const express = require('express');
const router = express.Router();
const { runYtDlp } = require('../utils/runYtDlp');

router.get('/info', async (req, res, next) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: true, message: 'URL is required' });
        }

        const info = await runYtDlp(['-J', url]);

        // Return essential info
        res.json({
            id: info.id,
            title: info.title,
            description: info.description,
            thumbnail: info.thumbnail,
            duration: info.duration,
            uploader: info.uploader,
            view_count: info.view_count,
            formats: info.formats // Client might need this to choose format
        });
    } catch (error) {
        next(error);
    }
});

// Get Playlist Info
router.get('/info/playlist', async (req, res, next) => {
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

module.exports = router;
