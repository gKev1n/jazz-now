// Look-ahead step sequencer on the AudioContext clock ("A Tale of Two Clocks"):
// a 25ms timer schedules notes ~120ms ahead with sample-accurate times; each note also
// queues a visual event at that same time, which the rAF engine drains when the audio
// clock reaches it. Sound and picture therefore share one timeline.
import { TRACKS } from '../data'
import { PATTERNS } from './patterns'
import { Kit } from './synth'

const LOOKAHEAD = 0.12
const TICK_MS = 25
export const BANDS = 40
const MUTE_KEY = 'jazz-now:muted'

export interface AudioEvent {
  t: number
  v: string
}

class AudioEngine {
  ctx: AudioContext | null = null
  private mix: AudioNode | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private fft = new Uint8Array(0)
  private wave = new Float32Array(0)
  private bins: [number, number][] = []

  muted = false
  track = -1
  running = false
  /** running without sound (no Web Audio): visual events only, on performance.now() */
  silent = false
  barDur = 1

  private bus: GainNode | null = null
  private stopBed: ((at: number) => void) | null = null
  private kit: Kit | null = null
  private timer = 0
  private nextT = 0
  private step = 0
  private bar = 0
  private pos = new Map<number, { step: number; bar: number }>()
  private queue: AudioEvent[] = []
  private muteSubs = new Set<(m: boolean) => void>()

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      /* default: sound on */
    }
    if (typeof document !== 'undefined') {
      // rAF (and so the visuals / progress) stops in a background tab — pause sound with it
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return
        if (document.hidden) void this.ctx.suspend()
        else void this.ctx.resume()
      })
    }
  }

  /** Must run inside a user gesture the first time (autoplay policy). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      try {
        this.build(new AC({ latencyHint: 'interactive' }))
      } catch {
        return
      }
    }
    if (this.ctx!.state === 'suspended' && !document.hidden) void this.ctx!.resume()
  }

  private build(ctx: AudioContext) {
    this.ctx = ctx
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.ratio.value = 3.5
    comp.attack.value = 0.004
    comp.release.value = 0.2
    const an = ctx.createAnalyser()
    an.fftSize = 2048
    an.smoothingTimeConstant = 0.72
    an.minDecibels = -92
    an.maxDecibels = -22
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : 0.9
    // analyser sits before the mute so the visuals keep moving when muted
    comp.connect(an).connect(master).connect(ctx.destination)
    this.mix = comp
    this.analyser = an
    this.master = master
    this.fft = new Uint8Array(an.frequencyBinCount)
    this.wave = new Float32Array(an.fftSize)
    // log-spaced bands 45Hz – 11kHz
    const hz = ctx.sampleRate / an.fftSize
    for (let i = 0; i < BANDS; i++) {
      const lo = 45 * Math.pow(11000 / 45, i / BANDS)
      const hi = 45 * Math.pow(11000 / 45, (i + 1) / BANDS)
      const a = Math.max(1, Math.floor(lo / hz))
      this.bins.push([a, Math.max(a + 1, Math.ceil(hi / hz))])
    }
  }

  private clock() {
    return this.ctx ? this.ctx.currentTime : performance.now() / 1000
  }
  /** the time currently reaching the speakers */
  now() {
    const c = this.ctx
    return c ? c.currentTime - (c.outputLatency || c.baseLatency || 0) : performance.now() / 1000
  }

  /** desired state from the engine: play track i, or nothing (-1) */
  drive(i: number) {
    if (i < 0) {
      if (this.running) this.stop()
      return
    }
    const upgrade = this.running && this.silent && !!this.ctx
    if (!this.running || this.track !== i || upgrade) {
      if (this.running) this.stop()
      this.start(i)
    }
  }

  resetPosition(i: number) {
    this.pos.delete(i)
  }

  private start(i: number) {
    const p = PATTERNS[i]
    const ctx = this.ctx
    this.track = i
    this.running = true
    this.silent = !ctx
    const t0 = this.clock() + 0.05
    if (ctx && this.mix) {
      this.bus = ctx.createGain()
      this.bus.gain.value = 1
      this.bus.connect(this.mix)
    }
    this.kit = new Kit(ctx, this.bus, (t, v) => this.queue.push({ t, v }))
    const saved = this.pos.get(i)
    this.step = saved?.step ?? 0
    this.bar = saved?.bar ?? 0
    this.nextT = t0
    this.barDur = p.steps * p.stepDur
    this.stopBed = this.kit.bed(TRACKS[i].device, t0)
    this.tick()
    this.timer = window.setInterval(this.tick, TICK_MS)
  }

  private stop() {
    this.pos.set(this.track, { step: this.step, bar: this.bar })
    this.running = false
    clearInterval(this.timer)
    const t = this.clock()
    const bus = this.bus
    if (bus) {
      bus.gain.setTargetAtTime(0, t, 0.06)
      setTimeout(() => bus.disconnect(), 700)
    }
    this.stopBed?.(t)
    this.stopBed = null
    this.bus = null
    // drop visuals for notes that will now never be heard
    this.queue = this.queue.filter((e) => e.t <= t)
  }

  private tick = () => {
    if (!this.running || !this.kit) return
    const p = PATTERNS[this.track]
    const now = this.clock()
    if (this.nextT < now - 0.2) this.nextT = now + 0.02 // came back from a stall: don't burst
    while (this.nextT < now + LOOKAHEAD) {
      let t = this.nextT
      if (p.swing && this.step % 2 === 1) t += p.swing * p.stepDur
      if (this.step === 0) this.queue.push({ t: this.nextT, v: 'bar' })
      if (p.beats.includes(this.step)) this.queue.push({ t, v: 'beat' })
      p.play(this.kit, this.step, this.bar, t, p.stepDur)
      this.nextT += p.stepDur
      if (++this.step >= p.steps) {
        this.step = 0
        this.bar = (this.bar + 1) % 64
      }
    }
  }

  /** events whose time has reached the speakers, in time order */
  drain(now: number): AudioEvent[] {
    if (!this.queue.length) return []
    const due: AudioEvent[] = []
    const rest: AudioEvent[] = []
    for (const e of this.queue) (e.t <= now ? due : rest).push(e)
    this.queue = rest
    return due.sort((a, b) => a.t - b.t)
  }

  /** fills `out` with 0..1 band levels; returns RMS level 0..1, or -1 if no analyser */
  analyse(out: Float32Array): number {
    const an = this.analyser
    if (!an || this.silent) return -1
    an.getByteFrequencyData(this.fft)
    for (let i = 0; i < BANDS; i++) {
      const [a, b] = this.bins[i]
      let m = 0
      for (let k = a; k < b && k < this.fft.length; k++) m = Math.max(m, this.fft[k])
      out[i] = m / 255
    }
    an.getFloatTimeDomainData(this.wave)
    let s = 0
    for (let i = 0; i < this.wave.length; i += 4) s += this.wave[i] * this.wave[i]
    return Math.min(1, Math.sqrt(s / (this.wave.length / 4)) * 3.2)
  }

  setMuted(m: boolean) {
    this.muted = m
    try {
      localStorage.setItem(MUTE_KEY, m ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.03)
    this.muteSubs.forEach((f) => f(m))
  }
  onMute(f: (m: boolean) => void) {
    this.muteSubs.add(f)
    return () => void this.muteSubs.delete(f)
  }
}

export const audio = new AudioEngine()
