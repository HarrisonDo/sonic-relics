import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  BatteryFull,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import { createThrottle, useHoldAction } from "../../hooks/useDeviceMotion";
import { formatTime } from "../../lib/model";
import { WaveCanvas } from "../WaveCanvas";
import type { DeviceProps } from "./shared";
import {
  PlayGlyph,
  clamp,
  currentVolume,
  pad2,
  scanBy,
  trackIndex,
} from "./shared";

export function MP3({
  track,
  tracks,
  player,
  preferences,
  onNext,
  onPrevious,
  onVolume,
}: DeviceProps) {
  const titleBox = useRef<HTMLElement>(null);
  const titleText = useRef<HTMLSpanElement>(null);
  const volumeTimer = useRef(0);
  const scanStep = useRef(createThrottle(0.16));
  const [overflow, setOverflow] = useState(0);
  const [scan, setScan] = useState(0);
  const [showVolume, setShowVolume] = useState(false);
  const volume = currentVolume(preferences);
  useEffect(() => () => window.clearTimeout(volumeTimer.current), []);

  // Long names scroll across the LCD, like they did on the real thing.
  useLayoutEffect(() => {
    const box = titleBox.current;
    const text = titleText.current;
    if (!box || !text) return;
    const measure = () =>
      setOverflow(Math.max(0, Math.ceil(text.offsetWidth - box.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [track.title, showVolume]);

  const skipKey = (direction: 1 | -1) => ({
    onTap: () => {
      player.mechanicalClick();
      if (direction > 0) onNext();
      else onPrevious();
    },
    onHoldStart: () => {
      player.mechanicalClick();
      setScan(direction);
    },
    onHold: (dt: number) =>
      scanStep.current(dt, (elapsed) =>
        scanBy(player, direction * elapsed * 7),
      ),
    onHoldEnd: () => setScan(0),
  });
  const back = useHoldAction(skipKey(-1));
  const forward = useHoldAction(skipKey(1));
  const nudgeVolume = (delta: number) => {
    player.mechanicalClick("tick");
    onVolume(clamp(Math.round((volume + delta) * 20) / 20));
    setShowVolume(true);
    window.clearTimeout(volumeTimer.current);
    volumeTimer.current = window.setTimeout(() => setShowVolume(false), 1400);
  };
  const segments = 12;
  const lit = Math.round(volume * segments);
  return (
    <div className="mp3-player">
      <span className="mp3-strap" />
      <div className="mp3-volume-keys">
        <button onClick={() => nudgeVolume(-0.05)} aria-label="MP3 音量减小">
          <Minus size={8} strokeWidth={3} />
        </button>
        <button onClick={() => nudgeVolume(0.05)} aria-label="MP3 音量增大">
          <Plus size={8} strokeWidth={3} />
        </button>
      </div>
      <div className="mp3-brand">
        SONIC <b>RELICS</b>
        <span>digital audio player</span>
      </div>
      <div className="mp3-inner">
        <div className="mp3-lcd">
          <div className="lcd-top">
            <span>
              {scan ? (scan > 0 ? "▶▶" : "◀◀") : player.playing ? "▶" : "Ⅱ"} MP3
            </span>
            <span className="lcd-counter">
              {pad2(trackIndex(tracks, track) + 1)}/{pad2(tracks.length)}
            </span>
            <BatteryFull size={14} />
          </div>
          {showVolume ? (
            <div
              className="mp3-volume"
              role="status"
              aria-label={`音量 ${Math.round(volume * 100)}`}
            >
              <span>VOL</span>
              <span className="mp3-volume-bar">
                {Array.from({ length: segments }, (_, index) => (
                  <i key={index} className={index < lit ? "lit" : ""} />
                ))}
              </span>
              <span>{Math.round(volume * 100)}</span>
            </div>
          ) : (
            <strong
              ref={titleBox}
              className={`mp3-title ${overflow > 0 ? "marquee" : ""}`}
              style={
                {
                  "--marquee-distance": `${overflow + 8}px`,
                  "--marquee-time": `${Math.max(4, overflow / 18 + 3)}s`,
                } as CSSProperties
              }
            >
              <span ref={titleText}>{track.title}</span>
            </strong>
          )}
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
          <button aria-label="MP3 上一首，按住快退" {...back}>
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
          <button aria-label="MP3 下一首，按住快进" {...forward}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="mp3-cap" />
      <span className="mp3-capacity">256 MB / MUSIC TO GO</span>
    </div>
  );
}
