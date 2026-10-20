import { Component, useEffect, useLayoutEffect, useRef } from "react";
import type { MutableRefObject, PointerEvent, ReactNode } from "react";
import type { EraId } from "../lib/model";
import { Brain } from "./devices/Brain";
import { Cassette } from "./devices/Cassette";
import { CDPlayer } from "./devices/CDPlayer";
import { IPod } from "./devices/IPod";
import { MP3 } from "./devices/MP3";
import { MP4 } from "./devices/MP4";
import { Radio } from "./devices/Radio";
import { Streaming } from "./devices/Streaming";
import { Unknown } from "./devices/Unknown";
import { Vinyl } from "./devices/Vinyl";
import type { DeviceProps } from "./devices/shared";
import { ShatterDirector, captureDevice } from "./deviceTransition";
import type { DeviceSnapshot } from "./deviceTransition";

const DEVICES: Record<EraId | "unknown", (props: DeviceProps) => ReactNode> = {
  radio: Radio,
  vinyl: Vinyl,
  cassette: Cassette,
  cd: CDPlayer,
  mp3: MP3,
  ipod: IPod,
  mp4: MP4,
  stream: Streaming,
  relic: Brain,
  unknown: Unknown,
};

interface SwitchProps {
  eraId: string;
  accent: string;
  object: MutableRefObject<HTMLDivElement | null>;
  snapshot: MutableRefObject<DeviceSnapshot | null>;
  children: ReactNode;
}

/**
 * Copies the outgoing device right before React replaces it, so the transition
 * can shatter exactly what was on screen.
 */
class DeviceSwitch extends Component<SwitchProps> {
  getSnapshotBeforeUpdate(previous: SwitchProps) {
    if (previous.eraId !== this.props.eraId && this.props.object.current)
      this.props.snapshot.current = captureDevice(
        this.props.object.current,
        previous.eraId,
        previous.accent,
      );
    return null;
  }

  componentDidUpdate() {
    // The snapshot is consumed by DeviceStage's layout effect.
  }

  render() {
    return this.props.children;
  }
}

const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function DeviceStage(props: DeviceProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const objectRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<DeviceSnapshot | null>(null);
  const director = useRef<ShatterDirector | null>(null);
  const mounted = useRef(false);
  const reduced = props.preferences.reducedMotion || prefersReducedMotion();

  // Runs before paint, after the new device is in the DOM: hide it and let the
  // director play the burst and the reassembly.
  useLayoutEffect(() => {
    if (!stageRef.current || !layerRef.current) return;
    director.current ??= new ShatterDirector(
      layerRef.current,
      stageRef.current,
    );
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    const getLive = () => objectRef.current;
    if (!mounted.current) {
      mounted.current = true;
      if (!reduced)
        director.current.intro(getLive, props.era.id, props.era.accent);
      return;
    }
    if (snapshot)
      director.current.swap(
        snapshot,
        getLive,
        props.era.id,
        props.era.accent,
        reduced,
      );
  }, [props.era.id]);
  useEffect(() => () => director.current?.dispose(), []);
  useEffect(() => {
    if (reduced) director.current?.reset();
  }, [reduced]);

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced || event.pointerType !== "mouse") return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rectangle.left) / rectangle.width - 0.5;
    const y = (event.clientY - rectangle.top) / rectangle.height - 0.5;
    objectRef.current?.style.setProperty("--tilt-x", `${-y * 4}deg`);
    objectRef.current?.style.setProperty("--tilt-y", `${x * 6}deg`);
  };
  const reset = () => {
    objectRef.current?.style.setProperty("--tilt-x", "0deg");
    objectRef.current?.style.setProperty("--tilt-y", "0deg");
  };
  const Device = DEVICES[props.era.id];
  return (
    <div
      ref={stageRef}
      className={`device-stage stage-${props.era.id} ${props.player.playing ? "is-playing" : ""}`}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      <div className="stage-center-mark" aria-hidden="true" />
      <DeviceSwitch
        eraId={props.era.id}
        accent={props.era.accent}
        object={objectRef}
        snapshot={snapshotRef}
      >
        <div className="device-object" key={props.era.id} ref={objectRef}>
          <Device {...props} />
        </div>
      </DeviceSwitch>
      <div className="shatter-layer" ref={layerRef} aria-hidden="true" inert />
      <div className="stage-object-label">
        <span className="object-number">OBJECT {props.era.number}</span>
        <span className="object-label-rule" />
        <span>{props.era.label}</span>
      </div>
    </div>
  );
}
