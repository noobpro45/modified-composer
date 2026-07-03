import fs from 'fs';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

async function run() {
  const sizes = [16, 24, 32, 48, 64, 256];
  const pngs = [];
  
  for (const size of sizes) {
    const out = `scratch/temp-${size}.png`;
    await sharp('build/appicon.png')
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(out);
    pngs.push(out);
  }
  
  try {
    const ico = await pngToIco(pngs);
    fs.writeFileSync('build/windows/icon.ico', ico);
    console.log("Successfully created icon.ico with", sizes.length, "layers.");
  } catch (err) {
    console.error("pngToIco failed:", err);
  }
}

run();
