require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { MongoDB } = require('./config/database');
const logger = require('./config/logger');

const jobRoutes = require('./routes/jobs');
const scraperRoutes = require('./routes/scraper');

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
  extended: true
}));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'API is running',
    database: MongoDB.isConnected()
      ? 'connected'
      : 'disconnected',
    timestamp: new Date()
  });
});

app.use('/api/jobs', jobRoutes);

app.use('/api/scraper', scraperRoutes);


app.use((err, req, res, next) => {
  logger.error(
    `Unhandled error: ${err.message}`
  );

  res.status(500).json({
    error: 'Internal server error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'An error occurred'
  });
});


app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
});


const start = async () => {
  try {
    logger.info(
      'Starting Job Scraper backend...'
    );


    if (!MongoDB) {
      throw new Error(
        'MongoDB module was not imported correctly'
      );
    }

    if (typeof MongoDB.connect !== 'function') {
      throw new Error(
        'MongoDB.connect() is not available. Check config/database.js export.'
      );
    }


    await MongoDB.connect();

    logger.info(
      'Database connected successfully'
    );


    app.listen(PORT, () => {
      logger.info(
        `Server running on http://localhost:${PORT}`
      );
    });

  } catch (error) {
    logger.error(
      `Failed to start server: ${error.message}`
    );

    process.exit(1);
  }
};

start();

module.exports = app;