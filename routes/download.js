const express = require('express');
const router = express.Router();
const { spawnYtDlp, runYtDlp } = require('../utils/runYtDlp');

router.get('/download', async (req, res, next) => {
    try {
        const { url, format } = req.query;
        if (!url) {
            return res.status(400).json({ error: true, message: 'URL is required' });
        }

        // 1. Get info first to get the title and validate URL
        // We use --flat-playlist to ensure we don't try to download a whole playlist if a playlist URL is passed by mistake
        // but for single video download, we usually want the video info.
        // If it's a playlist URL, yt-dlp might return playlist info.
        // Let's just use -J.
        const info = await runYtDlp(['-J', url]);

        const title = info.title.replace(/[^a-zA-Z0-9]/g, '_'); // Sanitize filename
        const ext = format || 'mp4'; // Default to mp4 if not specified
        // Note: If user selects a format id (e.g. '22'), we need to know the extension.
        // But usually 'format' query param here implies the desired output container or the format ID.
        // If it's a format ID (like '137+140'), the extension depends on the merge.
        // For simplicity, let's assume 'format' is the format selector string for yt-dlp (e.g. 'bestvideo+bestaudio/best').
        // And we force the output to be a specific container if possible, or let yt-dlp decide.

        // However, to stream effectively, we need to know the content type or just stream as binary.
        // If we use '-o -', yt-dlp writes to stdout.

        const args = [
            '-o', '-', // Output to stdout
            url
        ];

        if (format) {
            args.push('-f', format);
        } else {
            // Default to best compatible
            args.push('-f', 'best');
        }

        // Set headers
        res.header('Content-Disposition', `attachment; filename="${title}.${ext}"`);
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
