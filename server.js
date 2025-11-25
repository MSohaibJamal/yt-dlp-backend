const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { ensureYtDlp } = require('./utils/ensureYtDlp');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Routes
const downloadRoutes = require('./routes/download');
const playlistRoutes = require('./routes/playlist');
const infoRoutes = require('./routes/info');
const generalRoutes = require('./routes/general');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Rate Limiter (Apply to all API routes)
app.use('/api', rateLimiter);

// Static folder for downloads (if needed for temporary storage debugging)
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Root Route - API Directory
app.get('/', (req, res) => {
    res.json({
        message: 'YouTube Downloader API is running 🚀',
        endpoints: {
            health: '/api/health',
            info: '/api/info?url={youtube_url}',
            formats: '/api/formats?url={youtube_url}',
            download: '/api/download?url={youtube_url}&format={format_id}',
            playlist_info: '/api/playlist?url={playlist_url}',
            playlist_download: '/api/playlist/download?url={playlist_url}'
        }
    });
});

// Routes (Support both /api/* and /*)
app.use('/api', downloadRoutes);
app.use('/', downloadRoutes);

app.use('/api/playlist', playlistRoutes);
app.use('/playlist', playlistRoutes);

app.use('/api', infoRoutes);
app.use('/', infoRoutes);

app.use('/api', generalRoutes);
app.use('/', generalRoutes);

// Root Route
app.get('/', (req, res) => {
    res.json({
        message: 'YouTube Downloader API is running',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            download: '/api/download',
            playlist: '/api/playlist',
            info: '/api/info'
        }
    });
});

// Error Handling
app.use(errorHandler);

// Start Server
async function startServer() {
    await ensureYtDlp(); // Ensure binary exists before accepting requests

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer();
