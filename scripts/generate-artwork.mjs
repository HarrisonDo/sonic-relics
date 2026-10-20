import fs from "node:fs";

fs.mkdirSync("public/artworks", { recursive: true });
const artworks = [
  ["radio", "#ddc6a5", "#885b40", "#313e36", "AFTERNOON", "03:00 PM", 0],
  ["cassette", "#e6d6b9", "#b9573f", "#3f5549", "EVENING", "LETTERS", 1],
  ["cd", "#bccbd0", "#e9e5d5", "#536d83", "BLUE", "SUNDAY", 2],
  ["mp3", "#d4debd", "#687b53", "#2e453b", "POCKET", "UNIVERSE", 3],
  ["ipod", "#ddd0b8", "#bf694a", "#48554b", "SUNSET", "BOULEVARD", 4],
  ["stream", "#c5d6cc", "#568286", "#f2eadd", "IN BETWEEN", "THE LIGHT", 5],
  ["local", "#e3ded3", "#8d9583", "#586253", "YOUR OWN", "SOUND", 6],
  ["vinyl", "#e2cfa6", "#b4673f", "#3a3129", "DUSK", "BALLROOM", 7, "07"],
];
// A record seen from above, with a low sun behind it and a dark shelf below.
const recordGeometry = (background, accent, dark) =>
  `<circle cx="192" cy="200" r="148" fill="${accent}" opacity=".32"/><path d="M0 336H384V384H0Z" fill="${dark}"/><circle cx="192" cy="200" r="122" fill="${dark}"/>${[
    110, 99, 88, 77, 66,
  ]
    .map(
      (radius) =>
        `<circle cx="192" cy="200" r="${radius}" fill="none" stroke="${background}" stroke-opacity=".16" stroke-width="1.4"/>`,
    )
    .join(
      "",
    )}<path d="M120 138A102 102 0 0 1 264 138" fill="none" stroke="${background}" stroke-opacity=".34" stroke-width="5" stroke-linecap="round"/><circle cx="192" cy="200" r="42" fill="${accent}"/><circle cx="192" cy="200" r="5" fill="${background}"/>`;
for (const [
  id,
  background,
  accent,
  dark,
  first,
  second,
  index,
  number = `0${index + 1}`,
] of artworks) {
  const geometry =
    id === "vinyl"
      ? recordGeometry(background, accent, dark)
      : index % 3 === 0
        ? `<circle cx="196" cy="187" r="111" fill="${accent}"/><path d="M0 234Q100 169 193 232T384 221V384H0" fill="${dark}"/><path d="M0 262Q121 218 211 270T384 253" fill="none" stroke="${background}" stroke-width="3"/>`
        : index % 3 === 1
          ? `<circle cx="208" cy="185" r="105" fill="${accent}"/><path d="M0 286L90 222 148 259 257 211 384 293V384H0" fill="${dark}"/><path d="M0 314L90 250 148 287 257 239 384 321" fill="none" stroke="${background}" stroke-width="2"/>`
          : `<path d="M65 295V170a127 127 0 0 1 254 0v125" fill="${dark}"/><path d="M91 295V170a101 101 0 0 1 202 0v125M116 295V170a76 76 0 0 1 152 0v125M141 295V170a51 51 0 0 1 102 0v125" fill="none" stroke="${background}" stroke-width="3"/><circle cx="192" cy="170" r="28" fill="${accent}"/>`;
  fs.writeFileSync(
    `public/artworks/${id}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 384"><defs><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".1"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter></defs><rect width="384" height="384" fill="${background}"/>${geometry}<text x="26" y="38" fill="${dark}" font-family="Arial,sans-serif" font-size="15" letter-spacing="3">${first}</text><text x="26" y="62" fill="${dark}" font-family="Arial,sans-serif" font-size="15" letter-spacing="3">${second}</text><text x="26" y="360" fill="${background}" font-family="monospace" font-size="10" letter-spacing="3">SONIC RELICS / ${number}</text><rect width="384" height="384" fill="transparent" filter="url(#paper)"/></svg>`,
  );
}
