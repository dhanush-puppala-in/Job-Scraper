const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const scraperService = require('../services/scraper.service');
const jobsService = require('../services/jobs.service');
const logger = require('../config/logger');

const activeScrapes = new Map();

const VALID_SOURCES = [
  'public-api',
  'rss'
];

/**
 * POST /api/scraper/start
 */
router.post('/start', async (req, res) => {
  try {
    const {
      source = 'public-api'
    } = req.body;

    if (!VALID_SOURCES.includes(source)) {
      return res.status(400).json({
        error: 'Invalid source',
        allowedSources: VALID_SOURCES
      });
    }

    if (activeScrapes.size > 0) {
      return res.status(429).json({
        error: 'Scrape already in progress',
        activeScrapes: Array.from(
          activeScrapes.keys()
        )
      });
    }

    const scrapeId = uuidv4();

    // IMPORTANT:
    // Create status BEFORE returning response
    activeScrapes.set(scrapeId, {
      status: 'running',
      source,
      startedAt: new Date()
    });

    res.status(202).json({
      scrapeId,
      status: 'started',
      source,
      message: `Scraping from ${source}...`
    });

    // Background scrape
    (async () => {
      try {
        logger.info(
          `Starting scrape ${scrapeId} from ${source}`
        );

        const jobs =
          await scraperService.scrapeJobs(source);

        let saveResult = null;

        if (jobs.length > 0) {
          saveResult =
            await jobsService.saveJobs(jobs);
        }

        const current =
          activeScrapes.get(scrapeId);

        activeScrapes.set(scrapeId, {
          ...current,

          status: 'completed',

          completedAt: new Date(),

          jobsScraped: jobs.length,

          jobsSaved:
            saveResult?.upsertedCount || 0
        });

        logger.info(
          `Scrape ${scrapeId} completed. Scraped ${jobs.length} jobs.`
        );

      } catch (error) {

        const current =
          activeScrapes.get(scrapeId);

        activeScrapes.set(scrapeId, {
          ...current,

          status: 'failed',

          error: error.message,

          completedAt: new Date()
        });

        logger.error(
          `Scrape ${scrapeId} failed: ${error.message}`
        );
      }
    })();

  } catch (error) {
    logger.error(
      `POST /scraper/start error: ${error.message}`
    );

    res.status(500).json({
      error: 'Failed to start scrape',
      message: error.message
    });
  }
});

/**
 * GET /api/scraper/status/:scrapeId
 */
router.get('/status/:scrapeId', (req, res) => {
  try {
    const {
      scrapeId
    } = req.params;

    const scrapeStatus =
      activeScrapes.get(scrapeId);

    if (!scrapeStatus) {
      return res.status(404).json({
        error: 'Scrape not found'
      });
    }

    res.json({
      scrapeId,
      ...scrapeStatus
    });

  } catch (error) {
    logger.error(
      `GET /scraper/status error: ${error.message}`
    );

    res.status(500).json({
      error: 'Failed to get scrape status'
    });
  }
});

/**
 * GET /api/scraper/active
 */
router.get('/active', (req, res) => {
  const active =
    Array.from(
      activeScrapes.entries()
    ).map(([id, data]) => ({
      scrapeId: id,
      ...data
    }));

  res.json({
    activeScrapes: active,
    count: active.length
  });
});

/**
 * GET /api/scraper/stats
 */
router.get('/stats', (req, res) => {
  try {
    res.json(
      scraperService.getStatistics()
    );
  } catch (error) {
    logger.error(
      `GET /scraper/stats error: ${error.message}`
    );

    res.status(500).json({
      error: 'Failed to get scraper statistics'
    });
  }
});

/**
 * GET /api/scraper/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'scraper',
    timestamp: new Date(),
    activeScrapes: activeScrapes.size,
    totalRequests: scraperService.requestCount,
    blockRate: scraperService.blockCount
  });
});

module.exports = router;