import { copyFile, mkdir } from "node:fs/promises";

const projectRoot = new URL("../", import.meta.url);
const outputRoot = new URL("dist/", projectRoot);

await mkdir(outputRoot, { recursive: true });
for (const file of ["LICENSE", "NOTICE"]) {
  await copyFile(new URL(file, projectRoot), new URL(file, outputRoot));
}
