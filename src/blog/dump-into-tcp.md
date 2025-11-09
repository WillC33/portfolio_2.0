---
title: Dump Everything in one TCP Window and Never Worry Again
slug: dump-into-tcp
date: 2025-01-09
description: Let the network do all the heavy lifting and you never have to think about performance ever again
lead: "Put everything in the first TCP packet (14KB) and the network handles the rest. No performance anxiety. No compromise."
tags: [performance, optimisation, tcp, networking]
---
**Does anyone remember "Create React App?"** Has anyone seen a bundle in the wild that shipped with **all the symbols and the source map?** I have, and I cut **70% of the build size** within a month of becoming a dev because I read the docs. This is in no way a boast or something I consider to be a feat of brilliance, though every HR person who crosses my CV will get to read it that way for as long as my employer is listed there. I consider it to be a bare minimum of effort into reading how something works. That's a lost art.

We as developers are a psychologically interesting bunch, whining about people taking shortcuts and being sloppy while also trying to find the most automated way to do any task that crosses the kanban. I'd say even, that it is normal and healthy to live in such paradoxes. But it does mean sometimes we push ugly, stupid, rushed garbage to meet a deadline or because we get distracted by Twitch.

I, too, am named in the deposition, don't worry. If Claude can write me a script for it, even through three or four prompts, I ain't reading the damn man page. It's 2025. Someone other than my brain can pay the compute.

There are no accusations here about your 300MB SPA with an SEO score worse than GeoCities. I maintain one of my own. Ours has more than 1001 treasures in the node_modules folder too. Never will they be cleaned. Notably, the build takes the perfect five minutes I need to stretch my legs and get a coffee. And who would tell the team this could be thirty seconds with working hot reload? Not this thirsty dev.

But sometimes, just sometimes, there's some juicy little piece of craft and artistry that tickles us and gets us in the mood for some actual thought-based coding. That for me has recently become a mysterious trick to make any site _instant_.

I'm talking about making it _theoretically fast_...

Here's the thing about TCP: no one gives a shit about it until they want to play a round of code golf because they have given up their downtime hobbies in favour of blogging about technology after a hard day working with it. But just maybe sometimes we should. The first packet you get is roughly **14KB**, then the network has to get busy again before sending more. This costs time—real, measurable time. Latency that even the most out of touch of us care about. So I made a rule for my own portfolio site (where you may or may not be reading this): **if it doesn't fit in 14KB, it doesn't go anywhere.**

This has the benefit of making the site feel swifter than Hacker News, that tool catalogue people harp on about, and Berkshire Hathaway (plus I have actual text content on mine...). There are small, smart optimisations to have in our back pocket as developers, doesn't matter what framework. Things like eager loading on hover, creating front-end search indices, gzipping assets, subsetting fonts. These are all small tokens of attention being paid. Of testing having occurred. Taking the debug symbols out is the _least_ you can do for your users, but sometimes our abstractions have lulled us into forgetting we have responsibilities. There are about a million more I could make in my build script but right now it's earning its keep. In fact, the process can become endless and obsessive. Putting a little lipstick on the pig never hurt anyone though. That one constraint was enough, especially after stripping out the UTF-8 bloatware from my font binary to find that it was 18KB, an unacceptable behemoth that would find no home on my server.

And fine, I'll admit it. You may see the emojis in the build script. I got Claude to spit it out for me! And why not? I know what I want it to do and it does it. It turns my nice readable markdown into HTML. It minifies my assets, it zips everything up. It's very capable of doing that, just as much as it is writing CSS to about the same level as me (i.e., almost well enough). This is the beauty of knowing where to optimise. You can prompt for the tedious bits, and your fingers never have to hunt for brackets—you can just use English.

I could trim more fat, but I don't need to. **The data literally will not be broken down anymore.** This is as small as it gets.

That's the point. We can still pick our battles. I'm not talking about hand-sanding walnut with beeswax from Bhutan. I'm talking about running a circular saw through your build output and seeing what sticks.

So yes, this site is fast. _Almost_ theoretically so. Fits in **one TCP packet**. Loads in **tens of milliseconds**. Some number of 9s as the percentile.

Yet there is **someone** faster...
