import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { WaveCanvas } from "../WaveCanvas";
import type { DeviceProps } from "./shared";
import { clamp } from "./shared";

// Vertical chip offsets (px): resting below the socket, or pushed in.
const UNPLUGGED = 18;
const PLUGGED = -10;
const SNAP_LINE = 4;

const FOLDS = [
  "M219 75C184 68 166 92 172 117S213 146 194 170",
  "M147 100C130 107 129 133 145 143S178 133 169 113",
  "M119 145C102 169 112 195 136 192S146 166 157 163",
  "M177 153C158 178 179 198 201 192S227 166 221 145",
  "M107 201C113 224 133 218 143 234S139 260 151 270",
  "M159 208C141 210 149 234 173 232S200 208 218 222",
  "M185 248C156 241 161 275 181 282S212 271 219 253",
  "M217 90C230 106 215 129 224 143",
  "M120 166C134 151 121 131 138 118",
  "M204 298C195 280 214 278 222 290",
];

export function Brain({ player, preferences }: DeviceProps) {
  const [drag, setDrag] = useState<number | null>(null);
  const [pulse, setPulse] = useState(0);
  const gesture = useRef<{
    y: number;
    base: number;
    scale: number;
    moved: boolean;
  } | null>(null);
  const swallowClick = useRef(false);
  const wasPlaying = useRef(player.playing);
  useEffect(() => {
    if (player.playing && !wasPlaying.current) setPulse((value) => value + 1);
    wasPlaying.current = player.playing;
  }, [player.playing]);

  const down = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const element = event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      y: event.clientY,
      base: player.playing ? PLUGGED : UNPLUGGED,
      scale:
        element.getBoundingClientRect().height / (element.offsetHeight || 1),
      moved: false,
    };
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const current = gesture.current;
    if (!current) return;
    const dy = (event.clientY - current.y) / current.scale;
    if (!current.moved && Math.abs(dy) < 3) return;
    current.moved = true;
    setDrag(clamp(current.base + dy, PLUGGED - 2, UNPLUGGED + 10));
  };
  const up = () => {
    const current = gesture.current;
    gesture.current = null;
    if (!current?.moved) return;
    swallowClick.current = true;
    const offset = drag ?? current.base;
    setDrag(null);
    const plugIn = offset < SNAP_LINE;
    player.mechanicalClick(plugIn ? "drop" : "press");
    if (plugIn && !player.playing) void player.play();
    if (!plugIn && player.playing) player.pause();
  };
  const offset = drag ?? (player.playing ? PLUGGED : UNPLUGGED);
  const tilt = -11 * clamp((offset - PLUGGED) / (UNPLUGGED - PLUGGED));

  return (
    <div
      className={`brain-player ${player.playing ? "connected" : ""} ${drag !== null ? "chip-dragging" : ""} ${drag !== null && drag < SNAP_LINE ? "chip-near" : ""}`}
    >
      <span className="brain-top-code">NEURAL INTERFACE / R–77</span>
      <svg className="brain-anatomy" viewBox="0 0 480 400" aria-hidden="true">
        <defs>
          <linearGradient id="brainGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d3ddc8" stopOpacity=".85" />
            <stop offset=".48" stopColor="#a7bda7" stopOpacity=".4" />
            <stop offset="1" stopColor="#9fa992" stopOpacity=".74" />
          </linearGradient>
          <filter id="brainShadow">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id="brainSculpt">
            <feGaussianBlur stdDeviation="2.1" />
          </filter>
        </defs>
        <ellipse
          cx="240"
          cy="358"
          rx="105"
          ry="10"
          fill="#879788"
          opacity=".12"
          filter="url(#brainShadow)"
        />
        {[false, true].map((mirror) => (
          <g
            key={String(mirror)}
            transform={mirror ? "translate(480 0) scale(-1 1)" : undefined}
          >
            <path
              d="M235 74C218 49 194 56 181 62C155 55 131 75 126 96C102 105 100 126 99 145C78 164 89 192 99 204C86 228 105 250 121 258C124 285 147 292 167 291C182 313 214 318 230 303L235 74Z"
              fill="url(#brainGlass)"
              stroke="#7d9386"
              strokeWidth="1.7"
            />
            {FOLDS.map((d, i) => (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke="#526c52"
                  strokeWidth="7"
                  opacity=".2"
                  filter="url(#brainSculpt)"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#edf0d9"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  opacity=".8"
                  transform="translate(-1.3 -1.5)"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="#839c80"
                  strokeWidth={i % 3 === 0 ? 2 : 1.5}
                  strokeLinecap="round"
                  opacity=".7"
                />
              </g>
            ))}
            <path
              d="M223 298C230 316 223 332 231 350"
              fill="none"
              stroke="#82988a"
              strokeWidth="2"
            />
          </g>
        ))}
        <path
          d="M240 69V292M240 312V347"
          stroke="#a1876e"
          strokeWidth="1"
          strokeDasharray="2 5"
          fill="none"
        />
      </svg>
      <WaveCanvas
        player={player}
        reducedMotion={preferences.reducedMotion}
        mode="neural"
      />
      <span className="brain-socket" aria-hidden="true">
        <i />
      </span>
      {pulse > 0 && (
        <span className="brain-pulse" key={pulse} aria-hidden="true" />
      )}
      <button
        className="relic-chip"
        style={{ transform: `translateY(${offset}px) rotate(${tilt}deg)` }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          gesture.current = null;
          setDrag(null);
        }}
        onClick={() => {
          if (swallowClick.current) {
            swallowClick.current = false;
            return;
          }
          player.mechanicalClick(player.playing ? "press" : "drop");
          player.toggle();
        }}
        aria-label={
          player.playing
            ? "拔出 Relic 芯片并暂停（也可以向下拖出）"
            : "接入 Relic 芯片并播放（也可以向上推入接口）"
        }
      >
        <span className="chip-pins" />
        <span className="chip-core">
          <span>RELIC</span>
          <i />
          <small>R—77</small>
        </span>
      </button>
      <span className="brain-connection">
        <i />
        {player.playing
          ? "CONNECTION ESTABLISHED"
          : drag !== null && drag < SNAP_LINE
            ? "RELEASE TO CONNECT"
            : "PUSH THE CHIP TO CONNECT"}
      </span>
    </div>
  );
}
