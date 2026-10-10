// All motion timing lives here so the whole piece can be calibrated in one place.
// Values measured frame-by-frame from the reference (30fps) where possible.

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1] // slide-in, no overshoot
export const EASE_IN: [number, number, number, number] = [0.5, 0, 0.75, 0]
export const EASE_INOUT: [number, number, number, number] = [0.65, 0, 0.35, 1]

export const T = {
  /** text column fades out first (ref: title dims within ~0.2s) */
  textExit: 0.22,
  /** device shrinks + drops + fades (ref 15.0→15.3s) */
  deviceExit: 0.34,
  deviceExitDelay: 0.08,
  /** new device starts sliding once old one is mostly gone */
  enterDelay: 0.34,
  /** slide from off-screen left, decelerating (ref 15.3→15.8s) */
  deviceEnter: 0.62,
  /** text cascade starts while device is still settling */
  textStart: 0.62,
  textStagger: 0.085,
  textDur: 0.38,
  ruleDur: 0.5,
  /** background colour crossfade (CSS, see styles.css --bg-dur) */
  bg: 0.7,
  /** intro / outro */
  introStagger: 0.07,
  sceneFade: 0.4,
} as const

/** ms each track plays before the album auto-advances (ref ≈ 10.5s per style) */
export const TRACK_MS = 10500

/** turntable: 33⅓ rpm = 200°/s; spin-up/down time constant */
export const RECORD_DEG_PER_S = 200
export const SPIN_TAU = 0.45

/** tonearm angles (deg, clockwise from straight down) */
export const ARM_REST = -2
export const ARM_PLAY = 19
