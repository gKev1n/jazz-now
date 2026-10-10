// One step-sequenced groove per style, written from each track's meta (meter / BPM / key).
// `play` is called once per step with the exact audio time `t`; `d` is the step length.
import type { Kit } from './synth'

export interface Pattern {
  stepDur: number
  steps: number
  /** steps that count as a felt beat (drives the beat dot / LED) */
  beats: number[]
  /** delay applied to odd steps, as a fraction of a step */
  swing?: number
  play(k: Kit, s: number, bar: number, t: number, d: number): void
}

const sixteenth = (bpm: number) => 60 / bpm / 4
const at = (list: number[], s: number) => list.includes(s)

// ── 01 MATH JAZZ · 7/8 · 167 · E lydian ─────────────────────
// 7 eighths grouped 2+2+3, kept deliberately plain so the odd meter is easy to follow:
// kick on each group start, one backbeat, an up-and-down tapped arpeggio on eighths,
// and accented hats marking the uneven 2+2+3 grouping.
// Chords change every 2 bars. (14 sixteenth steps; only even steps = eighths are used.)
const MATH_CHORDS = [
  [64, 68, 71, 75, 78], // Emaj7#11 colour (E G# B D# A#)
  [61, 64, 68, 71, 75], // C#m9
  [57, 61, 64, 68, 71], // Amaj9
  [59, 63, 66, 70, 73], // Bmaj7(9)
]
const MATH_ARP = [0, 1, 2, 3, 4, 3, 2] // one note per eighth: up, then back down
const MATH_ROOT = [40, 37, 33, 35]
const math: Pattern = {
  stepDur: sixteenth(167), steps: 14, beats: [0, 4, 8],
  play(k, s, bar, t, d) {
    if (s % 2) return
    const e = s / 2 // eighth 0..6
    const b = Math.floor(bar / 2) % 4
    if (s === 0 || s === 8) k.kick(t, s === 0 ? 1 : 0.8)
    if (s === 4) k.snare(t, 0.8)
    // accented hats on the 2+2+3 group starts carry the 'accent' voice (lights the 2+2+3 chip)
    if (at([0, 4, 8], s)) k.hat(t, 0.38, false, 'accent')
    else k.hat(t, 0.18)
    k.pluck(t, MATH_CHORDS[b][MATH_ARP[e]] + 12, at([0, 4, 8], s) ? 0.7 : 0.5)
    if (s === 0 || s === 8) k.bass(t, MATH_ROOT[b], d * (s === 0 ? 7 : 5), 0.8)
    if (s === 0 && bar % 2 === 0) k.ep(t, MATH_CHORDS[b].slice(0, 4).map((x) => x - 12), d * 27, 0.35, 'pad')
  },
}

// ── 02 HYPER PIANO TRIO · 4/4 · 150 · C minor ─────────────────
// Three bars of unison eighth-note runs (piano + bass), then a bar of kime (band stabs + rests).
// Tempo stays 150 as labelled; runs are eighths (5 notes/s) rather than 16ths so it isn't frantic.
const CMIN = [48, 50, 51, 53, 55, 56, 59] // C D Eb F G Ab B (harmonic minor)
const deg = (i: number) => CMIN[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7)
const RUNS = [
  [7, 9, 11, 13, 14, 12, 10, 8],
  [9, 10, 11, 12, 13, 12, 11, 10],
  [14, 13, 12, 11, 10, 11, 12, 14],
]
const hyper: Pattern = {
  stepDur: sixteenth(150), steps: 16, beats: [0, 4, 8, 12],
  play(k, s, bar, t, d) {
    const b = bar % 4
    if (b < 3) {
      if (s === 0 || s === 8 || (b === 1 && s === 10)) k.kick(t)
      if (s === 4 || s === 12) k.snare(t)
      if (s % 2 === 0) k.hat(t, 0.32)
      if (b === 0 && s === 0) k.crash(t, 0.5)
      if (s % 2 === 0) {
        const n = deg(RUNS[b][s / 2])
        k.piano(t, [n + 12], d * 2.4, 0.75, 'run')
        k.bass(t, n - 12, d * 1.8, 0.55, 'run')
      }
    } else {
      // kime: everyone hits together, silence in between
      if (at([0, 3, 6, 10, 12], s)) {
        k.kick(t, 1, 'kime')
        k.crash(t, 0.45)
        k.piano(t, [60, 63, 67, 70, 74], d * 2, 0.9, 'kime')
        k.bass(t, 36, d * 1.5, 0.9, 'kime')
      }
      if (s === 14 || s === 15) k.snare(t, 0.7 + (s - 14) * 0.2)
    }
  },
}

// ── 03 JUNGLE JAZZ · 174 · Fm ────────────────────────────────
// Chopped break, sub bass, Rhodes pads and a sax phrase every 4 bars.
const JUNGLE_CH = [
  [53, 56, 60, 63, 67], // Fm9
  [53, 56, 60, 63, 67],
  [49, 53, 56, 60, 63], // Dbmaj9
  [51, 55, 58, 62, 65], // Eb6/9
]
const SAX: [number, number, number][] = [
  [0, 72, 3], [4, 75, 2], [6, 77, 6], [12, 75, 2], [14, 72, 2],
]
const jungle: Pattern = {
  stepDur: sixteenth(174), steps: 16, beats: [0, 4, 8, 12],
  play(k, s, bar, t, d) {
    const b = bar % 4
    if (s === 0 || s === 10 || (b % 2 && s === 2)) k.kick(t)
    if (s === 4 || s === 12 || (b === 3 && s === 14)) k.snare(t, 0.95)
    if (at([7, 9, 15], s)) k.snare(t, 0.28, 'ghost')
    k.hat(t, s % 2 ? 0.14 : 0.24)
    if (s === 0) k.bass(t, JUNGLE_CH[b][0] - 24, d * 15, 0.9)
    if (s === 0 || s === 11) k.ep(t, JUNGLE_CH[b], d * (s === 0 ? 10 : 5), s === 0 ? 0.6 : 0.4)
    if (b === 1) for (const [st, n, len] of SAX) if (st === s) k.sax(t, n, d * len, 0.65)
  },
}

// ── 04 BROKEN BEAT · 122 · Fm ────────────────────────────────
// Displaced kick/snare, offbeat Rhodes stabs, syncopated bass, horn stabs on bar 4.
const BB_CH = [
  [53, 56, 60, 63, 67], // Fm9
  [58, 61, 65, 68, 72], // Bbm9
  [53, 56, 60, 63, 67],
  [56, 60, 63, 67, 70], // Abmaj9
]
const BB_BASS: [number, number][] = [[0, 0], [3, 7], [6, 12], [10, 0], [13, 10]]
const broken: Pattern = {
  stepDur: sixteenth(122), steps: 16, beats: [0, 4, 8, 12],
  play(k, s, bar, t, d) {
    const b = bar % 4
    if (at([0, 6, 11], s) || (b % 2 && s === 14)) k.kick(t, s === 0 ? 1 : 0.85)
    if (s === 4 || s === 13) {
      k.snare(t, 0.85)
      k.clap(t, 0.5)
    }
    if (s === 9) k.snare(t, 0.25, 'ghost')
    if (s % 2 === 0) k.hat(t, 0.22, s === 10)
    if (s === 3 || s === 7 || (b % 2 === 0 && s === 14)) k.ep(t, BB_CH[b], d * 1.6, 0.55)
    for (const [st, iv] of BB_BASS) if (st === s) k.synthBass(t, BB_CH[b][0] - 24 + iv, d * 2, 0.75)
    if (b === 3 && (s === 8 || s === 11)) for (const n of [68, 72, 75]) k.horn(t, n, d * (s === 8 ? 2 : 4), 0.55)
  },
}

// ── 05 NEO-SOUL JAZZ · 84 · Ab ───────────────────────────────
// Drunk, swung 16ths; snare dragged late; lush 9th chords; gliding synth bass.
const NS_CH = [
  [56, 60, 63, 67, 70], // Abmaj9
  [53, 56, 60, 63, 67], // Fm9
  [49, 53, 56, 60, 63], // Dbmaj9
  [51, 55, 58, 61, 65], // Eb9
]
const NS_BASS: [number, number, number][] = [[0, 0, 6], [7, 7, 3], [10, 12, 5]]
const neosoul: Pattern = {
  stepDur: sixteenth(84), steps: 16, beats: [0, 4, 8, 12], swing: 0.22,
  play(k, s, bar, t, d) {
    const b = bar % 4
    const late = 0.032 // laid-back pocket
    if (at([0, 7, 10], s) || (b % 2 && s === 3)) k.kick(t, 0.9)
    if (s === 4 || s === 12) k.snare(t + late, 0.75)
    if (s % 2 === 0) k.hat(t + (Math.random() - 0.5) * 0.01, s % 4 ? 0.12 : 0.2)
    if (s === 0) k.ep(t, NS_CH[b], d * 9, 0.7)
    if (s === 10) k.ep(t, NS_CH[b].slice(1), d * 5, 0.4)
    const root = NS_CH[b][0] - 24
    for (const [st, iv, len] of NS_BASS) if (st === s) k.synthBass(t, root + iv, d * len, 0.7, s === 7 ? root : undefined)
  },
}

// ── 06 NU JAZZ · 122 · Dm ────────────────────────────────────
// Four-on-the-floor, offbeat open hats, piano comping, vibraphone arpeggios.
const NU_CH = [
  [50, 53, 57, 60, 64], // Dm9
  [55, 59, 64, 65, 69], // G13
  [46, 50, 53, 57, 60], // Bbmaj7
  [45, 49, 55, 58, 61], // A7(b9)
]
const nu: Pattern = {
  stepDur: sixteenth(122), steps: 16, beats: [0, 4, 8, 12],
  play(k, s, bar, t, d) {
    const b = bar % 4
    if (s % 4 === 0) k.kick(t)
    if (s === 4 || s === 12) k.clap(t, 0.65)
    if (s % 4 === 2) k.hat(t, 0.28, true)
    else k.hat(t, 0.1)
    if (s % 4 === 2) k.bass(t, NU_CH[b][0] - 12, d * 1.5, 0.75)
    if (s === 0 || s === 6 || s === 10) k.piano(t, NU_CH[b].map((n) => n + 12), d * (s === 0 ? 5 : 2), s === 0 ? 0.65 : 0.45)
    if (s % 2 === 0) {
      const tones = NU_CH[b].map((n) => n + 24)
      k.vibes(t, tones[(s / 2) % tones.length], d * 2, s % 4 ? 0.4 : 0.6)
    }
  },
}

// ── 07 AFRO JAZZ · 12/8 · 100 (dotted quarter) · D minor ──────
// Standard 12/8 bell, shaker, conga-ish toms, piano ostinato, horn call every 2 bars.
// 24 steps = 12 eighths × 2.
const BELL = [0, 2, 4, 5, 7, 9, 11]
const AFRO_RIFF = [62, 65, 69, 65, 62, 65, 60, 64, 67, 64, 60, 64]
const AFRO_BASS: [number, number][] = [[0, 38], [3, 45], [6, 38], [9, 36]]
const AFRO_HORN: [number, number, number][] = [[0, 69, 3], [3, 72, 2], [6, 74, 5]]
const afro: Pattern = {
  stepDur: 60 / 100 / 6, steps: 24, beats: [0, 6, 12, 18],
  play(k, s, bar, t, d) {
    if (s % 2) return
    const e = s / 2 // eighth index 0..11
    if (BELL.includes(e)) k.bell(t, e === 0 ? 84 : 86, e === 0 ? 0.8 : 0.55)
    if (e === 0 || e === 6 || (bar % 2 && e === 9)) k.kick(t, 0.85)
    k.shaker(t, e % 3 === 0 ? 0.6 : 0.35)
    if (e === 3 || e === 10) k.tom(t, 120, 0.5, 'drum')
    if (e === 8) k.tom(t, 190, 0.45, 'drum')
    k.piano(t, [AFRO_RIFF[e]], d * 2.2, 0.5)
    for (const [st, n] of AFRO_BASS) if (st === e) k.bass(t, n, d * 5, 0.8)
    if (bar % 2 === 1) for (const [st, n, len] of AFRO_HORN) if (st === e) k.horn(t, n, d * 2 * len, 0.6)
  },
}

// ── 08 CHOPS FUSION · 100 · Eb ───────────────────────────────
// Syncopated groove, 32nd-note snare/tom fills at the end of every other bar,
// busy filter-swept synth bass, pentatonic lead runs.
const EB_PENT = [63, 65, 67, 70, 72, 75, 77, 79, 82, 84]
const CH_BASS: [number, number][] = [[0, 39], [2, 51], [3, 49], [6, 39], [8, 46], [10, 51], [11, 49], [14, 44]]
const chops: Pattern = {
  stepDur: sixteenth(100), steps: 16, beats: [0, 4, 8, 12],
  play(k, s, bar, t, d) {
    const b = bar % 4
    const fill = bar % 2 === 1 && s >= 12
    if (at([0, 3, 8], s) || (b % 2 === 0 && s === 10)) k.kick(t)
    if (!fill) {
      if (s === 4 || s === 12) k.snare(t)
      k.hat(t, s % 2 ? 0.12 : 0.22)
    } else {
      const toms = [210, 170, 135, 105]
      for (const off of [0, 0.5]) {
        const i = (s - 12) * 2 + (off ? 1 : 0)
        if (i % 3 === 0) k.snare(t + off * d, 0.5 + i * 0.05, 'fill')
        else k.tom(t + off * d, toms[Math.floor(i / 2)], 0.55, 'fill')
      }
    }
    for (const [st, n] of CH_BASS) if (st === s) k.synthBass(t, n, d * 1.3, 0.8, st === 3 || st === 11 ? n + 2 : undefined)
    if (s === 0) k.ep(t, [51, 55, 58, 62, 65], d * 14, 0.3, 'pad')
    if (b === 2) k.lead(t, EB_PENT[s % 10] + (s >= 10 ? 0 : 12), d * 0.9, 0.6)
    if (b === 0 && (s === 0 || s === 6)) k.lead(t, s === 0 ? 82 : 79, d * (s === 0 ? 5 : 8), 0.55)
  },
}

export const PATTERNS: Pattern[] = [math, hyper, jungle, broken, neosoul, nu, afro, chops]
