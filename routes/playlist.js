const express = require('express');
const router = express.Router();
const { runYtDlp, spawnYtDlp } = require('../utils/runYtDlp');
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

const DOWNLOADS_DIR = path.join(__dirname, '../downloads');

// Ensure downloads dir exists
fs.ensureDirSync(DOWNLOADS_DIR);

// Get Playlist Info
router.get('/', async (req, res, next) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: true, message: 'URL is required' });
        }

        // --flat-playlist gets info without downloading or resolving every video detail deeply
        const info = await runYtDlp(['-J', '--flat-playlist', url]);

        res.json({
            title: info.title,
            uploader: info.uploader,
            webpage_url: info.webpage_url,
            video_count: info.playlist_count || (info.entries ? info.entries.length : 0),
            entries: info.entries ? info.entries.map(e => ({
                id: e.id,
                title: e.title,
                duration: e.duration,
                url: e.url
            })) : []
        });
    } catch (error) {
        next(error);
    }
});

// Download Playlist as ZIP
router.get('/download', async (req, res, next) => {
    const requestId = uuidv4();
    const tempDir = path.join(DOWNLOADS_DIR, requestId);

    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: true, message: 'URL is required' });
        }

        // Create temp dir
        await fs.ensureDir(tempDir);

        console.log(`[${requestId}] Starting playlist download for: ${url}`);

        // Download videos to tempDir
        // We use 'best' format to keep it simple and fast enough, or user preference if we added that.
        // Using -o to format filenames
        const args = [
            '-o', path.join(tempDir, '%(title)s.%(ext)s'),
            '-f', 'best', // Or 'bestaudio' if they want mp3s, but requirement says "Download entire playlist"
            url
        ];

        // We can't easily stream the zip while downloading because we need the files first.
        // So we wait for download to finish, then zip.
        // WARNING: This might take a long time and timeout the request.
        // For production, this should be a background job with polling.
        // But for this task, we'll try to keep the connection alive or just wait.
        // To keep connection alive, we could write some headers or processing info, 
        // but standard HTTP doesn't support "processing" messages easily without SSE/WebSockets.
        // We'll just await the process.

        await runYtDlp(args);

        console.log(`[${requestId}] Download complete. Zipping...`);

        // Create Zip
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        res.header('Content-Type', 'application/zip');
        res.header('Content-Disposition', `attachment; filename="playlist_${requestId}.zip"`);

        archive.pipe(res);

        archive.directory(tempDir, false);

        await archive.finalize();

        console.log(`[${requestId}] Zip sent.`);

        // Cleanup
        // We clean up after response finishes
        res.on('finish', async () => {
            try {
                await fs.remove(tempDir);
                console.log(`[${requestId}] Cleanup successful.`);
            } catch (err) {
                console.error(`[${requestId}] Cleanup failed:`, err);
            }
        });

    } catch (error) {
        // If headers already sent (streaming zip started), we can't send JSON error.
        // But if error happened during download (before zip), we can.
        if (!res.headersSent) {
            next(error);
        } else {
            console.error('Error after headers sent:', error);
        }

        // Attempt cleanup on error
        try {
            await fs.remove(tempDir);
        } catch (e) { /* ignore */ }
    }
});

module.exports = router;
