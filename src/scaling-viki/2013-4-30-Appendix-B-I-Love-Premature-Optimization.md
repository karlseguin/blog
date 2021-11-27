---
layout: viki
category: viki
title: "Appendix B - I Love Premature Optimizations"
permalink: "/scaling-viki/Appendix-B-I-Love-Premature-Optimizations/"
date: 2013-04-30 12:00:45
tags: [ebook, learning, performance]
---

I hate programming adages that give developers an excuse to avoid work. Developers shouldn't test their own code. Laziness is one of our great virtues. Premature optimization is the root of all evil.  I understand the spirit of these (well, except the testing one, that's just silly), but too often I see them wielded as an excuse for mediocrity.

I'm particularly weary of any such performance-related battle cry. The bar is now set so low that what some people call *premature optimization*, I call *making it work*.

There are a lot of reasons why optimizing code is important. Performance *is* a feature. Some even say performance is **the** feature. We're also seeing all types of shift in computing hardware: the move to portable devices and the move to slower multi-core machines. Also, performance can be something that's hard to fix after the fact - it normally has a major impact on the design decisions you'll make. If you don't stay on top of it and work diligently at it, it will get out of control.

The real reason why you should consider spending time optimizing your code, even for something trivial, is because it's a great way to learn. You'll discover all types of crazy things you didn't know about your language or a library you are using. Continuously benchmark your code, try variations, and learn from your observations. Whatever time you spend is a small price to pay for gaining fundamental knowledge about compilers, memory and processors.

I can't pass up an opportunity to talk about third-party libraries with respect to performance. We ran into a number of performance-related issues that were a result of some third-party library or tool. The clearest example was in Redis' `sdiff` command. When we first considered using it for holdbacks, I told Cris that I was apprehensive given its O(N) characteristics (where N is the total number of elements in all sets). Cris looked at me suspiciously and said: *"No it isn't"*. So I opened up Redis' website and showed him that it was - because that's exactly what it says. Cris pulled out a piece of paper and proved to me that both Redis and I were wrong.

We looked at the implementation and emailed Salvatore to propose an alternative implementation. Before we even had our editors open, he'd already committed a patch (`sdiff` will now use its inputs to determine whether it should pick the initial implementation or a new one, which is O(N * M) where N is the the size of the smallest set and M is the total number of sets).

There are two lessons here. First, don't blindly accept the work of another programmer just because he or she is better than you. I have a lot of respect for Salvatore and the work he's done, but we all make mistakes and we all tend to get a narrow perspective around our own code. Always be a critical thinker.

More importantly, third-party libraries can be a huge source of performance problem. Bugs tend to get fixed as they have an immediate and obvious impact. But poor performance can go uncorrected for a long time. 
