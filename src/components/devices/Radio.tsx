import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { Power } from "lucide-react";
import { useAudioSignal, useRotaryDrag } from "../../hooks/useDeviceMotion";
import type { DeviceProps } from "./shared";
import { clamp, currentVolume, trackIndex } from "./shared";

// Stations sit between 88 and 108 MHz, evenly spread along the dial.
const stationAt = (index: number, count: number) =>
  count <= 1 ? 0.5 : 0.08 + (index / (count - 1)) * 0.84;
const nearestStation = (position: number, count: number) =>
  count <= 1
    ? 0
    : Math.round(clamp(((position - 0.08) / 0.84) * (count - 1), 0, count - 1));
const frequencyAt = (position: number) => (88 + position * 20).toFixed(1);
// One and a half turns of the tuning knob sweep the whole dial.
const TURNS_PER_DIAL = 1.5;
const LOCK_WIDTH = 0.035;

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
        clamp(drag.current.value + (drag.current.y - event.clientY) / 140),
      );
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowUp: 0.05,
      ArrowRight: 0.05,
      ArrowDown: -0.05,
      ArrowLeft: -0.05,
    };
    if (event.key in step) {
      event.preventDefault();
      onChange(clamp(value + step[event.key]));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onChange(event.key === "Home" ? 0 : 1);
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

export function Radio({
  player,
  tracks,
  track,
  preferences,
  onVolume,
  onSelect,
}: DeviceProps) {
  const count = tracks.length;
  const index = trackIndex(tracks, track);
  const rootRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const live = useRef<number | null>(null);
  const lastStatic = useRef(0);
  const commitTimer = useRef(0);
  const [dial, setDial] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  useAudioSignal(player, rootRef);
  useEffect(() => () => window.clearTimeout(commitTimer.current), []);

  const tuned = pending ?? index;
  const position = dial ?? stationAt(tuned, count);
  const nearest = nearestStation(position, count);
  const lock = clamp(
    1 - Math.abs(position - stationAt(nearest, count)) / LOCK_WIDTH,
  );
  const lockedTrack = lock > 0.5 ? tracks[nearest] : null;

  const commit = (station: number) => {
    live.current = null;
    setDial(null);
    setPending(null);
    const chosen = tracks[station];
    if (chosen && chosen.id !== track.id) onSelect(chosen.id);
  };
  const tuneTo = (value: number) => {
    const next = clamp(value);
    live.current = next;
    setDial(next);
    const distance = Math.abs(
      next - stationAt(nearestStation(next, count), count),
    );
    const now = performance.now();
    if (distance > LOCK_WIDTH * 0.35 && now - lastStatic.current > 90) {
      lastStatic.current = now;
      player.staticNoise(clamp(distance / (LOCK_WIDTH * 1.6)));
    }
  };
  const release = () => {
    if (live.current === null) return;
    player.mechanicalClick();
    commit(nearestStation(live.current, count));
  };
  const tuningKnob = useRotaryDrag(
    (radians) =>
      tuneTo(
        (live.current ?? stationAt(tuned, count)) +
          radians / (Math.PI * 2 * TURNS_PER_DIAL),
      ),
    { onEnd: release },
  );
  const stepStation = (target: number) => {
    const station = Math.round(clamp(target, 0, count - 1));
    player.mechanicalClick();
    setPending(station);
    window.clearTimeout(commitTimer.current);
    // Let quick key presses sweep past stations before one is actually loaded.
    commitTimer.current = window.setTimeout(() => commit(station), 420);
  };
  const tuningKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
    };
    if (event.key in step) {
      event.preventDefault();
      stepStation(tuned + step[event.key]);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      stepStation(event.key === "Home" ? 0 : count - 1);
    }
  };
  const dialPosition = (clientX: number) => {
    const rectangle = dialRef.current?.getBoundingClientRect();
    if (!rectangle) return position;
    return (clientX - rectangle.left) / rectangle.width;
  };
  const dialDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    tuneTo(dialPosition(event.clientX));
  };
  const dialMove = (event: PointerEvent<HTMLDivElement>) => {
    if (live.current !== null) tuneTo(dialPosition(event.clientX));
  };

  const tuning = dial !== null;
  return (
    <div
      ref={rootRef}
      className={`radio-player ${player.playing ? "powered" : ""} ${tuning ? "tuning" : ""} ${tuning && lock < 0.5 ? "detuned" : ""}`}
      style={{ "--lock": lock.toFixed(2) } as CSSProperties}
    >
      <div className="radio-handle" />
      <div className="radio-face">
        <div className="radio-grille">
          <span className="radio-cone" />
          <span className="radio-emblem">s.</span>
        </div>
        <div className="radio-panel">
          <div className="radio-brand">
            SONIC <b>RELICS</b>
            <span className="radio-eye" aria-hidden="true" title="调谐指示灯" />
          </div>
          <div
            className="radio-tuner"
            ref={dialRef}
            onPointerDown={dialDown}
            onPointerMove={dialMove}
            onPointerUp={release}
            onPointerCancel={release}
          >
            <div className="radio-numbers">
              <span>88</span>
              <span>92</span>
              <span>96</span>
              <span>100</span>
              <span>108</span>
            </div>
            <div className="radio-marks">
              {tracks.map((item, station) => (
                <i
                  key={item.id}
                  className={station === index ? "current" : ""}
                  style={{ left: `${stationAt(station, count) * 100}%` }}
                />
              ))}
            </div>
            <span
              className="radio-needle"
              style={{ left: `${position * 100}%` }}
            />
            <span className="radio-readout">
              <span>{lockedTrack ? lockedTrack.title : "· · · 搜索电台"}</span>
              <b>FM {frequencyAt(position)}</b>
            </span>
          </div>
          <div className="radio-knob-row">
            <div>
              <VolumeKnob
                value={currentVolume(preferences)}
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
              <Power size={20} />
            </button>
            <div>
              <div
                className="radio-knob tuning-knob"
                role="slider"
                tabIndex={0}
                aria-label="调谐旋钮：转动或用方向键换台"
                aria-valuemin={1}
                aria-valuemax={Math.max(1, count)}
                aria-valuenow={tuned + 1}
                aria-valuetext={`FM ${frequencyAt(stationAt(tuned, count))}，${tracks[tuned]?.title ?? ""}`}
                onKeyDown={tuningKey}
                {...tuningKnob}
              >
                <span
                  style={{
                    transform: `rotate(${position * 360 * TURNS_PER_DIAL}deg)`,
                  }}
                />
              </div>
              <span>TUNING</span>
            </div>
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
