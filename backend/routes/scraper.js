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

    const source =
      req.body?.source || 'public-api';

    // Validate source
    if (!VALID_SOURCES.includes(source)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid source',
        message: `Source "${source}" is not supported.`,
        allowedSources: VALID_SOURCES
      });
    }

    // Only allow one scrape at a time
    if (activeScrapes.size > 0) {
      return res.status(429).json({
        success: false,
        error: 'Scrape already in progress',
        message:
          'Another scrape is currently running. Please wait for it to finish.',
        activeScrapes:
          Array.from(activeScrapes.keys())
      });
    }

    const scrapeId = uuidv4();

    const scrapeInfo = {
      status: 'running',
      source,
      startedAt: new Date(),
      jobsScraped: 0,
      jobsSaved: 0
    };

    activeScrapes.set(
      scrapeId,
      scrapeInfo
    );

    logger.info(
      `Scrape ${scrapeId} accepted for source: ${source}`
    );

    // IMPORTANT:
    // Respond immediately.
    return res.status(202).json({
      success: true,
      scrapeId,
      status: 'started',
      source,
      message: `Scraping from ${source}...`
    });

  } catch (error) {
    logger.error(
      `POST /scraper/start failed: ${
        error.stack || error.message
      }`
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to start scrape',
      message: error.message
    });
  }
});


/**
 * Run a scrape in the background.
 *
 * This is separated from the HTTP request so that
 * the API can respond immediately with the scrape ID.
 */
async function runScrape(
  scrapeId,
  source
) {
  try {
    logger.info(
      `Starting background scrape ${scrapeId} from ${source}`
    );

    const jobs =
      await scraperService.scrapeJobs(source);

    let saveResult = null;

    if (jobs && jobs.length > 0) {
      saveResult =
        await jobsService.saveJobs(jobs);
    }

    const current =
      activeScrapes.get(scrapeId);

    if (!current) {
      logger.warn(
        `Scrape ${scrapeId} disappeared before completion`
      );

      return;
    }

    activeScrapes.set(scrapeId, {
      ...current,
      status: 'completed',
      completedAt: new Date(),
      jobsScraped: jobs?.length || 0,
      jobsSaved:
        saveResult?.upsertedCount || 0
    });

    logger.info(
      `Scrape ${scrapeId} completed. ` +
      `Scraped ${jobs?.length || 0} jobs.`
    );

  } catch (error) {
    logger.error(
      `Scrape ${scrapeId} failed: ${
        error.stack || error.message
      }`
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
}


/**
 * GET /api/scraper/status/:scrapeId
 */
router.get(
  '/status/:scrapeId',
  (req, res) => {
    try {
      const { scrapeId } =
        req.params;

      const scrapeStatus =
        activeScrapes.get(scrapeId);

      if (!scrapeStatus) {
        return res.status(404).json({
          success: false,
          error: 'Scrape not found',
          message:
            `No scrape exists with ID ${scrapeId}`
        });
      }

      return res.json({
        success: true,
        scrapeId,
        ...scrapeStatus
      });

    } catch (error) {
      logger.error(
        `GET /scraper/status error: ${error.message}`
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to get scrape status',
        message: error.message
      });
    }
  }
);


/**
 * GET /api/scraper/active
 */
router.get('/active', (req, res) => {
  try {
    const active =
      Array.from(
        activeScrapes.entries()
      ).map(([id, data]) => ({
        scrapeId: id,
        ...data
      }));

    return res.json({
      success: true,
      activeScrapes: active,
      count: active.length
    });

  } catch (error) {
    logger.error(
      `GET /scraper/active error: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to get active scrapes',
      message: error.message
    });
  }
});


/**
 * GET /api/scraper/stats
 */
router.get('/stats', (req, res) => {
  try {
    return res.json({
      success: true,
      ...scraperService.getStatistics()
    });

  } catch (error) {
    logger.error(
      `GET /scraper/stats error: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to get scraper statistics',
      message: error.message
    });
  }
});


/**
 * GET /api/scraper/health
 */
router.get('/health', (req, res) => {
  try {
    return res.json({
      success: true,
      status: 'healthy',
      service: 'scraper',
      timestamp: new Date().toISOString(),
      activeScrapes: activeScrapes.size,
      totalRequests:
        scraperService.requestCount || 0,
      blockRate:
        scraperService.blockCount || 0
    });

  } catch (error) {
    logger.error(
      `GET /scraper/health error: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});


/**
 * Start the actual scraper AFTER the route
 * has returned the 202 response.
 *
 * We attach this middleware after the /start
 * handler so the HTTP response is not blocked.
 */
const originalStartHandler = router.stack.find(
  (layer) =>
    layer.route &&
    layer.route.path === '/start' &&
    layer.route.methods.post
);

if (originalStartHandler) {
  const originalHandler =
    originalStartHandler.route.stack[0].handle;

  originalStartHandler.route.stack[0].handle =
    async function wrappedStartHandler(
      req,
      res,
      next
    ) {
      await originalHandler(
        req,
        res,
        next
      );

      // Only start background work if the
      // request was successfully accepted.
      if (res.statusCode === 202) {
        const scrapeId =
          res.locals.scrapeId;

        const source =
          res.locals.scrapeSource;

        if (scrapeId && source) {
          setImmediate(() => {
            runScrape(
              scrapeId,
              source
            );
          });
        }
      }
    };
}

router.use('/start', (req, res, next) => {
  next();
});


module.exports = router;
