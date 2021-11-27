---
layout: viki
category: viki
title: "Chapter 4 - Tweaks"
permalink: "/scaling-viki/Chapter-4-Tweaks/"
date: 2013-04-30 12:00:20
tags: [ebook, design, performance, soa]
---

The core part of our system, including holdbacks, represented a disproportionately large amount of design and experimentation compared to the amount of code involved. The bulk of the code was yet to be written, but it would either be built on top of our foundation or use more traditional designs. Data that didn't need to be integrated with video data or holdbacks ended up either on the file system or in a Postgres database.

Furthermore, aside from a few conversations, we hadn't even begun to tackle the distributed portion of the system. Before moving on to that topic though, we made a number of tweaks to `find` which were worth exploring.

One thing to note is that, at this point at least, we were ahead of schedule and ahead of the other teams. We wanted to ship, but to what end? Without our infrastructure or clients, we were nothing. Our business experts would validate our work through a nice client, not raw JSON manipulated via query string parameters. At the rate we were going, there was plenty of time to build out Hyperion's secondary endpoints, figure out the distributed aspect, and have fun shaving milliseconds from our code.

## Sorting
While our implementation was fast, it wasn't as fast as we had promised, at least, not under all conditions. The set operations were fast; the sorting and paging were not. Getting a page of action movies sorted by views might take 15ms. Getting a page of all videos sorted by views might take 100ms. The more you filtered, the smaller your final result was, the faster you could sort.

In our `find` function, we use Redis' `sort` command and supply a `BY` argument:

{% highlight lua %}
redis.call('sort', intersect, 'BY', 'v:*->created_at',
           'desc', 'LIMIT', ARGV[1], ARGV[2], 'GET', 'v:*->details')
{% endhighlight %}

We could sort by views or whatever value we had available simply by switching `v:*->created_at` for another field. However, even if you just want the first ten records out of a hundred thousand, you still need to sort the entire list.

We decided to store pre-sorted values in sorted sets. In theory, we'd be able to apply this as just another filter with the distinct advantage that we could stop filtering as soon as we had a page worth of results.

There were a few problems with this plan. First, we were using `sdiffstore` to implement holdbacks. Unfortunately, Redis doesn't have an equivalent `zdiffstore` command. Secondly, we have enough sort options that memory was a concern.

The first problem was solved by writing a specialized Redis command in C: `vfind`. Like our Lua-based `find`, `vfind` did intersections, holdbacks, sorting and detail retrieval. But it did it all much faster and did it against our sorted sets.

The second problem was solved in two parts. First, rather than creating sorted sets that held all videos, we created a sorted set that only stored the top videos for that order. For example, instead of having a sorted set containing all videos ranked by updated date, we'd have a sorted set with the 5000 most recently updated. Essentially, this approach optimized our code for retrieving the first X pages. Requests for pages 1, 2, 3, 4 ... could be satisfied by `vfind`. If `vfind` failed to return a full page, we'd fall back to `find`.

That solved part of our memory pressure. The real issue though was that a number of sorts are country-specific. For example, you can list the most popular videos based on US views. Take 4 sorts * 200 countries and you end up needing a lot of memory. We cheated our way out of this problem. We analyzed views across countries and noticed that a lot of countries have nearly identical viewing behaviour. Why keep a list of top Canadian content when it's almost identical to the list for US? This, we convinced ourselves, also had the positive side effect of helping surface content. A kind of naive recommendation engine.

So how fast was `vfind` for our slowest (100ms) query? Around 15ms.

## Paging
Even though we could efficiently filter and sort at the same time, we still had to count up results for paging purposes. Even here, `vfind` was a lot faster - it still had to count everything, but once it had filled a page, it really was just a matter of checking holdbacks and increasing a counter. No need to track all those values and then do a NLog(N) sort.

At this point, our website was starting to take shape and we noticed that a lot of queries were being used without paging. The homepage, for example, showed the top 3 trending movies, TV shows and music videos. We changed our code so that, by default, only partial paging information was returned. If you asked for 10 videos, we'd return 10 videos plus a boolean field that indicated whether more results were available or not. Getting a full count was O(N) where N was the total number of matches. However, to only find out if there's at least 1 more video available, it's O(N+1) where N is the number of videos you are requesting. In other words, with full paging details, N was 5000; without, it's 11.

This works well if you just care about top X results, or if you are doing endless scrolling or limiting your paging to *prev* and *next*.

As an aside, if you happen to be doing paging where you can maintain state (mobile or using Ajax) it's also possible to optimize this by only getting the total count for the initial load. There's really no need to get the total count each time the user switches to a different page.

Single digit: 9ms.

## Serialization
That last tweak that we did, and most likely the first one we'll roll back, had to do with data serialization. We knew from past experience that rendering a view, whether it's HTML or XML or JSON, can be quite slow. Up until this point, it hadn't been a problem. However, with everything else tweaked, it was now the slowest part of our code.

Since we were dealing exclusively with JSON, there wasn't much to tweak. The only thing that seemed plausible was to directly return pre-formatted JSON strings. This fit quite well with our data model. Inside the `details` field of our video's hash, we already had the JSON body of the video. All we had to do was join the matching video details by a comma, wrap them in square brackets, and write it to the socket.

We had been doing some light processing on the response before sending it out to improve the usability of our API, but decided to give it a try and see how it worked (so far, none of our internal clients have complained!).

The change cut our response time to around 5ms. That, we decided, was good enough...for now.

## Wasted Time?
I wouldn't disagree with accusations of having taken it a bit too far. However, the only time-consuming change we made, `vfind`, was also the most important. It was also the one we learned the most from. It wouldn't be a stretch for me to say that `vfind` and the accompanying sorted set generation was some of the funnest, funniest and most educational code I've written in a long time.

A lot of our performance testing was focused on single queries running locally. Obviously this is the easiest thing to test and tweak. While not ideal, a 10x performance improvement in such a controlled environment is bound to improve performance in the chaos of a production environment. We were also testing without the caching layers we'd have in production. Finally, our architecture was designed to scale horizontally. Supporting a high level of concurrency would at least partially be resolved by throwing hardware at the problem.
