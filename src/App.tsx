import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent, FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CassetteTape,
  Check,
  CircleDot,
  Cpu,
  Disc3,
  Heart,
  ListMusic,
  LoaderCircle,
  MonitorPlay,
  Music2,
  Pause,
  Pencil,
  Play,
  Plus,
  Radio,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Turntable,
  Volume2,
  VolumeX,
} from "lucide-react";
import { DeviceStage } from "./components/DeviceStage";
import { Modal } from "./components/Modal";
import { SocialLink } from "./components/SocialLink";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import {
  DEMO_TRACKS,
  ERAS,
  YEAR_SOURCE_LABELS,
  createQueueOrder,
  eraForYear,
  formatTime,
  nextTrackId,
  parseYear,
  withYearOverride,
} from "./lib/model";
import type { EraId, Preferences, Track } from "./lib/model";
import { importAudio } from "./lib/importAudio";
import {
  deleteSavedTrack,
  hydrateTrack,
  readLocal,
  readPreferences,
  readSavedTracks,
  releaseTrack,
  saveTrack,
  writeLocal,
} from "./lib/storage";

const ERA_ICONS = {
  radio: Radio,
  vinyl: Turntable,
  cassette: CassetteTape,
  cd: Disc3,
  mp3: Music2,
  ipod: CircleDot,
  mp4: MonitorPlay,
  stream: AudioLines,
  relic: Cpu,
};
type ModalId = "library" | "year" | "settings" | "about" | null;

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M5 12v8M12 5v22M19 9v14M26 7v18"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function YearEditor({
  track,
  onSave,
  onReset,
  onClose,
}: {
  track: Track;
  onSave: (value: number | null) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(track.year?.toString() ?? "");
  const [error, setError] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value && (!/^\d{4}$/.test(value) || parseYear(value) === null)) {
      setError(
        `请输入 1877—${new Date().getFullYear()} 之间的四位年份，或留空。`,
      );
      return;
    }
    onSave(value ? Number(value) : null);
  };
  return (
    <Modal
      title="给声音一个年代"
      eyebrow="A DATE FOR YOUR MEMORY"
      onClose={onClose}
    >
      <p className="modal-description">{track.title}</p>
      <form onSubmit={submit}>
        <label className="field-label" htmlFor="release-year">
          {track.isDemo ? "演示场景年份" : "这份录音首次发行的年份"}
        </label>
        <div className="year-input-wrap">
          <input
            autoFocus
            id="release-year"
            type="number"
            min="1877"
            max={new Date().getFullYear()}
            placeholder="例如 1984"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError("");
            }}
          />
          <span>YEAR</span>
        </div>
        <p className="field-note">
          当前来源：{YEAR_SOURCE_LABELS[track.yearSource]}。
          {track.isDemo
            ? "演示曲为原创片段，年份用于体验不同载体。"
            : "旧录音再版可改回原年份；翻唱、重录与现场版使用各自的发行年。"}
        </p>
        <p className="field-note">
          留空会标记为“年份未知”。手动穿越无需修改这里。
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="text-button" onClick={onReset}>
            恢复原始年份
          </button>
          <button type="submit" className="solid-button">
            保存年份
            <Check size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Library({
  tracks,
  currentId,
  favorites,
  playing,
  onFavorite,
  onSelect,
  onRemove,
  onImport,
  importing,
  onClose,
}: {
  tracks: Track[];
  currentId: string;
  favorites: string[];
  playing: boolean;
  onFavorite: (id: string) => void;
  onSelect: (id: string) => void;
  onRemove: (track: Track) => void;
  onImport: () => void;
  importing: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "local" | "favorites">("all");
  const filtered = tracks.filter(
    (track) =>
      (filter === "all" ||
        (filter === "local" ? !track.isDemo : favorites.includes(track.id))) &&
      `${track.title} ${track.artist} ${track.year ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <Modal
      title="你的声音收藏"
      eyebrow="THE SOUND COLLECTION"
      onClose={onClose}
      drawer
    >
      <div className="library-search">
        <Search size={17} />
        <input
          autoFocus
          type="search"
          placeholder="找一首歌，或一个年份"
          aria-label="搜索音乐"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="library-filters">
        {(
          [
            ["all", "全部声音"],
            ["local", "我的音乐"],
            ["favorites", "心头好"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={filter === id}
            className={filter === id ? "active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="library-list">
        {filtered.map((track, index) => (
          <div
            className={`library-track ${currentId === track.id ? "current" : ""}`}
            key={track.id}
          >
            <span className="track-index">
              {currentId === track.id && playing ? (
                <AudioLines size={15} />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <button
              className="library-track-select"
              onClick={() => onSelect(track.id)}
              aria-label={`播放 ${track.title}`}
            >
              <img src={track.cover} alt="" />
              <span>
                <strong>{track.title}</strong>
                <small>{track.isDemo ? "原创体验片段" : track.artist}</small>
              </span>
              <span className="track-year">
                {track.year ?? "未知"}
                <small>{track.isDemo ? "模拟年代" : "发行年份"}</small>
              </span>
            </button>
            <button
              className={`icon-button favorite-button ${favorites.includes(track.id) ? "active" : ""}`}
              onClick={() => onFavorite(track.id)}
              aria-label={`${favorites.includes(track.id) ? "取消收藏" : "收藏"} ${track.title}`}
              aria-pressed={favorites.includes(track.id)}
            >
              <Heart
                size={17}
                fill={favorites.includes(track.id) ? "currentColor" : "none"}
              />
            </button>
            {!track.isDemo && (
              <button
                className="icon-button delete-track"
                onClick={() => onRemove(track)}
                aria-label={`移除 ${track.title}`}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
        {!filtered.length && (
          <div className="empty-library">
            <Music2 size={30} />
            <h3>
              {query
                ? "还没有找到这段声音"
                : filter === "favorites"
                  ? "把喜欢的声音留下来"
                  : "带一首自己的歌来吧"}
            </h3>
            <p>
              {query
                ? "试试歌名、艺术家或年份。"
                : filter === "favorites"
                  ? "点亮歌曲旁的爱心，它就会出现在这里。"
                  : "导入音频，看看它会变成哪一种载体。"}
            </p>
          </div>
        )}
      </div>
      <div className="library-bottom">
        <button
          className="solid-button wide-button"
          disabled={importing}
          onClick={onImport}
        >
          {importing ? (
            <LoaderCircle size={17} className="spin-icon" />
          ) : (
            <Plus size={18} />
          )}
          导入自己的音乐
        </button>
        <p>
          音频保存在这台设备的浏览器中。
          <br />
          演示曲为原创声音片段，年份是年代场景设定。
        </p>
      </div>
    </Modal>
  );
}

export default function App() {
  const [rawTracks, setRawTracks] = useState<Track[]>(DEMO_TRACKS);
  const [currentId, setCurrentId] = useState("demo-cassette");
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);
  const [overrides, setOverrides] = useState<Record<string, number | null>>(
    () => {
      const value = readLocal<unknown>("years", {});
      return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, number | null>)
        : {};
    },
  );
  const [favorites, setFavorites] = useState<string[]>(() => {
    const value = readLocal<unknown>("favorites", []);
    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string")
      : [];
  });
  const [manualEra, setManualEra] = useState<EraId | null>(null);
  const [modal, setModal] = useState<ModalId>(null);
  const [toast, setToast] = useState("");
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const tracksRef = useRef(rawTracks);
  const objectUrls = useRef(new Map<string, Track>());
  const busy = useRef(false);
  const dragCount = useRef(0);
  const tracks = useMemo(
    () => rawTracks.map((track) => withYearOverride(track, overrides)),
    [rawTracks, overrides],
  );
  // Keep one shuffled order through a listening session, including when repeat is off.
  const queueOrder = useMemo(
    () => createQueueOrder(rawTracks, currentId, preferences.shuffle),
    [rawTracks, preferences.shuffle],
  );
  const playbackQueue = queueOrder
    .map((id) => tracks.find((item) => item.id === id))
    .filter((item): item is Track => !!item);
  const track =
    tracks.find((item) => item.id === currentId) ??
    tracks.find((item) => item.id === "demo-cassette") ??
    tracks[0];
  tracksRef.current = rawTracks;
  const endedRef = useRef<() => void>(() => undefined);
  const player = useAudioPlayer(track, preferences, () => endedRef.current());
  const era = manualEra
    ? ERAS.find((item) => item.id === manualEra)!
    : eraForYear(track.year, preferences.digitalDefault);
  const selectedFavorite = favorites.includes(track.id);
  const patchPreferences = useCallback(
    (patch: Partial<Preferences>) =>
      setPreferences((value) => ({ ...value, ...patch })),
    [],
  );
  const selectTrack = useCallback(
    (id: string, autoplay = true) => {
      if (id === currentId) {
        if (autoplay) void player.play();
        return;
      }
      player.prepareTrack(autoplay);
      setCurrentId(id);
    },
    [currentId, player.play, player.prepareTrack],
  );
  const go = (direction: 1 | -1) =>
    selectTrack(nextTrackId(playbackQueue, track.id, direction, false));
  endedRef.current = () => {
    if (
      preferences.repeat === "off" &&
      playbackQueue[playbackQueue.length - 1]?.id === track.id
    ) {
      player.pause();
      return;
    }
    if (tracks.length === 1) {
      if (preferences.repeat === "off") player.pause();
      else void player.play();
      return;
    }
    go(1);
  };

  useEffect(() => {
    writeLocal("preferences", preferences);
  }, [preferences]);
  useEffect(() => {
    writeLocal("years", overrides);
  }, [overrides]);
  useEffect(() => {
    writeLocal("favorites", favorites);
  }, [favorites]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4800);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    let cancelled = false;
    void readSavedTracks()
      .then((saved) => {
        if (cancelled) return;
        const restored = saved
          .filter(
            (item) => !tracksRef.current.some((track) => track.id === item.id),
          )
          .map(hydrateTrack);
        restored.forEach((item) => objectUrls.current.set(item.id, item));
        setRawTracks((current) => [...current, ...restored]);
      })
      .catch(() => setToast("这个浏览器暂时无法保存音乐，本次导入仍可播放。"));
    return () => {
      cancelled = true;
      objectUrls.current.forEach(releaseTrack);
      objectUrls.current.clear();
    };
  }, []);
  useEffect(() => {
    const keyboard = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        modal ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target.isContentEditable ||
        target.closest(
          'input, textarea, select, button, [role="slider"], [role="group"]',
        )
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        player.toggle();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        player.skipSeconds(-5);
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        player.skipSeconds(5);
      } else if (event.code === "KeyM")
        patchPreferences({ muted: !preferences.muted });
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [
    modal,
    preferences.muted,
    player.toggle,
    player.skipSeconds,
    patchPreferences,
  ]);

  const handleImport = async (files: File[]) => {
    if (!files.length || busy.current) return;
    busy.current = true;
    setImporting(true);
    setDragging(false);
    dragCount.current = 0;
    const imported: Track[] = [];
    const errors: string[] = [];
    let duplicates = 0;
    let unsaved = 0;
    for (const file of files) {
      try {
        const saved = await importAudio(file);
        if (
          tracksRef.current.some((track) => track.id === saved.id) ||
          imported.some((track) => track.id === saved.id)
        ) {
          duplicates++;
          continue;
        }
        try {
          await saveTrack(saved);
        } catch {
          unsaved++;
        }
        const ready = hydrateTrack(saved);
        objectUrls.current.set(ready.id, ready);
        imported.push(ready);
      } catch (error) {
        errors.push(
          error instanceof Error ? error.message : "有一个文件没能导入",
        );
      }
    }
    if (imported.length) {
      setRawTracks((current) => [...current, ...imported]);
      player.prepareTrack(false);
      setCurrentId(imported[0].id);
      setManualEra(null);
      setModal(null);
    }
    setImporting(false);
    busy.current = false;
    const messages = [
      imported.length
        ? `已收好 ${imported.length} 首音乐，点播放开始聆听。`
        : "",
      duplicates ? `${duplicates} 首已在收藏中。` : "",
      unsaved ? "存储空间不足，部分歌曲仅在本次打开时可用。" : "",
      errors.slice(0, 2).join("；"),
    ].filter(Boolean);
    setToast(messages.join(" "));
  };

  const removeTrack = async (removed: Track) => {
    try {
      await deleteSavedTrack(removed.id);
    } catch {
      setToast("暂时无法更新音乐库，请稍后再试。");
      return;
    }
    if (currentId === removed.id) selectTrack("demo-cassette", false);
    setRawTracks((current) => current.filter((item) => item.id !== removed.id));
    setFavorites((current) => current.filter((id) => id !== removed.id));
    const owned = objectUrls.current.get(removed.id);
    if (owned) {
      objectUrls.current.delete(removed.id);
      window.setTimeout(() => releaseTrack(owned), 1000);
    }
    setToast("已从音乐库移除，原始文件仍保留在你的设备上。");
  };
  const favorite = (id: string) =>
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const chooseEra = (id: EraId) => {
    player.mechanicalClick();
    setManualEra(id);
  };
  const setVolume = (value: number) =>
    patchPreferences({ volume: value, muted: false });
  const hasFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer.types).includes("Files");
  const dragEnter = (event: DragEvent) => {
    if (hasFiles(event)) {
      event.preventDefault();
      dragCount.current++;
      setDragging(true);
    }
  };
  const dragLeave = (event: DragEvent) => {
    if (hasFiles(event)) {
      dragCount.current--;
      if (dragCount.current <= 0) setDragging(false);
    }
  };
  const drop = (event: DragEvent) => {
    if (hasFiles(event)) {
      event.preventDefault();
      void handleImport(Array.from(event.dataTransfer.files));
    }
  };
  const progress = player.duration
    ? Math.min(100, (player.time / player.duration) * 100)
    : 0;

  return (
    <div
      className={`app ${preferences.reducedMotion ? "reduced-motion" : ""} ${era.id === "relic" ? "future-mode" : ""}`}
      style={{ "--accent": era.accent } as CSSProperties}
      onDragEnter={dragEnter}
      onDragLeave={dragLeave}
      onDragOver={(event) => {
        if (hasFiles(event)) event.preventDefault();
      }}
      onDrop={drop}
    >
      <audio
        ref={player.audioRef}
        preload="metadata"
        data-testid="audio-engine"
      />
      <input
        ref={fileInput}
        className="hidden-input"
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac,.opus,.aiff,.mp4"
        multiple
        aria-label="选择本地音频文件"
        onChange={(event) => {
          void handleImport(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <div className="app-shell">
        <header className="site-header">
          <a href="#listening-room" className="brand" aria-label="声物首页">
            <BrandMark />
            <span className="brand-name">
              声物<span>SONIC RELICS</span>
            </span>
          </a>
          <nav className="main-nav" aria-label="主导航">
            <button className="active" onClick={() => setModal(null)}>
              聆听室
            </button>
            <button onClick={() => setModal("library")}>声音收藏</button>
            <button onClick={() => setModal("about")}>
              关于声物
              <ArrowUpRight size={13} />
            </button>
          </nav>
          <div className="header-actions">
            <SocialLink platform="github" />
            <button
              className="icon-button settings-button"
              onClick={() => setModal("settings")}
              aria-label="偏好设置"
            >
              <SlidersHorizontal size={19} />
            </button>
            <button
              className="import-button"
              onClick={() => fileInput.current?.click()}
              disabled={importing}
            >
              {importing ? (
                <LoaderCircle size={16} className="spin-icon" />
              ) : (
                <Plus size={18} />
              )}
              <span>{importing ? "正在收录" : "导入音乐"}</span>
            </button>
          </div>
        </header>
        <main id="listening-room">
          <div className="room-intro">
            <span>
              <span className="small-star">✳</span> 一座可以聆听的时光博物馆
            </span>
            <span className="intro-edition">
              AN EXPERIMENT IN SOUND & TIME <i /> VOL. 001
            </span>
          </div>
          <section className="listening-room" aria-label="年代播放器">
            <div
              className="era-story"
              key={`${era.id}-${manualEra ? "manual" : "auto"}`}
            >
              <div className="era-eyebrow">
                <span className="accent-line" />
                {era.english}
              </div>
              <button
                className="era-year-button"
                onClick={() => setModal("year")}
                aria-label="编辑歌曲年份"
              >
                <span
                  className={`era-year ${era.id === "unknown" ? "unknown-year" : ""}`}
                >
                  {manualEra ? era.year : (track.year ?? "— —")}
                </span>
                <ArrowUpRight size={18} />
              </button>
              <div className="year-context">
                <span>
                  {manualEra
                    ? "自由穿越"
                    : track.isDemo
                      ? "演示年代"
                      : "发行年份"}
                </span>
                <i />
                {manualEra ? `原曲 ${track.year ?? "年份未知"}` : era.period}
              </div>
              <h1>
                {era.headline[0]}
                <br />
                {era.headline[1]}
              </h1>
              <p className="era-caption">{era.caption}</p>
              <div className="story-bottom">
                <span className="story-line" />
                <span>EVERY SOUND HAS A SOUL.</span>
              </div>
            </div>
            <div className="object-exhibit">
              <div className="exhibit-header">
                <span>
                  <i className={`live-dot ${player.playing ? "on" : ""}`} />
                  {player.playing
                    ? "NOW PLAYING"
                    : player.status === "loading"
                      ? "LOADING SOUND"
                      : player.status === "error"
                        ? "AUDIO UNAVAILABLE"
                        : "READY TO PLAY"}
                </span>
                <span className="exhibit-count">
                  {era.number}
                  <span> / {String(ERAS.length).padStart(2, "0")}</span>
                </span>
              </div>
              <DeviceStage
                era={era}
                track={track}
                tracks={tracks}
                player={player}
                preferences={preferences}
                onVolume={setVolume}
                onNext={() => go(1)}
                onPrevious={() => go(-1)}
                onLibrary={() => setModal("library")}
                onSelect={selectTrack}
              />
              <div className="exhibit-hint">
                <span className="hint-cross">+</span>
                {era.note}
                <span className="hint-cross">+</span>
              </div>
            </div>
          </section>
          <section className="timeline-section" aria-label="选择播放载体">
            <div className="timeline-heading">
              <div>
                <span className="timeline-label">声音的形状</span>
                <span className="timeline-subtitle">
                  SAME SONG. DIFFERENT TIMES.
                </span>
              </div>
              <div
                className="mode-control"
                role="group"
                aria-label="年代选择模式"
              >
                <button
                  aria-pressed={!manualEra}
                  className={!manualEra ? "selected" : ""}
                  onClick={() => setManualEra(null)}
                >
                  <Sparkles size={12} />
                  跟随歌曲年份
                </button>
                <button
                  aria-pressed={!!manualEra}
                  className={manualEra ? "selected" : ""}
                  onClick={() =>
                    setManualEra(era.id === "unknown" ? "cassette" : era.id)
                  }
                >
                  自由穿越
                </button>
              </div>
            </div>
            <div className="era-timeline">
              {ERAS.map((item) => {
                const Icon = ERA_ICONS[item.id as EraId];
                return (
                  <button
                    className={`era-stop ${era.id === item.id ? "active" : ""} ${item.id === "relic" ? "future-stop" : ""}`}
                    key={item.id}
                    aria-label={`穿越到${item.label}`}
                    aria-pressed={era.id === item.id}
                    onClick={() => chooseEra(item.id as EraId)}
                  >
                    <div className="era-stop-top">
                      <Icon size={23} strokeWidth={1.35} />
                      <span className="era-stop-year">{item.yearLabel}</span>
                    </div>
                    <span className="timeline-rail">
                      <i />
                    </span>
                    <span className="era-stop-name">
                      {item.label}
                      {item.id === "relic" && <ArrowUpRight size={11} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="transport" aria-label="音乐播放控制">
            <div className="now-playing">
              <button
                className="current-cover"
                onClick={() => setModal("library")}
                aria-label="打开声音收藏"
              >
                <img src={track.cover} alt="当前歌曲封面" />
                <span>
                  <ListMusic size={20} />
                </span>
              </button>
              <div className="current-track-info">
                <div>
                  <strong>{track.title}</strong>
                  <button
                    className={`icon-button favorite-button ${selectedFavorite ? "active" : ""}`}
                    onClick={() => favorite(track.id)}
                    aria-label={
                      selectedFavorite ? "取消收藏当前歌曲" : "收藏当前歌曲"
                    }
                    aria-pressed={selectedFavorite}
                  >
                    <Heart
                      size={15}
                      fill={selectedFavorite ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <span>
                  {track.isDemo ? "原创体验片段" : track.artist}
                  <button
                    className="track-year-edit"
                    onClick={() => setModal("year")}
                  >
                    {track.year ?? "补充年份"}
                    <Pencil size={9} />
                  </button>
                </span>
              </div>
            </div>
            <div className="playback-controls">
              <div className="transport-buttons">
                <button
                  className={`icon-button shuffle-button ${preferences.shuffle ? "active" : ""}`}
                  onClick={() =>
                    patchPreferences({ shuffle: !preferences.shuffle })
                  }
                  aria-label="随机播放"
                  aria-pressed={preferences.shuffle}
                >
                  <Shuffle size={17} />
                </button>
                <button
                  className="icon-button skip-button"
                  onClick={() => go(-1)}
                  aria-label="上一首"
                >
                  <SkipBack size={20} fill="currentColor" />
                </button>
                <button
                  className={`main-play-button ${player.playing ? "playing" : ""}`}
                  onClick={player.toggle}
                  aria-label={player.playing ? "暂停播放" : "开始播放"}
                >
                  {player.status === "loading" ? (
                    <LoaderCircle size={21} className="spin-icon" />
                  ) : player.playing ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play size={20} fill="currentColor" />
                  )}
                </button>
                <button
                  className="icon-button skip-button"
                  onClick={() => go(1)}
                  aria-label="下一首"
                >
                  <SkipForward size={20} fill="currentColor" />
                </button>
                <button
                  className={`icon-button repeat-button ${preferences.repeat !== "off" ? "active" : ""}`}
                  onClick={() =>
                    patchPreferences({
                      repeat:
                        preferences.repeat === "all"
                          ? "one"
                          : preferences.repeat === "one"
                            ? "off"
                            : "all",
                    })
                  }
                  aria-label={`循环模式：${preferences.repeat === "all" ? "列表循环" : preferences.repeat === "one" ? "单曲循环" : "顺序播放"}`}
                >
                  {preferences.repeat === "one" ? (
                    <Repeat1 size={17} />
                  ) : (
                    <Repeat size={17} />
                  )}
                </button>
              </div>
              <div className="progress-control">
                <span>{formatTime(player.time)}</span>
                <input
                  type="range"
                  aria-label="播放进度"
                  aria-valuetext={`${formatTime(player.time)}，共 ${formatTime(player.duration)}`}
                  min={0}
                  max={player.duration || 1}
                  step={0.1}
                  value={Math.min(player.time, player.duration || 0)}
                  disabled={!player.duration}
                  onChange={(event) => player.seek(Number(event.target.value))}
                  style={{ "--range-fill": `${progress}%` } as CSSProperties}
                />
                <span>
                  {player.duration ? formatTime(player.duration) : "—:—"}
                </span>
              </div>
            </div>
            <div className="extra-controls">
              <div className="volume-control">
                <button
                  className="icon-button"
                  onClick={() =>
                    patchPreferences({ muted: !preferences.muted })
                  }
                  aria-label={preferences.muted ? "取消静音" : "静音"}
                >
                  {preferences.muted || preferences.volume === 0 ? (
                    <VolumeX size={17} />
                  ) : (
                    <Volume2 size={17} />
                  )}
                </button>
                <input
                  type="range"
                  aria-label="音量"
                  min={0}
                  max={1}
                  step={0.01}
                  value={preferences.muted ? 0 : preferences.volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  style={
                    {
                      "--range-fill": `${preferences.muted ? 0 : preferences.volume * 100}%`,
                    } as CSSProperties
                  }
                />
              </div>
              <span className="control-divider" />
              <button
                className="queue-button"
                onClick={() => setModal("library")}
                aria-label={`打开播放列表，共 ${tracks.length} 首`}
              >
                <ListMusic size={20} />
                <span>{String(tracks.length).padStart(2, "0")}</span>
              </button>
            </div>
          </section>
          {player.error && (
            <div className="audio-error" role="alert">
              {player.error}
              <button onClick={() => void player.play()}>
                再试一次
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </main>
        <footer className="site-footer">
          <span>
            音乐有年代，热爱没有。<span className="footer-divider">/</span>
            <span className="footer-english">
              A LITTLE USELESS. A LOT OF FEELING.
            </span>
          </span>
          <div className="footer-connections">
            <nav className="social-links" aria-label="在别处找到作者">
              <span className="social-caption">保持同频</span>
              <SocialLink platform="bilibili" />
              <SocialLink platform="xiaohongshu" />
            </nav>
            <span className="footer-connection-divider" aria-hidden="true" />
            <span className="keyboard-hint">
              <kbd>space</kbd>播放 / 暂停<span className="footer-dot">·</span>
              <button onClick={() => setModal("about")}>
                慢慢听
                <ArrowUpRight size={12} />
              </button>
            </span>
          </div>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
        </div>
      )}
      {dragging && (
        <div className="drop-overlay">
          <div>
            <ArrowDownToLine size={38} />
            <h2>把声音，留在这里。</h2>
            <p>松开鼠标，收录你的音乐。</p>
          </div>
        </div>
      )}
      {modal === "library" && (
        <Library
          tracks={tracks}
          currentId={track.id}
          favorites={favorites}
          playing={player.playing}
          onFavorite={favorite}
          onSelect={(id) => {
            selectTrack(id);
            setModal(null);
          }}
          onRemove={(removed) => void removeTrack(removed)}
          onImport={() => fileInput.current?.click()}
          importing={importing}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "year" && (
        <YearEditor
          track={track}
          onClose={() => setModal(null)}
          onSave={(year) => {
            setOverrides((current) => ({ ...current, [track.id]: year }));
            setModal(null);
            setToast(
              year ? `这段声音的年份已记为 ${year}。` : "已标记为年份未知。",
            );
          }}
          onReset={() => {
            setOverrides((current) => {
              const next = { ...current };
              delete next[track.id];
              return next;
            });
            setModal(null);
            setToast("已恢复原始年份。");
          }}
        />
      )}
      {modal === "settings" && (
        <Modal
          title="按你的习惯聆听"
          eyebrow="MAKE YOURSELF AT HOME"
          onClose={() => setModal(null)}
        >
          <div className="preference-volume">
            <label htmlFor="preference-volume">
              聆听音量
              <span>
                {Math.round((preferences.muted ? 0 : preferences.volume) * 100)}
                %
              </span>
            </label>
            <input
              id="preference-volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={preferences.muted ? 0 : preferences.volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              style={
                {
                  "--range-fill": `${preferences.muted ? 0 : preferences.volume * 100}%`,
                } as CSSProperties
              }
            />
          </div>
          <div className="preference-row">
            <div>
              <strong>机械反馈音</strong>
              <p>给按键和开关一点真实的声音。</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                role="switch"
                aria-label="机械反馈音"
                checked={preferences.soundEffects}
                onChange={(event) =>
                  patchPreferences({ soundEffects: event.target.checked })
                }
              />
              <span />
            </label>
          </div>
          <div className="preference-row">
            <div>
              <strong>减少动态效果</strong>
              <p>停下旋转与倾斜，保留安静的画面。</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                role="switch"
                aria-label="减少动态效果"
                checked={preferences.reducedMotion}
                onChange={(event) =>
                  patchPreferences({ reducedMotion: event.target.checked })
                }
              />
              <span />
            </label>
          </div>
          <div className="preference-choice">
            <strong>2005—2012，你记忆中的声音</strong>
            <p>这个年代有几种共同流行的载体。</p>
            <div className="digital-choice">
              <button
                className={
                  preferences.digitalDefault === "ipod" ? "selected" : ""
                }
                aria-pressed={preferences.digitalDefault === "ipod"}
                onClick={() => patchPreferences({ digitalDefault: "ipod" })}
              >
                <CircleDot size={21} />
                iPod
                {preferences.digitalDefault === "ipod" && <Check size={15} />}
              </button>
              <button
                className={
                  preferences.digitalDefault === "mp4" ? "selected" : ""
                }
                aria-pressed={preferences.digitalDefault === "mp4"}
                onClick={() => patchPreferences({ digitalDefault: "mp4" })}
              >
                <MonitorPlay size={21} />
                MP4{preferences.digitalDefault === "mp4" && <Check size={15} />}
              </button>
            </div>
          </div>
          <div className="privacy-note">
            <span className="live-dot on" />
            <p>
              你的音乐只留在这台设备上。
              <br />
              清理浏览器网站数据会移除已收录的副本。
            </p>
          </div>
        </Modal>
      )}
      {modal === "about" && (
        <Modal
          title="让声音，有迹可循。"
          eyebrow="A LITTLE USELESS. A LOT OF FEELING."
          onClose={() => setModal(null)}
        >
          <div className="about-brand">
            <BrandMark />
            <span>声物</span>
          </div>
          <p className="about-copy">
            我们记住一首歌，有时也记住了播放它的那台机器。落下的唱针，按下的磁带键，划过光盘的光，还有口袋里缠成一团的耳机线。
          </p>
          <p className="about-copy">
            声物是一座小小的声音博物馆。让音乐回到它的年代，也让你自由地穿越过去与未来。
          </p>
          <div className="about-note">
            <strong>先从七段声音开始</strong>
            <p>
              内置音乐是为声物创作的器乐片段。标注年份为演示场景，不是历史发行年份。导入自己的音乐后，播放器会读取文件中的年份；你也可以随时修正。
            </p>
          </div>
          <div className="about-shortcuts">
            <span>
              <kbd>space</kbd> 播放 / 暂停
            </span>
            <span>
              <kbd>←</kbd>
              <kbd>→</kbd> 前后 5 秒
            </span>
            <span>
              <kbd>M</kbd> 静音
            </span>
          </div>
          <p className="about-copy">
            © 2026{" "}
            <a
              href="https://github.com/HarrisonDo"
              target="_blank"
              rel="noreferrer"
            >
              HarrisonDo
            </a>
            {" · "}
            <a
              href="https://github.com/HarrisonDo/sonic-relics"
              target="_blank"
              rel="noreferrer"
            >
              声物 / SONIC RELICS
            </a>
            <br />
            允许非商业用途的下载、Fork、修改与再发布，须保留作者署名。
            商业用途需事先取得作者书面授权。
            <a
              href="https://github.com/HarrisonDo/sonic-relics/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
            >
              查看完整许可
            </a>
          </p>
          <button
            className="solid-button wide-button"
            onClick={() => setModal(null)}
          >
            回到聆听室
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
    </div>
  );
}
