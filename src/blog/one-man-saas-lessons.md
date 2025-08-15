---
title: Why I Over-Engineered My MVP (And You Should Too)
slug: one-man-saas-journey
date: 2025-08-15
description: Discover why I 'over-engineered' my latest SaaS, saving my time and headaches in the future.
lead: Using the right tools and a little forethought is a compounding reward
tags: [performance, optimisation, saas, elixir]
---

Building my waitlist SaaS solo, I had an unfair advantage: I'd already lived through the pain of retrofitting half-baked features into production systems. Having spent years fixing other people's "we'll think about that later" decisions, I knew exactly which corners not to cut.

This is how I built Clamber with the boring bits done properly and still shipped fast and lean.

## The Audit Trail Nobody Wants to Build

Something that keeps me up at night as a solo developer is my responsibility for customer data. I've seen too many codebases with authentication bolted on as an afterthought, user actions vanishing into the void, and zero ability to investigate when something goes wrong.

**So this time:** I built comprehensive security auditing from day one. Every OAuth login, every failed password attempt, gets tracked with a security context module. Not because it's exciting to implement, but because "we have no logs" isn't something you want to tell customers after a breach.

When someone asks about our security practices, I can truthfully say, I have security logging and compliance concerns at heart.

## Performance Monitoring: More Than "It Works on My Machine"

I work with software that has zero visibility into its own health every day. It makes refactoring a gamble, debugging a nightmare, and performance work something everyone avoids. I wanted to know—really know—how my system performed in production.

**So this time:** I built on the basic telemetry of Phoenix. API response times, cache hit rates, database query performance. Real numbers, not guesses. I cache a lot of api context for great performance from day one. It saves on cloud bills.

When prospects ask "What's your uptime?" I don't hand-wave. I show them the status page. When something's slow, I know exactly where and why. It turns out users appreciate transparency about performance as much as the performance itself.

## Documentation as a Feature, Not an Afterthought

As a solo developer, I'm also the entire support team. And honestly? I'm rubbish at support as I'm too busy building. But I want users to succeed with my product without needing to chase me down.

**So this time:** I treated documentation like a core feature. Empty states show contextual getting-started guides. API examples use the customer's actual API key and domain. Error messages explain what went wrong *and how to fix it*.

I wrote docs by walking through my own user journey, repeatedly. And I am still refining them! Every confusion I hit became a clarification in the docs. Every setup step I might forget got documented.

The result? Documentation became a sales tool. Prospects can evaluate the entire integration before signing up. Customers can onboard themselves. It's the compound interest of good documentation, every hour spent writing saves ten hours of support.

## Choosing Tools That Scale

Here's where I admit this whole article is really about why Phoenix and Elixir changed everything for me. The framework is opinionated in exactly the right ways. LiveView makes real-time features trivial. ETS gives you caching that just works. The BEAM gives you fault tolerance and concurrency that would cost a fortune to build in most stacks.

Building these "enterprise" features wasn't a months-long slog—it was a few days of enjoyable work. Rate limiting? There's a pattern for that. Background jobs? GenServers have you covered. Need to handle a million users? Same deployment, just bigger servers.

The crucial insight isn't which features to build—it's choosing tools that make the right features easy.

## The Maths of Building It Right

Building audit logging into an empty codebase: one day.  
Retrofitting it into a live system: months of careful migration.

Adding rate limiting with no traffic: an afternoon.  
Adding it during a DDoS: panic, downtime, and apologies.

Designing for multi-tenancy with zero customers: slightly abstract but straightforward.  
Reshaping single-tenant data later: migration scripts, edge cases, and prayer.

The pattern is clear: early implementation is measured in days, later retrofitting in months—if you survive it.

## What This Really Means for Solo Developers

If you're building your first SaaS, you can't afford to learn these lessons the hard way. But you can steal from those who have:

**Build security properly from the start.** Not because you'll get hacked tomorrow, but because "move fast and break things" shouldn't include breaking trust.

**Make your system observable.** You can't fix what you can't measure, and you can't improve what you don't understand.

**Document as you build.** Future you is your most important user, and current you is the only one who knows how it actually works.

**Choose enjoyable, powerful tools.** The exciting part should be your product, not wrestling with your stack.

The counterintuitive truth: building these "enterprise" features early makes solo development easier, not harder. You're not over-engineering; you're front-loading the complexity you'd face anyway, when it's still simple to implement.

Will I ever need audit logs for millions of users? Probably not. But I sleep better knowing they're there. And more importantly, I build faster knowing I won't have to retrofit them later.

I've spent time fixing other's shortcuts. For myself, I chose a different kind of complexity: the kind that makes tomorrow's problems easier to solve, not today's problems harder to find.

I built the SaaS I'd be happy to inherit!
