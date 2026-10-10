import { motion } from 'motion/react'
import { GOLD, TRACKS } from '../data'
import { EASE_OUT, T } from '../tokens'
import { CassetteArt } from './Cassette'
import { VinylDisc } from './VinylDisc'

interface Props {
  favorite: number | null
  onPick: (trackIndex: number) => void
  onHome: () => void
}

export function OutroScene({ favorite, onPick, onHome }: Props) {
  const exit = { opacity: 0, transition: { duration: T.sceneFade } }
  return (
    <div className="scene outro">
      <motion.h2
        className="outro-title"
        tabIndex={-1}
        data-heading
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.3, duration: 0.5 } }}
        exit={exit}
      >
        哪种爵士击中了你？
      </motion.h2>
      <div className="outro-grid" role="list">
        {TRACKS.map((t, i) => (
          <motion.button
            key={t.id}
            role="listitem"
            className={`outro-item ${t.device} ${favorite === i ? 'is-fav' : ''}`}
            style={{ ['--accent' as string]: t.accent }}
            onClick={() => onPick(i)}
            aria-label={`${favorite === i ? '你的选择：' : ''}${t.title} ${t.sub}，选择并播放`}
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 0.55 + i * 0.11, duration: 0.45, ease: EASE_OUT } }}
            exit={exit}
          >
            <span className="oi-art">
              {t.device === 'vinyl' ? (
                <span className="oi-disc">
                  <VinylDisc track={t} r={85} labelR={28} detail={false} />
                </span>
              ) : (
                <span className="oi-tape">
                  <CassetteArt track={t} />
                </span>
              )}
            </span>
            <span className="oi-name">{t.title}</span>
            <span className="oi-sub">{t.sub}</span>
            {favorite === i && <span className="oi-pick">YOUR PICK</span>}
          </motion.button>
        ))}
      </div>
      <motion.button
        className="outro-foot"
        style={{ color: GOLD }}
        onClick={onHome}
        aria-label="回到封面"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 1.6, duration: 0.5 } }}
        exit={exit}
      >
        JAZZ, NOW.<i>—</i>8 CUTTING-EDGE STYLES
      </motion.button>
    </div>
  )
}
