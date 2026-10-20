export type EraId =
  | "radio"
  | "vinyl"
  | "cassette"
  | "cd"
  | "mp3"
  | "ipod"
  | "mp4"
  | "stream"
  | "relic";
export type YearSource = "demo" | "original" | "tag" | "manual" | "unknown";
export type RepeatMode = "all" | "one" | "off";

export interface Track {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  yearSource: YearSource;
  duration: number;
  src: string;
  cover: string;
  isDemo: boolean;
  fileName?: string;
  addedAt?: number;
}

export interface Era {
  id: EraId | "unknown";
  label: string;
  english: string;
  yearLabel: string;
  year: string;
  period: string;
  headline: [string, string];
  caption: string;
  note: string;
  accent: string;
  number: string;
}

export interface Preferences {
  volume: number;
  muted: boolean;
  reducedMotion: boolean;
  soundEffects: boolean;
  digitalDefault: "ipod" | "mp4";
  repeat: RepeatMode;
  shuffle: boolean;
}

export const ERAS: Era[] = [
  {
    id: "radio",
    label: "收音机",
    english: "RADIO DAYS",
    yearLabel: "1950s",
    year: "1957",
    period: "— 1959",
    headline: ["世界很大，", "声音很近。"],
    caption: "转动旋钮，让远方的声音抵达此刻。",
    note: "转动调谐旋钮，在电台之间换一首歌",
    accent: "#946744",
    number: "01",
  },
  {
    id: "vinyl",
    label: "黑胶唱机",
    english: "THE GROOVE YEARS",
    yearLabel: "1960s",
    year: "1972",
    period: "1960 — 1979",
    headline: ["唱针落下，", "旧日醒来。"],
    caption: "细细的纹路里，刻着一整个年代的心跳。",
    note: "把唱臂移到唱片上，落针即播放",
    accent: "#a07c3c",
    number: "02",
  },
  {
    id: "cassette",
    label: "磁带随身听",
    english: "THE MAGNETIC ERA",
    yearLabel: "1980s",
    year: "1984",
    period: "1980 — 1989",
    headline: ["把时光，", "轻轻倒带。"],
    caption: "那些舍不得快进的日子，都藏在这一面。",
    note: "按下 PLAY；按住 REW / FF 快速卷带",
    accent: "#cf593b",
    number: "03",
  },
  {
    id: "cd",
    label: "CD 播放机",
    english: "A SILVER REVOLUTION",
    yearLabel: "1990s",
    year: "1996",
    period: "1990 — 1999",
    headline: ["一圈一圈，", "转回从前。"],
    caption: "光落在银色唱片上，折射出整个夏天。",
    note: "打开舱盖换一张碟，合上就播放",
    accent: "#647c87",
    number: "04",
  },
  {
    id: "mp3",
    label: "MP3 播放器",
    english: "A POCKETFUL OF MUSIC",
    yearLabel: "2000s",
    year: "2002",
    period: "2000 — 2004",
    headline: ["整个世界，", "装进口袋。"],
    caption: "小小的屏幕，存着一整个青春。",
    note: "方向键切歌，按住快进快退",
    accent: "#5a776c",
    number: "05",
  },
  {
    id: "ipod",
    label: "iPod",
    english: "A THOUSAND SONGS",
    yearLabel: "2005+",
    year: "2008",
    period: "2005 — 2012",
    headline: ["指尖一转，", "就是远方。"],
    caption: "白色耳机线，连着只属于你的世界。",
    note: "MENU 里转盘选曲；播放界面转盘调音量",
    accent: "#a17b57",
    number: "06",
  },
  {
    id: "mp4",
    label: "MP4 播放器",
    english: "SOUND IN FULL COLOR",
    yearLabel: "2005+",
    year: "2009",
    period: "2005 — 2012",
    headline: ["第一次，", "看见声音。"],
    caption: "在一块小彩屏里，把喜欢放到最大。",
    note: "轻触屏幕切换封面与声波，也可以全屏观看",
    accent: "#726f95",
    number: "07",
  },
  {
    id: "stream",
    label: "流媒体",
    english: "SOUND WITHOUT BORDERS",
    yearLabel: "2013+",
    year: "2024",
    period: "2013 — NOW",
    headline: ["声音无形，", "情绪有迹。"],
    caption: "让音乐自由流淌，在此刻泛起涟漪。",
    note: "拖动外圈调整进度，轻触泛起涟漪",
    accent: "#497f83",
    number: "08",
  },
  {
    id: "relic",
    label: "脑机芯片",
    english: "BEYOND LISTENING",
    yearLabel: "2077?",
    year: "2077",
    period: "AN IMAGINED FUTURE",
    headline: ["下一首，", "在脑海里。"],
    caption: "如果记忆可以接入，音乐会抵达哪里？",
    note: "把芯片推进接口，让声音沿神经生长",
    accent: "#a46858",
    number: "09",
  },
];

export const UNKNOWN_ERA: Era = {
  id: "unknown",
  label: "待定年代",
  english: "A MEMORY WITHOUT A DATE",
  yearLabel: "未知",
  year: "— —",
  period: "YEAR UNKNOWN",
  headline: ["好声音，", "不问来处。"],
  caption: "给这首歌补一个年份，或自由挑选一种载体。",
  note: "点年份标签，补上这段声音的年代",
  accent: "#7d8174",
  number: "—",
};

export const DEMO_TRACKS: Track[] = [
  {
    id: "demo-radio",
    title: "午后三点的广播",
    artist: "声物声音实验室",
    year: 1957,
    yearSource: "demo",
    duration: 0,
    src: "/audio/radio.wav",
    cover: "/artworks/radio.svg",
    isDemo: true,
  },
  {
    id: "demo-vinyl",
    title: "黄昏舞池",
    artist: "声物声音实验室",
    year: 1972,
    yearSource: "demo",
    duration: 0,
    src: "/audio/vinyl.wav",
    cover: "/artworks/vinyl.svg",
    isDemo: true,
  },
  {
    id: "demo-cassette",
    title: "晚风来信",
    artist: "声物声音实验室",
    year: 1984,
    yearSource: "demo",
    duration: 0,
    src: "/audio/cassette.wav",
    cover: "/artworks/cassette.svg",
    isDemo: true,
  },
  {
    id: "demo-cd",
    title: "蓝色星期天",
    artist: "声物声音实验室",
    year: 1996,
    yearSource: "demo",
    duration: 0,
    src: "/audio/cd.wav",
    cover: "/artworks/cd.svg",
    isDemo: true,
  },
  {
    id: "demo-mp3",
    title: "口袋里的宇宙",
    artist: "声物声音实验室",
    year: 2002,
    yearSource: "demo",
    duration: 0,
    src: "/audio/mp3.wav",
    cover: "/artworks/mp3.svg",
    isDemo: true,
  },
  {
    id: "demo-ipod",
    title: "日落公路",
    artist: "声物声音实验室",
    year: 2008,
    yearSource: "demo",
    duration: 0,
    src: "/audio/ipod.wav",
    cover: "/artworks/ipod.svg",
    isDemo: true,
  },
  {
    id: "demo-stream",
    title: "浮光之间",
    artist: "声物声音实验室",
    year: 2024,
    yearSource: "demo",
    duration: 0,
    src: "/audio/stream.wav",
    cover: "/artworks/stream.svg",
    isDemo: true,
  },
];

export const DEFAULT_PREFERENCES: Preferences = {
  volume: 0.65,
  muted: false,
  reducedMotion: false,
  soundEffects: false,
  digitalDefault: "ipod",
  repeat: "all",
  shuffle: false,
};

export function parseYear(
  value: unknown,
  currentYear = new Date().getFullYear(),
): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const text = String(value).trim();
  if (!/^\d{4}(?:$|[-/])/.test(text)) return null;
  const year = Number(text.slice(0, 4));
  return Number.isInteger(year) && year >= 1877 && year <= currentYear
    ? year
    : null;
}

export function resolveMetadataYear(tags: {
  originalyear?: unknown;
  originaldate?: unknown;
  year?: unknown;
  date?: unknown;
}): { year: number | null; yearSource: YearSource } {
  const original = parseYear(tags.originalyear) ?? parseYear(tags.originaldate);
  if (original !== null) return { year: original, yearSource: "original" };
  const tagged = parseYear(tags.year) ?? parseYear(tags.date);
  return { year: tagged, yearSource: tagged === null ? "unknown" : "tag" };
}

export function eraForYear(
  year: number | null,
  digitalDefault: "ipod" | "mp4" = "ipod",
): Era {
  if (parseYear(year) === null) return UNKNOWN_ERA;
  const y = year as number;
  const id: EraId =
    y < 1960
      ? "radio"
      : y < 1980
        ? "vinyl"
        : y < 1990
          ? "cassette"
          : y < 2000
            ? "cd"
            : y < 2005
              ? "mp3"
              : y < 2013
                ? digitalDefault
                : "stream";
  return ERAS.find((era) => era.id === id)!;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function nextTrackId(
  tracks: Track[],
  currentId: string,
  direction: 1 | -1,
  shuffle: boolean,
): string {
  if (!tracks.length) return currentId;
  const index = tracks.findIndex((track) => track.id === currentId);
  if (shuffle && tracks.length > 1 && direction === 1) {
    const others = tracks.filter((track) => track.id !== currentId);
    return others[Math.floor(Math.random() * others.length)].id;
  }
  return tracks[(index + direction + tracks.length) % tracks.length].id;
}

export function createQueueOrder(
  tracks: Track[],
  currentId: string,
  shuffle: boolean,
): string[] {
  const ids = tracks.map((track) => track.id);
  if (!shuffle) return ids;
  const remaining = ids.filter((id) => id !== currentId);
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return ids.includes(currentId) ? [currentId, ...remaining] : remaining;
}

export function withYearOverride(
  track: Track,
  overrides: Record<string, number | null>,
): Track {
  if (!Object.prototype.hasOwnProperty.call(overrides, track.id)) return track;
  const year = parseYear(overrides[track.id]);
  return { ...track, year, yearSource: year === null ? "unknown" : "manual" };
}

export const YEAR_SOURCE_LABELS: Record<YearSource, string> = {
  demo: "演示场景年份",
  original: "原始发行标签",
  tag: "文件发行标签",
  manual: "你设置的年份",
  unknown: "未找到年份标签",
};
