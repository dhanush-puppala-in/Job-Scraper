const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const scraperService = require('../services/scraper.service');
const jobsService = require('../services/jobs.service');
const logger = require('../config/logger');

const activeScrapes = new Map();

const VALID_SOURCES = ['public-api', 'rss'];

/**
 * POST /api/scraper/start
 */
router.post('/start', async (req, res) => {
  try {
    logger.info(
      `Scrape request received: ${JSON.stringify(req.body)}`
    );

    const source = req.body?.source || 'public-api';

    if (!VALID_SOURCES.includes(source)) {
      return res.status(400).json({
        error: 'Invalid source',
        allowedSources: VALID_SOURCES
      });
    }

    if (activeScrapes.size > 0) {
      return res.status(429).json({
        error: 'Scrape already in progress',
        activeScrapes: Array.from(activeScrapes.keys())
      });
    }

    const scrapeId = uuidv4();

    activeScrapes.set(scrapeId, {
      status: 'running',
      source,
      startedAt: new Date(),
      jobsScraped: 0,
      jobsSaved: 0
    });

    // Respond immediately
    res.status(202).json({
      scrapeId,
      status: 'started',
      source,
      message: `Scraping from ${source}...`
    });

    // Run scraper in background
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

        if (current) {
          activeScrapes.set(scrapeId, {
            ...current,
            status: 'completed',
            completedAt: new Date(),
            jobsScraped: jobs.length,
            jobsSaved:
              saveResult?.upsertedCount || 0
          });
        }

        logger.info(
          `Scrape ${scrapeId} completed. ` +
          `Scraped ${jobs.length} jobs.`
        );

      } catch (error) {
        logger.error(
          `Scrape ${scrapeId} failed: ${error.message}`
        );

        const current =
          activeScrapes.get(scrapeId);

        if (current) {
          activeScrapes.set(scrapeId, {
            ...current,
            status: 'failed',
            error: error.message,
            completedAt: new Date()
          });
        }
      }
    })();

  } catch (error) {
    logger.error(
      `POST /scraper/start failed: ${error.stack || error.message}`
    );

    return res.status(500).json({
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
    const { scrapeId } = req.params;

    const scrapeStatus =
      activeScrapes.get(scrapeId);

    if (!scrapeStatus) {
      return res.status(404).json({
        error: 'Scrape not found'
      });
    }

    return res.json({
      scrapeId,
      ...scrapeStatus
    });

  } catch (error) {
    logger.error(
      `GET /scraper/status error: ${error.message}`
    );

    return res.status(500).json({
      error: 'Failed to get scrape status',
      message: error.message
    });
  }
});


/**
 * GET /api/scraper/active
 */
router.get('/active', (req, res) => {
  const active =
    Array.from(activeScrapes.entries())
      .map(([id, data]) => ({
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
      error: 'Failed to get scraper statistics',
      message: error.message
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
