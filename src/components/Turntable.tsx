import { useEffect, useRef } from 'react'
import type { Track } from '../data'
import { engine } from '../engine'
import { ARM_PLAY, ARM_REST, RECORD_DEG_PER_S } from '../tokens'
import { VinylDisc } from './VinylDisc'

const DOTS = Array.from({ length: 150 }, (_, i) => (i / 150) * Math.PI * 2)

interface Props {
  track: Track
  /** this scene is the live one (exiting copies freeze their controls) */
  live: boolean
  /** needle is down: playing && device finished sliding in */
  needleDown: boolean
  playing: boolean
  onToggle: () => void
  /** tonearm finished lowering onto the record — sound may start */
  onNeedleDown: () => void
}

export function Turntable({ track, live, needleDown, playing, onToggle, onNeedleDown }: Props) {
  const platter = useRef<HTMLDivElement>(null)
  const led = useRef<HTMLSpanElement>(null)
  // kept outside the effect so re-subscribing (live → exiting) doesn't reset the angle
  const motor = useRef({ a: Math.random() * 360, s: 0 })

  useEffect(() => {
    const m = motor.current
    return engine.subscribe((dt, e) => {
      // only the live deck follows the global motor; an exiting deck coasts down on its own
      m.s += ((live ? e.spin : 0) - m.s) * (1 - Math.exp(-dt / 0.35))
      if (!platter.current || e.reduced) return
      m.a += RECORD_DEG_PER_S * m.s * dt
      platter.current.style.transform = `rotate(${m.a % 360}deg)`
    })
  }, [live])

  // LED flickers with the beat while the deck is running
  useEffect(
    () =>
      engine.subscribe((_, e) => {
        if (led.current) led.current.style.opacity = playing && live ? String(0.62 + 0.38 * e.pulse) : ''
      }),
    [playing, live],
  )

  // safety net: if the arm's transitionend is ever missed, still start the sound
  useEffect(() => {
    if (!needleDown) return
    const id = setTimeout(onNeedleDown, 1300)
    return () => clearTimeout(id)
  }, [needleDown, onNeedleDown])

  return (
    <div className="tt" style={{ ['--accent' as string]: track.accent }}>
      <button
        className="tt-plinth device-btn"
        onClick={onToggle}
        disabled={!live}
        aria-pressed={playing}
        aria-label={`${track.title}：${playing ? '暂停' : '播放'}`}
      >
        <div className="tt-platter" ref={platter}>
          <svg viewBox="-365 -365 730 730" width={730} height={730} className="tt-rim" aria-hidden="true">
            <circle r={365} fill="#1a1b1f" />
            {DOTS.map((a, i) => (
              <circle key={i} cx={Math.cos(a) * 356} cy={Math.sin(a) * 356} r={2.4} fill="#3f4147" />
            ))}
          </svg>
          <div className="tt-disc">
            <VinylDisc track={track} r={345} labelR={115} />
          </div>
        </div>
        <div className="tt-sheen" aria-hidden="true" />
        <div className="tt-arm-base" aria-hidden="true" />
        <div
          className="tt-arm"
          aria-hidden="true"
          style={{ transform: `rotate(${needleDown ? ARM_PLAY : ARM_REST}deg)` }}
          onTransitionEnd={(ev) => ev.propertyName === 'transform' && needleDown && onNeedleDown()}
        >
          <div className="tt-weight" />
          <div className="tt-rod" />
          <div className="tt-head" />
        </div>
        <div className="tt-pivot" aria-hidden="true" />
        <span className="tt-knob" style={{ left: 54 }} aria-hidden="true" />
        <span className="tt-knob" style={{ left: 114 }} aria-hidden="true" />
        <span ref={led} className={`tt-led ${playing ? 'on' : ''}`} aria-hidden="true" />
      </button>
      <div className="dev-caption tt-caption" aria-hidden="true">
        LP<i>·</i>33⅓ RPM
      </div>
    </div>
  )
}
