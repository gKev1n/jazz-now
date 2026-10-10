import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, useIsPresent } from 'motion/react'
import { INTRO, NEUTRAL_BG, OUTRO, TRACKS, trackOf } from './data'
import { audio } from './audio'
import { engine } from './engine'
import { Header } from './components/Header'
import { IntroScene } from './components/IntroScene'
import { OutroScene } from './components/OutroScene'
import { TrackScene } from './components/TrackScene'

// ───────────────────────── state ─────────────────────────
interface State {
  scene: number // 0 intro · 1..8 tracks · 9 outro
  dir: number
  playing: boolean
  favorite: number | null
}

type Action =
  | { type: 'go'; scene: number; play?: boolean }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'toggle' }
  | { type: 'pick'; index: number }

const FAV_KEY = 'jazz-now:favorite'
const clampScene = (n: number) => Math.max(INTRO, Math.min(OUTRO, n))

function go(s: State, target: number, play?: boolean): State {
  const scene = clampScene(target)
  if (scene === s.scene) return play === undefined || play === s.playing ? s : { ...s, playing: play }
  // leaving the cover always starts the record; otherwise keep the user's play/pause choice
  const playing = play ?? (s.scene === INTRO ? true : s.playing)
  return { ...s, scene, dir: scene > s.scene ? 1 : -1, playing }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'go':
      return go(s, a.scene, a.play)
    case 'next':
      return go(s, s.scene + 1)
    case 'prev':
      return go(s, s.scene - 1)
    case 'toggle':
      if (s.scene === INTRO) return go(s, 1, true)
      if (trackOf(s.scene)) return { ...s, playing: !s.playing }
      return s
    case 'pick':
      return { ...go(s, a.index + 1, true), favorite: a.index }
  }
}

function initState(): State {
  let favorite: number | null = null
  try {
    const v = localStorage.getItem(FAV_KEY)
    if (v !== null && +v >= 0 && +v < TRACKS.length) favorite = +v
  } catch {
    /* storage unavailable — favourite simply isn't remembered */
  }
  return { scene: INTRO, dir: 1, playing: false, favorite }
}

// ───────────────────────── layout ─────────────────────────
function useStage() {
  const calc = () => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const portrait = vw / vh < 0.9
    const [W, H] = portrait ? [1080, 1920] : [1920, 1080]
    return { portrait, W, H, scale: Math.min(vw / W, vh / H) }
  }
  const [s, set] = useState(calc)
  useEffect(() => {
    const on = () => set(calc())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return s
}

/** Marks a scene as live / exiting so exiting copies are inert and stop driving the motor. */
function SceneWrap({ children }: { children: (live: boolean) => ReactNode }) {
  const live = useIsPresent()
  return (
    <div className="scene-wrap" aria-hidden={!live} {...(!live ? { inert: '' } : {})}>
      {children(live)}
    </div>
  )
}

// ───────────────────────── app ─────────────────────────
export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initState)
  const { scene, dir, playing, favorite } = state
  const stage = useStage()
  const track = trackOf(scene)

  // engine follows discrete state; it calls back when a track runs out
  useEffect(() => {
    engine.setTrack(track ? track.no - 1 : -1)
    engine.setPlaying(playing)
  }, [track, playing])
  useEffect(() => {
    engine.onTrackEnd = () => dispatch({ type: 'next' })
  }, [])

  // browsers only allow audio to start inside a user gesture — unlock on the first one
  useEffect(() => {
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
  }, [])

  // background bloom follows the kick drum + overall loudness
  const glowRef = useRef<HTMLDivElement>(null)
  useEffect(
    () =>
      engine.subscribe((_, e) => {
        const el = glowRef.current
        if (!el) return
        const sounding = e.playing && e.ready && e.current >= 0
        const amt = sounding ? (e.reduced ? 0.06 * e.level : 0.2 * e.hit('kick') + 0.12 * e.hit('kime') + 0.1 * e.level) : 0
        el.style.opacity = amt.toFixed(3)
      }),
    [],
  )

  useEffect(() => {
    try {
      if (favorite !== null) localStorage.setItem(FAV_KEY, String(favorite))
    } catch {
      /* ignore */
    }
  }, [favorite])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      const onControl = t.closest('button, a, input, textarea, select')
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          if (!e.repeat) dispatch({ type: 'next' })
          e.preventDefault()
          break
        case 'ArrowLeft':
        case 'PageUp':
          if (!e.repeat) dispatch({ type: 'prev' })
          e.preventDefault()
          break
        case ' ':
        case 'k':
          if (onControl && e.key === ' ') return // let the focused button handle Space natively
          if (!e.repeat) dispatch({ type: 'toggle' })
          e.preventDefault()
          break
        case 'm':
        case 'M':
          if (!e.repeat) audio.setMuted(!audio.muted)
          break
        case 'Home':
          dispatch({ type: 'go', scene: INTRO })
          break
        case 'End':
          dispatch({ type: 'go', scene: OUTRO })
          break
        default:
          if (/^[1-8]$/.test(e.key)) dispatch({ type: 'go', scene: +e.key })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // touch swipe (no drag-follow: the reference has no gestural motion to mirror)
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null)
  const swiped = useRef(false)
  const onPointerDown = (e: React.PointerEvent) => {
    swiped.current = false
    if (e.pointerType !== 'mouse') swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      swiped.current = true
      dispatch({ type: dx < 0 ? 'next' : 'prev' })
    }
  }
  // a swipe that started on the deck must not also toggle playback
  const onClickCapture = (e: React.MouseEvent) => {
    if (swiped.current) {
      e.stopPropagation()
      e.preventDefault()
      swiped.current = false
    }
  }

  // if the focused control left with its scene, hand focus to the new heading
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const a = document.activeElement as HTMLElement | null
      const leaving = a?.closest('[aria-hidden="true"]') || (!trackOf(scene) && a?.closest('.hdr'))
      if (!a || a === document.body || leaving) {
        document.querySelector<HTMLElement>('.scene-wrap:not([aria-hidden="true"]) [data-heading]')?.focus({ preventScroll: true })
      }
    })
    return () => cancelAnimationFrame(id)
  }, [scene])

  const toggle = useCallback(() => dispatch({ type: 'toggle' }), [])
  const bg = track ? track.bg : NEUTRAL_BG
  const announce = track
    ? `第 ${track.no} 首，共 ${TRACKS.length} 首：${track.title} ${track.sub}，${playing ? '播放中' : '已暂停'}`
    : scene === INTRO
      ? 'JAZZ, NOW. 封面'
      : '结尾：哪种爵士击中了你？'

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="viewport"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
        onClickCapture={onClickCapture}
      >
        <div className="bg" style={{ ['--c1' as string]: bg[0], ['--c2' as string]: bg[1] }} />
        <div className="beat-glow" ref={glowRef} style={{ ['--glow' as string]: track ? track.accent : '#ecc47c' }} />
        <div className="vignette" />
        <div className="grain" />
        <main
          className={`stage ${stage.portrait ? 'port' : 'land'}`}
          style={{ width: stage.W, height: stage.H, transform: `translate(-50%, -50%) scale(${stage.scale})` }}
        >
          <AnimatePresence>
            {track && (
              <Header
                key="hdr"
                current={track.no - 1}
                onHome={() => dispatch({ type: 'go', scene: INTRO })}
                onJump={(i) => dispatch({ type: 'go', scene: i + 1 })}
              />
            )}
          </AnimatePresence>

          <AnimatePresence initial={true}>
            <SceneWrap key={scene}>
              {(live) =>
                track ? (
                  <TrackScene
                    track={track}
                    dir={dir}
                    live={live}
                    playing={playing}
                    portrait={stage.portrait}
                    onToggle={toggle}
                  />
                ) : scene === INTRO ? (
                  <IntroScene
                    onPick={(i) => dispatch({ type: 'go', scene: i + 1, play: true })}
                    hasProgress={engine.progress.some((p) => p > 0)}
                  />
                ) : (
                  <OutroScene
                    favorite={favorite}
                    onPick={(i) => dispatch({ type: 'pick', index: i })}
                    onHome={() => dispatch({ type: 'go', scene: INTRO })}
                  />
                )
              }
            </SceneWrap>
          </AnimatePresence>

          {scene > INTRO && (
            <button className="edge prev" onClick={() => dispatch({ type: 'prev' })} aria-label="上一个">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </button>
          )}
          {scene < OUTRO && (
            <button className="edge next" onClick={() => dispatch({ type: 'next' })} aria-label="下一个">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </main>
        <div className="sr-only" aria-live="polite">
          {announce}
        </div>
      </div>
    </MotionConfig>
  )
}
