import fs from "fs-extra";
import path from "node:path";
import sharp from "sharp";
import { globSync } from "glob";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT_DIR, "src/assets/Products");
const WEBP_QUALITY = 82;
const VARIANTS = [
  // Página do produto, Open Graph e sitemap.
  { outputDir: path.join(ROOT_DIR, "src/assets/ProductsOptimized"), maxSize: 900 },
  // Cards do catálogo e da home: exibidos com ~184 px de altura, 480 px cobre telas retina.
  { outputDir: path.join(ROOT_DIR, "src/assets/ProductsThumbs"), maxSize: 480 },
];

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function outputPathFor(sourceFile, outputDir) {
  const relative = path.relative(SOURCE_DIR, sourceFile);
  const parsed = path.parse(relative);
  return path.join(outputDir, parsed.dir, `${parsed.name}.webp`);
}

async function optimizeImage(sourceFile, { outputDir, maxSize }) {
  const outputFile = outputPathFor(sourceFile, outputDir);
  await fs.ensureDir(path.dirname(outputFile));

  const sourceStat = await fs.stat(sourceFile);
  const outputExists = await fs.pathExists(outputFile);
  if (outputExists) {
    const outputStat = await fs.stat(outputFile);
    if (outputStat.mtimeMs >= sourceStat.mtimeMs) {
      return { skipped: true, sourceFile, outputFile };
    }
  }

  await sharp(sourceFile)
    .rotate()
    .resize({
      width: maxSize,
      height: maxSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 5 })
    .toFile(outputFile);

  return { skipped: false, sourceFile, outputFile };
}

async function main() {
  const files = globSync(`${toPosixPath(SOURCE_DIR)}/**/*.png`, {
    nodir: true,
    windowsPathsNoEscape: true,
  }).map((file) => path.resolve(file));

  let optimized = 0;
  let skipped = 0;
  let originalBytes = 0;
  let optimizedBytes = 0;

  for (const file of files) {
    for (const variant of VARIANTS) {
      const result = await optimizeImage(file, variant);
      if (result.skipped) {
        skipped += 1;
      } else {
        optimized += 1;
      }

      const sourceStat = await fs.stat(result.sourceFile);
      const outputStat = await fs.stat(result.outputFile);
      originalBytes += sourceStat.size;
      optimizedBytes += outputStat.size;
    }
  }

  const savedBytes = Math.max(0, originalBytes - optimizedBytes);
  const savedPercent = originalBytes ? Math.round((savedBytes / originalBytes) * 100) : 0;

  console.log(
    `Optimized ${optimized} image(s), skipped ${skipped}. ` +
      `WebP total ${(optimizedBytes / 1024 / 1024).toFixed(2)} MB, ` +
      `saved ${savedPercent}%.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
