const { MongoDB } = require('../config/database');
const logger = require('../config/logger');

class JobsService {

  async saveJobs(jobs) {
    try {
      const db = MongoDB.getDb();
      const collection = db.collection('jobs');

      if (!Array.isArray(jobs) || jobs.length === 0) {
        return {
          insertedCount: 0,
          modifiedCount: 0,
          upsertedCount: 0
        };
      }

      const operations = jobs
        .filter(job => job.jobId)
        .map(job => ({
          updateOne: {
            filter: {
              jobId: job.jobId
            },
            update: {
              $set: job
            },
            upsert: true
          }
        }));

      if (operations.length === 0) {
        return {
          insertedCount: 0,
          modifiedCount: 0,
          upsertedCount: 0
        };
      }

      const result = await collection.bulkWrite(
        operations,
        { ordered: false }
      );

      logger.info(
        `Saved jobs - inserted: ${result.upsertedCount}, modified: ${result.modifiedCount}`
      );

      return result;
    } catch (error) {
      logger.error(
        `Error saving jobs: ${error.message}`
      );

      throw error;
    }
  }

  async getJobs(
    filters = {},
    page = 1,
    limit = 20
  ) {
    try {
      const db = MongoDB.getDb();
      const collection = db.collection('jobs');

      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);

      const query = this.buildQuery(filters);

      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        collection
          .find(query)
          .sort({ scrapedAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),

        collection.countDocuments(query)
      ]);

      return {
        jobs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(
        `Error fetching jobs: ${error.message}`
      );

      throw error;
    }
  }

  async searchJobs(
    keywords,
    page = 1,
    limit = 20
  ) {
    try {
      const db = MongoDB.getDb();
      const collection = db.collection('jobs');

      page = Math.max(1, page);
      limit = Math.min(Math.max(1, limit), 100);

      const query = {
        $text: {
          $search: keywords
        }
      };

      const skip = (page - 1) * limit;

      const [jobs, total] = await Promise.all([
        collection
          .find(query)
          .sort({
            score: {
              $meta: 'textScore'
            }
          })
          .skip(skip)
          .limit(limit)
          .toArray(),

        collection.countDocuments(query)
      ]);

      return {
        jobs,
        query: keywords,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error(
        `Error searching jobs: ${error.message}`
      );

      throw error;
    }
  }

  async getJobsBySource(source) {
    try {
      const db = MongoDB.getDb();

      return await db
        .collection('jobs')
        .find({ source })
        .sort({ scrapedAt: -1 })
        .limit(100)
        .toArray();
    } catch (error) {
      logger.error(
        `Error fetching jobs by source: ${error.message}`
      );

      throw error;
    }
  }

  async getStatistics() {
    try {
      const db = MongoDB.getDb();

      const stats = await db
        .collection('jobs')
        .aggregate([
          {
            $facet: {
              total: [
                {
                  $count: 'count'
                }
              ],

              bySource: [
                {
                  $group: {
                    _id: '$source',
                    count: {
                      $sum: 1
                    }
                  }
                }
              ],

              byLocation: [
                {
                  $group: {
                    _id: '$location',
                    count: {
                      $sum: 1
                    }
                  }
                },
                {
                  $sort: {
                    count: -1
                  }
                },
                {
                  $limit: 10
                }
              ],

              recent: [
                {
                  $sort: {
                    scrapedAt: -1
                  }
                },
                {
                  $limit: 1
                },
                {
                  $project: {
                    scrapedAt: 1
                  }
                }
              ]
            }
          }
        ])
        .toArray();

      const result = stats[0];

      return {
        totalJobs: result.total[0]?.count || 0,
        bySource: result.bySource,
        topLocations: result.byLocation,
        lastUpdated:
          result.recent[0]?.scrapedAt || null
      };
    } catch (error) {
      logger.error(
        `Error fetching statistics: ${error.message}`
      );

      throw error;
    }
  }

  async deleteOldJobs(days = 30) {
    try {
      const db = MongoDB.getDb();

      const cutoffDate = new Date();

      cutoffDate.setDate(
        cutoffDate.getDate() - days
      );

      const result = await db
        .collection('jobs')
        .deleteMany({
          scrapedAt: {
            $lt: cutoffDate
          }
        });

      logger.info(
        `Deleted ${result.deletedCount} old jobs`
      );

      return result;
    } catch (error) {
      logger.error(
        `Error deleting old jobs: ${error.message}`
      );

      throw error;
    }
  }

  buildQuery(filters) {
    const query = {};

    if (filters.source) {
      query.source = filters.source;
    }

    if (filters.location) {
      query.location = {
        $regex: filters.location,
        $options: 'i'
      };
    }

    if (filters.company) {
      query.company = {
        $regex: filters.company,
        $options: 'i'
      };
    }

    if (filters.jobType) {
      query.jobType = filters.jobType;
    }

    return query;
  }
}

module.exports = new JobsService();