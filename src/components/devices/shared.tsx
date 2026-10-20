import { Pause, Play } from "lucide-react";
import type { AudioPlayer } from "../../hooks/useAudioPlayer";
import type { Era, Preferences, Track } from "../../lib/model";

export interface DeviceProps {
  era: Era;
  track: Track;
  tracks: Track[];
  player: AudioPlayer;
  preferences: Preferences;
  onVolume: (value: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onLibrary: () => void;
  onSelect: (id: string) => void;
}

export function PlayGlyph({
  playing,
  size = 20,
}: {
  playing: boolean;
  size?: number;
}) {
  return playing ? (
    <Pause size={size} fill="currentColor" strokeWidth={1.4} />
  ) : (
    <Play size={size} fill="currentColor" strokeWidth={1.4} />
  );
}

export function Screw({ className = "" }: { className?: string }) {
  return <span className={`screw ${className}`} aria-hidden="true" />;
}

export const pad2 = (value: number) => String(value).padStart(2, "0");

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const currentVolume = (preferences: Preferences) =>
  preferences.muted ? 0 : preferences.volume;

export function trackIndex(tracks: Track[], track: Track) {
  return Math.max(
    0,
    tracks.findIndex((item) => item.id === track.id),
  );
}

/** Seek forward or back without crossing the end, so scanning never skips a song. */
export function scanBy(player: AudioPlayer, seconds: number) {
  const audio = player.audioRef.current;
  if (!audio || !Number.isFinite(audio.duration)) return;
  const target = Math.min(
    Math.max(0, audio.currentTime + seconds),
    Math.max(0, audio.duration - 0.35),
  );
  player.seek(target);
}
