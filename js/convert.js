// convert-logo.js
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

// Define the SVG content provided earlier
const svgLogo200 = `
<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="100" cy="100" r="95" fill="#f5f7fa" stroke="#5c6bc0" stroke-width="2"/>
  
  <!-- 3D Cube representation -->
  <g transform="translate(100, 100)">
    <!-- Back face -->
    <path d="M -40,-40 L 40,-40 L 40,40 L -40,40 Z" fill="#3949ab" opacity="0.7"/>
    
    <!-- Right face -->
    <path d="M 40,-40 L 55,-25 L 55,55 L 40,40 Z" fill="#5c6bc0"/>
    
    <!-- Top face -->
    <path d="M -40,-40 L -25,-55 L 55,-55 L 40,-40 Z" fill="#7986cb"/>
    
    <!-- Document icons inside the cube -->
    <!-- Document 1 -->
    <g transform="translate(-15, -15) rotate(-15)">
      <rect x="-10" y="-15" width="20" height="25" rx="2" fill="white" opacity="0.9"/>
      <line x1="-6" y1="-8" x2="6" y2="-8" stroke="#5c6bc0" stroke-width="1.5"/>
      <line x1="-6" y1="-3" x2="6" y2="-3" stroke="#5c6bc0" stroke-width="1.5"/>
      <line x1="-6" y1="2" x2="6" y2="2" stroke="#5c6bc0" stroke-width="1.5"/>
    </g>
    
    <!-- Document 2 -->
    <g transform="translate(15, 0) rotate(10)">
      <rect x="-10" y="-15" width="20" height="25" rx="2" fill="white" opacity="0.9"/>
      <line x1="-6" y1="-8" x2="6" y2="-8" stroke="#5c6bc0" stroke-width="1.5"/>
      <line x1="-6" y1="-3" x2="6" y2="-3" stroke="#5c6bc0" stroke-width="1.5"/>
      <line x1="-6" y1="2" x2="6" y2="2" stroke="#5c6bc0" stroke-width="1.5"/>
    </g>
    
    <!-- Document 3 -->
    <g transform="translate(0, 15) rotate(5)">
      <rect x="-10" y="-15" width="20" height="25" rx="2" fill="white" opacity="0.9"/>
      <line x1="-6" y1="-8" x2="6" y2="-8" stroke="#5c6bc0" stroke-width="1.5"/>
      <line x1="-6" y1="-3" x2="6" y2="-3" stroke="#5c6bc0" stroke-width="1.5"/>
      <line x1="-6" y1="2" x2="6" y2="2" stroke="#5c6bc0" stroke-width="1.5"/>
    </g>
  </g>
  
  <!-- Text -->
  <text x="100" y="170" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="#3949ab">NoteVault</text>
</svg>
`;

const svgLogo128 = `
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- 3D Cube representation -->
  <g transform="translate(64, 54)">
    <!-- Back face -->
    <path d="M -30,-30 L 30,-30 L 30,30 L -30,30 Z" fill="#3949ab" opacity="0.7"/>
    
    <!-- Right face -->
    <path d="M 30,-30 L 42,-18 L 42,42 L 30,30 Z" fill="#5c6bc0"/>
    
    <!-- Top face -->
    <path d="M -30,-30 L -18,-42 L 42,-42 L 30,-30 Z" fill="#7986cb"/>
    
    <!-- Document icons inside the cube -->
    <!-- Document 1 -->
    <g transform="translate(-10, -10) rotate(-15)">
      <rect x="-8" y="-12" width="16" height="20" rx="2" fill="white" opacity="0.9"/>
      <line x1="-5" y1="-6" x2="5" y2="-6" stroke="#5c6bc0" stroke-width="1.2"/>
      <line x1="-5" y1="-2" x2="5" y2="-2" stroke="#5c6bc0" stroke-width="1.2"/>
      <line x1="-5" y1="2" x2="5" y2="2" stroke="#5c6bc0" stroke-width="1.2"/>
    </g>
    
    <!-- Document 2 -->
    <g transform="translate(10, 0) rotate(10)">
      <rect x="-8" y="-12" width="16" height="20" rx="2" fill="white" opacity="0.9"/>
      <line x1="-5" y1="-6" x2="5" y2="-6" stroke="#5c6bc0" stroke-width="1.2"/>
      <line x1="-5" y1="-2" x2="5" y2="-2" stroke="#5c6bc0" stroke-width="1.2"/>
      <line x1="-5" y1="2" x2="5" y2="2" stroke="#5c6bc0" stroke-width="1.2"/>
    </g>
  </g>
  
  <!-- Text -->
  <text x="64" y="105" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#3949ab">NoteVault</text>
</svg>
`;

const svgLogo48 = `
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <!-- 3D Cube representation -->
  <g transform="translate(24, 22)">
    <!-- Back face -->
    <path d="M -15,-15 L 15,-15 L 15,15 L -15,15 Z" fill="#3949ab" opacity="0.7"/>
    
    <!-- Right face -->
    <path d="M 15,-15 L 22,-8 L 22,22 L 15,15 Z" fill="#5c6bc0"/>
    
    <!-- Top face -->
    <path d="M -15,-15 L -8,-22 L 22,-22 L 15,-15 Z" fill="#7986cb"/>
    
    <!-- Document icon inside the cube -->
    <g transform="translate(0, 0)">
      <rect x="-6" y="-8" width="12" height="15" rx="1.5" fill="white" opacity="0.9"/>
      <line x1="-4" y1="-4" x2="4" y2="-4" stroke="#5c6bc0" stroke-width="1"/>
      <line x1="-4" y1="-1" x2="4" y2="-1" stroke="#5c6bc0" stroke-width="1"/>
      <line x1="-4" y1="2" x2="4" y2="2" stroke="#5c6bc0" stroke-width="1"/>
    </g>
  </g>
</svg>
`;

// Define the required sizes for Chrome extension
const sizes = [
  { width: 16, height: 16, name: 'icon16' },
  { width: 32, height: 32, name: 'icon32' },
  { width: 48, height: 48, name: 'icon48' },
  { width: 128, height: 128, name: 'icon128' }
];

// Additional sizes for other purposes
const additionalSizes = [
  { width: 200, height: 200, name: 'logo200' }
];

// Combine all sizes
const allSizes = [...sizes, ...additionalSizes];

// Create output directory
const outputDir = path.join(__dirname, 'icons');
const logoDir = path.join(__dirname, 'logos');

async function convertLogos() {
  try {
    // Create directories if they don't exist
    await fs.ensureDir(outputDir);
    await fs.ensureDir(logoDir);
    
    console.log('Converting SVG logos to PNG files...');
    
    // Process each size
    for (const size of allSizes) {
      const outputPath = path.join(outputDir, `${size.name}.png`);
      const logoPath = path.join(logoDir, `${size.name}.png`);
      
      // Choose the appropriate SVG based on size
      let svgContent;
      if (size.width >= 200) {
        svgContent = svgLogo200;
      } else if (size.width >= 128) {
        svgContent = svgLogo128;
      } else {
        svgContent = svgLogo48;
      }
      
      // Convert SVG to PNG using Sharp
      await sharp(Buffer.from(svgContent))
        .resize(size.width, size.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      // Also save to logos directory
      await sharp(Buffer.from(svgContent))
        .resize(size.width, size.height, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(logoPath);
      
      console.log(`✓ Created ${size.name}.png (${size.width}x${size.height})`);
    }
    
    // Save the original SVG files
    await fs.writeFile(path.join(logoDir, 'logo200.svg'), svgLogo200);
    await fs.writeFile(path.join(logoDir, 'logo128.svg'), svgLogo128);
    await fs.writeFile(path.join(logoDir, 'logo48.svg'), svgLogo48);
    
    console.log('\n✅ All logos converted successfully!');
    console.log('📁 Icons saved to: ./icons/');
    console.log('📁 Logos saved to: ./logos/');
    
  } catch (error) {
    console.error('Error converting logos:', error);
  }
}

// Run the conversion
convertLogos();