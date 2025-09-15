---
title: Ambrosia - A Corner of the Quiet Internet 
slug: ambrosia-quiet-internet-corner
date: 2025-09-15
description: Ambrosia is a project designed to help empower people to craft their own intentional community space.
lead: Ambrosia is a project designed to help empower people to craft their own intentional community space.
ags: [self-hosting, gemini-protocol, dev-tooling]
---

There's something awesomely liberating about owning your own corner of the internet—truly owning it, understanding every component, and knowing it won't disappear at the whim of a platform or algorithm. This desire for digital sovereignty led me to discover Gemini, a protocol that recaptures the intentional, collaborative spirit of the early web without the bloat, surveillance, and environmental costs of modern HTTP.

## Rediscovering Purpose in Protocol Design

Gemini sits beautifully between Gopher's minimalism and the web's capabilities. It's heavier than Gopher but lighter than HTTP, striking what its creators call "maximum power to weight ratio." For me, it represents something more fundamental: the internet of my childhood, where content mattered more than engagement metrics, where pages loaded instantly, and where you could genuinely understand the technology beneath your fingertips.

The protocol's constraints are its strength. No cookies, no JavaScript, no tracking pixels—just pure content delivery over TLS. It's impossible to build surveillance capitalism on Gemini, and that's entirely the point. Every design decision reflects what I call "technical choices with moral dimensions." When you remove the ability to harvest attention, you're left with something radical: genuine human communication.

## Why Ambrosia Exists

The Gemini ecosystem already has excellent servers like Agate and Molly Brown. Ambrosia exists not because they're inadequate, but because I fell in love with the Erlang VM's approach to fault tolerance. Building software that simply doesn't crash, that handles thousands of concurrent connections without breaking a sweat, and that recovers gracefully from failures—this is what the BEAM was designed for.

Ambrosia embodies the "set and forget" philosophy that Gemini deserves. Drop it on a VPS with your content, and it scales quietly from personal capsule to community hub. The supervision trees ensure that if something fails, only that component restarts whilst everything else continues serving. It's infrastructure you can truly understand and trust.

## The Joy of Intentional Computing

Working on Ambrosia has been a masterclass in purposeful development. Using test-driven development to explore security concerns like path traversal attacks transformed what could have been tedious security work into an engaging puzzle. Every feature serves a clear purpose; every constraint forces better design decisions.

The environmental implications matter too. Gemini pages load in milliseconds, consume minimal bandwidth, and run efficiently on modest hardware. Ambrosia typically uses just 75-100MB of memory whilst serving thousands of users. Compare this to modern web applications that consume gigabytes just to display text. We can build a more sustainable digital future—we simply choose not to.

## Owning Your Digital Presence

There's profound satisfaction in publishing to your own Gemini capsule. No character limits, no algorithmic suppression, no sudden policy changes that make your content disappear. Just you, your thoughts, and readers who've made the intentional choice to visit your space.

The friction is feature, not bug. Gemini clients require deliberate installation and use. This filters for engaged, curious individuals rather than scroll-addicted consumers. The conversations that emerge in Geminispace reflect this intentionality—thoughtful, substantive, human.

The technical simplicity means you're never more than an SSH session away from complete control over your content and infrastructure. Update via rsync, deploy with Docker, monitor with simple tools you understand. No complex build pipelines, no vendor lock-in, no mysterious scaling costs.

## The Quiet Revolution

Gemini won't replace the web, nor should it. Instead, it offers something precious: a refuge for intentional computing, collaborative discovery, and genuine digital ownership. It's proof that we can choose different values in our technology stack—sustainability over growth, understanding over complexity, intention over engagement.

Building Ambrosia has reinforced my belief that we can create technology that serves human flourishing rather than corporate extraction. Every line of code is a small act of resistance against surveillance capitalism, every design decision a vote for the internet we want to inhabit.

If you're curious about experiencing this quieter internet, I'd love to help you get started with your own Gemini capsule. The water's lovely once you dive in.

---

*Fancy exploring Geminispace? Drop me a line and I'll help you set up your first capsule, or visit my corner of the quiet internet to see what intentional computing looks like in practice.*
