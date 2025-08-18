// download-libs.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const libDir = path.join(__dirname, 'lib');

// Create lib directory if it doesn't exist
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir);
}

// Function to download a file
function downloadFile(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(libDir, filename));
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(filename);
      reject(err);
    });
  });
}

// Download required libraries
async function downloadLibraries() {
  try {
    console.log('Downloading libraries...');
    
    await downloadFile('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'three.min.js');
    console.log('✓ Downloaded three.min.js');
    
    await downloadFile('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js', 'OrbitControls.js');
    console.log('✓ Downloaded OrbitControls.js');
    
    await downloadFile('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.11.4/gsap.min.js', 'gsap.min.js');
    console.log('✓ Downloaded gsap.min.js');
    
    console.log('\n✅ All libraries downloaded successfully!');
  } catch (error) {
    console.error('Error downloading libraries:', error);
  }
}

downloadLibraries();
