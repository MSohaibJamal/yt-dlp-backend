const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '../bin');
const IS_WINDOWS = process.platform === 'win32';
const BINARY_NAME = IS_WINDOWS ? 'yt-dlp.exe' : 'yt-dlp';
const LOCAL_YT_DLP_PATH = path.join(BIN_DIR, BINARY_NAME);

let activeYtDlpPath = LOCAL_YT_DLP_PATH;

function getYtDlpExecutable() {
  return activeYtDlpPath;
}

async function ensureYtDlp() {
  try {
    // 1. Check if yt-dlp is available globally (e.g. via Nixpacks)
    try {
      execSync('yt-dlp --version', { stdio: 'ignore' });
      console.log('✅ Global yt-dlp found. Using system binary.');
      activeYtDlpPath = 'yt-dlp';
      return;
    } catch (e) {
      console.log('ℹ️ Global yt-dlp not found. Checking local binary...');
    }

    // 2. Fallback to local binary
    activeYtDlpPath = LOCAL_YT_DLP_PATH;

    // Ensure bin directory exists
    await fs.ensureDir(BIN_DIR);

    // Check if binary exists
    if (await fs.pathExists(LOCAL_YT_DLP_PATH)) {
      console.log(`✅ Local yt-dlp binary already exists at ${LOCAL_YT_DLP_PATH}`);
      // Ensure permissions are correct even if file exists (Linux/Mac)
      if (!IS_WINDOWS) {
        try {
          fs.chmodSync(LOCAL_YT_DLP_PATH, '755');
          console.log('✅ Permissions verified (755).');
        } catch (err) {
          console.error('⚠️ Could not set permissions on existing file:', err.message);
        }
      }
      return;
    }

    console.log('⬇️ Local yt-dlp binary not found. Downloading latest release...');

    // Get latest release info from GitHub
    const releaseUrl = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest';
    const { data } = await axios.get(releaseUrl);

    // Determine asset name based on platform
    let assetName = 'yt-dlp'; // Default (linux)
    if (IS_WINDOWS) assetName = 'yt-dlp.exe';
    else if (process.platform === 'darwin') assetName = 'yt-dlp_macos';
    else assetName = 'yt-dlp_linux'; // Explicit linux

    // Find the binary asset
    let asset = data.assets.find(a => a.name === assetName);
    if (!asset) {
      // Fallback: try finding 'yt-dlp' if specific one fails, or just error out
      // Some releases might just have 'yt-dlp' for linux
      const fallbackAsset = data.assets.find(a => a.name === 'yt-dlp');
      if (!IS_WINDOWS && fallbackAsset) {
        console.log(`⚠️ Could not find ${assetName}, falling back to 'yt-dlp'`);
        asset = fallbackAsset;
      } else {
        throw new Error(`❌ Could not find ${assetName} asset in latest release.`);
      }
    }

    const downloadUrl = asset.browser_download_url;
    console.log(`🔗 Downloading from: ${downloadUrl}`);

    // Download the binary
    const response = await axios({
      url: downloadUrl,
      method: 'GET',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(LOCAL_YT_DLP_PATH);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('✅ Download complete.');

    // Make executable (Linux/Mac only)
    if (!IS_WINDOWS) {
      try {
        fs.chmodSync(LOCAL_YT_DLP_PATH, '755');
        console.log('✅ Permissions set to 755.');
      } catch (err) {
        console.error('⚠️ Could not set permissions:', err.message);
      }
    }

  } catch (error) {
    console.error('❌ Error ensuring yt-dlp binary:', error.message);
    process.exit(1); // Critical failure
  }
}

module.exports = { ensureYtDlp, getYtDlpExecutable, YT_DLP_PATH: LOCAL_YT_DLP_PATH };
