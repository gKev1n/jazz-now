import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Track } from '../data'
import { TRACKS, pad2 } from '../data'
import { engine } from '../engine'
import { EASE_IN, EASE_OUT, T } from '../tokens'
import { Cassette } from './Cassette'
import { Turntable } from './Turntable'
import { Visualizer } from './Visualizer'

interface Props {
  track: Track
  /** +1 forward (enter from left, as in the reference), -1 backward (enter from right) */
  dir: number
  live: boolean
  playing: boolean
  portrait: boolean
  onToggle: () => void
}

const TITLE_MAX = 136

/** fade-in for the text column; index sets its slot in the cascade */
const txt = (i: number, rise = 10) => ({
  initial: { opacity: 0, y: rise },
  animate: {
    opacity: 1,
    y: 0,
    transition: { delay: T.textStart + i * T.textStagger, duration: T.textDur, ease: EASE_OUT },
  },
  exit: { opacity: 0, transition: { duration: T.textExit, delay: Math.min(i, 4) * 0.015 } },
})

export function TrackScene({ track, dir, live, playing, portrait, onToggle }: Props) {
  // direction is captured at mount: an exiting scene must not re-target its entrance
  const [enterFrom] = useState(() => (dir >= 0 ? -1 : 1))
  const [landed, setLanded] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const maxW = portrait ? 860 : 730

  // fit the display title to the column width (reference shrinks long names like HYPER PIANO TRIO)
  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el) return
    const fit = () => {
      el.style.fontSize = `${TITLE_MAX}px`
      const w = el.scrollWidth
      if (w > maxW) el.style.fontSize = `${Math.floor((TITLE_MAX * maxW) / w)}px`
    }
    fit()
    document.fonts?.ready.then(fit)
  }, [track.title, maxW])

  const idx = track.no - 1
  // the deck tells the engine when it may sound: needle down (vinyl) / deck landed (cassette)
  const onNeedleDown = useCallback(() => engine.setReady(idx), [idx])
  useEffect(() => {
    if (track.device === 'cassette' && playing && landed && live) engine.setReady(idx)
  }, [track.device, playing, landed, live, idx])

  // ── groove-reactive details, all driven by audible note events ──
  const dotRef = useRef<HTMLSpanElement>(null)
  const thumpRef = useRef<HTMLDivElement>(null)
  const ruleRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLSpanElement>(null)
  const chipFx = useRef<(HTMLSpanElement | null)[]>([])
  useEffect(() => {
    const ruleW = ruleRef.current?.offsetWidth ?? 700
    return engine.subscribe((_, e) => {
      const on = live && e.playing
      const sounding = on && e.ready
      if (dotRef.current) dotRef.current.style.opacity = String(on ? 0.28 + 0.72 * e.pulse : 0.28)
      // deck thumps on the kick (and harder on Hyper Piano Trio's band hits)
      if (thumpRef.current) {
        const k = sounding && !e.reduced ? 0.011 * e.hit('kick') + 0.008 * e.hit('kime') : 0
        thumpRef.current.style.transform = k > 0.0003 ? `scale(${1 + k})` : ''
      }
      // the rule becomes a bar-long playhead — 7/8 and 12/8 bars visibly differ in length
      if (headRef.current) {
        headRef.current.style.opacity = sounding ? String(0.55 + 0.45 * e.hit('bar')) : '0'
        headRef.current.style.transform = `translateX(${(e.reduced ? 0 : e.barPhase) * ruleW}px)`
      }
      // each 主要音色 chip lights when its instrument actually plays
      track.tagVoices.forEach((voices, i) => {
        const el = chipFx.current[i]
        if (!el) return
        const h = sounding ? Math.max(...voices.map((v) => e.hit(v))) : 0
        el.style.opacity = String(h)
      })
    })
  }, [live, track])

  const offX = portrait ? 1250 : enterFrom < 0 ? 1250 : 1750
  const device = {
    from: { x: enterFrom * offX, opacity: 1, scale: 1, y: 0 },
    enter: { x: 0, opacity: 1, scale: 1, y: 0, transition: { delay: T.enterDelay, duration: T.deviceEnter, ease: EASE_OUT } },
    // a deck that never finished arriving (user skipped past it) just vanishes —
    // otherwise its stale slide-in would keep playing underneath the next track
    exit: landed
      ? { opacity: 0, scale: 0.9, y: 50, transition: { delay: T.deviceExitDelay, duration: T.deviceExit, ease: EASE_IN } }
      : { opacity: 0, transition: { duration: 0.12 } },
  }

  return (
    <div
      className={`scene track ${track.device}`}
      style={{ ['--accent' as string]: track.accent, ['--tint' as string]: track.bg[0] }}
      aria-hidden={!live}
    >
      <motion.div
        className="device-layer"
        variants={device}
        initial="from"
        animate="enter"
        exit="exit"
        onAnimationComplete={(def) => def === 'enter' && setLanded(true)}
      >
        <div className="thump" ref={thumpRef}>
          {track.device === 'vinyl' ? (
            <Turntable
              track={track}
              live={live}
              playing={playing}
              needleDown={playing && landed && live}
              onToggle={onToggle}
              onNeedleDown={onNeedleDown}
            />
          ) : (
            <Cassette track={track} live={live} playing={playing} onToggle={onToggle} />
          )}
        </div>
      </motion.div>

      <div className="info">
        <motion.div className="t-label" {...txt(0, 0)}>
          TRACK {pad2(track.no)} / {pad2(TRACKS.length)}
        </motion.div>
        <motion.h2 className="t-title" ref={titleRef} {...txt(0.4, 0)} tabIndex={-1} data-heading>
          {track.title}
        </motion.h2>
        <motion.div className="t-sub" {...txt(1, 6)}>
          {track.sub}
        </motion.div>
        <motion.div
          className="t-rule"
          ref={ruleRef}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1, transition: { delay: T.textStart + 1.6 * T.textStagger, duration: T.ruleDur, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: T.textExit } }}
        >
          <span className="rule-head" ref={headRef} />
        </motion.div>
        <motion.div className="t-meta" {...txt(2.6)}>
          {track.meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
          <span className="beat-dot" ref={dotRef} />
        </motion.div>
        <motion.p className="t-desc" {...txt(3.4)}>
          {track.desc}
        </motion.p>
        <motion.div className="t-tags-label" {...txt(4.2)}>
          主要音色
        </motion.div>
        <div className="chips">
          {track.tags.map((tag, i) => (
            <motion.span key={tag} className="chip" {...txt(4.8 + i * 0.55, 8)}>
              <span className="chip-fx" ref={(el) => void (chipFx.current[i] = el)} />
              <span className="chip-label">{tag}</span>
            </motion.span>
          ))}
        </div>
      </div>

      <motion.div className="viz-wrap" {...txt(1.5, 0)}>
        <Visualizer live={live} />
      </motion.div>
    </div>
  )
}
