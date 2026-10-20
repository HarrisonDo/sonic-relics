import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { AudioPlayer } from "../hooks/useAudioPlayer";

interface WaveCanvasProps {
  player: AudioPlayer;
  reducedMotion: boolean;
  mode?: "orb" | "bars" | "neural";
  className?: string;
  /** Receives a function that sends a touch ripple through the orb from (x, y). */
  rippleRef?: MutableRefObject<((x: number, y: number) => void) | null>;
}

export function WaveCanvas({
  player,
  reducedMotion,
  mode = "orb",
  className = "",
  rippleRef,
}: WaveCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readSpectrum = player.readSpectrum;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const data = new Uint8Array(128);
    let width = 0;
    let height = 0;
    let frame = 0;
    let phase = 0;
    let amplitude = 0;
    let lastTime = 0;
    const resize = () => {
      const rectangle = canvas.getBoundingClientRect();
      width = rectangle.width;
      height = rectangle.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    // Touch ripples are interaction feedback, separate from the audio response.
    const ripples: Array<{ x: number; y: number; born: number }> = [];
    if (rippleRef)
      rippleRef.current = (x, y) => {
        if (reducedMotion) return;
        if (ripples.length > 4) ripples.shift();
        ripples.push({ x, y, born: performance.now() });
      };
    const draw = (now: number) => {
      const signal = readSpectrum(data);
      amplitude += (signal - amplitude) * 0.16;
      const delta = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;
      if (!reducedMotion && signal > 0.002)
        phase += delta * (0.13 + signal * 0.55);
      context.clearRect(0, 0, width, height);
      canvas.parentElement?.style.setProperty("--signal", String(amplitude));
      if (mode === "bars") {
        const count = 22;
        const gap = width / count;
        const gradient = context.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, "#709886");
        gradient.addColorStop(1, "#d6dcb5");
        context.fillStyle = gradient;
        for (let i = 0; i < count; i++) {
          const value = data[Math.floor(i * 2.8)] / 255;
          const barHeight = Math.max(2, value * height * 0.88);
          context.fillRect(
            i * gap,
            height - barHeight,
            Math.max(1, gap - 3),
            barHeight,
          );
        }
      } else if (mode === "neural") {
        const points = [
          [0.32, 0.26],
          [0.44, 0.19],
          [0.28, 0.41],
          [0.43, 0.43],
          [0.34, 0.58],
          [0.45, 0.66],
          [0.58, 0.21],
          [0.69, 0.29],
          [0.58, 0.42],
          [0.74, 0.44],
          [0.62, 0.6],
          [0.54, 0.68],
        ];
        const base = height / 400;
        for (let i = 0; i < points.length; i++) {
          const [x, y] = points[i];
          const response = data[i * 6] / 255;
          context.beginPath();
          context.moveTo(width * 0.5, height * 0.88);
          context.quadraticCurveTo(
            width * (i < 6 ? 0.46 : 0.54),
            height * 0.68,
            width * x,
            height * y,
          );
          context.strokeStyle = `rgba(168, 104, 77, ${0.055 + response * 0.48})`;
          context.lineWidth = 1 * base;
          context.stroke();
          context.beginPath();
          context.arc(
            width * x,
            height * y,
            (1.7 + response * 3) * base,
            0,
            Math.PI * 2,
          );
          context.fillStyle = `rgba(178, 103, 78, ${0.2 + response * 0.8})`;
          context.shadowColor = "#d6906c";
          context.shadowBlur = response * 16;
          context.fill();
          context.shadowBlur = 0;
        }
      } else {
        const centerX = width * 0.5;
        const centerY = height * 0.49;
        const radius = Math.min(width * 0.33, height * 0.42);
        const gradient = context.createLinearGradient(
          centerX - radius,
          0,
          centerX + radius,
          height,
        );
        gradient.addColorStop(0, "rgba(74, 117, 111, .65)");
        gradient.addColorStop(0.52, "rgba(98, 139, 139, .9)");
        gradient.addColorStop(1, "rgba(174, 131, 97, .54)");
        context.strokeStyle = gradient;
        while (ripples.length && now - ripples[0].born > 1600) ripples.shift();
        const waves = ripples.map((ripple) => {
          const age = (now - ripple.born) / 1000;
          return {
            x: ripple.x,
            y: ripple.y,
            front: age * 230,
            strength: (1 - age / 1.6) * 11,
          };
        });
        for (let ring = 0; ring < 42; ring++) {
          context.beginPath();
          const depth = ring / 41;
          for (let point = 0; point <= 180; point++) {
            const angle = (point / 180) * Math.PI * 2;
            const frequency = data[Math.floor((point / 180) * 78)] / 255;
            const contour =
              1 +
              0.095 * Math.sin(angle * 3 + phase + depth * 2.7) +
              0.055 * Math.cos(angle * 5 - phase * 0.7 + depth * 4);
            const signalScale = reducedMotion
              ? 1
              : 1 + amplitude * 0.09 + frequency * 0.04;
            const r = radius * (0.29 + depth * 0.71) * contour * signalScale;
            let x = centerX + Math.cos(angle) * r;
            let y =
              centerY +
              Math.sin(angle) * r * 0.88 +
              Math.cos(angle * 2 + depth * 2) * radius * 0.07;
            for (const wave of waves) {
              const dx = x - wave.x;
              const dy = y - wave.y;
              const distance = Math.hypot(dx, dy) || 1;
              const bump =
                Math.exp(-((distance - wave.front) ** 2) / 900) * wave.strength;
              x += (dx / distance) * bump;
              y += (dy / distance) * bump;
            }
            if (point === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }
          context.closePath();
          context.globalAlpha = 0.25 + Math.sin(depth * Math.PI) * 0.7;
          context.lineWidth = 0.68 + amplitude * 0.4;
          context.stroke();
        }
        for (const wave of waves) {
          context.globalAlpha = Math.max(0, wave.strength / 11) * 0.42;
          context.lineWidth = 1;
          context.strokeStyle = "rgba(87, 132, 131, 1)";
          for (const scale of [1, 0.72]) {
            context.beginPath();
            context.arc(
              wave.x,
              wave.y,
              Math.max(1, wave.front * scale),
              0,
              Math.PI * 2,
            );
            context.stroke();
          }
        }
        context.globalAlpha = 1;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (rippleRef) rippleRef.current = null;
    };
  }, [readSpectrum, reducedMotion, mode, rippleRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`wave-canvas ${className}`}
      aria-hidden="true"
    />
  );
}
