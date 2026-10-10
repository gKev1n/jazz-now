// Small Web Audio instrument kit. Every voice also emits a visual event at its exact
// audio time, so the screen reacts to what is *heard*, not to a parallel timer.

export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
const Z = 0.0001

export type Emit = (t: number, voice: string) => void

export class Kit {
  private noise: AudioBuffer | null = null

  constructor(
    private ctx: AudioContext | null,
    private out: AudioNode | null,
    private emit: Emit,
  ) {
    if (ctx) {
      const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const d = b.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      this.noise = b
    }
  }

  // ── plumbing ───────────────────────────────────────────
  private gain(t: number, peak: number, attack: number, decay: number, sustain = Z, hold = 0) {
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(Z, t)
    g.gain.exponentialRampToValueAtTime(Math.max(Z, peak), t + attack)
    if (hold > 0) g.gain.setValueAtTime(Math.max(Z, peak), t + attack + hold)
    g.gain.exponentialRampToValueAtTime(Math.max(Z, sustain), t + attack + hold + decay)
    return g
  }
  private osc(type: OscillatorType, f: number, t: number, end: number, detune = 0) {
    const o = this.ctx!.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f, t)
    o.detune.value = detune
    o.start(t)
    o.stop(end)
    return o
  }
  private noiseSrc(t: number, end: number) {
    const s = this.ctx!.createBufferSource()
    s.buffer = this.noise
    s.loop = true
    s.start(t, Math.random() * 0.5)
    s.stop(end)
    return s
  }
  private filter(type: BiquadFilterType, f: number, q = 0.7) {
    const b = this.ctx!.createBiquadFilter()
    b.type = type
    b.frequency.value = f
    b.Q.value = q
    return b
  }
  private chain(...nodes: AudioNode[]) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
    nodes[nodes.length - 1].connect(this.out!)
  }
  private live(t: number, voice: string) {
    this.emit(t, voice)
    return !!this.ctx && !!this.out
  }

  // ── drums ──────────────────────────────────────────────
  kick(t: number, v = 1, voice = 'kick') {
    if (!this.live(t, voice)) return
    const o = this.osc('sine', 160, t, t + 0.45)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    this.chain(o, this.gain(t, 0.95 * v, 0.003, 0.4))
    const c = this.noiseSrc(t, t + 0.02)
    this.chain(c, this.filter('highpass', 3000), this.gain(t, 0.12 * v, 0.001, 0.015))
  }
  snare(t: number, v = 1, voice = 'snare') {
    if (!this.live(t, voice)) return
    this.chain(this.noiseSrc(t, t + 0.25), this.filter('bandpass', 1900, 0.7), this.gain(t, 0.55 * v, 0.002, 0.17))
    this.chain(this.osc('triangle', 190, t, t + 0.12), this.gain(t, 0.32 * v, 0.002, 0.09))
  }
  clap(t: number, v = 1, voice = 'snare') {
    if (!this.live(t, voice)) return
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(Z, t)
    for (const d of [0, 0.011, 0.023]) {
      g.gain.setValueAtTime(0.5 * v, t + d)
      g.gain.exponentialRampToValueAtTime(0.06 * v, t + d + 0.01)
    }
    g.gain.exponentialRampToValueAtTime(Z, t + 0.2)
    this.chain(this.noiseSrc(t, t + 0.22), this.filter('bandpass', 1150, 1.1), g)
  }
  hat(t: number, v = 0.3, open = false, voice = 'hat') {
    if (!this.live(t, voice)) return
    this.chain(this.noiseSrc(t, t + 0.35), this.filter('highpass', 7600), this.gain(t, 0.3 * v, 0.001, open ? 0.26 : 0.042))
  }
  shaker(t: number, v = 0.3, voice = 'shaker') {
    if (!this.live(t, voice)) return
    this.chain(this.noiseSrc(t, t + 0.1), this.filter('highpass', 5600), this.gain(t, 0.16 * v, 0.012, 0.055))
  }
  crash(t: number, v = 0.6, voice = 'crash') {
    if (!this.live(t, voice)) return
    this.chain(this.noiseSrc(t, t + 1.6), this.filter('highpass', 4800), this.gain(t, 0.22 * v, 0.002, 1.4))
  }
  rim(t: number, v = 0.5, voice = 'rim') {
    if (!this.live(t, voice)) return
    this.chain(this.osc('triangle', 1650, t, t + 0.05), this.filter('highpass', 900), this.gain(t, 0.3 * v, 0.001, 0.035))
  }
  tom(t: number, f: number, v = 0.7, voice = 'tom') {
    if (!this.live(t, voice)) return
    const o = this.osc('sine', f, t, t + 0.35)
    o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.25)
    this.chain(o, this.gain(t, 0.6 * v, 0.002, 0.3))
  }
  bell(t: number, m: number, v = 0.6, voice = 'bell') {
    if (!this.live(t, voice)) return
    const f = mtof(m)
    this.chain(this.osc('triangle', f, t, t + 0.4), this.gain(t, 0.16 * v, 0.001, 0.32))
    this.chain(this.osc('sine', f * 2.76, t, t + 0.2), this.gain(t, 0.06 * v, 0.001, 0.12))
  }

  // ── pitched ────────────────────────────────────────────
  /** FM electric piano (Rhodes-ish) */
  ep(t: number, notes: number[], dur: number, v = 0.6, voice = 'keys') {
    if (!this.live(t, voice)) return
    const per = v / Math.sqrt(notes.length)
    for (const m of notes) {
      const f = mtof(m)
      const end = t + dur + 0.6
      const car = this.osc('sine', f, t, end)
      const mod = this.osc('sine', f, t, end)
      const mg = this.ctx!.createGain()
      mg.gain.setValueAtTime(f * 1.6, t)
      mg.gain.exponentialRampToValueAtTime(f * 0.25, t + 0.45)
      mod.connect(mg).connect(car.frequency)
      const g = this.gain(t, 0.13 * per, 0.006, 0.5, 0.05 * per, 0)
      g.gain.setValueAtTime(0.05 * per, t + Math.max(0.51, dur))
      g.gain.exponentialRampToValueAtTime(Z, end)
      this.chain(car, g)
    }
  }
  piano(t: number, notes: number[], dur: number, v = 0.6, voice = 'keys') {
    if (!this.live(t, voice)) return
    const per = v / Math.sqrt(notes.length)
    for (const m of notes) {
      const f = mtof(m)
      const end = t + Math.min(dur + 0.5, 2)
      const lp = this.filter('lowpass', 3400)
      const g = this.gain(t, 0.15 * per, 0.004, Math.min(dur + 0.45, 1.9))
      this.osc('triangle', f, t, end).connect(lp)
      const h = this.osc('sine', f * 2, t, end)
      const hg = this.ctx!.createGain()
      hg.gain.value = 0.3
      h.connect(hg).connect(lp)
      this.chain(lp, g)
    }
  }
  pluck(t: number, m: number, v = 0.6, voice = 'pluck') {
    if (!this.live(t, voice)) return
    const lp = this.filter('lowpass', 5000, 3)
    lp.frequency.setValueAtTime(5200, t)
    lp.frequency.exponentialRampToValueAtTime(650, t + 0.14)
    this.chain(this.osc('sawtooth', mtof(m), t, t + 0.3), lp, this.gain(t, 0.1 * v, 0.002, 0.24))
  }
  bass(t: number, m: number, dur: number, v = 0.7, voice = 'bass') {
    if (!this.live(t, voice)) return
    const f = mtof(m)
    const end = t + dur + 0.1
    const lp = this.filter('lowpass', 750)
    const g = this.gain(t, 0.34 * v, 0.008, Math.max(0.05, dur - 0.01), 0.18 * v)
    g.gain.exponentialRampToValueAtTime(Z, end)
    this.osc('sine', f, t, end).connect(lp)
    const tri = this.osc('triangle', f, t, end)
    const tg = this.ctx!.createGain()
    tg.gain.value = 0.45
    tri.connect(tg).connect(lp)
    this.chain(lp, g)
  }
  synthBass(t: number, m: number, dur: number, v = 0.7, from?: number, voice = 'bass') {
    if (!this.live(t, voice)) return
    const end = t + dur + 0.08
    const lp = this.filter('lowpass', 1600, 7)
    lp.frequency.setValueAtTime(1700, t)
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.2)
    const g = this.gain(t, 0.17 * v, 0.006, Math.max(0.05, dur), 0.08 * v)
    g.gain.exponentialRampToValueAtTime(Z, end)
    for (const [type, det] of [['sawtooth', -7], ['square', 7]] as const) {
      const o = this.osc(type, mtof(from ?? m), t, end, det)
      if (from !== undefined) o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.07)
      o.connect(lp)
    }
    this.chain(lp, g)
  }
  vibes(t: number, m: number, dur: number, v = 0.6, voice = 'vibes') {
    if (!this.live(t, voice)) return
    const f = mtof(m)
    const end = t + Math.max(dur, 1.4)
    const trem = this.ctx!.createGain()
    trem.gain.value = 0.75
    const lfo = this.osc('sine', 5.6, t, end)
    const depth = this.ctx!.createGain()
    depth.gain.value = 0.25
    lfo.connect(depth).connect(trem.gain)
    const g = this.gain(t, 0.12 * v, 0.003, end - t - 0.01)
    this.osc('sine', f, t, end).connect(trem)
    const h = this.osc('sine', f * 4, t, t + 0.3)
    const hg = this.gain(t, 0.03 * v, 0.002, 0.2)
    h.connect(hg).connect(trem)
    this.chain(trem, g)
  }
  /** brass-ish swell (stabs or held notes) */
  horn(t: number, m: number, dur: number, v = 0.6, voice = 'horn', bright = 2300) {
    if (!this.live(t, voice)) return
    const f = mtof(m)
    const end = t + dur + 0.15
    const lp = this.filter('lowpass', 500, 1.2)
    lp.frequency.setValueAtTime(500, t)
    lp.frequency.linearRampToValueAtTime(bright, t + 0.07)
    lp.frequency.linearRampToValueAtTime(bright * 0.6, t + dur)
    const g = this.gain(t, 0.075 * v, 0.045, Math.max(0.05, dur - 0.05), 0.06 * v)
    g.gain.exponentialRampToValueAtTime(Z, end)
    const vib = this.osc('sine', 5.2, t, end)
    const vd = this.ctx!.createGain()
    vd.gain.setValueAtTime(0, t)
    vd.gain.linearRampToValueAtTime(f * 0.006, t + 0.25)
    for (const det of [-6, 6]) {
      const o = this.osc('sawtooth', f, t, end, det)
      vib.connect(vd).connect(o.frequency)
      o.connect(lp)
    }
    this.chain(lp, g)
  }
  sax(t: number, m: number, dur: number, v = 0.6) {
    this.horn(t, m, dur, v * 1.1, 'sax', 1700)
  }
  lead(t: number, m: number, dur: number, v = 0.6, voice = 'lead') {
    if (!this.live(t, voice)) return
    const end = t + dur + 0.06
    const lp = this.filter('lowpass', 3200, 2)
    const g = this.gain(t, 0.07 * v, 0.004, Math.max(0.04, dur), 0.04 * v)
    g.gain.exponentialRampToValueAtTime(Z, end)
    this.osc('square', mtof(m), t, end, -8).connect(lp)
    this.osc('sawtooth', mtof(m), t, end, 8).connect(lp)
    this.chain(lp, g)
  }

  // ── texture ────────────────────────────────────────────
  /** looping vinyl crackle or tape hiss bed; returns a stopper */
  bed(kind: 'vinyl' | 'cassette', t: number): (at: number) => void {
    if (!this.ctx || !this.out) return () => {}
    const ctx = this.ctx
    const len = ctx.sampleRate * 3
    const b = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = b.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (kind === 'vinyl' ? 0.012 : 0.02)
    if (kind === 'vinyl') {
      for (let p = 0; p < 70; p++) {
        const at = Math.floor(Math.random() * (len - 200))
        const amp = 0.15 + Math.random() * 0.45
        for (let k = 0; k < 120; k++) d[at + k] += amp * Math.exp(-k / 12) * (k % 2 ? -1 : 1)
      }
    }
    const s = ctx.createBufferSource()
    s.buffer = b
    s.loop = true
    const g = ctx.createGain()
    g.gain.setValueAtTime(Z, t)
    g.gain.exponentialRampToValueAtTime(kind === 'vinyl' ? 0.55 : 0.35, t + 0.08)
    const hp = this.filter('highpass', kind === 'vinyl' ? 700 : 3500)
    s.connect(hp).connect(g).connect(this.out)
    s.start(t)
    // needle drop / play-key clunk
    if (kind === 'vinyl') this.chain(this.osc('sine', 70, t, t + 0.2), this.gain(t, 0.25, 0.002, 0.16))
    else this.chain(this.noiseSrc(t, t + 0.05), this.filter('bandpass', 900, 2), this.gain(t, 0.25, 0.001, 0.04))
    return (at: number) => {
      g.gain.setTargetAtTime(Z, at, 0.05)
      s.stop(at + 0.4)
    }
  }
}
