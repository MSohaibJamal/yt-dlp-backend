function errorHandler(err, req, res, next) {
    console.error('❌ Error:', err.message);
    if (err.stack) console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: true,
        message: message,
        // Only show stack trace in development if needed, but keeping it clean for now
        // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
}

module.exports = errorHandler;
