import { useEffect, useRef } from 'react'
import type { Track } from '../data'
import { pad2 } from '../data'
import { engine } from '../engine'

/** Static cassette artwork, shared by the big deck and the intro / outro thumbnails. */
export function CassetteArt({ track, reelRefs }: { track: Track; reelRefs?: React.RefObject<(SVGGElement | SVGCircleElement | null)[]> }) {
  const light = track.shell === '#e9ebef'
  const set = (i: number) => (el: SVGGElement | SVGCircleElement | null) => {
    if (reelRefs?.current) reelRefs.current[i] = el
  }
  return (
    <svg viewBox="0 0 816 516" width="100%" height="100%" className="cs-svg" aria-hidden="true">
      <defs>
        <clipPath id={`win-${track.id}`}>
          <rect x={214} y={180} width={388} height={108} rx={14} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={816} height={516} rx={26} fill={track.shell} />
      <rect x={1} y={1} width={814} height={514} rx={25} fill="none" stroke={light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'} strokeWidth={2} />
      {/* bottom trapezoid + drive holes */}
      <path d="M210 392 H606 L646 516 H170 Z" fill={track.shellDark} />
      <circle cx={298} cy={447} r={14} fill="#121214" />
      <rect x={358} y={437} width={20} height={20} fill="#121214" />
      <rect x={438} y={437} width={20} height={20} fill="#121214" />
      <circle cx={518} cy={447} r={14} fill="#121214" />
      {/* label */}
      <rect x={46} y={34} width={724} height={317} rx={8} fill="#f2ede1" />
      <rect x={64} y={50} width={60} height={60} rx={6} fill="none" stroke="#232323" strokeWidth={3} />
      <text x={94} y={96} textAnchor="middle" fontFamily="var(--f-serif)" fontWeight={700} fontSize={44} fill="#232323">A</text>
      <text x={151} y={98} fontFamily="var(--f-serif)" fontWeight={700} fontSize={track.title.length > 13 ? 48 : 52} fill="#1f1f1f" textLength={track.title.length > 13 ? 452 : undefined}>
        {track.title}
      </text>
      <line x1={148} x2={748} y1={107} y2={107} stroke="rgba(0,0,0,0.28)" strokeWidth={1.5} />
      <text x={151} y={132} fontFamily="var(--f-cjk)" fontWeight={500} fontSize={22} fill="#262626">
        {track.sub}　No.{pad2(track.no)}　C-60
      </text>
      <line x1={148} x2={748} y1={140} y2={140} stroke="rgba(0,0,0,0.22)" strokeWidth={1.5} />
      {/* tape window */}
      <g clipPath={`url(#win-${track.id})`}>
        <rect x={214} y={180} width={388} height={108} fill="#2c1f1a" />
        <circle ref={set(2)} cx={292} cy={234} r={70} fill="#5a3b2b" />
        <circle ref={set(3)} cx={522} cy={234} r={60} fill="#5a3b2b" />
        <rect x={358} y={196} width={100} height={92} fill="#1c1412" />
        <rect x={214} y={180} width={388} height={16} fill={track.accent} />
      </g>
      <rect x={214} y={180} width={388} height={108} rx={14} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={2} />
      {[292, 522].map((cx, i) => (
        <g key={cx} transform={`translate(${cx} 234)`}>
          <circle r={33} fill="#f3f0e9" />
          <g ref={set(i)}>
            {Array.from({ length: 6 }, (_, k) => (
              <rect key={k} x={-3.5} y={-17} width={7} height={13} rx={1.5} fill="#1d1d1f" transform={`rotate(${k * 60})`} />
            ))}
            <circle r={6} fill="#1d1d1f" />
            <circle cx={20} cy={14} r={2.5} fill="#bdb8ae" />
            <circle cx={-22} cy={-8} r={2.5} fill="#bdb8ae" />
          </g>
        </g>
      ))}
      {/* stripe */}
      <rect x={46} y={289} width={724} height={62} fill={track.accent} />
      <rect x={46} y={289} width={724} height={10} fill="rgba(0,0,0,0.18)" />
      <text x={70} y={333} fontFamily="var(--f-mono)" fontWeight={700} fontSize={18} letterSpacing={2.2} fill="#2a2420">
        TYPE I{'  '}NORMAL POSITION
      </text>
      {/* screws */}
      {[
        [24, 24], [792, 24], [24, 492], [792, 492], [408, 370],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <circle r={9} fill={light ? '#b9bcc2' : '#8d8f96'} />
          <rect x={-5} y={-1.2} width={10} height={2.4} fill={light ? '#7d8087' : '#3a3b40'} />
        </g>
      ))}
    </svg>
  )
}

interface Props {
  track: Track
  live: boolean
  playing: boolean
  onToggle: () => void
}

export function Cassette({ track, live, playing, onToggle }: Props) {
  const reels = useRef<(SVGGElement | SVGCircleElement | null)[]>([])
  // kept outside the effect so re-subscribing (live → exiting) doesn't reset the angle
  const motor = useRef({ a: 0, s: 0 })

  useEffect(() => {
    const idx = track.no - 1
    const m = motor.current
    return engine.subscribe((dt, e) => {
      m.s += ((live ? e.spin : 0) - m.s) * (1 - Math.exp(-dt / 0.3))
      const [hubL, hubR, tapeL, tapeR] = reels.current
      if (!e.reduced) {
        m.a += 230 * m.s * dt
        hubL?.setAttribute('transform', `rotate(${m.a % 360})`)
        hubR?.setAttribute('transform', `rotate(${(m.a * 1.18) % 360})`)
      }
      // tape winds from the left spool to the right one as the track plays
      const p = e.progress[idx]
      tapeL?.setAttribute('r', String(74 - 26 * p))
      tapeR?.setAttribute('r', String(48 + 26 * p))
    })
  }, [live, track.no])

  return (
    <div className="cs" style={{ ['--accent' as string]: track.accent }}>
      <button
        className="cs-shell device-btn"
        onClick={onToggle}
        disabled={!live}
        aria-pressed={playing}
        aria-label={`${track.title}：${playing ? '暂停' : '播放'}`}
      >
        <CassetteArt track={track} reelRefs={reels} />
      </button>
      <div className="dev-caption cs-caption" aria-hidden="true">
        CASSETTE<i>·</i>C-60
      </div>
    </div>
  )
}
