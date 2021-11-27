---
layout: viki
category: viki
title: "Chapter 1 - Introduction"
permalink: "/scaling-viki/Chapter-1-Introduction/"
date: 2013-04-30 12:00:05
tags: [ebook, design, soa]
---

<p>This book tells the story of how Cristobal Viedma and I created the platform that powers Viki: a video site focused on international content and community-driven subtitle translations. Our push to production proved to be an enlightening experience. I constantly found myself looking forward to the day's challenges while reflecting on the experiences and lessons I've accumulated in an otherwise unremarkable career. It was a strange but pleasant mix. A journey, I hope, which you'll find worth reading about.</p>

Technically, there's nothing remarkable about Viki, Cris or myself. This book, while detailed with respect to our technical implementation, doesn't provide any silver, or even lead, bullets. Maybe our approach is ridiculously flawed and this book will serve no purpose other than embarrassing us. It'll be another lesson I'll grudgingly take.

The number of people doing remarkable work in the fields of computer science and computer engineering is limited. So too are the truly innovative companies. The rest of us face less difficult challenges. Nonetheless, there's something peculiar that we all face when writing code - namely, the code itself. Almost every method is unique. Every solution is different. Furthermore, we're all coding systems of ever-increasing levels of complexity. The number of people with experience in creating distributed high-throughput systems today is small compared to how many there'll be tomorrow. 

This is exactly where we found ourselves. Tasked, more by ourselves than anyone else, to build a fast, distributed and reliable platform while lacking the experience to do so. Even today, months after we started, I'm overwhelmed with thoughts and emotions by this premise. Consider how different people might react to such a challenge. Some would shy away, being naturally risk-averse or lacking confidence. They might also be lazy or bad programmers afraid to be found out. Others would cherish the opportunity, as we did, seeing it as a rare chance to grow. Driven perhaps by arrogance, ambition, the challenge or the experience.

Also, consider what it means to have experience doing something. Surely, someone with direct experience building a similar system would be better suited than someone with no such experience. However, such people are rare, especially when you're a relatively unknown company headquartered in Singapore. Instead, perhaps we should consider indirect experience. One of the things that seems to separate a good programmer from her counterparts is the ability to take experiences doing one thing and applying it to something else. Extrapolating potential solutions or even just a starting point from an incomplete picture, or a gut feeling, is how you grow. This applies at both the macro and micro level. We'll look at more concrete examples throughout the book. For now, I suspect that anyone with experience interviewing applicants knows what I'm talking about. Some candidates don't know the answer, some make poor guesses or babble. The ones worth hiring though, make, or at least try to make, the leap from what they know to what makes sense. (Not that there's anything wrong with saying *I don't know* in an interview every now and again.)

I can't talk about experience without sharing something I learned from the bank. It's resoundingly true that there's a world of difference between twenty years of experience and one year of experience repeated twenty times. In some cases, indirect or no experience is better than too much.

## How It All Started
Before being able to explore the path we took, you must first have some understanding of where we began.

I joined Viki at an awkward time. A recent change not only left a team of roughly 18 engineers leaderless, but also left a non-technical product team disconnected with engineers. The system, a monolithic Ruby on Rails and Postgresql application, was starting to burst at the seams. Outages were all too common and page load time was going from bad to worse. Seeing signs of slowed growth, product managers pushed for new features, only to exacerbate existing stability and performance issues. Furthermore, a recent experiment of breaking engineers into small teams made it difficult for anyone to address system-wide issues (like stability and performance).

In a lot of ways, the code reminded me of the bank. Large and surprisingly complex, with frustratingly slow and randomly failing tests. Rather than leaky abstraction via Hibernate, it was leaky abstraction via ActiveRecord. Months later, I'd discover that deleting certain objects resulted in over 26 000 cascading changes to the database. Furthermore, the culture felt odd. The office was like a library. There was little to no discussion between engineers, and never any arguments. Dogmatic Agile was, once again, in full effect.

Thankfully, what did differ from the bank was management's awareness of these issues and their willingness to try and address them. While the day-to-day culture might have compared poorly to other startups, the underlying support for taking initiative was intact.

Roughly a month later, a new VP of Engineering was hired. At this point, Cris and I, the platform team, had a few modest successes behind us as well as a clear vision of where we wanted to go and how we wanted to get there. Additionally, we had gelled. When we looked or talked about code, we, more often than not, knew what the other was thinking. We argued, often intensely (especially on Friday for some reason). From this point on, we were given a certain degree of freedom to execute our vision.

## The Platform
Our purpose on the platform team is to support Viki's API and other shared services. Previously, this had meant a fairly thin layer, largely composed of controllers, within the Rails application. Our mobile applications, along with a few partner sites, were our clients. The main website did not use the API, but rather had its own path to our shared models and database. This, we all agreed, had to change. While I think it's possible to prematurely adopt an API-based architecture, the ever growing number of clients in Viki's ecosystem called for a shared API.

Our ambition was greater than just having the web become a consumer of our API. First and foremost, we wanted to address the performance and reliability issues that were plaguing us. Based on some early prototypes, we felt we could deliver any request within 25 milliseconds uncached and within a local area network (10-100x faster than the existing system). We also wanted to build a distributed system which would help address both reliability issues as well as reduce network latency. Viki has a global audience with a significant number of users behind slow connections (either at the last mile, or via international pipes). Our top five cities are distributed across four continents. We already leveraged CDNs for our videos, but what good is that if it takes users six, ten or even twenty seconds to get all the data they need to start playing (with much of that time spent at the network layer)? 

We also wanted to improve our development and operational environment. We felt that by moving away from one large codebase, we'd be better able to deliver new features as well as enable new clients. Furthermore, we wanted to improve our logging and general insight into our system's health. For us, that meant less but more meaningful logs which would essentially improve the signal-to-noise ratio.

Our approach was fueled by understanding two fundamental things about Viki. First, we're read-heavy. Second, what writes we have need not be replicated in real-time, or even close to it. It cannot be stressed enough how important it is to understand the actual operational requirements of a system. In all honesty, the only write in Viki that I'd hate to lose is user registration. Anything else I'm more than happy to batch up in an fsync every second (or minute!)

This is a good time to mention Viki's community team. Viki was, and continues to be, built on a community of volunteer translators. The community aspect of Viki has different operational requirements than the main website and mobile clients. It also has its own dedicated team. Where platform is read-heavy, community is more evenly distributed. Where most of our replication can happen in minutes, they are dealing with real-time collaboration. This presented an interesting challenge: community defines Viki but is dwarfed in terms of traffic and complexity by clients and platform. Which do you favor when designing your system, especially your data model?

We opted to lean on our yet-to-be-built platform's ability to work with stale data (slow replication). The community team would continue as-is, working on their own priorities, while we'd replicate data from the existing database into a platform-friendly model. If it took a minute or two for a new subtitle to propagate, so be it. This had the added benefit of letting us try and clean up our existing data. We could dump our failed polymorphic model and correct impossible data, like created_at values set in the future, orphaned children or duplicates that should never have been allowed.

It was to be a rewrite. It had to be fast. Codename: Hyperion.

At the time, none of this was flushed out. The core of the idea was really just to have an optimized data model fronted by a robust API application. Distributed, of course. Somehow, we'd keep it all in sync. In some places we had prototype code, but for very specific and low-level parts. Despite the vagueness, it never felt impossible or even particularly difficult.

Ultimately, two factors defined almost every decision we made. First, our own attitude towards risk and technology. It isn't a job, nor a profession. It's a passion. Secondly, a common sense understanding of the system's non-functional requirements. Almost every technical problem we faced was solved by taking a step back and remembering some basic truths about our system. Not only are we read-heavy and can accommodate slow replication, but in a lot of cases, we can apply fuzzy logic and return an approximation.

With a great deal of enthusiasm, we started to code.
