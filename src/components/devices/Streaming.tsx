import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { formatTime } from "../../lib/model";
import { WaveCanvas } from "../WaveCanvas";
import type { DeviceProps } from "./shared";
import { PlayGlyph, clamp } from "./shared";

const IDLE_AFTER = 2800;
const RING_GRAB = 20;

export function Streaming({ player, preferences }: DeviceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<((x: number, y: number) => void) | null>(null);
  const idleTimer = useRef(0);
  const seeking = useRef<number | null>(null);
  const swallowClick = useRef(false);
  const [size, setSize] = useState({ width: 600, height: 324 });
  const [idle, setIdle] = useState(false);

  useLayoutEffect(() => {
    const element = rootRef.current;
    if (!element) return;
    const measure = () =>
      setSize({ width: element.offsetWidth, height: element.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const wake = () => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_AFTER);
  };
  useEffect(() => {
    if (player.playing) wake();
    else {
      window.clearTimeout(idleTimer.current);
      setIdle(false);
    }
    return () => window.clearTimeout(idleTimer.current);
  }, [player.playing]);

  // The ring hugs the outside of the orb drawn by WaveCanvas.
  const centerX = size.width / 2;
  const centerY = size.height * 0.49;
  const radius = Math.min(size.width * 0.33, size.height * 0.42) * 1.03;
  const circumference = Math.PI * 2 * radius;
  const progress = player.duration ? clamp(player.time / player.duration) : 0;
  const knobAngle = progress * Math.PI * 2 - Math.PI / 2;
  const hidden = idle && player.playing;

  const local = (event: PointerEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const rectangle = element.getBoundingClientRect();
    const scale = rectangle.width / (element.offsetWidth || 1);
    return {
      x: (event.clientX - rectangle.left) / scale,
      y: (event.clientY - rectangle.top) / scale,
    };
  };
  const seekToward = (x: number, y: number) => {
    if (!player.duration) return;
    let position =
      (Math.atan2(y - centerY, x - centerX) + Math.PI / 2) / (Math.PI * 2);
    if (position < 0) position += 1;
    // Do not wrap from the end straight back to the start while dragging.
    const previous = seeking.current;
    if (previous !== null && Math.abs(position - previous) > 0.5)
      position = previous > 0.5 ? 0.999 : 0;
    seeking.current = position;
    player.seek(position * player.duration);
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    const wasHidden = hidden;
    wake();
    if ((event.target as Element).closest(".stream-play")) {
      // First touch on hidden controls only reveals them.
      if (wasHidden) swallowClick.current = true;
      return;
    }
    const { x, y } = local(event);
    const distance = Math.hypot(x - centerX, y - centerY);
    if (Math.abs(distance - radius) < RING_GRAB && player.duration) {
      event.currentTarget.setPointerCapture(event.pointerId);
      seeking.current = null;
      seekToward(x, y);
      return;
    }
    rippleRef.current?.(x, y);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && seeking.current === null) wake();
    if (seeking.current === null) return;
    const { x, y } = local(event);
    seekToward(x, y);
  };
  const up = () => {
    seeking.current = null;
  };
  const ringKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowRight: 5,
      ArrowUp: 5,
      ArrowLeft: -5,
      ArrowDown: -5,
    };
    if (event.key in step) {
      event.preventDefault();
      wake();
      player.skipSeconds(step[event.key]);
    } else if (event.key === "Home") {
      event.preventDefault();
      player.seek(0);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`streaming-player ${hidden ? "controls-idle" : ""}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onFocus={wake}
    >
      <div className="stream-orbit" />
      <span className="stream-coordinate top">SOUND / 01</span>
      <span className="stream-coordinate bottom">
        {player.playing ? "A MOMENT IN MOTION" : "STILLNESS BEFORE SOUND"}
      </span>
      <WaveCanvas
        player={player}
        reducedMotion={preferences.reducedMotion}
        rippleRef={rippleRef}
      />
      <svg
        className="stream-ring"
        viewBox={`0 0 ${size.width} ${size.height}`}
        aria-hidden="true"
      >
        <circle className="ring-track" cx={centerX} cy={centerY} r={radius} />
        <circle
          className="ring-hit"
          cx={centerX}
          cy={centerY}
          r={radius}
          strokeWidth={RING_GRAB * 2}
        />
        <circle
          className="ring-fill"
          cx={centerX}
          cy={centerY}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${centerX} ${centerY})`}
        />
      </svg>
      <div
        className="stream-knob"
        role="slider"
        tabIndex={0}
        aria-label="播放进度：拖动外圈，或用方向键前后 5 秒"
        aria-valuemin={0}
        aria-valuemax={Math.round(player.duration) || 0}
        aria-valuenow={Math.round(player.time)}
        aria-valuetext={`${formatTime(player.time)} / ${formatTime(player.duration)}`}
        onKeyDown={ringKey}
        style={{
          left: `${centerX + Math.cos(knobAngle) * radius}px`,
          top: `${centerY + Math.sin(knobAngle) * radius}px`,
        }}
      />
      <button
        className="stream-play"
        onClick={() => {
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          player.toggle();
        }}
        aria-label={player.playing ? "暂停流媒体" : "播放流媒体"}
      >
        <PlayGlyph playing={player.playing} size={20} />
      </button>
      <div className="stream-live">
        <span className={player.playing ? "live-dot on" : "live-dot"} />
        {player.analysisAvailable
          ? "LIVE AUDIO REACTIVE"
          : "AUDIO VISUALIZATION UNAVAILABLE"}
        <span className="stream-time">
          {formatTime(player.time)} / {formatTime(player.duration)}
        </span>
      </div>
    </div>
  );
}
