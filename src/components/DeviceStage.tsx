import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import {
  BatteryFull,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Disc3,
  Eject,
  Pause,
  Play,
  Power,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import type { AudioPlayer } from "../hooks/useAudioPlayer";
import type { Era, Preferences, Track } from "../lib/model";
import { formatTime } from "../lib/model";
import { WaveCanvas } from "./WaveCanvas";

interface DeviceProps {
  era: Era;
  track: Track;
  tracks: Track[];
  player: AudioPlayer;
  preferences: Preferences;
  onVolume: (value: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onLibrary: () => void;
  onSelect: (id: string) => void;
}

function PlayGlyph({
  playing,
  size = 20,
}: {
  playing: boolean;
  size?: number;
}) {
  return playing ? (
    <Pause size={size} fill="currentColor" strokeWidth={1.4} />
  ) : (
    <Play size={size} fill="currentColor" strokeWidth={1.4} />
  );
}

function Screw({ className = "" }: { className?: string }) {
  return <span className={`screw ${className}`} aria-hidden="true" />;
}

function Reel({
  progress,
  right = false,
  playing,
}: {
  progress: number;
  right?: boolean;
  playing: boolean;
}) {
  return (
    <div
      className="tape-reel"
      style={
        {
          "--tape-amount": `${60 + (right ? progress : 1 - progress) * 31}%`,
        } as CSSProperties
      }
    >
      <div className="tape-wound" />
      <div className={`reel-hub ${playing ? "is-spinning" : ""}`}>
        {Array.from({ length: 6 }, (_, index) => (
          <span
            className="reel-spoke"
            key={index}
            style={{ transform: `rotate(${index * 60}deg)` }}
          />
        ))}
        <span className="reel-hole" />
      </div>
    </div>
  );
}

function Cassette({ track, player, onLibrary }: DeviceProps) {
  const progress = player.duration ? player.time / player.duration : 0;
  const action = (callback: () => void) => {
    player.mechanicalClick();
    callback();
  };
  return (
    <div className="cassette-player">
      <div className="deck-top">
        <span>SONIC RELICS</span>
        <span className="deck-stereo">PORTABLE STEREO</span>
        <span className={`power-led ${player.playing ? "on" : ""}`} />
      </div>
      <div className="deck-window">
        <div className="cassette-tape">
          <Screw className="top-left" />
          <Screw className="top-right" />
          <Screw className="bottom-left" />
          <Screw className="bottom-right" />
          <div className="cassette-paper">
            <div className="tape-label-top">
              <strong>A</strong>
              <span>HIGH FIDELITY / LOW NOISE</span>
              <b>C–60</b>
            </div>
            <div className="tape-handwriting">{track.title}</div>
            <div className="tape-label-rule">
              <span>
                {track.isDemo ? "SONIC RELICS ORIGINALS" : track.artist}
              </span>
              <span>{track.year ?? "UNDATED"}</span>
            </div>
            <button
              className="tape-glass"
              onClick={() => action(player.toggle)}
              aria-label={player.playing ? "暂停磁带" : "播放磁带"}
            >
              <Reel progress={progress} playing={player.playing} />
              <div className="tape-center-window">
                <span className="visible-tape" />
                <span className="tape-guide" />
              </div>
              <Reel progress={progress} playing={player.playing} right />
            </button>
            <div className="tape-bottom-label">
              <span>NORMAL POSITION</span>
              <span>IEC I / TYPE I</span>
            </div>
          </div>
          <div className="tape-reader">
            <i />
            <span />
            <i />
            <span />
            <i />
          </div>
          <div className="cassette-ridges" />
        </div>
        <div className="deck-glass-sheen" />
      </div>
      <div className="deck-bottom">
        <div className="deck-keys">
          <button onClick={() => action(player.pause)} aria-label="磁带停止">
            <Square size={12} fill="currentColor" />
            <span>STOP</span>
          </button>
          <button
            onClick={() => action(() => player.skipSeconds(-10))}
            aria-label="磁带倒带十秒"
          >
            <ChevronsLeft size={17} fill="currentColor" />
            <span>REW</span>
          </button>
          <button
            className={`deck-play ${player.playing ? "pressed" : ""}`}
            onClick={() => action(player.toggle)}
            aria-label={player.playing ? "磁带暂停键" : "磁带播放键"}
          >
            <PlayGlyph playing={player.playing} size={15} />
            <span>{player.playing ? "PAUSE" : "PLAY"}</span>
          </button>
          <button
            onClick={() => action(() => player.skipSeconds(10))}
            aria-label="磁带快进十秒"
          >
            <ChevronsRight size={17} fill="currentColor" />
            <span>FF</span>
          </button>
          <button onClick={() => action(onLibrary)} aria-label="换一盒磁带">
            <Eject size={14} fill="currentColor" />
            <span>EJECT</span>
          </button>
        </div>
        <div className="deck-speaker">
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
      <div className="deck-side" />
    </div>
  );
}

function CDPlayer({ track, player, onLibrary }: DeviceProps) {
  const [open, setOpen] = useState(false);
  const resumeAfterClosing = useRef(false);
  useEffect(() => {
    if (player.playing && open) {
      setOpen(false);
      resumeAfterClosing.current = false;
    }
  }, [open, player.playing]);
  const openLid = () => {
    player.mechanicalClick();
    if (open) {
      if (resumeAfterClosing.current) void player.play();
      resumeAfterClosing.current = false;
    } else {
      resumeAfterClosing.current = player.playing;
      player.pause();
    }
    setOpen(!open);
  };
  const toggle = () => {
    if (open) setOpen(false);
    resumeAfterClosing.current = false;
    player.mechanicalClick();
    player.toggle();
  };
  return (
    <div className={`cd-player ${open ? "lid-open" : ""}`}>
      <div className="cd-device-brand">
        <span>SONIC RELICS</span>
        <span>COMPACT DISC / 01</span>
      </div>
      <div className="cd-well">
        <div className={`compact-disc ${player.playing ? "is-spinning" : ""}`}>
          <div className="disc-grooves" />
          <div
            className="disc-label-art"
            style={{ backgroundImage: `url(${track.cover})` }}
          />
          <span className="disc-track-title">{track.title}</span>
          <span className="disc-label-tiny">DIGITAL AUDIO · SONIC RELICS</span>
          <div className="disc-center">
            <div />
          </div>
        </div>
      </div>
      <button
        className="cd-lid"
        onClick={openLid}
        aria-label={open ? "合上 CD 舱盖" : "打开 CD 舱盖"}
        aria-pressed={open}
      >
        <span className="lid-rim" />
        <span className="lid-type">
          transparent
          <br />
          <b>SOUND.</b>
        </span>
        <span className="lid-latch" />
      </button>
      <div className="cd-controls">
        <span className="cd-lcd">{formatTime(player.time)}</span>
        <button
          onClick={toggle}
          aria-label={player.playing ? "暂停 CD" : "播放 CD"}
        >
          <PlayGlyph playing={player.playing} size={20} />
        </button>
        <button onClick={onLibrary} aria-label="挑选另一张唱片">
          <Disc3 size={18} />
        </button>
      </div>
      <span className="cd-edge" />
    </div>
  );
}

function VolumeKnob({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const drag = useRef<{ y: number; value: number } | null>(null);
  const down = (event: PointerEvent<HTMLDivElement>) => {
    drag.current = { y: event.clientY, value };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current)
      onChange(
        Math.max(
          0,
          Math.min(
            1,
            drag.current.value + (drag.current.y - event.clientY) / 140,
          ),
        ),
      );
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      [
        "ArrowUp",
        "ArrowRight",
        "ArrowDown",
        "ArrowLeft",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      event.preventDefault();
      onChange(
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 1
            : Math.min(
                1,
                Math.max(
                  0,
                  value +
                    (["ArrowUp", "ArrowRight"].includes(event.key)
                      ? 0.05
                      : -0.05),
                ),
              ),
      );
    }
  };
  return (
    <div
      className="radio-knob"
      role="slider"
      tabIndex={0}
      aria-label="收音机音量旋钮"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={key}
    >
      <span style={{ transform: `rotate(${-130 + value * 260}deg)` }} />
    </div>
  );
}

function Radio({
  player,
  tracks,
  track,
  preferences,
  onVolume,
  onSelect,
}: DeviceProps) {
  const index = tracks.findIndex((item) => item.id === track.id);
  return (
    <div className="radio-player">
      <div className="radio-handle" />
      <div className="radio-face">
        <div className="radio-grille">
          <span className="radio-emblem">s.</span>
        </div>
        <div className="radio-panel">
          <div className="radio-brand">
            SONIC <b>RELICS</b>
          </div>
          <div className="radio-tuner">
            <div className="radio-numbers">
              <span>88</span>
              <span>92</span>
              <span>96</span>
              <span>100</span>
              <span>108</span>
            </div>
            <div className="radio-marks" />
            <span
              className="radio-needle"
              style={{
                left: `${8 + (index / Math.max(1, tracks.length - 1)) * 84}%`,
              }}
            />
            <span className="radio-fm">FM · MHz</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, tracks.length - 1)}
              value={index}
              onChange={(event) => {
                player.mechanicalClick();
                onSelect(tracks[Number(event.target.value)].id);
              }}
              aria-label="收音机调谐选曲"
            />
          </div>
          <div className="radio-knob-row">
            <div>
              <VolumeKnob
                value={preferences.muted ? 0 : preferences.volume}
                onChange={onVolume}
              />
              <span>VOLUME</span>
            </div>
            <button
              className={`radio-power ${player.playing ? "on" : ""}`}
              onClick={() => {
                player.mechanicalClick();
                player.toggle();
              }}
              aria-label={player.playing ? "关闭收音机" : "打开收音机"}
            >
              <Power size={23} />
            </button>
          </div>
        </div>
      </div>
      <div className="radio-feet">
        <i />
        <i />
      </div>
    </div>
  );
}

function MP3({ track, player, preferences, onNext, onPrevious }: DeviceProps) {
  return (
    <div className="mp3-player">
      <span className="mp3-strap" />
      <div className="mp3-brand">
        SONIC <b>RELICS</b>
        <span>digital audio player</span>
      </div>
      <div className="mp3-inner">
        <div className="mp3-lcd">
          <div className="lcd-top">
            <span>{player.playing ? "▶" : "Ⅱ"} MP3</span>
            <BatteryFull size={14} />
          </div>
          <strong>{track.title}</strong>
          <div className="mp3-screen-bottom">
            <WaveCanvas
              player={player}
              reducedMotion={preferences.reducedMotion}
              mode="bars"
            />
            <span>{formatTime(player.time)}</span>
          </div>
        </div>
        <div className="mp3-controls">
          <button aria-label="MP3 上一首" onClick={onPrevious}>
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label={player.playing ? "暂停 MP3" : "播放 MP3"}
            onClick={() => {
              player.mechanicalClick();
              player.toggle();
            }}
          >
            <PlayGlyph playing={player.playing} size={17} />
          </button>
          <button aria-label="MP3 下一首" onClick={onNext}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="mp3-cap" />
      <span className="mp3-capacity">256 MB / MUSIC TO GO</span>
    </div>
  );
}

function IPod({
  track,
  tracks,
  player,
  onSelect,
  onNext,
  onPrevious,
}: DeviceProps) {
  const [menu, setMenu] = useState(false);
  const [cursor, setCursor] = useState(
    Math.max(
      0,
      tracks.findIndex((item) => item.id === track.id),
    ),
  );
  const movement = useRef<{ angle: number; remainder: number } | null>(null);
  const menuList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setCursor(
      Math.max(
        0,
        tracks.findIndex((item) => item.id === track.id),
      ),
    );
  }, [track.id, tracks]);
  useEffect(() => {
    menuList.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor, menu]);
  const turn = (direction: number) => {
    setMenu(true);
    setCursor((value) => (value + direction + tracks.length) % tracks.length);
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    movement.current = {
      angle: Math.atan2(
        event.clientY - rect.top - rect.height / 2,
        event.clientX - rect.left - rect.width / 2,
      ),
      remainder: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setMenu(true);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!movement.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const angle = Math.atan2(
      event.clientY - rect.top - rect.height / 2,
      event.clientX - rect.left - rect.width / 2,
    );
    let delta = angle - movement.current.angle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    movement.current.remainder += delta;
    movement.current.angle = angle;
    if (Math.abs(movement.current.remainder) > 0.42) {
      turn(Math.sign(movement.current.remainder));
      movement.current.remainder = 0;
    }
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
    ) {
      event.preventDefault();
      turn(["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1);
    }
  };
  return (
    <div className="ipod-player">
      <div className="ipod-screen">
        <div className="ipod-screen-title">
          <span>{menu ? "音乐资料库" : "正在播放"}</span>
          <BatteryFull size={16} />
        </div>
        {menu ? (
          <div
            className="ipod-menu"
            ref={menuList}
            role="listbox"
            aria-label="iPod 歌曲列表"
          >
            {tracks.map((item, index) => (
              <button
                key={item.id}
                role="option"
                aria-selected={index === cursor}
                onClick={() => {
                  onSelect(item.id);
                  setMenu(false);
                }}
              >
                {item.title}
                <ChevronRight size={12} />
              </button>
            ))}
          </div>
        ) : (
          <div className="ipod-now">
            <img src={track.cover} alt="" />
            <div>
              <strong>{track.title}</strong>
              <span>{track.artist}</span>
              <small>{track.year ?? "年份未知"}</small>
            </div>
            <div className="ipod-progress">
              <i
                style={{
                  width: `${player.duration ? (player.time / player.duration) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="ipod-time">
              {formatTime(player.time)}
              <span>{formatTime(player.duration)}</span>
            </span>
          </div>
        )}
      </div>
      <span className="ipod-wordmark">SONIC RELICS</span>
      <div
        className="click-wheel"
        role="group"
        aria-label="iPod 转盘，用方向键选曲"
        tabIndex={0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => {
          movement.current = null;
        }}
        onPointerCancel={() => {
          movement.current = null;
        }}
        onKeyDown={key}
      >
        <button className="wheel-menu" onClick={() => setMenu(!menu)}>
          MENU
        </button>
        <button
          className="wheel-prev"
          onClick={menu ? () => turn(-1) : onPrevious}
          aria-label="iPod 上一项"
        >
          <SkipBack size={17} fill="currentColor" />
        </button>
        <button
          className="wheel-next"
          onClick={menu ? () => turn(1) : onNext}
          aria-label="iPod 下一项"
        >
          <SkipForward size={17} fill="currentColor" />
        </button>
        <button
          className="wheel-play"
          onClick={player.toggle}
          aria-label={player.playing ? "暂停 iPod" : "播放 iPod"}
        >
          <Play size={11} fill="currentColor" />
          <Pause size={11} fill="currentColor" />
        </button>
        <button
          className="wheel-center"
          onClick={() => {
            player.mechanicalClick();
            if (menu) {
              onSelect(tracks[cursor].id);
              setMenu(false);
            } else player.toggle();
          }}
          aria-label={menu ? "确认 iPod 选曲" : "iPod 中心播放键"}
        />
      </div>
      <span className="ipod-bottom-mark">Designed for memories.</span>
    </div>
  );
}

function MP4({ track, player, preferences, onNext, onPrevious }: DeviceProps) {
  const [visualizer, setVisualizer] = useState(false);
  return (
    <div className="mp4-player">
      <span className="mp4-wordmark">SONIC RELICS / VISION</span>
      <div className="mp4-display">
        <button
          className="mp4-screen"
          onClick={() => setVisualizer(!visualizer)}
          aria-label={visualizer ? "MP4 显示封面" : "MP4 显示频谱"}
        >
          {visualizer ? (
            <WaveCanvas
              player={player}
              reducedMotion={preferences.reducedMotion}
              mode="bars"
            />
          ) : (
            <img src={track.cover} alt="专辑封面" />
          )}
          <div className="mp4-screen-chrome">
            <span>{player.playing ? "PLAYING" : "PAUSED"}</span>
            <BatteryFull size={12} />
          </div>
          <div className="mp4-track">
            <b>{track.title}</b>
            <span>
              {formatTime(player.time)} / {formatTime(player.duration)}
            </span>
          </div>
        </button>
        <div className="mp4-keys">
          <button onClick={onPrevious} aria-label="MP4 上一首">
            <SkipBack size={15} />
          </button>
          <button
            className="mp4-play"
            onClick={player.toggle}
            aria-label={player.playing ? "暂停 MP4" : "播放 MP4"}
          >
            <PlayGlyph playing={player.playing} size={21} />
          </button>
          <button onClick={onNext} aria-label="MP4 下一首">
            <SkipForward size={15} />
          </button>
        </div>
      </div>
      <div className="mp4-speaker" />
    </div>
  );
}

function Streaming({ player, preferences }: DeviceProps) {
  return (
    <div className="streaming-player">
      <div className="stream-orbit" />
      <span className="stream-coordinate top">SOUND / 01</span>
      <span className="stream-coordinate bottom">
        {player.playing ? "A MOMENT IN MOTION" : "STILLNESS BEFORE SOUND"}
      </span>
      <WaveCanvas player={player} reducedMotion={preferences.reducedMotion} />
      <button
        className="stream-play"
        onClick={player.toggle}
        aria-label={player.playing ? "暂停流媒体" : "播放流媒体"}
      >
        <PlayGlyph playing={player.playing} size={20} />
      </button>
      <div className="stream-live">
        <span className={player.playing ? "live-dot on" : "live-dot"} />
        {player.analysisAvailable
          ? "LIVE AUDIO REACTIVE"
          : "AUDIO VISUALIZATION UNAVAILABLE"}
      </div>
    </div>
  );
}

function Brain({ player, preferences }: DeviceProps) {
  const folds = [
    "M219 75C184 68 166 92 172 117S213 146 194 170",
    "M147 100C130 107 129 133 145 143S178 133 169 113",
    "M119 145C102 169 112 195 136 192S146 166 157 163",
    "M177 153C158 178 179 198 201 192S227 166 221 145",
    "M107 201C113 224 133 218 143 234S139 260 151 270",
    "M159 208C141 210 149 234 173 232S200 208 218 222",
    "M185 248C156 241 161 275 181 282S212 271 219 253",
    "M217 90C230 106 215 129 224 143",
    "M120 166C134 151 121 131 138 118",
    "M204 298C195 280 214 278 222 290",
  ];
  return (
    <div className={`brain-player ${player.playing ? "connected" : ""}`}>
      <span className="brain-top-code">NEURAL INTERFACE / R–77</span>
      <svg className="brain-anatomy" viewBox="0 0 480 400" aria-hidden="true">
        <defs>
          <linearGradient id="brainGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d3ddc8" stopOpacity=".85" />
            <stop offset=".48" stopColor="#a7bda7" stopOpacity=".4" />
            <stop offset="1" stopColor="#9fa992" stopOpacity=".74" />
          </linearGradient>
          <filter id="brainShadow">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="brainSculpt">
            <feGaussianBlur stdDeviation="2.1" />
          </filter>
        </defs>
        <ellipse
          cx="240"
          cy="358"
          rx="105"
          ry="10"
          fill="#879788"
          opacity=".12"
          filter="url(#brainShadow)"
        />
        {[false, true].map((mirror) => (
          <g
            key={String(mirror)}
            transform={mirror ? "translate(480 0) scale(-1 1)" : undefined}
          >
            <path
              d="M235 74C218 49 194 56 181 62C155 55 131 75 126 96C102 105 100 126 99 145C78 164 89 192 99 204C86 228 105 250 121 258C124 285 147 292 167 291C182 313 214 318 230 303L235 74Z"
              fill="url(#brainGlass)"
              stroke="#7d9386"
              strokeWidth="1.7"
            />
            {folds.map((d, i) => (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke="#526c52"
                  strokeWidth="7"
                  opacity=".2"
                  filter="url(#brainSculpt)"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#edf0d9"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  opacity=".8"
                  transform="translate(-1.3 -1.5)"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#839c80"
                  strokeWidth={i % 3 === 0 ? 2 : 1.5}
                  strokeLinecap="round"
                  opacity=".7"
                />
              </g>
            ))}
            <path
              d="M223 298C230 316 223 332 231 350"
              fill="none"
              stroke="#82988a"
              strokeWidth="2"
            />
          </g>
        ))}
        <path
          d="M240 69V292M240 312V347"
          stroke="#a1876e"
          strokeWidth="1"
          strokeDasharray="2 5"
          fill="none"
        />
      </svg>
      <WaveCanvas
        player={player}
        reducedMotion={preferences.reducedMotion}
        mode="neural"
      />
      <button
        className="relic-chip"
        onClick={player.toggle}
        aria-label={
          player.playing ? "拔出 Relic 芯片并暂停" : "接入 Relic 芯片并播放"
        }
      >
        <span className="chip-pins" />
        <span className="chip-core">
          <span>RELIC</span>
          <i />
          <small>R—77</small>
        </span>
      </button>
      <span className="brain-connection">
        <i />
        {player.playing ? "CONNECTION ESTABLISHED" : "CLICK TO CONNECT"}
      </span>
    </div>
  );
}

function Unknown({ track, player }: DeviceProps) {
  return (
    <div className="unknown-player">
      <div className="unknown-cover">
        <img src={track.cover} alt="" />
        <span>
          UNDATED
          <br />
          MEMORIES
        </span>
      </div>
      <button
        onClick={player.toggle}
        aria-label={player.playing ? "暂停未知年代歌曲" : "播放未知年代歌曲"}
      >
        <PlayGlyph playing={player.playing} size={24} />
      </button>
      <span className="unknown-caption">EVERY SONG HAS A STORY.</span>
    </div>
  );
}

export function DeviceStage(props: DeviceProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (props.preferences.reducedMotion || event.pointerType !== "mouse")
      return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rectangle.left) / rectangle.width - 0.5;
    const y = (event.clientY - rectangle.top) / rectangle.height - 0.5;
    stageRef.current?.style.setProperty("--tilt-x", `${-y * 4}deg`);
    stageRef.current?.style.setProperty("--tilt-y", `${x * 6}deg`);
  };
  const reset = () => {
    stageRef.current?.style.setProperty("--tilt-x", "0deg");
    stageRef.current?.style.setProperty("--tilt-y", "0deg");
  };
  const components = {
    radio: Radio,
    cassette: Cassette,
    cd: CDPlayer,
    mp3: MP3,
    ipod: IPod,
    mp4: MP4,
    stream: Streaming,
    relic: Brain,
    unknown: Unknown,
  };
  const Device = components[props.era.id];
  return (
    <div
      className={`device-stage stage-${props.era.id} ${props.player.playing ? "is-playing" : ""}`}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      <div className="stage-center-mark" aria-hidden="true" />
      <div className="device-object" key={props.era.id} ref={stageRef}>
        <Device {...props} />
      </div>
      <div className="stage-object-label">
        <span className="object-number">OBJECT {props.era.number}</span>
        <span className="object-label-rule" />
        <span>{props.era.label}</span>
      </div>
    </div>
  );
}
