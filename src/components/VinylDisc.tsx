import type { Track } from '../data'
import { pad2 } from '../data'

/** The record itself (grooves + printed label). Rotation is applied by the parent. */
export function VinylDisc({ track, r, labelR, detail = true }: { track: Track; r: number; labelR: number; detail?: boolean }) {
  const s = labelR / 115 // label typography designed at labelR = 115
  const grooves = detail ? [0.93, 0.86, 0.78, 0.7, 0.62, 0.54, 0.46] : [0.85, 0.7, 0.55]
  return (
    <svg viewBox={`${-r} ${-r} ${r * 2} ${r * 2}`} width={r * 2} height={r * 2} aria-hidden="true">
      <circle r={r} fill="#101012" />
      {grooves.map((g) => (
        <circle key={g} r={r * g} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={Math.max(1, r / 220)} />
      ))}
      <circle r={labelR} fill={track.labelColor} />
      <circle r={labelR - 6 * s} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={1.2 * s} />
      <g fill="#14161a" fontFamily="var(--f-mono)" fontWeight={700} textAnchor="middle">
        <text x={-52 * s} y={-58 * s} fontSize={13 * s} letterSpacing={1 * s}>SIDE A</text>
        <text x={52 * s} y={-58 * s} fontSize={13 * s}>No.{pad2(track.no)}</text>
        <text y={-24 * s} fontSize={(track.title.length > 10 ? 18 : 24) * s} fontFamily="var(--f-display)" fontWeight={900}>
          {track.title}
        </text>
        <text y={28 * s} fontSize={15 * s} fontFamily="var(--f-cjk)" fontWeight={700}>{track.sub}</text>
        <text y={58 * s} fontSize={12 * s} letterSpacing={1 * s}>33⅓ RPM</text>
      </g>
      <circle r={9 * s} fill="#0b0b0d" />
    </svg>
  )
}
