// One rAF loop for every continuous effect (record spin, reels, bars, beat dot, progress,
// groove-reactive visuals). React owns *discrete* state (scene / playing); the engine owns
// per-frame values and writes straight to DOM refs, so 60fps updates never re-render React.
//
// Rhythm comes from the audio sequencer: each frame we drain the note events whose audio
// time has reached the speakers, so every visual hit lands with the sound that caused it.
import { BANDS, audio } from './audio'
import { TRACKS } from './data'
import { SPIN_TAU, TRACK_MS } from './tokens'

export type Tick = (dt: number, e: Engine) => void

/** per-voice envelope decay rate (1/s) — drums snap, sustained voices glow longer */
const DECAY: Record<string, number> = { kick: 9, snare: 10, beat: 7, bar: 4, keys: 4, pad: 3, horn: 4, sax: 4, vibes: 5, bass: 6 }

export class Engine {
  playing = false
  /** index into TRACKS of the active track, -1 on intro/outro */
  current = -1
  /** the deck is ready to sound: needle down (vinyl) or deck landed (cassette) */
  ready = false
  progress: number[] = TRACKS.map(() => 0)
  /** smoothed 0..1 motor speed (spin-up / spin-down inertia) */
  spin = 0
  /** beats elapsed, and a 0..1 decaying pulse on each felt beat */
  beats = 0
  pulse = 0
  /** 0..1 envelopes keyed by synth voice ('kick', 'keys', 'bell', …) */
  hits: Record<string, number> = {}
  /** 0..1 position inside the current bar (drives the rule playhead) */
  barPhase = 0
  /** 0..1 loudness and per-band spectrum from the analyser */
  level = 0
  spectrum = new Float32Array(BANDS)
  /** spectrum is real analyser data (false → fall back to synthetic bars) */
  hasSpectrum = false
  reduced = false
  onTrackEnd: (() => void) | null = null

  private subs = new Set<Tick>()
  private last = 0
  private raf = 0
  private ended = false
  private barStart = 0

  constructor() {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      this.reduced = mq.matches
      mq.addEventListener?.('change', (ev) => (this.reduced = ev.matches))
    }
  }

  subscribe(fn: Tick) {
    this.subs.add(fn)
    if (!this.raf) this.start()
    return () => void this.subs.delete(fn)
  }

  setTrack(i: number) {
    if (i === this.current) return
    this.current = i
    this.ready = false
    this.ended = false
    // a finished track restarts when revisited; a partially played one resumes
    if (i >= 0 && this.progress[i] >= 1) {
      this.progress[i] = 0
      audio.resetPosition(i)
    }
  }

  setPlaying(p: boolean) {
    this.playing = p
    if (!p) this.ready = false // needle lifts / deck stops: must re-arm before sound returns
  }

  /** called by the deck once it can sound (needle down / cassette landed).
   *  Not gated on `playing`: child effects run before App's setPlaying(true) in the same commit. */
  setReady(i: number) {
    if (i === this.current) this.ready = true
  }

  hit(v: string) {
    return this.hits[v] ?? 0
  }

  get elapsedMs() {
    return this.progress.reduce((a, p) => a + p, 0) * TRACK_MS
  }

  private start() {
    this.last = performance.now()
    const loop = (now: number) => {
      // clamp so a backgrounded tab doesn't fast-forward on return
      const dt = Math.min(0.1, (now - this.last) / 1000)
      this.last = now
      this.step(dt)
      this.subs.forEach((fn) => fn(dt, this))
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  private step(dt: number) {
    const target = this.playing && this.current >= 0 ? 1 : 0
    this.spin += (target - this.spin) * (1 - Math.exp(-dt / SPIN_TAU))
    if (this.spin < 0.001) this.spin = 0

    const sounding = this.playing && this.ready && this.current >= 0
    audio.drive(sounding ? this.current : -1)

    // decay every envelope, then apply the hits that just became audible
    for (const k in this.hits) this.hits[k] *= Math.exp(-dt * (DECAY[k] ?? 8))
    const now = audio.now()
    for (const ev of audio.drain(now)) {
      this.hits[ev.v] = 1
      if (ev.v === 'beat') {
        this.pulse = 1
        this.beats++
      } else if (ev.v === 'bar') this.barStart = ev.t
    }
    this.pulse *= Math.exp(-dt * 7)
    this.barPhase = sounding ? Math.min(1, Math.max(0, (now - this.barStart) / audio.barDur)) : 0

    const lv = audio.analyse(this.spectrum)
    this.hasSpectrum = lv >= 0
    this.level += ((lv >= 0 ? lv : 0) - this.level) * (1 - Math.exp(-dt * 12))

    if (sounding) {
      this.progress[this.current] = Math.min(1, this.progress[this.current] + (dt * 1000) / TRACK_MS)
      if (this.progress[this.current] >= 1 && !this.ended) {
        this.ended = true
        this.onTrackEnd?.()
      }
    }
  }
}

export const engine = new Engine()
