const express = require('express');
const router = express.Router();
const { runYtDlp } = require('../utils/runYtDlp');

// Health Check
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Get available formats for a URL
router.get('/formats', async (req, res, next) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: true, message: 'URL is required' });
        }

        // -J gives full JSON info including formats
        const info = await runYtDlp(['-J', url]);

        // Extract just the formats to keep payload smaller if needed, 
        // or return the whole format list
        const formats = info.formats.map(f => ({
            format_id: f.format_id,
            ext: f.ext,
            resolution: f.resolution,
            filesize: f.filesize,
            note: f.format_note,
            vcodec: f.vcodec,
            acodec: f.acodec
        }));

        res.json({ formats });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
