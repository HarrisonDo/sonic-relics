// The "big bang" between carriers: the outgoing device cracks, bursts into real
// fragments of itself plus a cloud of particles, and the incoming device
// reassembles from pieces flying back in. Audio never waits for any of this.
//
// Fragments are clones of the live device DOM clipped into polygons, so every
// carrier shatters exactly as it looks without rasterising anything.

import { createFracture, toClipPath } from "../lib/shatter";
import type { Bounds, Point, Shard } from "../lib/shatter";

export interface DeviceSnapshot {
  master: HTMLElement;
  bounds: Bounds;
  eraId: string;
  accent: string;
}

type Phase = "idle" | "waiting" | "assembling" | "settling";

const CHARGE = 160;
const ASSEMBLE_AT = 450;
const EXPLODE_DURATION = 560;
const ASSEMBLE_DURATION = 620;
const IDENTITY =
  "translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1)";

const PALETTES: Record<string, string[]> = {
  radio: ["#9b724b", "#d8ccb0", "#5d5235", "#b6623b", "#e4d7ae"],
  vinyl: ["#1d1c1a", "#6b4a32", "#c39a52", "#d9d3c4", "#b4673f"],
  cassette: ["#4b5744", "#be6545", "#e4d9b9", "#2b3526", "#d7865d"],
  cd: ["#e1e2d7", "#b8ced0", "#eadcba", "#8f9f81", "#c7bacd"],
  mp3: ["#a3bcb0", "#a1b88c", "#587e6c", "#d9e3d1", "#354d27"],
  ipod: ["#f2f2e5", "#485d3d", "#e5ead6", "#adbba0", "#739257"],
  mp4: ["#3f5546", "#5d6c5f", "#acbf9d", "#172c24", "#e9f1cf"],
  stream: ["#4a756f", "#628b8b", "#ae8361", "#c5d6cc", "#92ac92"],
  relic: ["#a7bda7", "#d3ddc8", "#b2674e", "#677e62", "#d6906c"],
  unknown: ["#e8ebd7", "#7d8174", "#bdc9ae", "#778e60"],
};

type RGB = [number, number, number];
const toRGB = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const palette = (eraId: string) =>
  (PALETTES[eraId] ?? PALETTES.unknown).map(toRGB);
const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function copyCanvases(from: ParentNode, to: ParentNode) {
  const sources = from.querySelectorAll("canvas");
  const targets = to.querySelectorAll("canvas");
  sources.forEach((source, index) => {
    const target = targets[index];
    if (!target || !source.width || !source.height) return;
    target.width = source.width;
    target.height = source.height;
    try {
      target.getContext("2d")?.drawImage(source, 0, 0);
    } catch {
      // A lost or unreadable canvas just stays blank in the fragment.
    }
  });
}

function cloneDevice(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.visibility = "";
  clone.style.opacity = "";
  clone.classList.add("device-clone");
  copyCanvases(source, clone);
  // SVG blur filters would be re-rasterised for every fragment on every frame
  // (hundreds of milliseconds per frame). Fragments in flight don't need them.
  clone
    .querySelectorAll("[filter]")
    .forEach((element) => element.removeAttribute("filter"));
  return clone;
}

/** Where the device itself sits inside the stage, in stage pixels. */
function measure(object: HTMLElement): Bounds {
  const stage = (object.parentElement ?? object).getBoundingClientRect();
  const device = (object.firstElementChild ?? object).getBoundingClientRect();
  return {
    x: device.left - stage.left,
    y: device.top - stage.top,
    width: device.width,
    height: device.height,
  };
}

export function captureDevice(
  object: HTMLElement,
  eraId: string,
  accent: string,
): DeviceSnapshot {
  return {
    master: cloneDevice(object),
    bounds: measure(object),
    eraId,
    accent,
  };
}

interface Motion {
  far: string;
  mid: string;
  overshoot: string;
}

function motionFor(shard: Shard, intensity: number): Motion {
  const distance =
    (110 + Math.random() * 150) * (0.7 + shard.ring * 0.32) * intensity;
  const angle =
    Math.atan2(shard.direction[1], shard.direction[0]) +
    (Math.random() - 0.5) * 0.6;
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance;
  const dz = (Math.random() * 2 - 0.4) * 180 * intensity;
  const rx = (Math.random() - 0.5) * 220;
  const ry = (Math.random() - 0.5) * 220;
  const rz = (Math.random() - 0.5) * 140;
  const fall = 30 + Math.random() * 40;
  const at = (k: number, extraY = 0, scale = 1) =>
    `translate3d(${(dx * k).toFixed(1)}px, ${(dy * k + extraY).toFixed(1)}px, ${(dz * k).toFixed(1)}px) rotateX(${(rx * k).toFixed(1)}deg) rotateY(${(ry * k).toFixed(1)}deg) rotateZ(${(rz * k).toFixed(1)}deg) scale(${scale})`;
  return {
    far: at(1, fall, 0.86),
    mid: at(0.6, 0, 0.97),
    overshoot: at(-0.025),
  };
}

class ParticleField {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D | null;
  private particles: Particle[] = [];
  private cracks: { lines: Array<[Point, Point]>; born: number } | null = null;
  private frame = 0;
  private last = 0;
  private margin = { x: 160, y: 140 };
  private gatherCenter: Point = [0, 0];

  constructor(
    layer: HTMLElement,
    private stage: HTMLElement,
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "shatter-particles";
    this.context = this.canvas.getContext("2d");
    layer.append(this.canvas);
  }

  private resize() {
    const rect = this.stage.getBoundingClientRect();
    this.margin = {
      x: Math.max(140, rect.width * 0.32),
      y: Math.max(120, rect.height * 0.5),
    };
    const width = rect.width + this.margin.x * 2;
    const height = rect.height + this.margin.y * 2;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    Object.assign(this.canvas.style, {
      left: `${-this.margin.x}px`,
      top: `${-this.margin.y}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  burst(
    bounds: Bounds,
    impact: Point,
    cracks: Array<[Point, Point]>,
    colors: RGB[],
    count: number,
  ) {
    if (!this.frame) this.resize();
    const now = performance.now();
    this.cracks = { lines: cracks, born: now };
    for (let i = 0; i < count; i++) {
      const x = bounds.x + Math.random() * bounds.width;
      const y = bounds.y + Math.random() * bounds.height;
      let dx = x - impact[0];
      let dy = y - impact[1];
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
      const speed = 170 + Math.random() * 480;
      const spread = (Math.random() - 0.5) * 0.7;
      const cos = Math.cos(spread);
      const sin = Math.sin(spread);
      this.particles.push({
        x,
        y,
        vx: (dx * cos - dy * sin) * speed,
        vy: (dx * sin + dy * cos) * speed - 40,
        size: 0.8 + Math.random() ** 2 * 2.6,
        color: pick(colors),
        alpha: 1,
        born: now + CHARGE + Math.random() * 60,
        shape: Math.random() < 0.35 ? 1 : 0,
        spin: Math.random() * Math.PI,
        gather: null,
      });
    }
    this.start();
  }

  /** Pull every particle into the incoming device; tops up if there are too few. */
  gather(bounds: Bounds, colors: RGB[], duration: number, count: number) {
    if (!this.frame) this.resize();
    const now = performance.now();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    this.gatherCenter = [centerX, centerY];
    this.particles = this.particles.slice(0, count);
    while (this.particles.length < count) {
      const angle = Math.random() * Math.PI * 2;
      const radius =
        Math.max(bounds.width, bounds.height) * (0.55 + Math.random() * 0.5);
      this.particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius * 0.75,
        vx: 0,
        vy: 0,
        size: 0.8 + Math.random() ** 2 * 2.4,
        color: pick(colors),
        alpha: 0,
        born: now,
        shape: Math.random() < 0.35 ? 1 : 0,
        spin: Math.random() * Math.PI,
        gather: null,
      });
    }
    for (const particle of this.particles) {
      particle.born = Math.min(particle.born, now);
      particle.gather = {
        fromX: particle.x,
        fromY: particle.y,
        fromColor: particle.color,
        fromAlpha: particle.alpha,
        toX: bounds.x + bounds.width * (0.06 + Math.random() * 0.88),
        toY: bounds.y + bounds.height * (0.06 + Math.random() * 0.88),
        toColor: pick(colors),
        start: now + Math.random() * 120,
        duration: duration * (0.7 + Math.random() * 0.3),
        swirl: (Math.random() - 0.5) * 110,
      };
    }
    this.start();
  }

  /** An interrupted gathering flies apart again from wherever it is. */
  scatter() {
    const [centerX, centerY] = this.gatherCenter;
    for (const particle of this.particles) {
      if (!particle.gather) continue;
      particle.gather = null;
      let dx = particle.x - centerX;
      let dy = particle.y - centerY;
      const length = Math.hypot(dx, dy) || 1;
      dx /= length;
      dy /= length;
      const speed = 160 + Math.random() * 360;
      particle.vx = dx * speed;
      particle.vy = dy * speed;
      particle.alpha = Math.max(particle.alpha, 0.6);
    }
    this.start();
  }

  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.particles = [];
    this.cracks = null;
    this.context?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private start() {
    if (this.frame) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.draw);
  }

  private draw = (now: number) => {
    const context = this.context;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!context) return;
    const { x: mx, y: my } = this.margin;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.cracks) {
      const age = now - this.cracks.born;
      if (age > 340) this.cracks = null;
      else {
        const glow = age < 140 ? age / 140 : 1 - (age - 140) / 200;
        context.lineCap = "round";
        for (const [width, alpha] of [
          [4, 0.16],
          [1.1, 0.85],
        ]) {
          context.strokeStyle = `rgba(255, 249, 232, ${(alpha * glow).toFixed(3)})`;
          context.lineWidth = width;
          context.beginPath();
          for (const [from, to] of this.cracks.lines) {
            context.moveTo(from[0] + mx, from[1] + my);
            context.lineTo(to[0] + mx, to[1] + my);
          }
          context.stroke();
        }
      }
    }
    const survivors: Particle[] = [];
    for (const particle of this.particles) {
      if (now < particle.born) {
        survivors.push(particle);
        continue;
      }
      let color = particle.color;
      if (particle.gather) {
        const motion = particle.gather;
        const t = clamp01((now - motion.start) / motion.duration);
        const eased = easeInOut(t);
        const dx = motion.toX - motion.fromX;
        const dy = motion.toY - motion.fromY;
        const length = Math.hypot(dx, dy) || 1;
        const bend = Math.sin(Math.PI * t) * motion.swirl;
        particle.x = motion.fromX + dx * eased + (-dy / length) * bend;
        particle.y = motion.fromY + dy * eased + (dx / length) * bend;
        color = motion.fromColor.map(
          (channel, index) =>
            channel + (motion.toColor[index] - channel) * eased,
        ) as RGB;
        particle.color = color;
        particle.alpha =
          Math.min(1, Math.max(motion.fromAlpha, t / 0.3)) *
          (t > 0.8 ? (1 - t) / 0.2 : 1);
        if (t >= 1) continue;
      } else {
        const drag = Math.exp(-dt * 2.4);
        particle.vx *= drag;
        particle.vy = particle.vy * drag + 110 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.alpha -= dt * 0.55;
        if (particle.alpha <= 0) continue;
      }
      survivors.push(particle);
      const [r, g, b] = color;
      context.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      if (particle.size > 2.6) {
        context.globalAlpha = particle.alpha * 0.22;
        context.beginPath();
        context.arc(
          particle.x + mx,
          particle.y + my,
          particle.size * 2.4,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
      context.globalAlpha = particle.alpha;
      if (particle.shape === 1) {
        particle.spin += dt * 6;
        context.save();
        context.translate(particle.x + mx, particle.y + my);
        context.rotate(particle.spin);
        context.fillRect(
          -particle.size,
          -particle.size * 0.45,
          particle.size * 2,
          particle.size * 0.9,
        );
        context.restore();
      } else {
        context.beginPath();
        context.arc(
          particle.x + mx,
          particle.y + my,
          particle.size,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
    context.globalAlpha = 1;
    this.particles = survivors;
    if (this.particles.length || this.cracks)
      this.frame = requestAnimationFrame(this.draw);
    else this.frame = 0;
  };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: RGB;
  alpha: number;
  born: number;
  shape: 0 | 1;
  spin: number;
  gather: {
    fromX: number;
    fromY: number;
    fromColor: RGB;
    fromAlpha: number;
    toX: number;
    toY: number;
    toColor: RGB;
    start: number;
    duration: number;
    swirl: number;
  } | null;
}

interface Piece {
  element: HTMLElement;
  animation: Animation;
}

export class ShatterDirector {
  private phase: Phase = "idle";
  private timers: number[] = [];
  private incoming: Piece[] = [];
  private particles: ParticleField;
  private getLive: () => HTMLElement | null = () => null;
  private eraId = "unknown";
  private accent = "#7d8174";
  private assembleAt = 0;
  private generation = 0;
  private settle: Animation | null = null;

  constructor(
    private layer: HTMLElement,
    private stage: HTMLElement,
  ) {
    this.particles = new ParticleField(layer, stage);
  }

  private config() {
    const width = this.stage.getBoundingClientRect().width;
    const compact = width < 540 || (navigator.hardwareConcurrency ?? 8) <= 4;
    return {
      rays: compact ? 7 : 9,
      rings: compact ? 2 : 3,
      particles: compact ? 110 : 220,
      intensity: Math.min(1.15, Math.max(0.55, width / 720)),
    };
  }

  private schedule(callback: () => void, delay: number) {
    const generation = this.generation;
    this.timers.push(
      window.setTimeout(() => {
        if (generation === this.generation) callback();
      }, delay),
    );
  }

  private clearTimers() {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
    this.generation++;
  }

  private hide(element: HTMLElement) {
    element.style.visibility = "hidden";
  }

  private show(element: HTMLElement | null) {
    if (element) element.style.visibility = "";
  }

  private group() {
    const group = document.createElement("div");
    group.className = "shatter-group";
    this.layer.append(group);
    return group;
  }

  private piece(
    group: HTMLElement,
    master: HTMLElement,
    shard: Shard,
    first: boolean,
  ) {
    const element = document.createElement("div");
    element.className = "shatter-shard";
    element.style.clipPath = toClipPath(shard.points);
    element.style.transformOrigin = `${shard.centroid[0].toFixed(1)}px ${shard.centroid[1].toFixed(1)}px`;
    element.append(first ? master : cloneDevice(master));
    group.append(element);
    return element;
  }

  private removeWhenDone(animation: Animation, element: HTMLElement) {
    const remove = () => {
      const parent = element.parentElement;
      element.remove();
      if (
        parent?.classList.contains("shatter-group") &&
        !parent.childElementCount
      )
        parent.remove();
    };
    animation.onfinish = remove;
    animation.oncancel = remove;
  }

  private effect(
    className: string,
    center: Point,
    size: number,
    keyframes: Keyframe[],
    timing: KeyframeAnimationOptions,
    color?: string,
  ) {
    const element = document.createElement("span");
    element.className = className;
    Object.assign(element.style, {
      left: `${center[0] - size / 2}px`,
      top: `${center[1] - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
    });
    if (color) element.style.setProperty("--effect-color", color);
    this.layer.append(element);
    this.removeWhenDone(
      element.animate(keyframes, { fill: "both", ...timing }),
      element,
    );
  }

  /** First visit: the device assembles itself out of a gathering cloud. */
  intro(getLive: () => HTMLElement | null, eraId: string, accent: string) {
    this.getLive = getLive;
    this.eraId = eraId;
    this.accent = accent;
    const live = getLive();
    if (!live) return;
    this.hide(live);
    this.phase = "waiting";
    this.assembleAt = performance.now() + 450;
    this.schedule(() => this.assemble(), 450);
    const generation = this.generation;
    void document.fonts?.ready.then(() => {
      if (generation !== this.generation || this.phase !== "waiting") return;
      this.clearTimers();
      this.assembleAt = performance.now() + 60;
      this.schedule(() => this.assemble(), 60);
    });
  }

  swap(
    snapshot: DeviceSnapshot,
    getLive: () => HTMLElement | null,
    eraId: string,
    accent: string,
    reduced: boolean,
  ) {
    this.getLive = getLive;
    this.eraId = eraId;
    this.accent = accent;
    const live = getLive();
    if (!live) return;
    if (reduced) {
      this.reset();
      this.crossfade(snapshot, live);
      return;
    }
    this.hide(live);
    const now = performance.now();
    if (this.phase === "waiting") {
      // The previous carrier is already in pieces; the newest choice simply
      // takes over the reassembly.
      this.clearTimers();
      const delay = Math.max(220, this.assembleAt - now);
      this.assembleAt = now + delay;
      this.schedule(() => this.assemble(), delay);
      return;
    }
    if (this.phase === "assembling") {
      this.clearTimers();
      this.burstIncoming();
      this.particles.scatter();
      this.phase = "waiting";
      this.assembleAt = now + 320;
      this.schedule(() => this.assemble(), 320);
      return;
    }
    this.clearTimers();
    this.finishSettle();
    this.explode(snapshot);
    this.phase = "waiting";
    this.assembleAt = now + ASSEMBLE_AT;
    this.schedule(() => this.assemble(), ASSEMBLE_AT);
  }

  private explode(snapshot: DeviceSnapshot) {
    const { rays, rings, particles, intensity } = this.config();
    const fracture = createFracture(snapshot.bounds, { rays, rings });
    const group = this.group();
    group.animate(
      [
        { transform: "scale(1) translate(0px, 0px)" },
        { transform: "scale(0.968) translate(1.5px, -1px)", offset: 0.45 },
        { transform: "scale(0.974) translate(-1.5px, 1px)", offset: 0.75 },
        { transform: "scale(0.985) translate(0px, 0px)" },
      ],
      { duration: CHARGE, easing: "ease-out", fill: "forwards" },
    );
    fracture.shards.forEach((shard, index) => {
      const element = this.piece(group, snapshot.master, shard, index === 0);
      const motion = motionFor(shard, intensity);
      const animation = element.animate(
        [
          { transform: IDENTITY, opacity: 1 },
          { transform: motion.mid, opacity: 1, offset: 0.4 },
          { transform: motion.far, opacity: 0 },
        ],
        {
          duration: EXPLODE_DURATION + Math.random() * 120,
          delay: CHARGE + shard.ring * 28 + Math.random() * 40,
          easing: "cubic-bezier(0.13, 0.72, 0.28, 1)",
          fill: "both",
        },
      );
      this.removeWhenDone(animation, element);
    });
    const size = Math.max(snapshot.bounds.width, snapshot.bounds.height);
    this.effect(
      "shatter-flash",
      fracture.impact,
      size * 1.1,
      [
        { opacity: 0, transform: "scale(0.4)" },
        { opacity: 0.9, transform: "scale(1)", offset: 0.35 },
        { opacity: 0, transform: "scale(1.25)" },
      ],
      { duration: 400, delay: CHARGE - 50, easing: "ease-out" },
    );
    this.effect(
      "shatter-wave",
      fracture.impact,
      size * 1.9,
      [
        { opacity: 0.75, transform: "scale(0.12)" },
        { opacity: 0, transform: "scale(1)" },
      ],
      {
        duration: 680,
        delay: CHARGE - 10,
        easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
      },
      snapshot.accent,
    );
    this.particles.burst(
      snapshot.bounds,
      fracture.impact,
      fracture.cracks,
      palette(snapshot.eraId),
      particles,
    );
  }

  private assemble() {
    const live = this.getLive();
    if (!live || !live.isConnected) {
      this.phase = "idle";
      return;
    }
    this.phase = "assembling";
    const { rays, rings, particles, intensity } = this.config();
    const bounds = measure(live);
    const fracture = createFracture(bounds, { rays, rings });
    const master = cloneDevice(live);
    const group = this.group();
    let finish = 0;
    this.incoming = fracture.shards.map((shard, index) => {
      const element = this.piece(group, master, shard, index === 0);
      const motion = motionFor(shard, intensity * 0.92);
      const delay = shard.ring * 40 + Math.random() * 50;
      finish = Math.max(finish, delay + ASSEMBLE_DURATION);
      const animation = element.animate(
        [
          { transform: motion.far, opacity: 0 },
          { opacity: 1, offset: 0.3 },
          { transform: motion.overshoot, opacity: 1, offset: 0.84 },
          { transform: IDENTITY, opacity: 1 },
        ],
        {
          duration: ASSEMBLE_DURATION,
          delay,
          easing: "cubic-bezier(0.22, 0.8, 0.22, 1)",
          fill: "both",
        },
      );
      return { element, animation };
    });
    this.particles.gather(
      bounds,
      palette(this.eraId),
      ASSEMBLE_DURATION * 0.9,
      particles,
    );
    this.schedule(() => this.reveal(bounds), finish);
  }

  /** Pieces caught mid-flight by a newer choice burst again from where they are. */
  private burstIncoming() {
    const { intensity } = this.config();
    for (const { element, animation } of this.incoming) {
      try {
        animation.commitStyles();
      } catch {
        // Not rendered (for example, still in its delay); start from its first frame.
      }
      animation.cancel();
      const from = element.style.transform || IDENTITY;
      const opacity = element.style.opacity || "1";
      const shard: Shard = {
        points: [],
        centroid: [0, 0],
        direction: [Math.random() - 0.5, Math.random() - 0.5],
        ring: 1,
      };
      const motion = motionFor(shard, intensity);
      const burst = element.animate(
        [
          { transform: from, opacity },
          { transform: motion.far, opacity: 0 },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.13, 0.72, 0.28, 1)",
          fill: "forwards",
        },
      );
      this.removeWhenDone(burst, element);
    }
    this.incoming = [];
  }

  private reveal(bounds: Bounds) {
    for (const { element, animation } of this.incoming) {
      animation.cancel();
      element.remove();
    }
    this.incoming = [];
    this.layer
      .querySelectorAll(".shatter-group:empty")
      .forEach((group) => group.remove());
    const live = this.getLive();
    this.show(live);
    if (live)
      this.settle = live.animate([{ scale: "1.022" }, { scale: "1" }], {
        duration: 280,
        easing: "cubic-bezier(0.3, 1.6, 0.5, 1)",
      });
    this.effect(
      "shatter-sweep",
      [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2],
      Math.max(bounds.width, bounds.height),
      [
        { opacity: 0, backgroundPosition: "-60% 0" },
        { opacity: 1, offset: 0.25 },
        { opacity: 0, backgroundPosition: "160% 0" },
      ],
      { duration: 560, easing: "ease-out" },
      this.accent,
    );
    this.phase = "settling";
    this.schedule(() => {
      this.phase = "idle";
    }, 300);
  }

  private finishSettle() {
    this.settle?.cancel();
    this.settle = null;
  }

  private crossfade(snapshot: DeviceSnapshot, live: HTMLElement) {
    const element = document.createElement("div");
    element.className = "shatter-shard";
    element.append(snapshot.master);
    this.layer.append(element);
    this.removeWhenDone(
      element.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 200,
        easing: "ease-out",
        fill: "forwards",
      }),
      element,
    );
    this.show(live);
    live.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 200,
      easing: "ease-in",
    });
  }

  /** Drop every effect and show the live device immediately. */
  reset() {
    this.clearTimers();
    this.finishSettle();
    this.incoming = [];
    this.particles.stop();
    for (const animation of this.layer.getAnimations({ subtree: true }))
      animation.cancel();
    for (const child of Array.from(this.layer.children))
      if (!child.classList.contains("shatter-particles")) child.remove();
    this.show(this.getLive());
    this.phase = "idle";
  }

  dispose() {
    this.reset();
  }
}
