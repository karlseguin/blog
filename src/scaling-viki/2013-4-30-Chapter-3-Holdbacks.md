---
layout: viki
category: viki
title: "Chapter 3 - Holdbacks"
permalink: "/scaling-viki/Chapter-3-Holdbacks/"
date: 2013-04-30 12:00:15
tags: [ebook, design, redis, soa]
---

The most complicated part of our system is the logic that decides whether a user can or cannot watch a video. We call this *holdbacks* and it integrates with almost every single possible query. We hate the idea of users following a link that we provided, say from the homepage or search results, and getting a *not available in your region* message.

The number of conversations we have which end with *"Ya, but what about holdbacks?"* followed by sad faces all around was considerable. Which isn't to say that we dislike holdbacks; it's a fun technical challenge and our content providers are as important as our users. Nor am I trying to imply that it limits what we can do. But it can, without question, make a simple feature much more complicated.

## The Legacy System
In the existing system, to get a list of videos, the system would first query the holdback API for a list of restricted ids based on the user's location, platform and various other properties. These ids would then be passed into a `not in` statement to Postgres. I still remember the first time I saw Rails logging a `select` with thousands of values being specified in a `not in`. I'm still amazed at how well Postgres handles that. Nonetheless, it wasn't ideal. Furthermore, getting that list of ids wasn't a straightforward query - it was as much an SQL `select` as it was a mini-rules engine. Without Memcached, I don't think the system could have handled the load.

There was another problem that we were anxious to fix. Holdbacks had been implemented as a standalone system exposed as an HTTP API. APIs are great, but some things just need to be tightly coupled. It wasn't just about the performance, though that was certainly a major factor. Holdbacks is a first-class citizen of our entire data universe - as important as the title or mp4 location of a video. It didn't belong out there, abstracted by a `HoldbackManager`. It belonged right next to our indexes and video data.

Finally, the existing holdback system identified seven or eight dimensions which could be applied to either deny or allow a video from being watched. It also had rules that didn't make sense (they were always invalidated by rules with a higher priority). Finally, it had time sensitive rules that were long expired.

It might help to see a simplified example of holdback rules:

    video | country | platform |    from    |    to      | allow
      1       SG        TV                                  F
      1       SG        Web      Jan 1 2013   Dec 31 2013   T
      1       SG        Web                                 F
      1       US        Mobile                              T
      1       US        *                                   F
      1       *         *                                   T

The rules are processed from top to bottom, stopping once a match is found. This video is never watchable from Singapore on a TV and can only be watched from the website during 2013. Furthermore, US users can only watch it from a mobile device. Anyone else, in any country and from any platform, can watch the video.

## A Failed First Attempt
The story of our holdback rewrite is a lot like the story of our bitmaps and sets: our first iterations of both were failures. The idea was simple: we'd take our holdback rules and store them in our application's memory. The structure would be a hash containing linked lists. They hash key would be the video id, and each linked list item would be a set of conditions with either a deny or allow flag. To know if you could watch a video, you'd do something like:

{% highlight javascript %}
function allowed(context, video_id) {
  var ruleSet = rules[video_id];
  for(var i = 0; i &lt; ruleSet.length; ++i) {
    if (isMatch(context, ruleSet[i])) {
      return ruleSet[i].allowed;
    }
  }
  return false;
}
{% endhighlight %}

`isMatch` would take the context and compare them to the 8 dimensions of the rule to see if they all match. Something like:

{% highlight javascript %}
function isMatch(ctx, rule) {
  return ctx.country == rule.country && ctx.platform == rule.platform && ...;
}
{% endhighlight %}

For an individual video, this worked well. For a list, not so much. There were two problems. First, much like the legacy system, we were still moving large quantities of video ids back and forth between holdbacks and our `find` system (in Redis). Sure, it was a lot more efficient (not over HTTP, possibly even on the same machine), but it was still an issue. Worse though was getting our page count. Finding 10 or 20 videos was plenty fast, but also getting a count of all matches (for proper paging) was well over 100ms.

It still wasn't as tightly coupled as it should have been, and the iteration over N rules for M videos was just bad.

## Permutations
The idea of pre-calculating every possible combination of rules for given conditions had been floated around from the very beginning. With such a pre-calculated list, a check could be done in O(1) using a set. We'd get pen and paper and make some estimates. It never worked out; there are too many countries on this planet!

Seconds after we declared our first attempt a failure, we went back to the whiteboard talking about permutations. We talked to our business experts, our CEO, looked at licensing deals, and then went back to our existing data. We decided that, in reality, we only needed three dimensions: Country, Application and Platform (CAP). Some of the other dimensions were never used, two were mutually exclusive (and merged into Application), and the rest made more sense as filters or some other type of post-processing step. With 200 countries, 4 platforms and 100 applications, things looked more promising.

We built a prototype and started to load the data. It was larger than we were comfortable with - maybe 10GB. Doesn't sound like much, but we had to consider future growth: more videos, more applications and possibly new dimensions. We also had to think about our infrastructure. Given Redis' single-threaded nature, our plan had been to run multiple slaves per Hyperion cluster (a cluster being everything Hyperion needs to fulfill a request from a particular geographic region). That 10GB could easily turn into 100GB (new content * slaves), which, again, made us uncomfortable.

I can never remember who came up with the idea, but one of us suggested that we find matching permutations and alias them. The other one, undoubtedly driven by excitement (and possibly a bit of jealousy for not having thought of it first), quickly coded it. The result was great, holdbacks was less than 800MB. This was further reduced by switching to a 32bit build of Redis.

## Integration
We had an efficient representation of holdbacks, but we still had to integrate it with our core system. This was probably around the time that our set-based filters started to resonate with us. By storing holdbacks as sets in Redis, it became nothing more than another intersection of sets. We debated whether holdbacks should be stored as a whitelist or a blacklist. A whitelist would take more space, but might be more efficient. It would also more neatly fit into our existing code as it would just be another set intersection. A blacklist would be more memory efficient, probably a bit slower, require some small tweaks to our code, but would be a more accurate representation of what holdbacks were all about.

Ultimately, we settled for a blacklist - it felt more natural. Besides, our everything-in-memory attitude made us frugal. We've always seen memory as an important but limited resource.

Therefore, for a given CAP permutation, a holdback key could be one of two things. The first would be a list of denied video ids:

    hb:us:48:mobile = [38, 480, 19, 200, 3984, 40092]

The second would be an alias (implemented as a Redis string) to a real key:

    hb:ca:48:mobile = hb:us:48:mobile

On each request, we'd resolve the real holdback key (if it's an alias, de-reference it) and pass this holdback key to our `find` method:

{% highlight lua %}
local intersect
local diffed
local data
local result = {}

-- do not intersect if only 1 filter is provided
if #KEYS == 2 then
  intersect = KEYS[2]
else
  redis.call('sinterstore', intersect, unpack(KEYS, 2))
end

redis.call('sdiffstore', diffed, intersect, KEYS[1])

data = redis.call('sort', diffed, 'BY', 'v:*->created_at',
        'desc', 'LIMIT', ARGV[1], ARGV[2], 'GET', 'v:*->details')

table.insert(result, redis.call('scard', diffed))
table.insert(result, data)
return result
{% endhighlight %}

The only difference with the previous version is that we `diff` the holdback set (`KEYS[1]`) from the intersected result. In other words, after we've gotten all the action movies, we subtract the ids that the user isn't allowed to watch.

## Design Can Be Slow
As we moved forward, holdbacks would see some small changes. There were cases where we'd want to ignore holdbacks (if the user was an administrator, for example). We also spent a fair amount of time improving the performance of our permutation generator, including ways to further reduce the number of permutations.

If there's one lesson we learned, it's that some solutions evolve over a longer period of time than others. Permutations had always been on our minds; we'd explore the possibility at varying levels. Sometimes, it would be little more than *"If only we could store all the permutations"*. We explored various schemes to make it work, talked it over with colleagues, and even introduced it as an interview question (that didn't last long though).

I'm glad we didn't give up on the possibility. However, I'm sure holdbacks will be the first part of the new platform to see a rewrite. It'll take years to really solve this problem, in part because I expect the problem to evolve - more content and new types of restrictions. Some might see having to rewrite so quickly as a failure. I don't.
