---
layout: viki
category: viki
title: "Chapter 7 - Conclusion"
permalink: "/scaling-viki/Chapter-7-Conclusion/"
date: 2013-04-30 12:00:35
tags: [ebook, design, soa]
---

It's hard to end this story when I feel that there's so much more to talk about. Initially I had hoped to intermix technical chapters with Peopleware-oriented ones. But, as I wrote, that just didn't happen. Still, I can't help but think that our real story, challenges and lessons were more about the people than the code. 

Which isn't to say that the entire technical side of the story was told either. Our distributed approach demanded centralized logging and monitoring. We set up logging systems around Kibana, Logstash, Statsd and Graphite, largely following various guides and blogs. While I generally suffer from a bad mix of NIH syndrome and cheapness, I had no problem with our decision to use ScoutApp for system monitoring. Self-hosted monitoring solutions have fallen far behind, while other hosted ones are unreasonably priced. 

The devops effort alone warrants its own book (not to be written by me). Controversial to say, I know, but a programmer that can set up his own server and configure his stack is probably better than one who can't. It's worth knowing, especially considering how little time is involved.

Yet I come back to the people aspect of it. We had fun, we learned, we're proud, and we added value for our employer. Throw everything else away because it barely registers against those four criteria. Be passionate. Put your money where your mouth is, especially when it comes to the virtues of risk. Learn. 
