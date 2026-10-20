import fs from "node:fs";
import path from "node:path";

// Original, deterministic instrumental sketches. No recordings or melodies are sampled.
// These pieces are made for Sonic Relics; the UI dates describe imagined listening scenes.
const SR = 24000;
const destination = path.resolve("public/audio");
fs.mkdirSync(destination, { recursive: true });
const pieces = [
  {
    id: "radio",
    bpm: 92,
    voice: "keys",
    gain: 0.85,
    seed: 16,
    shift: -12,
    swing: 0.09,
  },
  {
    id: "vinyl",
    bpm: 96,
    voice: "rhodes",
    gain: 0.78,
    seed: 73,
    shift: 0,
    swing: 0.11,
    surfaceNoise: true,
  },
  { id: "cassette", bpm: 86, voice: "pad", gain: 0.7, seed: 84, shift: 0 },
  { id: "cd", bpm: 94, voice: "keys", gain: 0.7, seed: 96, shift: 0 },
  { id: "mp3", bpm: 108, voice: "chip", gain: 0.5, seed: 2, shift: 12 },
  { id: "ipod", bpm: 102, voice: "pluck", gain: 0.8, seed: 8, shift: 0 },
  { id: "stream", bpm: 70, voice: "pad", gain: 0.62, seed: 24, shift: 0 },
];
const harmony = [
  [57, 60, 64, 67],
  [53, 57, 60, 64],
  [60, 64, 67, 71],
  [55, 59, 62, 65],
];
const melodies = [
  [0, 2, 3, 2, 1, 0, 2, 1],
  [2, 1, 0, 2, 3, 2, 1, 0],
  [1, 2, 3, 1, 0, 1, 2, 0],
];

for (const piece of pieces) {
  let state = piece.seed;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return (state / 4294967296) * 2 - 1;
  };
  const beat = 60 / piece.bpm;
  const duration = 32 * beat + 3.5;
  const buffer = new Float64Array(Math.ceil(duration * SR));
  const addTone = (note, start, length, amplitude, voice) => {
    const frequency = 440 * 2 ** ((note - 69) / 12);
    const offset = Math.floor(start * SR);
    const release = voice === "pad" ? 0.9 : 0.24;
    const count = Math.floor((length + release) * SR);
    for (let i = 0; i < count && offset + i < buffer.length; i++) {
      const t = i / SR;
      const attack = Math.min(1, t / (voice === "pad" ? 0.2 : 0.012));
      const envelope =
        attack * (t < length ? 1 : Math.max(0, 1 - (t - length) / release));
      const phase = 2 * Math.PI * frequency * t;
      let wave;
      if (voice === "keys")
        wave =
          Math.sin(phase) * Math.exp(-t * 1.7) +
          0.28 * Math.sin(phase * 2) * Math.exp(-t * 3.8) +
          0.1 * Math.sin(phase * 3) * Math.exp(-t * 6);
      else if (voice === "pad")
        wave =
          Math.sin(phase) * 0.64 +
          Math.sin(phase * 1.002 + 0.3) * 0.23 +
          Math.sin(phase * 2) * 0.1;
      else if (voice === "chip")
        wave =
          (Math.sin(phase) +
            Math.sin(phase * 3) / 3 +
            Math.sin(phase * 5) / 5) *
          Math.exp(-t * 3.5) *
          0.75;
      else if (voice === "bass")
        wave =
          (Math.sin(phase) + 0.2 * Math.sin(phase * 2)) * Math.exp(-t * 2.2);
      else if (voice === "rhodes") {
        // A soft electric-piano tone: light FM bell over a sine body, with tremolo.
        const tremolo =
          1 + 0.12 * Math.sin(2 * Math.PI * 5.2 * ((offset + i) / SR));
        wave =
          (Math.sin(phase + 0.9 * Math.exp(-t * 3) * Math.sin(phase)) * 0.82 +
            0.18 *
              Math.sin(phase * 2 + Math.sin(phase) * 1.4 * Math.exp(-t * 6)) *
              Math.exp(-t * 4)) *
          Math.exp(-t * 1.25) *
          tremolo;
      } else
        wave =
          Math.sin(phase) * Math.exp(-t * 5) +
          0.38 * Math.sin(phase * 2) * Math.exp(-t * 8);
      buffer[offset + i] += wave * envelope * amplitude;
    }
  };
  const drum = (kind, start, amplitude) => {
    const offset = Math.floor(start * SR);
    const duration = kind === "kick" ? 0.32 : kind === "snare" ? 0.17 : 0.07;
    let previous = 0;
    for (let i = 0; i < duration * SR && offset + i < buffer.length; i++) {
      const t = i / SR;
      const noise = random();
      let value;
      if (kind === "kick")
        value =
          Math.sin(2 * Math.PI * (44 * t + 2.8 * (1 - Math.exp(-t * 28)))) *
          Math.exp(-t * 15);
      else if (kind === "snare")
        value =
          (noise * 0.55 + Math.sin(t * 2 * Math.PI * 170) * 0.3) *
          Math.exp(-t * 28);
      else value = (noise - previous) * Math.exp(-t * 65) * 0.4;
      previous = noise;
      buffer[offset + i] += value * amplitude * Math.min(1, t / 0.002);
    }
  };
  for (let bar = 0; bar < 8; bar++) {
    const chord = harmony[(bar + (piece.seed % 4)) % 4];
    const start = bar * beat * 4;
    const chordVoice = piece.voice === "chip" ? "keys" : piece.voice;
    chord.forEach((note, index) =>
      addTone(
        note,
        start + index * 0.012,
        beat * 3.4,
        0.032 * piece.gain,
        chordVoice,
      ),
    );
    for (let step = 0; step < 8; step++) {
      const pattern = melodies[(bar + piece.seed) % melodies.length];
      const note = chord[pattern[step]] + 12 + piece.shift;
      if (piece.id !== "stream" || step % 2 === 0) {
        const at =
          start +
          (step * beat) / 2 +
          (step % 2 ? beat * (piece.swing ?? 0) : 0);
        addTone(
          note,
          at,
          beat * (piece.id === "stream" ? 1.2 : 0.38),
          piece.voice === "pad" ? 0.056 : 0.075,
          piece.voice === "pad" ? "keys" : piece.voice,
        );
      }
      if (piece.id !== "stream")
        drum("hat", start + (step * beat) / 2, step % 2 ? 0.028 : 0.043);
    }
    for (let step = 0; step < 4; step++) {
      addTone(
        chord[step === 2 ? 2 : 0] - 24,
        start + step * beat,
        beat * 0.7,
        0.14,
        "bass",
      );
      if (piece.id !== "stream") {
        drum(
          step % 2 === 0 ? "kick" : "snare",
          start + step * beat,
          step % 2 === 0 ? 0.19 : 0.09,
        );
      }
    }
  }
  const delay = Math.floor(beat * 0.75 * SR);
  for (let i = delay; i < buffer.length; i++)
    buffer[i] += buffer[i - delay] * (piece.id === "stream" ? 0.22 : 0.1);
  if (piece.surfaceNoise) {
    // Synthesised record-surface character for this demo only: low hiss, sparse
    // dust pops and a faint tick once per 33⅓ rpm revolution. Imported music is
    // never filtered; this texture is part of the original sketch itself.
    let noiseState = 1972;
    const noise = () => {
      noiseState = (noiseState * 1103515245 + 12345) >>> 0;
      return noiseState / 4294967296;
    };
    let hiss = 0;
    for (let i = 0; i < buffer.length; i++) {
      hiss += (noise() * 2 - 1 - hiss) * 0.08;
      buffer[i] += hiss * 0.014;
      if (noise() < 6 / SR) {
        const size = 0.012 + noise() ** 3 * 0.05;
        const length = Math.floor(SR * (0.0006 + noise() * 0.0016));
        for (let k = 0; k < length && i + k < buffer.length; k++)
          buffer[i + k] +=
            size * (noise() * 2 - 1) * Math.exp(-k / (length * 0.35));
      }
    }
    const revolution = 60 / (100 / 3);
    for (let at = 0.37; at < duration; at += revolution) {
      const offset = Math.floor(at * SR);
      for (let k = 0; k < SR * 0.004 && offset + k < buffer.length; k++)
        buffer[offset + k] +=
          0.018 * Math.sin(k * 0.9) * Math.exp(-k / (SR * 0.0012));
    }
  }
  let peak = 0;
  for (let i = 0; i < buffer.length; i++) {
    const fade = Math.min(1, i / (SR * 0.12), (buffer.length - i) / (SR * 2.5));
    buffer[i] = Math.tanh(buffer[i] * 1.7) * Math.max(0, fade);
    peak = Math.max(peak, Math.abs(buffer[i]));
  }
  const wav = Buffer.alloc(44 + buffer.length * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SR, 24);
  wav.writeUInt32LE(SR * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(buffer.length * 2, 40);
  for (let i = 0; i < buffer.length; i++)
    wav.writeInt16LE(
      Math.round((buffer[i] / Math.max(peak, 0.1)) * 24500),
      44 + i * 2,
    );
  fs.writeFileSync(path.join(destination, `${piece.id}.wav`), wav);
  console.log(`${piece.id}: ${duration.toFixed(2)} seconds`);
}
