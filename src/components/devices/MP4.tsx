import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  AudioLines,
  BatteryFull,
  Image as ImageIcon,
  Maximize2,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import { formatTime } from "../../lib/model";
import { WaveCanvas } from "../WaveCanvas";
import type { DeviceProps } from "./shared";
import { PlayGlyph } from "./shared";

function Theater({
  track,
  player,
  preferences,
  visualizer,
  onVisualizer,
  onClose,
}: Pick<DeviceProps, "track" | "player" | "preferences"> & {
  visualizer: boolean;
  onVisualizer: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>(".theater-close")?.focus();
    return () => element?.close();
  }, []);
  const progress = player.duration
    ? Math.min(100, (player.time / player.duration) * 100)
    : 0;
  return createPortal(
    <dialog
      ref={dialog}
      className="mp4-theater"
      aria-label={`MP4 全屏观看：${track.title}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        className="theater-screen"
        onClick={onVisualizer}
        aria-label={visualizer ? "显示专辑封面" : "显示音乐频谱"}
      >
        {visualizer ? (
          <WaveCanvas
            player={player}
            reducedMotion={preferences.reducedMotion}
            mode="bars"
          />
        ) : (
          <>
            <img className="theater-backdrop" src={track.cover} alt="" />
            <img className="theater-cover" src={track.cover} alt="专辑封面" />
          </>
        )}
        <span className="theater-scanlines" />
      </button>
      <div className="theater-bar">
        <button
          className="theater-play"
          onClick={player.toggle}
          aria-label={player.playing ? "暂停" : "播放"}
        >
          <PlayGlyph playing={player.playing} size={18} />
        </button>
        <div className="theater-info">
          <strong>{track.title}</strong>
          <span>
            {formatTime(player.time)} / {formatTime(player.duration)}
          </span>
        </div>
        <input
          type="range"
          aria-label="播放进度"
          min={0}
          max={player.duration || 1}
          step={0.1}
          value={Math.min(player.time, player.duration || 0)}
          disabled={!player.duration}
          onChange={(event) => player.seek(Number(event.target.value))}
          style={{ "--range-fill": `${progress}%` } as CSSProperties}
        />
        <button
          className="theater-tool"
          onClick={onVisualizer}
          aria-label={visualizer ? "显示专辑封面" : "显示音乐频谱"}
        >
          {visualizer ? <ImageIcon size={17} /> : <AudioLines size={17} />}
        </button>
        <button
          className="theater-tool theater-close"
          onClick={onClose}
          aria-label="退出全屏"
        >
          <X size={18} />
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

export function MP4({
  track,
  player,
  preferences,
  onNext,
  onPrevious,
}: DeviceProps) {
  const [visualizer, setVisualizer] = useState(false);
  const [theater, setTheater] = useState(false);
  const progress = player.duration
    ? Math.min(100, (player.time / player.duration) * 100)
    : 0;
  return (
    <div className="mp4-player">
      <span className="mp4-wordmark">SONIC RELICS / VISION</span>
      <div className="mp4-display">
        <button
          className="mp4-screen"
          onClick={() => setVisualizer(!visualizer)}
          onDoubleClick={() => setTheater(true)}
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
            <i className="mp4-progress">
              <i style={{ width: `${progress}%` }} />
            </i>
          </div>
        </button>
        <div className="mp4-keys">
          <button
            onClick={() => {
              player.mechanicalClick();
              onPrevious();
            }}
            aria-label="MP4 上一首"
          >
            <SkipBack size={15} />
          </button>
          <button
            className="mp4-play"
            onClick={() => {
              player.mechanicalClick();
              player.toggle();
            }}
            aria-label={player.playing ? "暂停 MP4" : "播放 MP4"}
          >
            <PlayGlyph playing={player.playing} size={21} />
          </button>
          <button
            onClick={() => {
              player.mechanicalClick();
              onNext();
            }}
            aria-label="MP4 下一首"
          >
            <SkipForward size={15} />
          </button>
          <button
            className="mp4-full"
            onClick={() => {
              player.mechanicalClick();
              setTheater(true);
            }}
            aria-label="MP4 全屏观看"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>
      <div className="mp4-speaker" />
      {theater && (
        <Theater
          track={track}
          player={player}
          preferences={preferences}
          visualizer={visualizer}
          onVisualizer={() => setVisualizer(!visualizer)}
          onClose={() => setTheater(false)}
        />
      )}
    </div>
  );
}
