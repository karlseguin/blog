---
layout: viki
category: viki
title: "Appendix C - Our Simple AutoComplete"
permalink: "/scaling-viki/Appendix-C-Our-Simple-AutoComplete/"
date: 2013-04-30 12:00:50
tags: [data structures, ebook, node.js]
---

Search was the first feature that we planned to tackle after our launch. Until then, we'd simply make do with our existing third-party-hosted provider. But it was the end of the year and I had spent the last few work days in a funk. I needed a challenge to fuel me up and the four-day long weekend provided the perfect opportunity to put headphones on and code. I knew I wouldn't be able to tackle search, but autocomplete seemed doable.

I considered a few possibilities, read some blogs, looked at some open source code, and settled on storing the data directly in our application using a trie (which I pronounce as *try* because *tree* is absurdly ambiguous).

A trie is an ordered tree where all child nodes have a prefix associated with their parent. It's pretty easy to implement a trie using a hash. Here's what such a structure might look like if it contained the words *uni*, *unicorn* and *unicron*:

    u: {
      n: {
        i: {
          $: 1
          c: {
            o: {
              r: {
                n: {$: 2}
              }
            },
            r: {
              o: {
                n: {$: 3}
              }
            }
          }
        }
      }
    }

We use the `$` symbol to represent a special key that holds the values id. It's possible to be more space-efficient by collapsing prefixes without ids, but let's keep things simple. Given the above structure, finding all the ids that have a certain prefix is just a matter of walking through a hash. First, we find the node that represents the user's input. For example, if the user entered `unic`, we could quickly walk down the hash to the 4th level (`c`):

    # first we find the node that represents the ids
    node = trie_root
    for c in input
      node = node[c]
      return null unless node? # there are no matches
    return load_ids(node)

Next we load every id from this point down through all child nodes (in our case, that would mean visiting both branches and getting 2 and 3). Since we are more concerned with performance than memory usage, we store the matching ids at every level. Therefore, our structure actually looks like:

    u: { 
      $: [1, 2, 3]
      n: {
        $: [1, 2, 3]
        i: {
          $: [1, 2, 3]
          c: {
            $: [2, 3]
            o: {
              $: [2]
              r: {
                $: [2]
                n: {$: [2]}
              }
            },
            r: {
              $: [3]
              o: {
                $: [3]
                n: {$: [3]}
              }
            }
          }
        }
      }
    }

The result is that we don't need a recursive or iterative method to load all child ids. We just need to access them directly from `node.$`. Regardless of how many values we store, retrieving all matching ids is O(N) where N is the length of the input.

This is only part of our implementation. We still need to apply holdbacks, sort them (based on whatever dimension we want, say, popularity) and get the details for the top matches. For this, we take the found ids and pass them to Redis. At this point, the code is similar to the rest of our video listing code. Unfortunately, the ids can't be definitively pre-sorted because many of our sorts are context-sensitive. However, we do store them using a best-guess effort, which hopefully results in less secondary sorting (I've never actually measured it, but I can't see how it could be worse than a random order).

Server processing time is around 2 to 4 milliseconds and it takes single-digit megabytes to store (more since we store a copy per process, have multiple versions, plus have it stored permanently in Redis; but the point is, it isn't much).

With the basic code in place, there are a number of options available to improve the quality of the results. You can transform the words in the trie and the inputed word to help deal with common issues. For example, we strip out many characters which helps avoid misses due apostrophe, dashes or spaces (we hated that in the old system *astro boy* worked but *astroboy* didn't). You can apply stemming and soundexes. You can even manually edit the trie based on analysis of actual usage.

I'm sure one day, maybe soon, we'll outgrow it, but it was fun to code.
