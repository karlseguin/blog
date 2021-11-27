---
layout: viki
category: viki
title: "Chapter 5 - Surprisingly Reusable"
permalink: "/scaling-viki/Chapter-5-Surprisingly-Reusable/"
date: 2013-04-30 12:00:25
tags: [ebook, design, soa]
---

Up until now we've been looking at our design exclusively from the point of view of videos. In reality, we've always had two first-class citizens: videos and containers. The only difference between the two is that containers can have zero or more child videos. That might sound like a big difference, but it really isn't. For all intents and purposes, the two are similar: both can be filtered, both can have holdbacks applied, and both have similar detailed information.

Initially the two had slightly different code paths; namely, we had holdbacks specifically for videos and holdbacks specifically for containers. At some point, we started to just think about both as resources and our code started to merge to work on *resources* instead of *videos* or *containers*. Even months after this evolution, I've found myself pleasantly surprised at just how generic our model has been.

As an example, let's go back to adding support for containers having zero or more videos. That sounds significant, but it's really just another set. Want to find all of container 1000c's videos? Simply query the `r:1000c:videos` set. You can take this further by applying another set to it, say `r:x:t:clips`, to get all of the container's clips, and then use all of the existing data to sort it however you want. It's all just about intersection of sets. All of this code goes through the same `find` function which does caching, filtering, holdbacks, sorting, paging and data retrieval.

(OK, to be honest, we have a fair amount of `if` statements to handle a variety of possibilities. The code is far from a perfectly reusable, unblemished masterpiece. For example, when retrieving a container's videos, we skip `vfind` since it doesn't have the necessary data and our normal `find` works in a few milliseconds for such small sets).

The main difference between our resources is the code to create them. They each have unique indexes (such as a video's container) and unique sort options (in addition to many shared ones). Since the list of a resource's index is tracked during creation, they all share the same delete code which just deletes everything in that list. 

We've since introduced other resources and the only requirement for them to work is that they store something in the `details` field under a key named `r:RESOURCE_ID`. That's all `find`/`vfind` needs in order to function.

## Unique Ids
The old system didn't use unique ids, a decision we initially decided to stick with, not because we agreed with it. It was simply too much trouble to change. However, to merge *videos* and *containers* into the same holdback sets, into *resources*, this is something we had to address. Given a holdback of resources:

    hb:us:48:mobile = [38, 480, 19, 200, 3984, 40092]

How do you know if that's video 38 or container 38?

We considered GUIDs, but you probably aren't surprised to know it didn't fit very well with our everything-in-memory-with-lots-of-indexes approach. There was also some concern about mapping it to old ids. There aren't many things I dislike more than an `old_id` field.

The approach we settled on was to take the existing ids and append a character at the end. Thus container `50` became `50c` and video `9001` became `9001v`. This had a far smaller memory impact than using GUIDs. It also made it simple to map to the old system, and made debugging much easier: the id tells you what type of object you are looking at.

It's worked very well for us. Certainly anyone migrating from a system without unique ids to a system with unique ids should consider it. For a new system? My gut says to use GUIDs, but I'm not sure why. I think I'm just afraid to take a stand on something so basic that goes against conventional wisdom. That's not good.

## Lists
In Chapter 4 we saw how sorted sets of pre-calculated sorting options were used to greatly improve the performance of our system. The same technique is used for almost any list of resources. The best two examples are a user's subscriptions and curated content (like our featured content). Our concept of a list is truly that simple: a sorted set containing resource ids:

    # sorted sets are inserted as: score1 value1 score2 value2 scoren valuen
    r:9002u:subscriptions = [0 1000v 1 384v 2 50c]

By its very nature, the list is pre-sorted, so getting your most recently subscribed or least recently subscribed resources is trivial. In the above example, the score of each resource is an incrementing count (we actually use a creation timestamp).

What's been fun about lists is how often we've said *"I think we can just use a list for this"* and how often that ended up being the case. They are fast, memory efficient, and, best of all, go through our same `find` logic. Again, this means that as soon as we populated a sorted set with resources that have a `details` fields, our core logic applies (most importantly holdbacks).

It'd be nice to say that the reusable nature of the system was intentional, but it wasn't. Even as we implemented it specifically to improve holdbacks, it wasn't at all obvious just how flexible yet simple we were making things. The same is true for lists. They were built for a very specific purpose, but as soon as we had the concept of resources, it became the right solution for many things. Our system is made up of millions of lists. And we've only scratched the surface.
