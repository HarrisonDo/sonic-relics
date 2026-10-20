import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { Disc3 } from "lucide-react";
import { useAudioSignal, useInertialSpin } from "../../hooks/useDeviceMotion";
import { formatTime } from "../../lib/model";
import {
  TURNTABLE,
  angleForProgress,
  progressForAngle,
  progressForRadius,
} from "../../lib/turntable";
import type { DeviceProps } from "./shared";
import { PlayGlyph, clamp } from "./shared";

// Direction from the tonearm pivot to the spindle in the device's own space. Comparing
// it with the same two points on screen recovers the device's rotation and scale.
const LOCAL_PIVOT_TO_CENTER = Math.atan2(
  TURNTABLE.center.y - TURNTABLE.pivot.y,
  TURNTABLE.center.x - TURNTABLE.pivot.x,
);
const LOCAL_PIVOT_DISTANCE = Math.hypot(
  TURNTABLE.center.x - TURNTABLE.pivot.x,
  TURNTABLE.center.y - TURNTABLE.pivot.y,
);
const RPM_33 = 200; // 33⅓ revolutions per minute, in degrees per second

export function Vinyl({ track, player, preferences, onLibrary }: DeviceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const spinRef = useRef<HTMLDivElement>(null);
  const platterRef = useRef<HTMLDivElement>(null);
  const pivotRef = useRef<HTMLSpanElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    moved: boolean;
    angle: number | null;
  } | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [parked, setParked] = useState(false);

  useAudioSignal(player, rootRef);
  useInertialSpin(
    player.playing ? RPM_33 : 0,
    preferences.reducedMotion,
    (angle) => {
      if (spinRef.current)
        spinRef.current.style.transform = `rotate(${angle}deg)`;
    },
    { spinUp: 0.55, spinDown: 1.6 },
  );
  useEffect(() => {
    if (player.playing) setParked(false);
  }, [player.playing]);
  useEffect(() => setParked(false), [track.id]);

  const progress = player.duration ? clamp(player.time / player.duration) : 0;
  const resting = !player.playing && (parked || player.time < 0.25);
  const angle =
    drag ?? (resting ? TURNTABLE.restAngle : angleForProgress(progress));
  const lifted = drag !== null || !player.playing;

  const frame = () => {
    const pivot = pivotRef.current?.getBoundingClientRect();
    const platter = platterRef.current?.getBoundingClientRect();
    if (!pivot || !platter) return null;
    const p = {
      x: pivot.left + pivot.width / 2,
      y: pivot.top + pivot.height / 2,
    };
    const c = {
      x: platter.left + platter.width / 2,
      y: platter.top + platter.height / 2,
    };
    return {
      pivot: p,
      center: c,
      rotation: Math.atan2(c.y - p.y, c.x - p.x) - LOCAL_PIVOT_TO_CENTER,
      scale: Math.hypot(c.x - p.x, c.y - p.y) / LOCAL_PIVOT_DISTANCE,
    };
  };
  const angleAt = (clientX: number, clientY: number) => {
    const screen = frame();
    if (!screen) return null;
    const dx = clientX - screen.pivot.x;
    const dy = clientY - screen.pivot.y;
    const cos = Math.cos(-screen.rotation);
    const sin = Math.sin(-screen.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    return clamp(
      (Math.atan2(-localX, localY) * 180) / Math.PI,
      TURNTABLE.restAngle,
      TURNTABLE.maxAngle,
    );
  };

  const lowerAt = (position: number, seek = true) => {
    player.mechanicalClick("drop");
    setParked(false);
    if (seek && player.duration) player.seek(position * player.duration);
    if (!player.playing) void player.play();
  };
  const toggleNeedle = () => {
    if (player.playing) {
      player.mechanicalClick();
      player.pause();
    } else lowerAt(progress, false);
  };

  const armDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
      angle: null,
    };
  };
  const armMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current) return;
    if (
      !current.moved &&
      Math.hypot(event.clientX - current.x, event.clientY - current.y) < 4
    )
      return;
    if (!current.moved) {
      current.moved = true;
      // Lifting the arm off the groove stops the sound, like the real thing.
      if (player.playing) player.pause();
    }
    current.angle = angleAt(event.clientX, event.clientY);
    if (current.angle !== null) setDrag(current.angle);
  };
  const armUp = () => {
    const current = gesture.current;
    gesture.current = null;
    if (!current) return;
    setDrag(null);
    if (!current.moved) {
      toggleNeedle();
      return;
    }
    const landing =
      current.angle === null ? null : progressForAngle(current.angle);
    if (landing === null) {
      player.mechanicalClick();
      player.pause();
      setParked(true);
    } else lowerAt(landing);
  };
  const armCancel = () => {
    gesture.current = null;
    setDrag(null);
  };
  const armKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowRight: 0.05,
      ArrowUp: 0.05,
      ArrowLeft: -0.05,
      ArrowDown: -0.05,
    };
    if (event.key in steps || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!player.duration) return;
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 0.98
            : clamp(progress + steps[event.key]);
      setParked(false);
      player.seek(next * player.duration);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleNeedle();
    }
  };
  const recordClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Keyboard activation has no pointer position: treat it as the cue lever.
    if (event.detail === 0) {
      toggleNeedle();
      return;
    }
    const screen = frame();
    if (!screen) return;
    const radius =
      Math.hypot(
        event.clientX - screen.center.x,
        event.clientY - screen.center.y,
      ) / screen.scale;
    if (radius < TURNTABLE.labelRadius) toggleNeedle();
    else lowerAt(progressForRadius(radius));
  };

  const state = resting
    ? "停在支架上"
    : player.playing
      ? "唱针在唱片上"
      : "唱针已抬起";
  return (
    <div
      ref={rootRef}
      className={`vinyl-player ${player.playing ? "motor-on" : ""} ${lifted ? "arm-lifted" : ""} ${drag !== null ? "arm-dragging" : ""}`}
    >
      <div className="vinyl-deck" />
      <span className="vinyl-brand">
        SONIC <b>RELICS</b>
      </span>
      <span className="vinyl-model">SR–1972 · DIRECT DRIVE</span>
      <div className="vinyl-platter" ref={platterRef}>
        <div className="vinyl-spin" ref={spinRef}>
          <span className="vinyl-strobe" />
          <div className="vinyl-record" key={track.id}>
            <span className="vinyl-grooves" />
            <span
              className="vinyl-label"
              style={{ backgroundImage: `url(${track.cover})` }}
            >
              <small>SIDE A · 33⅓</small>
              <b>{track.title}</b>
            </span>
            <span className="vinyl-spindle" />
          </div>
        </div>
        <span className="vinyl-sheen" />
        <button
          className="vinyl-surface"
          onClick={recordClick}
          aria-label="点唱片落针：外圈是开头，内圈是结尾；点中心标签播放或暂停"
        />
      </div>
      <span className="vinyl-arm-base" />
      <span className="vinyl-pivot" ref={pivotRef} />
      <span className="vinyl-arm-rest" />
      <div
        className="vinyl-tonearm"
        style={{ transform: `rotate(${angle}deg)` }}
        role="slider"
        tabIndex={0}
        aria-label="唱臂：拖到唱片上落针，方向键调整位置，空格放下或抬起"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={`${state}，${formatTime(player.time)} / ${formatTime(player.duration)}`}
        onPointerDown={armDown}
        onPointerMove={armMove}
        onPointerUp={armUp}
        onPointerCancel={armCancel}
        onKeyDown={armKey}
      >
        <span className="arm-counterweight" />
        <span className="arm-tube" />
        <span className="arm-grip" />
        <span className="arm-headshell">
          <i className="arm-stylus" />
        </span>
      </div>
      <button
        className="vinyl-cue"
        onClick={toggleNeedle}
        aria-label={player.playing ? "升起唱臂并暂停" : "放下唱臂并播放"}
        aria-pressed={!lifted}
      >
        <span className="cue-slot">
          <i />
        </span>
        <span>CUE</span>
      </button>
      <button
        className="vinyl-start"
        onClick={toggleNeedle}
        aria-label={player.playing ? "停止唱机" : "启动唱机"}
      >
        <PlayGlyph playing={player.playing} size={11} />
        <span>START · STOP</span>
      </button>
      <span className="vinyl-speed">
        <i className="vinyl-lamp" />
        <b>33⅓</b>
        <span>45</span>
      </span>
      <button
        className="vinyl-swap"
        onClick={() => {
          player.mechanicalClick();
          onLibrary();
        }}
        aria-label="换一张唱片"
      >
        <Disc3 size={15} />
      </button>
    </div>
  );
}
