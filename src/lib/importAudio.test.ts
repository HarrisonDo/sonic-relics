import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { importAudio } from "./importAudio";

test("a real WAV without date tags stays undated, regardless of the filename or modified date", async () => {
  const bytes = await readFile(
    new URL("../../public/audio/cassette.wav", import.meta.url),
  );
  const file = new File([new Uint8Array(bytes).buffer], "MySong-1984.wav", {
    type: "audio/wav",
    lastModified: new Date("2024-01-01").getTime(),
  });
  const result = await importAudio(file);
  assert.equal(result.year, null);
  assert.equal(result.yearSource, "unknown");
  assert.equal(result.title, "MySong-1984");
  assert.ok(result.duration > 25 && result.duration < 27);
  assert.equal(result.isDemo, false);
});

test("content identity prevents duplicate imports with different filenames", async () => {
  const bytes = await readFile(
    new URL("../../public/audio/radio.wav", import.meta.url),
  );
  const first = await importAudio(
    new File([new Uint8Array(bytes).buffer], "first.wav", {
      type: "audio/wav",
    }),
  );
  const second = await importAudio(
    new File([new Uint8Array(bytes).buffer], "renamed.wav", {
      type: "audio/wav",
    }),
  );
  assert.equal(first.id, second.id);
});

test("empty and non-audio files give actionable import errors", async () => {
  await assert.rejects(
    importAudio(new File([], "empty.wav", { type: "audio/wav" })),
    /空文件/,
  );
  await assert.rejects(
    importAudio(new File(["text"], "notes.txt", { type: "text/plain" })),
    /不是支持的音频文件/,
  );
});

test("a real RIFF INFO date is parsed into an automatic listening era", async () => {
  const bytes = await readFile(
    new URL("../../public/audio/cd.wav", import.meta.url),
  );
  const value = Buffer.from("1986\0");
  const field = Buffer.alloc(8 + value.length + (value.length % 2));
  field.write("ICRD");
  field.writeUInt32LE(value.length, 4);
  value.copy(field, 8);
  const list = Buffer.alloc(12 + field.length);
  list.write("LIST");
  list.writeUInt32LE(4 + field.length, 4);
  list.write("INFO", 8);
  field.copy(list, 12);
  const tagged = Buffer.concat([bytes, list]);
  tagged.writeUInt32LE(tagged.length - 8, 4);
  const result = await importAudio(
    new File([new Uint8Array(tagged).buffer], "recording.wav", {
      type: "audio/wav",
    }),
  );
  assert.equal(result.year, 1986);
  assert.equal(result.yearSource, "tag");
});
