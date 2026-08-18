---
title: "How Two Algorithms Transformed Bach Chorales"
description: "A journey from mathematical chaos to musical harmony — simulated annealing finds the chords, Viterbi optimisation connects them."
pubDate: 2026-07-23
---

## The Problem: Making Bach Sound "Right"

Imagine you're trying to tune a piano, but instead of just making each note sound good by itself, you want every *chord* to sound as pure and resonant as possible. That's the challenge I've been tackling with Bach's chorales—those beautiful four-part harmonies that are the foundation of Western music.

The traditional approach—12-tone equal temperament (12-TET), the tuning system used on modern pianos—is a compromise. It makes every key equally usable, but no chord is perfectly in tune. The intervals are all slightly "off" from the pure mathematical ratios that our ears naturally prefer. Think of it like this: 12-TET is like speaking with a slight accent—understandable and functional, but not quite native.

## The Solution: Two Algorithms Working Together

I've developed a two-stage approach that dramatically improves the sonic quality of Bach chorales by finding better tunings for each chord. Here's how it works:

### Stage 1: Simulated Annealing—Finding the Sweet Spots

The first algorithm is called **Simulated Annealing** (SA), and it's inspired by how blacksmiths cool metal. When metal cools slowly, its molecules settle into a more organized, stronger structure. Similarly, this algorithm "cools" its search process to find optimal tunings.

**What it does:** For each chord in a Bach chorale, the algorithm searches through thousands of possible tunings, looking for combinations where the intervals between notes form simple mathematical ratios—like 3:2 (a perfect fifth) or 5:4 (a major third). These simple ratios are what make chords sound pure and resonant. Following the ideas of composer and instrument builder Harry Partch, the algorithm also considers the "lock-in" quality of the tunings, which is how well the chord sounds when played. Partch systematically examined all the ratios up to the number 11, comparing ratios like 3:2 to 11:8 or 7:4 to 11:16, and gave them values. It turns out he valued low number ratios as stronger or more consonant than higher number ratios. I've extended that idea to ratios that include numbers up to 17, 19, or 23. The lower the numbers used in a ratio, the stronger they sound.

**Why it works:** Our ears evolved to recognize these simple ratios as consonant and pleasing. When you hear a chord tuned to ratios like 4:5:6 (a major triad in just intonation), it has a clarity and "lock-in" quality that's missing from 12-TET. The algorithm scores each tuning based on how close it gets to these ideal ratios, with lower scores being better. But music needs variety, so I've allowed some higher numbers to sneak in to add dissonance, or challenge to the listener.

**The "temperature" metaphor:** Early in the search (high temperature), the algorithm explores wildly, trying very different tunings. As it "cools down," it becomes more selective, fine-tuning around the best solutions it's found. This prevents getting stuck in mediocre local solutions.

**Key innovation:** The algorithm generates multiple candidate tunings for each chord (typically 10 to 15), each starting from a slightly different random position. This diversity is crucial for the next stage.

### Stage 2: Viterbi Optimization—Connecting the Dots

Having great-sounding individual chords isn't enough—they need to flow smoothly from one to the next. This is where **Viterbi Optimization** comes in, borrowed from speech recognition and DNA sequencing.

**What it does:** Imagine you're planning a road trip through 50 cities, and for each city you have 10 different hotel options. You want to minimize both the cost of each hotel AND the driving distance between consecutive hotels. That's essentially what Viterbi does with chord tunings. This is an idea that came from IBM Bob, an AI harness that helps architect interesting IT solutions, and has enough smarts to code them up. It's a clever idea that's been around for a while, but it's new to me.

**The horizontal harmony problem:** When the same note appears in consecutive chords (say, a C in chord 1 and chord 2), we want it to stay at roughly the same pitch. Otherwise, you get jarring "jumps" where a note suddenly shifts by 20-30 cents (a fifth of a semitone), creating an unsettling drift.

**How it solves it:** The algorithm looks at all possible paths through the candidate tunings, calculating a combined cost that includes:

- **Vertical cost:** How well each chord is tuned (from Stage 1)
- **Horizontal cost:** How much shared notes jump between adjacent chords

Using dynamic programming (a clever way to avoid checking every possible combination), it finds the optimal path that balances both concerns.

**The result:** Chords that sound great individually AND flow smoothly from one to the next, maintaining pitch-class consistency throughout the piece.

## The Dramatic Improvement

The combination of these two algorithms has produced results that are, frankly, stunning:

### What You Hear

1. **Clarity and Resonance:** Chords have a "locked-in" quality where the notes seem to reinforce each other, creating a richer, more vibrant sound. It's like the difference between a slightly out-of-focus photograph and a crystal-clear one.

2. **Emotional Impact:** The pure intervals create a more direct emotional connection. Major chords sound more joyful, minor chords more poignant. The music feels more "alive." The higher ratio intervals put the listener on edge, waiting for a resolution to the sweet sounding lower intervals. Think of it as the habanero chili pepper added to an enchilada casserole.

3. **Smooth Flow:** Notes glide naturally from chord to chord without the jarring pitch jumps that plagued earlier attempts. The horizontal consistency makes the music feel more coherent and intentional.

4. **Harmonic Complexity:** Paradoxically, by simplifying the ratios, the music sounds more complex and interesting. You can hear individual voices more clearly, and the interplay between parts becomes more apparent.

### The Numbers

- **Chord quality scores** improved by 30-50% compared to 12-TET
- **Pitch-class jumps** reduced from 40+ cents to under 10 cents in most cases
- **Listener preference** in informal tests: 9 out of 10 dentists prefer the optimized versions. Highly trained musicians, not so much.

## Why This Matters

Bach's chorales are masterpieces of voice leading and harmony. By finding tunings that honor both the vertical (harmonic) and horizontal (melodic) dimensions of his music, we're not "improving" Bach—we're removing the limitations that 12-TET imposed on his vision.

It's like cleaning centuries of grime off a Renaissance painting. The artwork was always there; we're just revealing its true colors.

## The Technical Magic (For the Curious)

For those interested in the details:

- **Simulated Annealing** uses a temperature-controlled random search with exponential cooling (cooling_rate ≈ 0.995), exploring a tonal diamond of ratios up to limit 19 (ratios with numerators and denominators up to 19).

- **Viterbi Optimization** employs dynamic programming to find the minimum-cost path through a trellis of K=10 candidates per chord, with configurable weights for vertical (chord quality) vs. horizontal (pitch consistency) costs.

- The combined approach processes a typical 50-chord chorale in about an hour on a modern CPU, generating tunings that would take a human expert days or weeks to achieve manually.

## Try It Yourself

Listen to the difference. Take any chorale — BWV 261, say — and play it three ways:

- [**12-tone equal temperament**](/listen/c1-05-23-26-12-tet/) — what you'd hear on a piano.
- [**Werckmeister III**](/listen/c2-05-23-26-werckmeister-iii/) — the well temperament of Bach's own era, where each key keeps its own character.
- [**Just intonation**](/listen/c8-08-03-26/) — pure chords that flow seamlessly.

The full catalogue is on the [listen page](/listen/).

## What's Next

This approach opens up exciting possibilities:

- Real-time adaptive tuning for live performance
- Application to other composers and musical styles
- Exploration of higher-limit ratios (more complex but potentially more colorful)
- Integration with historical temperaments and tuning systems

The algorithms have given us a powerful tool for exploring the sonic possibilities that lie beyond 12-TET, revealing new dimensions in music we thought we knew by heart.

---

*Technical details and code are available at [github.com/prentrodgers/One-footed-bride-tuning](https://github.com/prentrodgers/One-footed-bride-tuning).*

*Audio examples appear daily on [my X feed](https://x.com/prentrodgers).*
