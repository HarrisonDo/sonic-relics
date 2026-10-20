import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import type { AudioPlayer } from "./useAudioPlayer";

/** Calls `callback` on every animation frame while mounted, always with the latest closure. */
export function useFrame(callback: (dt: number, now: number) => void) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      latest.current(dt, now);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
}

/**
 * Turns something like a motor would: it spins up and coasts down instead of
 * starting or stopping instantly. `targetSpeed` is in degrees per second.
 */
export function useInertialSpin(
  targetSpeed: number,
  reducedMotion: boolean,
  apply: (angle: number) => void,
  { spinUp = 0.45, spinDown = 1.1 } = {},
) {
  const state = useRef({ angle: 0, speed: 0 });
  useFrame((dt) => {
    const spin = state.current;
    if (reducedMotion) {
      spin.speed = 0;
      return;
    }
    const accelerating =
      Math.abs(targetSpeed) > Math.abs(spin.speed) ||
      Math.sign(targetSpeed) !== Math.sign(spin.speed);
    const timeConstant = accelerating ? spinUp : spinDown;
    spin.speed +=
      (targetSpeed - spin.speed) * (1 - Math.exp(-dt / timeConstant));
    if (targetSpeed === 0 && Math.abs(spin.speed) < 0.4) spin.speed = 0;
    if (spin.speed === 0) return;
    spin.angle = (spin.angle + spin.speed * dt) % 360;
    apply(spin.angle);
  });
  return state;
}

/** Publishes the real, smoothed playback level as the `--signal` CSS variable. */
export function useAudioSignal(
  player: AudioPlayer,
  target: RefObject<HTMLElement | null>,
  smoothing = 0.18,
) {
  const buffer = useRef(new Uint8Array(128));
  const level = useRef(0);
  const written = useRef("");
  useFrame(() => {
    const signal = player.readSpectrum(buffer.current);
    level.current += (signal - level.current) * smoothing;
    const value = level.current < 0.002 ? "0" : level.current.toFixed(3);
    if (value !== written.current && target.current) {
      target.current.style.setProperty("--signal", value);
      written.current = value;
    }
  });
  return level;
}

interface HoldOptions {
  /** A short press, or keyboard activation. */
  onTap: () => void;
  onHoldStart?: () => void;
  /** Called every frame while held, with seconds since the last frame. */
  onHold?: (dt: number, elapsed: number) => void;
  onHoldEnd?: () => void;
  delay?: number;
}

/**
 * Tap for one action, press and hold for a continuous one — like the REW / FF
 * keys of a tape deck. Keyboard users get the tap through the normal click.
 */
export function useHoldAction(options: HoldOptions) {
  const latest = useRef(options);
  latest.current = options;
  const state = useRef({
    timer: 0,
    frame: 0,
    pressed: false,
    holding: false,
    suppressClick: false,
    last: 0,
    started: 0,
  });
  const stop = (tap: boolean) => {
    const hold = state.current;
    window.clearTimeout(hold.timer);
    hold.timer = 0;
    if (hold.holding) {
      cancelAnimationFrame(hold.frame);
      hold.holding = false;
      latest.current.onHoldEnd?.();
    } else if (tap) latest.current.onTap();
  };
  useEffect(() => () => stop(false), []);
  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const hold = state.current;
      hold.pressed = true;
      hold.suppressClick = false;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      window.clearTimeout(hold.timer);
      hold.timer = window.setTimeout(() => {
        hold.timer = 0;
        hold.holding = true;
        hold.started = hold.last = performance.now();
        latest.current.onHoldStart?.();
        const tick = (now: number) => {
          if (!hold.holding) return;
          latest.current.onHold?.(
            Math.min(0.05, (now - hold.last) / 1000),
            (now - hold.started) / 1000,
          );
          hold.last = now;
          hold.frame = requestAnimationFrame(tick);
        };
        hold.frame = requestAnimationFrame(tick);
      }, latest.current.delay ?? 320);
    },
    onPointerUp: () => {
      const hold = state.current;
      if (!hold.pressed) return;
      hold.pressed = false;
      hold.suppressClick = true;
      stop(true);
    },
    onPointerCancel: () => {
      state.current.pressed = false;
      stop(false);
    },
    onClick: () => {
      const hold = state.current;
      if (hold.suppressClick) {
        hold.suppressClick = false;
        return;
      }
      latest.current.onTap();
    },
    onContextMenu: (event: { preventDefault: () => void }) =>
      event.preventDefault(),
  };
}

/**
 * Reports how far a pointer has turned around the centre of the element it pressed.
 * With `fromButtons`, a turn may start on a button inside the element (like the
 * labels printed on a click wheel); only `[data-no-rotate]` stays a plain button.
 */
export function useRotaryDrag(
  onTurn: (radians: number) => void,
  {
    onStart,
    onEnd,
    fromButtons = false,
  }: { onStart?: () => void; onEnd?: () => void; fromButtons?: boolean } = {},
) {
  const latest = useRef({ onTurn, onStart, onEnd });
  latest.current = { onTurn, onStart, onEnd };
  const movement = useRef<{ angle: number } | null>(null);
  const angleOf = (event: ReactPointerEvent<HTMLElement>) => {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return Math.atan2(
      event.clientY - rectangle.top - rectangle.height / 2,
      event.clientX - rectangle.left - rectangle.width / 2,
    );
  };
  const end = () => {
    if (!movement.current) return;
    movement.current = null;
    latest.current.onEnd?.();
  };
  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const target = event.target as Element;
      const onButton = !!target.closest("button");
      if (onButton && (!fromButtons || target.closest("[data-no-rotate]")))
        return;
      movement.current = { angle: angleOf(event) };
      // A button keeps its own pointer; its moves still bubble up to us.
      if (!onButton) event.currentTarget.setPointerCapture(event.pointerId);
      latest.current.onStart?.();
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      if (!movement.current) return;
      const angle = angleOf(event);
      let delta = angle - movement.current.angle;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      movement.current.angle = angle;
      latest.current.onTurn(delta);
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}

/** Repeats an action at a fixed rhythm while something is held (for audible scanning). */
export function createThrottle(interval: number) {
  let accumulated = 0;
  return (dt: number, action: (elapsed: number) => void) => {
    accumulated += dt;
    if (accumulated >= interval) {
      action(accumulated);
      accumulated = 0;
    }
  };
}
