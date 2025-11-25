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

module.exports = router;
