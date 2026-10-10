import { useEffect, useRef } from 'react'
import { engine } from '../engine'

const N = 40
// the reference always shows bars 2, 4 and 7 as flat dashes — keep that signature
const DASH = new Set([1, 3, 6])
const ENV = Array.from({ length: N }, (_, i) => 0.42 + 0.58 * Math.exp(-i / 13))

/** Pseudo spectrum. Beat-synced to the track BPM; collapses to stubs when paused. */
export function Visualizer({ live }: { live: boolean }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  const st = useRef({ h: new Float32Array(N), r: new Float32Array(N).map(() => Math.random()), beat: -1 })

  useEffect(() => {
    const s = st.current
    return engine.subscribe((dt, e) => {
      const on = live && e.playing
      const b = Math.floor(e.beats)
      if (b !== s.beat) {
        s.beat = b
        for (let i = 0; i < N; i++) s.r[i] = 0.25 + 0.75 * Math.random()
      }
      for (let i = 0; i < N; i++) {
        let target = 0.045
        if (on && !DASH.has(i)) {
          target = e.hasSpectrum
            ? // real analyser bands; tilt up the highs, which naturally sit lower
              Math.max(0.05, Math.min(1, Math.pow(e.spectrum[i], 1.5) * (0.8 + Math.pow(i / N, 1.4) * 2.1)))
            : Math.max(0.06, ENV[i] * (0.55 * s.r[i] + 0.45 * e.pulse) * (0.4 + 0.6 * e.spin))
        }
        if (e.reduced && on && !DASH.has(i)) target = ENV[i] * 0.6
        const k = target > s.h[i] ? 16 : 5 // fast attack, slow release
        s.h[i] += (target - s.h[i]) * (1 - Math.exp(-dt * k))
        const el = bars.current[i]
        if (el) el.style.transform = `scaleY(${s.h[i].toFixed(4)})`
      }
    })
  }, [live])

  return (
    <div className="viz" aria-hidden="true">
      {Array.from({ length: N }, (_, i) => (
        <span key={i} ref={(el) => void (bars.current[i] = el)} />
      ))}
    </div>
  )
}
