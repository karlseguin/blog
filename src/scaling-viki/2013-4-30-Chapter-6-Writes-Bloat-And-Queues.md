---
layout: viki
category: viki
title: "Chapter 6 - Writes, Bloat and Queues"
permalink: "/scaling-viki/Chapter-6-Writes-Bloat-and-Queues/"
date: 2013-04-30 12:00:30
tags: [ebook, design, scalability, soa]
---

You wouldn't be able to tell from the way I've described the system so far, but we do have writes. From the beginning our vision for managing the distributed nature of Hyperion was vague. We envisioned having a centralized system which used queues to communicate changes in our data. We named this system Oceanus. Although centralized, a failure in Oceanus wouldn't ripple to our Hyperion clusters. At worse, write operations would fail, but users, mobile applications and other partners would still be able to use our system to browse and watch videos.

## Garbage
Before we could think about accepting new writes, we had to figure out how to migrate data from our existing system into Oceanus. Worse, it was starting to look like both systems would be run in parallel for some time. Even though we eventually managed to shrink that gap, some tools, like our administrative CMS, would continue to operate against the old database for some time.

From past experience, it was evident that migrating data from new to old, not just once but continually, wasn't going to be pretty. A new project, named *Garbage*, was born. Garbage was a mess to work with, had no test coverage (consequently never a broken build either), and contained some truly bad code. Befitting its name, Garbage relied on triggers to detect inserted/updated/deleted rows in the existing system. These triggers would insert a row in a `changes` table, which contained the table name, row id, and, in some cases, some additional details.

The core of Garbage was a Ruby script which would pick up these changes, transform the data, and write it into Oceanus. Looking back, this simple to describe yet hard to write code might have been our most important project. We cleaned up so much data, so much legacy, so many unknowns, that it's hard to imagine we once saw Garbage as nothing more than an unfortunate side project. Oftentimes we broke things, but that always led to questions for which answers didn't always exist. What does it mean for a video to be *enabled* but *deleted*? What does the *license_exception* column mean? What's up with container id 2767? (I don't remember, but at some point it must have caused us so much grief that it's the sole member of a global blacklist in Garbage).

In the end, it wasn't just Garbage's value that we underestimated. To our surprise, after a couple major refactorings, it actually ran well and was flexible enough to adapt as needed. The real lesson though is the absurd cost of a sloppy data model. As Hyperion shows, I believe in optimizing code/data for reads, but only when paired with a clean and normalized representation. Without Garbage, we'd never have had that clean model to build an optimized representation from.

## The Message Flow
With data synchronized to Oceanus, our next step was to push it out to our distributed Hyperion clusters. For this we opted to use a real queue. When a change was made (initially by Garbage, but eventually by our replacement CMS), an event would be written to the queue. The message would be simple, something like:

    {resource: 'video', id: '598v', change: 'update'}

Hyperion Aggregator would be listening for these messages and use them to build up the denormalized message which Hyperion would serve. This step would pull in data from various sources to create near-final messages (Hyperion itself might do some minor tweaks to the document before saving it in Redis). Although final, the message wouldn't go straight from Hyperion Aggregator to the clusters. What if a cluster was down or slow? The generation of the message had to be isolated from the actual synchronization.

To achieve this, Hyperion Aggregator would add its processed message to another queue. Each Hyperion cluster would have a Hyperion Worker subscribed to this queue with the sole purpose of delivering the message. This extra step allowed clusters and workers to fail without affecting other workers or clusters.

## Fail Fast and Be Idempotent
In most apps, reads and writes are served from the same place (a database). With our model, reads and writes were disconnected. Why did it work? First, we insisted that all communication be idempotent. Applying the same change from Garbage, or message from Hyperion Aggregator or Hyperion Worker would just work. Hyperion Aggregator kept a fingerprint of each resource and discarded updates which didn't alter the final document (as seen by clients). Hyperion treated all writes as upserts and wouldn't complain when deleting an already deleted resource.

We also decided to fail fast. A write to the queue was deemed as important as a write ot the database. Open a DB transaction, save the row(s) and enqueue a new message. We'd never save a DB record without the corresponding message. Also, our systems demanded that messages be processed in order. Creating then deleting a video can't be processed in any other order. Therefore, failure to process a message would stop the queue, raise an alarm, and require manual intervention. Some work could be parallelized. Our search index could use a different queue and worker from our recommendations.

## Hyperion The Bloated
Around the time all these things were falling into place, we started to add more write endpoints to Hyperion. Most of these endpoints would be proxied through Hyperion into Oceanus. From the moment I finished writing user registration, I felt ill. Nothing about it felt right. Node.js suddenly felt like the wrong tool and proxying through Hyperion felt unnecessarily complex. I was sure we were doing something wrong, that we were butchering Hyperion.

A small group of us talked it over and we quickly came to a decision. Hyperion's responsibility was to let people watch videos. Other systems would be developed and given a well-defined responsibility. We'd have a system dedicated to user management (account creation, sessions, profiles), one for community-related jobs, and so on. We also decided that some systems would need to be isolated due to operational, rather than logical reasons. The relatively write-heavy user activity component (think *Last 10 videos that you've watched*) is a good example of a system that we felt would benefit from such isolation.

These systems wouldn't just be web layers; they'd be the authority for whatever data they were responsible for. Any system that wanted information on a user would go to our user management system (named Gaia). We'd also get the benefit of using whatever tools made the most sense for a specific system.

Since we didn't want to expose this implementation detail to clients, all services would use a single domain: `api.viki.io`. This would point to a custom Go cache/proxy which would know where to route each request.

In the course of a twenty-minute conversation, we went from having two systems, Hyperion and Oceanus, to having five. It might sound like we caused ourselves a bunch of extra work, but what we really did was properly organize and isolate the work that we already had. Even so, it became evident that there was more left to do than Cris and I could manage. Thankfully, two colleagues saved our asses: [Albert Callarisa](https://twitter.com/ac_roca) and [Nuttanart Pornprasitsakul](https://twitter.com/visibletrap). Despite their own workload and deadlines, they volunteered to take responsibility for some of these.

## Queues for Notification, APIs for Data
Having multiple authoritative systems wasn't easy. Who was responsible for what, and how did you present rich and meaningful data without coupling the systems? As an example, Gaia, the user system, had an endpoint to show the community roles a user has. On its own, this data is meaningless. *LetoA is manager of 123234c* isn't acceptable. It really needs to be presented with a summary of the container, which is Oceanus' domain.

Our approach was to lean on our queues. When a container changed, a message was already being written to the queue. So far, only Hyperion Aggregator cared about such messages. However, there was no reason Gaia couldn't also pay attention. When a container changed that Gaia cared about, it could ask Oceanus, via its API, for more details about this newly-updated container - perhaps opting to keep a local, non-authoritative, copy. There was some confusion about when to use queues and when to use APIs. To be pragmatic, we extended the queues' responsability of only notifying to, in some cases, also including a small payload.

In another life, I spent far too much time worrying about inversion of control. To me, the best IoC technique has always been event-based programming. The decoupling is absolute in that, for all you know, no one cares about your event. The queue architecture is exactly the same thing, but on a macro level. Make a change and write a message to the queue. Maybe nobody cares. Maybe someone does and they'll come back to you a second later asking for more details.

We're still finding our footing. Things are far from perfect. But something about it feels good.


## An Alternative
We have considered an alternative approach at times. Rather than having Gaia care about container summaries, what if it only knew container ids? A request for a user's role would be intercepted and the container ids could be substituted on the fly (from a cache or by fetching from Oceanus) for container summaries.

The idea is inspired by Edge Side Includes (as found in Varnish, for example). On paper, we're big fans of the idea. We simply thought about it too late. It further decouples the systems while simplifying them. It probably doesn't perform as well, but I doubt that it'd be noticeable. I hope we get to try it soon.

## Queues Keep On Giving
Despite this alternative, I wouldn't give up on queues. Having changes sent to a queue, where workers can pick up what they want whenever they want, opens up all types of possibilities.

For example, we recently rolled out workers which listen to various messages and send a purge request to our frontend caches. Rather than caching a subtitle for 5 minutes, why not cache it forever and explicitly update as needed? Users not only get better performance, they also see changes much faster.

I think most people use queues as a way to free foreground threads from blocking on long running jobs. That's a good reason to use queues, but I now feel that, in general, queues are being underused. They're an amazing way to decouple systems, distribute data and communicate. Making a stream of changes available, backed by APIs, is enabling. It also helps isolate failures. As long as messages are saved, a failed system can be restored and brought back to a fresh state.
