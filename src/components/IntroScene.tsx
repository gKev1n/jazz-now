import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { GOLD, TRACKS } from '../data'
import { engine } from '../engine'
import { EASE_OUT, T } from '../tokens'
import { CassetteArt } from './Cassette'
import { VinylDisc } from './VinylDisc'

const fade = (delay: number, rise = 0) => ({
  initial: { opacity: 0, y: rise },
  animate: { opacity: 1, y: 0, transition: { delay, duration: 0.55, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: T.sceneFade } },
})

export function IntroScene({ onPick, hasProgress }: { onPick: (trackIndex: number) => void; hasProgress: boolean }) {
  const disc = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let a = 0
    return engine.subscribe((dt, e) => {
      if (e.reduced || !disc.current) return
      a += 40 * dt // idle slow spin, as in the reference title card
      disc.current.style.transform = `rotate(${a}deg)`
    })
  }, [])

  const rows = [TRACKS.slice(0, 4), TRACKS.slice(4)]

  return (
    <div className="scene intro">
      <motion.button className="intro-disc" onClick={() => onPick(0)} aria-label="从 MATH JAZZ 开始播放" {...fade(0.15)}>
        <div ref={disc}>
          <VinylDisc track={TRACKS[0]} r={205} labelR={70} detail={false} />
        </div>
      </motion.button>
      <motion.button className="intro-tape" onClick={() => onPick(1)} aria-label="播放 HYPER PIANO TRIO" {...fade(0.2)}>
        <CassetteArt track={TRACKS[1]} />
      </motion.button>

      <motion.h1 className="intro-title" {...fade(0.3)} tabIndex={-1} data-heading>
        JAZZ, NOW.
      </motion.h1>
      <motion.div className="intro-kicker" style={{ color: GOLD }} {...fade(0.75)}>
        8 CUTTING-EDGE STYLES
      </motion.div>
      <motion.p className="intro-lead" {...fade(0.95)}>
        变拍子、碎拍、超绝技巧。当下的爵士 8 选
      </motion.p>
      <div className="intro-chips">
        {rows.map((row, r) => (
          <div className="intro-row" key={r}>
            {row.map((t) => (
              <motion.button
                key={t.id}
                className="intro-chip"
                style={{ ['--accent' as string]: t.accent }}
                onClick={() => onPick(t.no - 1)}
                {...fade(1.15 + (t.no - 1) * T.introStagger, 6)}
              >
                <i />
                {t.title}
              </motion.button>
            ))}
          </div>
        ))}
      </div>
      <motion.p className="intro-hint" {...fade(1.9)}>
        <span className="hint-keys">
          {hasProgress ? '点击风格或按 → 继续' : '点击风格或按 → 开始'}
          <b>·</b>空格 播放 / 暂停<b>·</b>← → 切换
        </span>
        <span className="hint-touch">
          轻点风格开始<b>·</b>左右滑动切换<b>·</b>轻点唱机播放 / 暂停
        </span>
      </motion.p>
    </div>
  )
}
