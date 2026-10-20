import type { DeviceProps } from "./shared";
import { PlayGlyph } from "./shared";

export function Unknown({ track, player }: DeviceProps) {
  return (
    <div className="unknown-player">
      <div className="unknown-cover">
        <img src={track.cover} alt="" />
        <span>
          UNDATED
          <br />
          MEMORIES
        </span>
      </div>
      <button
        onClick={player.toggle}
        aria-label={player.playing ? "暂停未知年代歌曲" : "播放未知年代歌曲"}
      >
        <PlayGlyph playing={player.playing} size={24} />
      </button>
      <span className="unknown-caption">EVERY SONG HAS A STORY.</span>
    </div>
  );
}
