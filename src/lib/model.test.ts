import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEMO_TRACKS,
  createQueueOrder,
  eraForYear,
  formatTime,
  nextTrackId,
  parseYear,
  resolveMetadataYear,
  withYearOverride,
} from "./model";

test("an original recording keeps its era when a reissue has a newer tag", () => {
  const metadata = resolveMetadataYear({ originalyear: 1986, year: 2020 });
  assert.deepEqual(metadata, { year: 1986, yearSource: "original" });
  assert.equal(eraForYear(metadata.year).id, "cassette");
});

test("a new recording without an original-year tag uses its own release date", () => {
  assert.deepEqual(resolveMetadataYear({ date: "2024-08-21" }), {
    year: 2024,
    yearSource: "tag",
  });
  assert.equal(eraForYear(2024).id, "stream");
});

test("invalid original tags fall back to release tags without guessing", () => {
  assert.deepEqual(
    resolveMetadataYear({ originalyear: "unknown", year: 1996 }),
    { year: 1996, yearSource: "tag" },
  );
  assert.deepEqual(resolveMetadataYear({}), {
    year: null,
    yearSource: "unknown",
  });
  assert.equal(eraForYear(null).id, "unknown");
});

test("era boundaries and overlapping digital formats match the plan", () => {
  const expected = [
    [1979, "radio"],
    [1980, "cassette"],
    [1989, "cassette"],
    [1990, "cd"],
    [1999, "cd"],
    [2000, "mp3"],
    [2004, "mp3"],
    [2005, "ipod"],
    [2012, "ipod"],
    [2013, "stream"],
  ] as const;
  for (const [year, era] of expected) assert.equal(eraForYear(year).id, era);
  assert.equal(eraForYear(2008, "mp4").id, "mp4");
  assert.equal(eraForYear(1996, "mp4").id, "cd");
  assert.equal(eraForYear(2077).id, "unknown");
});

test("only real four-digit dates are accepted; invalid input never selects the future", () => {
  for (const year of [
    null,
    undefined,
    "",
    0,
    1984.5,
    "19",
    "1e3",
    "unknown",
    2077,
    1876,
    "demo 1984",
    NaN,
    {},
    [],
  ])
    assert.equal(parseYear(year, 2026), null);
  assert.equal(parseYear(" 1984 ", 2026), 1984);
  assert.equal(parseYear("1984-11-02", 2026), 1984);
});

test("a manual year can correct or explicitly clear metadata without changing the audio", () => {
  const track = DEMO_TRACKS[1];
  const corrected = withYearOverride(track, { [track.id]: 1996 });
  assert.equal(corrected.year, 1996);
  assert.equal(corrected.yearSource, "manual");
  assert.equal(corrected.src, track.src);
  assert.equal(track.year, 1984);
  assert.equal(withYearOverride(track, { [track.id]: null }).year, null);
  assert.equal(withYearOverride(track, {}), track);
});

test("sequential queue wraps both directions; shuffle avoids repeating the current song", () => {
  assert.equal(
    nextTrackId(DEMO_TRACKS, DEMO_TRACKS.at(-1)!.id, 1, false),
    DEMO_TRACKS[0].id,
  );
  assert.equal(
    nextTrackId(DEMO_TRACKS, DEMO_TRACKS[0].id, -1, false),
    DEMO_TRACKS.at(-1)!.id,
  );
  assert.notEqual(
    nextTrackId(DEMO_TRACKS, DEMO_TRACKS[0].id, 1, true),
    DEMO_TRACKS[0].id,
  );
  assert.equal(
    nextTrackId([DEMO_TRACKS[0]], DEMO_TRACKS[0].id, 1, true),
    DEMO_TRACKS[0].id,
  );
  assert.equal(nextTrackId([], "current", 1, false), "current");
});

test("transport handles unknown, invalid and minute-boundary durations", () => {
  assert.equal(formatTime(NaN), "0:00");
  assert.equal(formatTime(Infinity), "0:00");
  assert.equal(formatTime(-1), "0:00");
  assert.equal(formatTime(59.99), "0:59");
  assert.equal(formatTime(60), "1:00");
});

test("a shuffled queue has a real end and visits each song once before wrapping", () => {
  const order = createQueueOrder(DEMO_TRACKS, "demo-cassette", true);
  assert.equal(order[0], "demo-cassette");
  assert.equal(new Set(order).size, DEMO_TRACKS.length);
  assert.deepEqual(
    [...order].sort(),
    DEMO_TRACKS.map((track) => track.id).sort(),
  );
  assert.deepEqual(
    createQueueOrder(DEMO_TRACKS, "demo-cassette", false),
    DEMO_TRACKS.map((track) => track.id),
  );
});
