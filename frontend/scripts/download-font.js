/**
 * Script to download the Noto Sans JP font and convert it to base64
 * This helps avoid Content Security Policy issues when loading fonts from CDNs
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// Font URL - Noto Sans JP Regular
const fontUrl = 'https://fonts.gstatic.com/s/notosansjp/v52/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75s.ttf';

// Output directory and file
const outputDir = path.join(__dirname, '..', 'src', 'utils', 'fonts');
const outputFile = path.join(outputDir, 'noto-sans-jp-base64.js');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Downloading Noto Sans JP font from ${fontUrl}...`);

// Download the font file
https.get(fontUrl, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download font: ${response.statusCode}`);
    return;
  }

  const chunks = [];
  
  response.on('data', (chunk) => {
    chunks.push(chunk);
  });
  
  response.on('end', () => {
    const fontData = Buffer.concat(chunks);
    const base64Font = fontData.toString('base64');
    
    // Create JavaScript file with the base64 font data
    const jsContent = `/**
 * Noto Sans JP font in base64 format
 * This file was generated automatically by the download-font.js script
 * to avoid Content Security Policy issues when loading fonts from CDNs.
 */
export const NOTO_SANS_JP_BASE64 = "${base64Font}";
`;
    
    fs.writeFileSync(outputFile, jsContent);
    console.log(`Font downloaded and converted to base64 successfully!`);
    console.log(`Base64 string size: ${base64Font.length} characters`);
    console.log(`Output file: ${outputFile}`);
  });
}).on('error', (err) => {
  console.error(`Error downloading font: ${err.message}`);
}); 