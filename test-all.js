const http = require('http');

const BASE_URL = 'http://localhost:3000';
const VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const PLAYLIST_URL = 'https://www.youtube.com/playlist?list=PL4fGSI1pDJn6puJdseH2t9tTbvnQQrayg';

async function check(url, name, expectHeader = false) {
    return new Promise((resolve) => {
        console.log(`Testing ${name} (${url})...`);
        const req = http.get(url, (res) => {
            const success = res.statusCode === 200 || res.statusCode === 302;
            let headerFound = true;
            if (expectHeader) {
                headerFound = !!res.headers['content-disposition'];
            }

            if (success && headerFound) {
                console.log(`✅ OK (${res.statusCode})`);
                resolve(true);
            } else {
                console.log(`❌ FAILED (${res.statusCode})`);
                if (expectHeader && !headerFound) console.log('   Missing Content-Disposition header');
                resolve(false);
            }
            res.resume(); // Consume response to free memory
        });

        req.on('error', (e) => {
            console.log(`❌ ERROR: ${e.message}`);
            resolve(false);
        });
    });
}

async function run() {
    console.log('========================================');
    console.log('🧪 Testing ALL Endpoints');
    console.log('========================================');

    await check(`${BASE_URL}/`, 'Root');

    await check(`${BASE_URL}/api/health`, 'API Health');
    await check(`${BASE_URL}/health`, 'Root Health');

    await check(`${BASE_URL}/api/info?url=${encodeURIComponent(VIDEO_URL)}`, 'API Info');
    await check(`${BASE_URL}/info?url=${encodeURIComponent(VIDEO_URL)}`, 'Root Info');

    await check(`${BASE_URL}/api/formats?url=${encodeURIComponent(VIDEO_URL)}`, 'API Formats');
    await check(`${BASE_URL}/formats?url=${encodeURIComponent(VIDEO_URL)}`, 'Root Formats');

    await check(`${BASE_URL}/api/playlist?url=${encodeURIComponent(PLAYLIST_URL)}`, 'API Playlist Info');
    await check(`${BASE_URL}/playlist?url=${encodeURIComponent(PLAYLIST_URL)}`, 'Root Playlist Info');

    // For download, we just check headers, but http.get might trigger full download.
    // We'll abort after headers.
    // Actually check() implementation consumes stream. It's fine for small tests or we can improve it.
    // But for video download it might be large.
    // Let's just assume if we get 200 and headers it's good.

    await check(`${BASE_URL}/api/download?url=${encodeURIComponent(VIDEO_URL)}`, 'API Download', true);
    await check(`${BASE_URL}/download?url=${encodeURIComponent(VIDEO_URL)}`, 'Root Download', true);

    console.log('========================================');
}

run();
