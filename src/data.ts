// 8 styles from the reference video. Copy translated to Chinese; titles / meta kept as in reference.
export type Device = 'vinyl' | 'cassette'

export interface Track {
  id: string
  no: number
  title: string
  sub: string
  device: Device
  /** UI accent: track label, rule, chips, bars, LED */
  accent: string
  /** vinyl label colour (Afro Jazz differs from its accent) */
  labelColor: string
  /** cassette shell colour + bottom trapezoid shade */
  shell?: string
  shellDark?: string
  /** background radial glow: centre / edge */
  bg: [string, string]
  meta: string[]
  bpm: number
  desc: string
  tags: string[]
  /** synth voices (see audio.ts) that light up each tag chip, index-aligned with tags */
  tagVoices: string[][]
}

export const TRACKS: Track[] = [
  {
    id: 'math', no: 1, title: 'MATH JAZZ', sub: '数学爵士', device: 'vinyl',
    accent: '#5fd3f6', labelColor: '#5fd3f6', bg: ['#14659a', '#06131f'],
    meta: ['7/8', 'BPM 167', 'E LYDIAN'], bpm: 167,
    desc: '数学摇滚的变拍子与点弦，\n叠上爵士的和声',
    tags: ['点弦吉他', '7 拍子', '2+2+3'],
    tagVoices: [['pluck'], ['bar'], ['accent']],
  },
  {
    id: 'hyper', no: 2, title: 'HYPER PIANO TRIO', sub: '超技钢琴三重奏', device: 'cassette',
    accent: '#ff4f7c', labelColor: '#ff4f7c', shell: '#24242b', shellDark: '#1b1b21',
    bg: ['#8c1740', '#1e060f'],
    meta: ['4/4', 'BPM 150', 'C MINOR'], bpm: 150,
    desc: '超绝技巧的钢琴与贝斯，\n以分毫不差的齐奏疾驰',
    tags: ['钢琴贝斯齐奏', '重拍切分', '摇滚鼓点'],
    tagVoices: [['run'], ['kime'], ['kick', 'snare']],
  },
  {
    id: 'jungle', no: 3, title: 'JUNGLE JAZZ', sub: '丛林爵士', device: 'vinyl',
    accent: '#6fe68e', labelColor: '#78e898', bg: ['#1f7a37', '#071a0c'],
    meta: ['BPM 174', 'KEY Fm'], bpm: 174,
    desc: '在高速碎拍之上，\n电钢琴与萨克斯游弋',
    tags: ['碎拍', '电钢琴', '萨克斯风'],
    tagVoices: [['kick', 'snare'], ['keys'], ['sax']],
  },
  {
    id: 'broken', no: 4, title: 'BROKEN BEAT', sub: '碎拍', device: 'cassette',
    accent: '#ffa23c', labelColor: '#ffa23c', shell: '#ff922c', shellDark: '#e07a1c',
    bg: ['#96500f', '#221005'],
    meta: ['BPM 122', 'KEY Fm'], bpm: 122,
    desc: '被打散的底鼓与军鼓，\n让俱乐部与爵士交汇',
    tags: ['打散的节拍', '电钢琴', '号角风'],
    tagVoices: [['kick', 'snare'], ['keys'], ['horn']],
  },
  {
    id: 'neosoul', no: 5, title: 'NEO-SOUL JAZZ', sub: '新灵魂爵士', device: 'vinyl',
    accent: '#b56ff3', labelColor: '#a95ae8', bg: ['#5a2697', '#150823'],
    meta: ['BPM 84', 'KEY A♭'], bpm: 84,
    desc: '刻意错位的律动，\n与厚重的张力和声',
    tags: ['错位律动', '电钢琴', '合成贝斯'],
    tagVoices: [['snare'], ['keys'], ['bass']],
  },
  {
    id: 'nu', no: 6, title: 'NU JAZZ', sub: '新爵士', device: 'cassette',
    accent: '#4fe9ee', labelColor: '#4fe9ee', shell: '#e9ebef', shellDark: '#c4c6cb',
    bg: ['#10899a', '#041e24'],
    meta: ['BPM 122', 'KEY Dm'], bpm: 122,
    desc: '在四踩底鼓之上，\n鸣响爵士钢琴与颤音琴',
    tags: ['四踩', '钢琴和弦', '颤音琴风'],
    tagVoices: [['kick'], ['keys'], ['vibes']],
  },
  {
    id: 'afro', no: 7, title: 'AFRO JAZZ', sub: '非洲爵士', device: 'vinyl',
    accent: '#f4c443', labelColor: '#e2412f', bg: ['#94740f', '#1f1704'],
    meta: ['12/8', 'BPM 100', 'D MINOR'], bpm: 100,
    desc: '12/8 的铃声刻出复节奏，\n号角声声相呼应',
    tags: ['铃的律动', '钢琴反复', '号角风'],
    tagVoices: [['bell'], ['keys'], ['horn']],
  },
  {
    id: 'chops', no: 8, title: 'CHOPS FUSION', sub: '炫技融合', device: 'cassette',
    accent: '#9a78ff', labelColor: '#b49cff', shell: '#6448dc', shellDark: '#5236c0',
    bg: ['#4a1fb2', '#0e062a'],
    meta: ['BPM 100', 'KEY E♭'], bpm: 100,
    desc: '手数繁密的高速加花，\n与起伏的合成贝斯',
    tags: ['高速加花', '合成贝斯', '合成主音'],
    tagVoices: [['fill'], ['bass'], ['lead']],
  },
]

export const NEUTRAL_BG: [string, string] = ['#3a2e26', '#0f0c0b']
export const GOLD = '#ecc47c'

/** scene index: 0 = intro, 1..8 = tracks, 9 = outro */
export const INTRO = 0
export const OUTRO = TRACKS.length + 1
export const trackOf = (scene: number): Track | null =>
  scene >= 1 && scene <= TRACKS.length ? TRACKS[scene - 1] : null

export const pad2 = (n: number) => String(n).padStart(2, '0')
