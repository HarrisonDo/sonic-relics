import { resolveMetadataYear } from "./model";
import type { SavedTrack } from "./storage";

export async function importAudio(file: File): Promise<SavedTrack> {
  if (!file.size) throw new Error(`「${file.name}」是空文件`);
  if (file.size > 80 * 1024 * 1024)
    throw new Error(`「${file.name}」超过 80 MB，请选择更小的音频`);
  if (
    !file.type.startsWith("audio/") &&
    !/\.(mp3|wav|wave|flac|m4a|aac|ogg|opus|aiff?|mp4)$/i.test(file.name)
  ) {
    throw new Error(`「${file.name}」不是支持的音频文件`);
  }
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  let track: SavedTrack = {
    id: `local-${fingerprint}`,
    title: file.name.replace(/\.[^.]+$/, ""),
    artist: "未知艺术家",
    year: null,
    yearSource: "unknown",
    duration: 0,
    isDemo: false,
    fileName: file.name,
    audio: file,
    fallbackCover: "/artworks/local.svg",
    addedAt: Date.now(),
  };
  try {
    const { parseBlob } = await import("music-metadata");
    const metadata = await parseBlob(file, { duration: true });
    const cover =
      metadata.common.picture?.find(
        (picture) => picture.type === "Cover (front)",
      ) ?? metadata.common.picture?.[0];
    track = {
      ...track,
      title: metadata.common.title?.trim() || track.title,
      artist: metadata.common.artist?.trim() || track.artist,
      duration: Number.isFinite(metadata.format.duration)
        ? metadata.format.duration!
        : 0,
      ...resolveMetadataYear(metadata.common),
      artwork:
        cover && cover.data.length < 5 * 1024 * 1024
          ? new Blob([new Uint8Array(cover.data).buffer], {
              type: cover.format,
            })
          : undefined,
    };
  } catch {
    // Untagged or partially tagged audio can still be playable in the browser.
  }
  return track;
}
