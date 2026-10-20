import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronsLeft, ChevronsRight, Eject, Square } from "lucide-react";
import { useHoldAction, useInertialSpin } from "../../hooks/useDeviceMotion";
import type { DeviceProps } from "./shared";
import { PlayGlyph, Screw, scanBy } from "./shared";

const PLAY_SPEED = 80; // degrees per second at normal playback
const WIND_SPEED = 900;
const WIND_RATE = 14; // seconds of tape per second while winding

function Reel({
  progress,
  right = false,
  hubRef,
}: {
  progress: number;
  right?: boolean;
  hubRef: (element: HTMLDivElement | null) => void;
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
      <div className="reel-hub" ref={hubRef}>
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

export function Cassette({
  track,
  player,
  preferences,
  onLibrary,
}: DeviceProps) {
  const progress = player.duration ? player.time / player.duration : 0;
  const hubs = useRef<Array<HTMLDivElement | null>>([]);
  const resume = useRef(false);
  const timers = useRef<number[]>([]);
  const [winding, setWinding] = useState<-1 | 0 | 1>(0);
  const [doorOpen, setDoorOpen] = useState(false);
  useEffect(
    () => () => timers.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );
  useInertialSpin(
    winding ? winding * WIND_SPEED : player.playing ? PLAY_SPEED : 0,
    preferences.reducedMotion,
    (angle) =>
      hubs.current.forEach((hub) => {
        if (hub) hub.style.transform = `rotate(${angle}deg)`;
      }),
    { spinUp: 0.3, spinDown: 0.55 },
  );

  const action = (callback: () => void) => {
    player.mechanicalClick();
    callback();
  };
  // Tap REW / FF to jump ten seconds; hold to wind the tape silently, then
  // carry on playing if it was playing before.
  const windKey = (direction: -1 | 1) => ({
    onTap: () => action(() => player.skipSeconds(direction * 10)),
    onHoldStart: () => {
      player.mechanicalClick();
      resume.current = player.playing;
      player.pause();
      setWinding(direction);
    },
    onHold: (dt: number) => scanBy(player, direction * WIND_RATE * dt),
    onHoldEnd: () => {
      setWinding(0);
      player.mechanicalClick();
      if (resume.current) void player.play();
      resume.current = false;
    },
  });
  const rewind = useHoldAction(windKey(-1));
  const forward = useHoldAction(windKey(1));
  const eject = () => {
    player.mechanicalClick();
    if (preferences.reducedMotion) {
      onLibrary();
      return;
    }
    setDoorOpen(true);
    timers.current.push(
      window.setTimeout(onLibrary, 280),
      window.setTimeout(() => setDoorOpen(false), 900),
    );
  };
  const latched = player.playing && !winding;

  return (
    <div className={`cassette-player ${doorOpen ? "door-open" : ""}`}>
      <div className="deck-top">
        <span>SONIC RELICS</span>
        <span className="deck-stereo">
          {winding
            ? winding > 0
              ? "FAST FORWARD ▸▸"
              : "◂◂ REWIND"
            : "PORTABLE STEREO"}
        </span>
        <span
          className={`power-led ${player.playing || winding ? "on" : ""}`}
        />
      </div>
      <div className="deck-window">
        <div className="cassette-tape" key={track.id}>
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
              <Reel
                progress={progress}
                hubRef={(element) => {
                  hubs.current[0] = element;
                }}
              />
              <div className="tape-center-window">
                <span className="visible-tape" />
                <span className="tape-guide" />
              </div>
              <Reel
                progress={progress}
                right
                hubRef={(element) => {
                  hubs.current[1] = element;
                }}
              />
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
            className={winding < 0 ? "pressed" : ""}
            aria-label="磁带倒带：点按后退十秒，按住连续倒带"
            {...rewind}
          >
            <ChevronsLeft size={17} fill="currentColor" />
            <span>REW</span>
          </button>
          <button
            className={`deck-play ${latched ? "pressed" : ""}`}
            onClick={() => action(player.toggle)}
            aria-label={player.playing ? "磁带暂停键" : "磁带播放键"}
            aria-pressed={latched}
          >
            <PlayGlyph playing={player.playing} size={15} />
            <span>{player.playing ? "PAUSE" : "PLAY"}</span>
          </button>
          <button
            className={winding > 0 ? "pressed" : ""}
            aria-label="磁带快进：点按前进十秒，按住连续快进"
            {...forward}
          >
            <ChevronsRight size={17} fill="currentColor" />
            <span>FF</span>
          </button>
          <button onClick={eject} aria-label="弹出磁带，换一盒">
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
