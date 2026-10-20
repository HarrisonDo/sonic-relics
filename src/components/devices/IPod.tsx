import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  BatteryFull,
  ChevronRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
} from "lucide-react";
import {
  createThrottle,
  useHoldAction,
  useRotaryDrag,
} from "../../hooks/useDeviceMotion";
import { formatTime } from "../../lib/model";
import type { DeviceProps } from "./shared";
import { clamp, currentVolume, scanBy, trackIndex } from "./shared";

// One full turn of the wheel covers most of the volume range, like the original.
const VOLUME_PER_TURN = 0.8;
const MENU_STEP = 0.42; // radians of wheel travel per list item
const TURN_CANCELS_TAP = 0.18; // radians: past this, a press on a label was a turn

export function IPod({
  track,
  tracks,
  player,
  preferences,
  onSelect,
  onNext,
  onPrevious,
  onVolume,
}: DeviceProps) {
  const [menu, setMenu] = useState(false);
  const [cursor, setCursor] = useState(trackIndex(tracks, track));
  const [showVolume, setShowVolume] = useState(false);
  const [scan, setScan] = useState(0);
  const remainder = useRef(0);
  const travel = useRef(0);
  const volumeTravel = useRef(0);
  const liveVolume = useRef(currentVolume(preferences));
  const volumeTimer = useRef(0);
  const menuList = useRef<HTMLDivElement>(null);
  const scanStep = useRef(createThrottle(0.16));
  const repeatStep = useRef(createThrottle(0.15));
  liveVolume.current = currentVolume(preferences);

  useEffect(() => setCursor(trackIndex(tracks, track)), [track.id, tracks]);
  useEffect(() => {
    menuList.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor, menu]);
  useEffect(() => () => window.clearTimeout(volumeTimer.current), []);

  const turn = (direction: number) => {
    if (!tracks.length) return;
    player.mechanicalClick("tick");
    setMenu(true);
    setCursor((value) => (value + direction + tracks.length) % tracks.length);
  };
  const changeVolume = (delta: number) => {
    const next = clamp(liveVolume.current + delta);
    liveVolume.current = next;
    onVolume(next);
    volumeTravel.current += Math.abs(delta);
    if (volumeTravel.current >= 0.04) {
      volumeTravel.current = 0;
      player.mechanicalClick("tick");
    }
    setShowVolume(true);
    window.clearTimeout(volumeTimer.current);
    volumeTimer.current = window.setTimeout(() => setShowVolume(false), 1600);
  };
  // In the menu the wheel scrolls the list; on Now Playing it is the volume.
  // A turn may begin on the printed labels, so a real turn cancels their tap.
  const wheel = useRotaryDrag(
    (radians) => {
      travel.current += Math.abs(radians);
      if (menu) {
        remainder.current += radians;
        if (Math.abs(remainder.current) > MENU_STEP) {
          turn(Math.sign(remainder.current));
          remainder.current = 0;
        }
      } else changeVolume((radians / (Math.PI * 2)) * VOLUME_PER_TURN);
    },
    {
      fromButtons: true,
      onStart: () => {
        remainder.current = 0;
        travel.current = 0;
      },
      // Forget the turn once the click that follows this release has been handled.
      onEnd: () => {
        window.setTimeout(() => {
          travel.current = 0;
        }, 0);
      },
    },
  );
  const turned = () => travel.current > TURN_CANCELS_TAP;
  const unlessTurned = (action: () => void) => () => {
    if (!turned()) action();
  };
  const center = () => {
    player.mechanicalClick("tick");
    if (menu) {
      if (tracks[cursor]) onSelect(tracks[cursor].id);
      setMenu(false);
    } else player.toggle();
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("button")) return;
    const step: Record<string, number> = menu
      ? { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }
      : { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
    if (event.key in step) {
      event.preventDefault();
      if (menu) turn(step[event.key]);
      else changeVolume(step[event.key] * 0.05);
    } else if (event.key === "Enter") {
      event.preventDefault();
      center();
    } else if (event.key === "Escape" && menu) {
      event.preventDefault();
      setMenu(false);
    }
  };
  const skipKey = (direction: 1 | -1) => ({
    onTap: unlessTurned(() => {
      if (menu) turn(direction);
      else {
        player.mechanicalClick("tick");
        if (direction > 0) onNext();
        else onPrevious();
      }
    }),
    onHoldStart: () => {
      if (!menu && !turned()) setScan(direction);
    },
    onHold: (dt: number) => {
      if (turned()) return;
      if (menu) repeatStep.current(dt, () => turn(direction));
      else
        scanStep.current(dt, (elapsed) =>
          scanBy(player, direction * elapsed * 7),
        );
    },
    onHoldEnd: () => setScan(0),
  });
  const previous = useHoldAction(skipKey(-1));
  const next = useHoldAction(skipKey(1));
  const volume = currentVolume(preferences);
  const progress = player.duration ? (player.time / player.duration) * 100 : 0;

  return (
    <div className="ipod-player">
      <div className="ipod-screen">
        <div className="ipod-screen-title">
          <span>
            {menu
              ? "音乐资料库"
              : showVolume
                ? "音量"
                : scan
                  ? scan > 0
                    ? "快进 ▸▸"
                    : "◂◂ 快退"
                  : "正在播放"}
          </span>
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
                  player.mechanicalClick("tick");
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
            {showVolume ? (
              <div
                className="ipod-volume"
                role="status"
                aria-label={`音量 ${Math.round(volume * 100)}`}
              >
                <Volume1 size={9} />
                <span className="ipod-volume-bar">
                  <i style={{ width: `${volume * 100}%` }} />
                </span>
                <Volume2 size={10} />
              </div>
            ) : (
              <>
                <div className="ipod-progress">
                  <i style={{ width: `${progress}%` }} />
                </div>
                <span className="ipod-time">
                  {formatTime(player.time)}
                  <span>{formatTime(player.duration)}</span>
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <span className="ipod-wordmark">SONIC RELICS</span>
      <div
        className="click-wheel"
        role="group"
        aria-label={
          menu
            ? "iPod 转盘：转动或用方向键选曲，回车确认"
            : "iPod 转盘：转动或用方向键调音量，MENU 打开歌单"
        }
        tabIndex={0}
        onKeyDown={key}
        {...wheel}
      >
        <button
          className="wheel-menu"
          onClick={unlessTurned(() => {
            player.mechanicalClick("tick");
            setMenu(!menu);
          })}
          aria-pressed={menu}
        >
          MENU
        </button>
        <button
          className="wheel-prev"
          aria-label={menu ? "iPod 上一项" : "iPod 上一首，按住快退"}
          {...previous}
        >
          <SkipBack size={17} fill="currentColor" />
        </button>
        <button
          className="wheel-next"
          aria-label={menu ? "iPod 下一项" : "iPod 下一首，按住快进"}
          {...next}
        >
          <SkipForward size={17} fill="currentColor" />
        </button>
        <button
          className="wheel-play"
          onClick={unlessTurned(() => {
            player.mechanicalClick("tick");
            player.toggle();
          })}
          aria-label={player.playing ? "暂停 iPod" : "播放 iPod"}
        >
          <Play size={11} fill="currentColor" />
          <Pause size={11} fill="currentColor" />
        </button>
        <button
          className="wheel-center"
          data-no-rotate
          onClick={center}
          aria-label={menu ? "确认 iPod 选曲" : "iPod 中心播放键"}
        />
      </div>
      <span className="ipod-bottom-mark">Designed for memories.</span>
    </div>
  );
}
