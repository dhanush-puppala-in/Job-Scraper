const express = require('express');
const router = express.Router();

const jobsService = require('../services/jobs.service');
const logger = require('../config/logger');

/**
 * GET /api/jobs
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      source,
      location,
      company,
      jobType
    } = req.query;

    const filters = {};

    if (source) filters.source = source;
    if (location) filters.location = location;
    if (company) filters.company = company;
    if (jobType) filters.jobType = jobType;

    const result = await jobsService.getJobs(
      filters,
      parseInt(page, 10),
      parseInt(limit, 10)
    );

    res.json(result);
  } catch (error) {
    logger.error(`GET /jobs error: ${error.message}`);

    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: error.message
    });
  }
});

/**
 * GET /api/jobs/search/:query
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;

    const {
      page = 1,
      limit = 20
    } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        error: 'Query must be at least 2 characters'
      });
    }

    const result = await jobsService.searchJobs(
      query,
      parseInt(page, 10),
      parseInt(limit, 10)
    );

    res.json(result);
  } catch (error) {
    logger.error(`GET /jobs/search error: ${error.message}`);

    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/jobs/source/:source
 */
router.get('/source/:source', async (req, res) => {
  try {
    const { source } = req.params;

    const jobs = await jobsService.getJobsBySource(source);

    res.json({
      source,
      jobs,
      count: jobs.length
    });
  } catch (error) {
    logger.error(
      `GET /jobs/source error: ${error.message}`
    );

    res.status(500).json({
      error: 'Failed to fetch jobs by source'
    });
  }
});

/**
 * GET /api/jobs/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await jobsService.getStatistics();

    res.json(stats);
  } catch (error) {
    logger.error(
      `GET /jobs/stats error: ${error.message}`
    );

    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/jobs/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { MongoDB } = require('../config/database');

    const db = MongoDB.getDb();

    const job = await db
      .collection('jobs')
      .findOne({ jobId: id });

    if (!job) {
      return res.status(404).json({
        error: 'Job not found'
      });
    }

    res.json(job);
  } catch (error) {
    logger.error(
      `GET /jobs/:id error: ${error.message}`
    );

    res.status(500).json({
      error: 'Failed to fetch job',
      message: error.message
    });
  }
});

module.exports = router;