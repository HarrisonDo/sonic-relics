import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eject,
  SkipBack,
  SkipForward,
} from "lucide-react";
import {
  createThrottle,
  useHoldAction,
  useInertialSpin,
} from "../../hooks/useDeviceMotion";
import { formatTime } from "../../lib/model";
import type { DeviceProps } from "./shared";
import { PlayGlyph, pad2, scanBy, trackIndex } from "./shared";

const DISC_SPEED = 40;

export function CDPlayer({
  track,
  tracks,
  player,
  preferences,
  onSelect,
  onNext,
  onPrevious,
}: DeviceProps) {
  const index = trackIndex(tracks, track);
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState(index);
  const [swapFrom, setSwapFrom] = useState(0);
  const [scan, setScan] = useState(0);
  const resumeAfterClosing = useRef(false);
  const discRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  const scanStep = useRef(createThrottle(0.16));
  const browseStep = useRef(createThrottle(0.26));

  useInertialSpin(
    player.playing ? DISC_SPEED : 0,
    preferences.reducedMotion,
    (angle) => {
      if (discRef.current)
        discRef.current.style.transform = `rotate(${angle}deg)`;
    },
    { spinUp: 0.7, spinDown: 1.6 },
  );
  useEffect(() => {
    // Playback started elsewhere (the transport bar, a shortcut): close up.
    if (player.playing && open) {
      setOpen(false);
      resumeAfterClosing.current = false;
    }
  }, [open, player.playing]);

  const shown = open ? (tracks[candidate] ?? track) : track;
  const browse = (direction: 1 | -1) => {
    if (!tracks.length) return;
    player.mechanicalClick("tick");
    setSwapFrom(direction * 46);
    setCandidate(
      (value) => (value + direction + tracks.length) % tracks.length,
    );
  };
  const openLid = () => {
    player.mechanicalClick();
    resumeAfterClosing.current = player.playing;
    player.pause();
    setCandidate(index);
    setSwapFrom(0);
    setOpen(true);
  };
  /** Close the lid; a different disc starts playing, the same one resumes. */
  const closeLid = (play = resumeAfterClosing.current) => {
    player.mechanicalClick();
    setOpen(false);
    const chosen = tracks[candidate];
    if (chosen && chosen.id !== track.id) onSelect(chosen.id);
    else if (play) void player.play();
    resumeAfterClosing.current = false;
  };
  const toggleLid = () => (open ? closeLid() : openLid());
  const toggle = () => {
    if (open) {
      closeLid(true);
      return;
    }
    player.mechanicalClick();
    player.toggle();
  };
  const skipKey = (direction: 1 | -1) => ({
    onTap: () => {
      if (open) browse(direction);
      else {
        player.mechanicalClick();
        if (direction > 0) onNext();
        else onPrevious();
      }
    },
    onHoldStart: () => {
      if (!open) setScan(direction);
    },
    onHold: (dt: number) => {
      if (open) browseStep.current(dt, () => browse(direction));
      else
        scanStep.current(dt, (elapsed) =>
          scanBy(player, direction * elapsed * 7),
        );
    },
    onHoldEnd: () => setScan(0),
  });
  const previous = useHoldAction(skipKey(-1));
  const next = useHoldAction(skipKey(1));

  const wellDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!open || (event.target as Element).closest("button")) return;
    swipe.current = { x: event.clientX, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const wellMove = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = swipe.current;
    if (!gesture || gesture.moved) return;
    const dx = event.clientX - gesture.x;
    if (Math.abs(dx) > 34) {
      gesture.moved = true;
      browse(dx < 0 ? 1 : -1);
    }
  };
  const wellUp = () => {
    const gesture = swipe.current;
    swipe.current = null;
    // A plain tap on the open disc puts it back and closes the lid.
    if (gesture && !gesture.moved) closeLid(true);
  };

  const lcd = open
    ? `OPEN ${pad2(candidate + 1)}`
    : player.status === "loading"
      ? "READ ··"
      : `${pad2(index + 1)} ${formatTime(player.time)}`;
  return (
    <div className={`cd-player ${open ? "lid-open" : ""}`}>
      <div className="cd-device-brand">
        <span>SONIC RELICS</span>
        <span>
          {scan
            ? scan > 0
              ? "SEARCH ▸▸"
              : "◂◂ SEARCH"
            : player.playing
              ? "ESP · 40 SEC"
              : "COMPACT DISC / 01"}
        </span>
      </div>
      <div
        className="cd-well"
        onPointerDown={wellDown}
        onPointerMove={wellMove}
        onPointerUp={wellUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <div
          className="disc-holder"
          key={shown.id}
          style={{ "--swap-from": `${swapFrom}px` } as CSSProperties}
        >
          <div className="compact-disc" ref={discRef}>
            <div className="disc-grooves" />
            <div
              className="disc-label-art"
              style={{ backgroundImage: `url(${shown.cover})` }}
            />
            <span className="disc-track-title">{shown.title}</span>
            <span className="disc-label-tiny">
              DIGITAL AUDIO · SONIC RELICS
            </span>
            <div className="disc-center">
              <div />
            </div>
          </div>
        </div>
        {open && tracks.length > 1 && (
          <>
            <button
              className="cd-browse prev"
              onClick={() => browse(-1)}
              aria-label="上一张碟"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="cd-browse next"
              onClick={() => browse(1)}
              aria-label="下一张碟"
            >
              <ChevronRight size={16} />
            </button>
            <span className="cd-disc-count" aria-live="polite">
              DISC {pad2(candidate + 1)} / {pad2(tracks.length)} · 点碟片合盖
            </span>
          </>
        )}
      </div>
      <button
        className="cd-lid"
        onClick={toggleLid}
        aria-label={open ? "合上 CD 舱盖" : "打开 CD 舱盖换碟"}
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
        <span className="cd-lcd">{lcd}</span>
        <button
          aria-label={open ? "上一张碟" : "上一首，按住快退"}
          {...previous}
        >
          <SkipBack size={13} fill="currentColor" />
        </button>
        <button
          className="cd-play"
          onClick={toggle}
          aria-label={
            open ? "合上舱盖并播放" : player.playing ? "暂停 CD" : "播放 CD"
          }
        >
          <PlayGlyph playing={player.playing} size={18} />
        </button>
        <button aria-label={open ? "下一张碟" : "下一首，按住快进"} {...next}>
          <SkipForward size={13} fill="currentColor" />
        </button>
        <button
          className={open ? "pressed" : ""}
          onClick={toggleLid}
          aria-label={open ? "合上舱盖" : "打开舱盖换碟"}
        >
          <Eject size={14} />
        </button>
      </div>
      <span className="cd-edge" />
    </div>
  );
}
