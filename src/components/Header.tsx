import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { audio } from '../audio'
import { TRACKS } from '../data'
import { engine } from '../engine'
import { T } from '../tokens'

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Top bar: brand, 8-segment album progress (clickable), elapsed clock. */
export function Header({ current, onHome, onJump }: { current: number; onHome: () => void; onJump: (i: number) => void }) {
  const fills = useRef<(HTMLSpanElement | null)[]>([])
  const clock = useRef<HTMLSpanElement>(null)
  const [muted, setMuted] = useState(audio.muted)
  useEffect(() => audio.onMute(setMuted), [])

  useEffect(
    () =>
      engine.subscribe((_, e) => {
        e.progress.forEach((p, i) => {
          const el = fills.current[i]
          if (el) el.style.transform = `scaleX(${p})`
        })
        if (clock.current) clock.current.textContent = fmt(e.elapsedMs)
      }),
    [],
  )

  return (
    <motion.header
      className="hdr"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: T.sceneFade, delay: T.enterDelay } }}
      exit={{ opacity: 0, transition: { duration: T.sceneFade * 0.7 } }}
    >
      <div className="hdr-brand">
        <button className="hdr-home" onClick={onHome} aria-label="返回封面">
          JAZZ, NOW.
        </button>
        <span>ON TAPE &amp; VINYL</span>
      </div>
      <button
        className="hdr-sound"
        onClick={() => audio.setMuted(!muted)}
        aria-pressed={!muted}
        aria-label={muted ? '打开声音（M）' : '静音（M）'}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
          {muted ? <path d="M16 9.5l5 5M21 9.5l-5 5" /> : <path d="M16 9a4.5 4.5 0 010 6M18.5 6.5a8 8 0 010 11" />}
        </svg>
        {muted ? 'MUTED' : 'SOUND'}
      </button>
      <span className="hdr-clock" ref={clock} aria-hidden="true">
        0:00
      </span>
      <nav className="hdr-progress" aria-label="曲目">
        {TRACKS.map((t, i) => (
          <button
            key={t.id}
            className={`seg ${i === current ? 'is-current' : ''}`}
            style={{ ['--accent' as string]: t.accent }}
            onClick={() => onJump(i)}
            aria-label={`第 ${i + 1} 首：${t.title} ${t.sub}`}
            aria-current={i === current ? 'true' : undefined}
          >
            <span className="seg-track">
              <span className="seg-fill" ref={(el) => void (fills.current[i] = el)} />
            </span>
          </button>
        ))}
      </nav>
    </motion.header>
  )
}
