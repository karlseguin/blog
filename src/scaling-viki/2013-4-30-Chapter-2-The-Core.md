---
layout: viki
category: viki
title: "Chapter 2 - The Core"
permalink: "/scaling-viki/Chapter-2-The-Core/"
date: 2013-04-30 12:00:10
tags: [ebook, design, redis, soa]
---

Although there's nothing spectacularly difficult about the new platform, the core part of the system is built differently than most systems. The core is the part of our system that's responsible for finding lists of videos or retrieving details of a video. This includes getting the most popular, trending or other sorting options and getting videos by genre, available subtitles or other filters. It also involves other lists, like a user's subscription and curated content like featured videos.

## A Redis-Based Query Engine
One thing that hasn't been mentioned yet is that our data easily fits in memory (at least, as far as platform is concerned). Part of the reason we felt we could deliver all requests within 25 milliseconds was precisely because we figured we'd be able to keep everything in memory. But memory isn't the final solution to all performance problems. Redis isn't fast only because data is held in memory; it's fast because, in many cases, fetching data happens in constant time regardless of how many items you are storing. Algorithms and data structures play as big a part in performance as the storage medium.

The origins of Hyperion can be traced back to a handful of concepts used to explore such data structures and algorithms for searching and sorting data. This was weekend-based experimentation at its finest. At best, I thought it might lead to an interesting blog post or two. Rather than storing data in a table and indexing it, what would happen if we stored the data directly in the application's memory? What if we used bitmap indexes? Sharded using hashes? Tried putting everything in sets and doing intersections and unions? What if we used Ruby, or Go, or Node? *What if*, *what if*, *what if*.

All of this happened during my first couple weekends at Viki, before anyone was thinking about building a new platform. Mostly, I was just messing around, exploring our data and features.

### Bitmaps, A First Attempt
Initially, the most promising approach was using bitwise logical operations against bitmap indexes. Bitmap indexes are great when dealing with data with few unique values, like gender on a user's table. A lot of our searches are done against such values. For hundreds of thousands of videos, there are only a few genres and types. Modern databases will make use of bitmap indexes, but my initial focus was in storing these directly in the app's memory.

The way a bitmap index works is by filling an array of 1s and 0s to indicate whether an item has or doesn't have a specific property. For example, given the following documents:

    {id: 1, genre: [1, 2], type: 1}
    {id: 2, genre: [1, 3], type: 1}
    {id: 3, genre: [2, 3], type: 2}
    {id: 4, genre: [1, 2], type: 2}
    {id: 5, genre: [2, 3], type: 1}

We could create indexes that look like:

      video | genre:1 | genre:2 | genre:3 | type:1 | type:2
       1        1         1         0         1        0
       2        1         0         1         1        0
       3        0         1         1         0        1
       4        1         1         0         0        1
       5        0         1         1         1        0

If we wanted to get all videos of `genre:2` and `type:1`, we could apply a bitwise `and` to those two indexes and end up with with a third bitmap:

    video | genre:2 & type:1
      1             1
      2             0
      3             0
      4             0
      5             1

This means items 0 and 4 (corresponding to ids 1 and 5) match our query. A bitmap index is associated with a value based on the index position, like an array. Nowhere in our indexes or result do you see document ids. When your ids are auto-incrementing, the mapping can be implicit. Here, we know that it's id 1 and 5 by taking the positions and adding 1 (0+1 and 4+1). With GUIDs, you'd need to map the implicit order to the GUID, which is a small pain.

Bitmap indexes are efficient, specifically in terms of memory. You could have a hundred such indexes for a million videos and it would take less than 16 megabytes.

Unfortunately, we eventually gave up on this approach. First, the implementation was never quite as simple or clean as we liked. Secondly, although it was memory-efficient and fast, it wasn't fast enough. The bitwise operation was fast, but taking that result, extracting the matches, sorting and paging weren't. If you had one million videos, you essentially had to loop over the entire result (O(n)) to get all the indexes that were equal to 1.

Given what we've learned since, I think the problem was squarely with our implementation. I'd love to try it again. However, at the time, we decided to move to a different solution.


### Sets
Our next attempt was to store our indexes as sets. Initially, this seemed both slower and less memory-efficient than bitmap indexes. However, once we stepped beyond artificial benchmarks, things started to look much more promising. Given the same documents as above:

    {id: 1, genre: [1, 2], type: 1}
    {id: 2, genre: [1, 3], type: 1}
    {id: 3, genre: [2, 3], type: 2}
    {id: 4, genre: [1, 2], type: 2}
    {id: 5, genre: [2, 3], type: 1}

We'd create the following indexes:

    genre:1 = [1, 2, 4]
    genre:2 = [1, 3, 4, 5]
    genre:3 = [2, 3, 5]
    type:1 = [1, 2, 5]
    type:2 = [3, 4]

To get all videos of `genre:2` and `type:1`, we could intersect the appropriate sets, and get the following result:

    [1, 5]

As expected, both bitmap indexes and sets return the same result, but the implication of one solution versus the other are significant. Sets, unlike bitmap indexes, can be sparse. For example, imagine a new genre which only applies to video 1 and video 1000000. With a set, this is efficiently represented as:

    genre:9001 = [1, 1000000]

While a bitmap index looks like:

    genre:9001
    1
    0
    0
    0
    0
    0
    ... # 999993 more 0s
    1
    ... # more 0s

In terms of processing, sets can be intersected in O(N * M) time, where N is the number of elements in the smallest set and M is the total number of sets. In other words, if a small set is involved, performance is great. Given three sets, one with ten items, another with ten thousand items and the last with a million items, an intersection will take be O(30). Given our data and how it was accessed, sets looked like the perfect solution. To seal the deal, sets and set operations are first-class citizens of Redis.

It felt like we had a winning solution, and over the following weeks, we'd improve and tweak it to fit our exact needs.

## Managing Our Data and Indexes
One of the nice things about relational databases is that once you've created an index, you don't have to think much about it. The database engine takes care of keeping your indexes up to date. If we were serious about storing everything in Redis and relying on set operations for filtering, we'd need to manage indexes ourselves.

The easy part was storing our data. For this, we used Redis hashes. They key would be `v:VIDEO_ID`. A JSON representation of the object would be held in the `details` field, and other fields would hold other values we were interested in (without having to load the entire details). Creating a video looked something like (as a Lua script):

{% highlight lua %}
local data = cjson.decode(ARGV[1])
local id = data.id
redis.call('hmset', 'v:' .. id, 'details', ARGV[1], 'type', data.type,
           'created_at', data.created_at, ...)
{% endhighlight %}

When creating a video, we'd add its id to the appropriate index. All our indexes would be stored in sets following a simple naming convention `r:x:NAME:VALUE`:

{% highlight lua %}
-- r:x:type:movie, r:x:type:episode ....
redis.call('sadd', 'r:x:type:' .. data.type, id)

--  r:x:genre:1, r:x:genre:2
for i=1,#data.genres do
  redis.call('sadd', 'r:x:genre:' .. data.genres[i], id)
end
{% endhighlight %}

Creating indexes was easy and cleanly isolated. Updating and deleting though didn't initially feel quite so right. Before deleting, do you load the `details` and remove the video's id from the appropriate indexes? Doable, but not clean. The solution ended up being much simpler. When creating a video, we'd use another set to track all of its indexes.

{% highlight lua %}
local index
local index_tracker = 'r:i:' .. id
-- r:x:type:movie, r:x:type:episode ....
index = 'r:x:type:' .. data.type
redis.call('sadd', index, id)
redis.call('sadd', index_tracker, index)

--  r:x:genre:1, r:x:genre:2
for for i=1,#data.genres do
  index = 'r:x:genre:' .. data.genres[i]
  redis.call('sadd', index, id)
  redis.call('sadd', index_tracker, index)
end
{% endhighlight %}

Given a video with an id of 9, a type of `movie` and two genres, 2 and 5, we'd end up with the following:

    r:x:type:movie = [9]
    r:x:genre:2 = [9]
    r:x:genre:5 = [9]
    r:i:9 = [r:x:type:movie, r:x:genre:2, r:x:genre:5]

To remove all the indexes when deleting this video, all we had to do was loop through the values at `r:i:9` and issue an `srem`:

{% highlight lua %}
local indexes = redis.call('smembers', 'r:i:' .. id)
for i=1,#indexes do
  redis.call('srem', indexes[i], id)
end
redis.call('del', 'r:i:' .. id)
{% endhighlight %}

With this approach, the entire process of managing indexes was isolated in the `create_video` script. Delete didn't know anything about indexes. Adding or removing new types of indexes became a non-issue. All delete cared about was looping through a set - you could put whatever you wanted in that set.

Finally, we implemented updates by doing a delete followed by a create. We had doubts about how well this would work and ultimately had to add the concept of a deep delete versus a shallow delete (the first used for a real delete, and the second used when updating). Even so, we were relatively happy with our data management strategy. It avoids having to load the object, find the difference and figure out which, if any, indexes need to be updated.

## Find
Now that we had a way to manage our data, and a general idea of how to query it, we were able to start moving forward at a faster pace. Much of our energy was spent on writing the `find` path - a surprising amount of code would flow through it. Our initial implementation, worthy of taking us to the next phase of development, looked something like:

{% highlight lua %}
local intersect
local data
local result = {}

-- if only 1 set is provided, no intersect needed
if #KEYS == 1 then
  intersect = KEYS[1]
else
  redis.call('sinterstore', intersect, unpack(KEYS))
end

data = redis.call('sort', intersect, 'BY', 'v:*->created_at',
        'desc', 'LIMIT', ARGV[1], ARGV[2], 'GET', 'v:*->details')

table.insert(result, redis.call('scard', intersect))
table.insert(result, data)
return result
{% endhighlight %}

We'd be able to call this method with one or more filters and provide paging information:

    find ['r:x:type:movie', 'r:x:genre:2'], [0, 10]

Redis' `sort` command was responsible for much of the heavy lifting. Many developers don't realize just how powerful this command can be. Understanding the `*->` syntax is key to understanding the command. The asterisk (`*`) will be replaced by the value currently being examined, while the arrow (`->`) tells Redis that the left part is the key and the right part is the field of a hash.

For example, giving an `intersect` with the following values:

    intersect = [50, 125, 359]

The above `sort` command would first sort these by the values at the following hashes:

    key     | field
    v:50    | created_at
    v:125   | created_at
    v:359   | created_at

And then retrieve (and store in the `data` variable) the values at:

    key     | field
    v:50    | details
    v:125   | details
    v:359   | details

This array of sorted details, along with a total count of matching results (for paging), would be returned to our code.

Over the course of development, `find` would get revisited over and over again. The following chapters will explore its evolution. But everything started with this simple script.

## Foolishness?
I've often wondered if we were fools for not adopting a more traditional model. I have no doubt that it would have worked. Yet, at some early point, our set approach really started to resonate with both of us. Everything, including features and details we hadn't considered at the time, just fit in our model. Thinking in terms of set operations and having a concrete handle on our indexes became natural, even comfortable. (I'd argue that a downside of having indexes completely managed by relational databases is that they remain somewhat abstract).

Also, we weren't trying to develop a one-size-fits-all approach for all of our data. We were focusing on one aspect of the system. If different parts required a different approach, so be it. Maybe that sounds like a lot of work and complexity. Intellectually, I agree. Nevertheless, my gut feeling says that, at some scale, using the right tool for the right job is just as true for data modeling as it is for everything else.

Finally, I'm not suggesting that a set approach is right for everyone. I'm saying that it was right for us. Not just because it was a good fit for our data either. It was also a good fit for us. It was different and exciting and thus, it fueled our enthusiasm. I'm not sure that we'd have spent evenings and weekends refactoring, experimenting and tweaking our response times down to single digit milliseconds had it been just another CRUD-based app. Programming is like running - you won't get better until you go beyond what you can already do.
