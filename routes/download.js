const express = require('express');
const router = express.Router();
const { spawnYtDlp, runYtDlp } = require('../utils/runYtDlp');

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

module.exports = router;
