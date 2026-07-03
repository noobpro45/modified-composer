import sharp from 'sharp';
import fs from 'fs';
import pngToIco from 'png-to-ico';

async function run() {
  try {
    const svgBuffer = fs.readFileSync('../public/logo.svg');
    
    // Create 1024x1024 png for appicon
    const png1024 = await sharp(svgBuffer)
      .resize(1024, 1024)
      .png()
      .toBuffer();
      
    fs.writeFileSync('../build/appicon.png', png1024);
    
    // Create 256x256 png for Windows ICO
    const png256 = await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toBuffer();
      
    fs.writeFileSync('temp.png', png256);
    
    // Convert to ICO
    const icoBuffer = await pngToIco('temp.png');
    fs.writeFileSync('../build/windows/icon.ico', icoBuffer);
    
    console.log("Done generating icons.");
  } catch(e) {
    console.error(e);
  }
}

run();
