const express = require('express');
const router = express.Router();
const { spawnYtDlp, runYtDlp } = require('../utils/runYtDlp');
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

const DOWNLOADS_DIR = path.join(__dirname, '../downloads');

router.get('/download', async (req, res, next) => {
    try {
        const { url, type } = req.query;
        if (!url) {
            return res.status(400).json({ error: true, message: 'URL is required' });
        }

        // 1. Get info first to get the title
        const info = await runYtDlp(['-J', url]);
        const title = info.title.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize filename

        const args = [];
        let ext = 'mp4';
        let contentType = 'video/mp4';

        if (type === 'audio') {
            ext = 'mp3';
            contentType = 'audio/mpeg';
            // Extract audio and convert to mp3, pipe to stdout
            args.push('-x', '--audio-format', 'mp3');
        } else {
            // Default to video (mp4)
            ext = 'mp4';
            contentType = 'video/mp4';
            // Try to get mp4 directly or merge to mp4
            // Note: streaming merged output to stdout might be tricky depending on ffmpeg version and moov atom.
            // But we will try to request mp4 extension.
            args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
        }

        args.push('-o', '-', url);

        // Set headers
        res.header('Content-Disposition', `attachment; filename="${title}.${ext}"`);
        res.header('Content-Type', contentType);
        // We don't know the content length beforehand because it's a stream/conversion

        const ytProcess = spawnYtDlp(args);

        ytProcess.stdout.pipe(res);

        ytProcess.stderr.on('data', (data) => {
            console.error(`[yt-dlp stderr]: ${data}`);
        });

        ytProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`yt-dlp exited with code ${code}`);
                // If headers haven't been sent (unlikely if piping started), we could send error.
                // But usually if piping started, the stream just ends.
            }
        });

        // Handle client disconnect
        req.on('close', () => {
            ytProcess.kill();
        });

    } catch (error) {
        next(error);
    }
});

// Download Playlist as ZIP
router.get('/download/playlist', async (req, res, next) => {
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
        const args = [
            '-o', path.join(tempDir, '%(title)s.%(ext)s'),
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            url
        ];

        await runYtDlp(args);

        console.log(`[${requestId}] Download complete. Zipping...`);

        // Create Zip
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        res.header('Content-Type', 'application/zip');
        res.header('Content-Disposition', `attachment; filename="playlist_${requestId}.zip"`);

        archive.pipe(res);
        archive.directory(tempDir, false);

        await archive.finalize();

        console.log(`[${requestId}] Zip sent.`);

        // Cleanup
        res.on('finish', async () => {
            try {
                await fs.remove(tempDir);
                console.log(`[${requestId}] Cleanup successful.`);
            } catch (err) {
                console.error(`[${requestId}] Cleanup failed:`, err);
            }
        });

    } catch (error) {
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
