const { MongoClient } = require('mongodb');
const logger = require('./logger');

class MongoDB {
  static client = null;
  static db = null;

  /**
   * Connect to MongoDB
   */
  static async connect() {
    try {
      const uri = process.env.MONGODB_URI;

      if (!uri) {
        throw new Error(
          'MONGODB_URI is not defined in the .env file'
        );
      }

      logger.info('Connecting to MongoDB...');

      this.client = new MongoClient(uri);

      await this.client.connect();

      // Use DB_NAME if provided.
      // Otherwise use acdyon-jobs.
      this.db = this.client.db(
        process.env.DB_NAME || 'acdyon-jobs'
      );

      // Verify connection
      await this.db.command({ ping: 1 });

      logger.info(
        `Connected to MongoDB successfully - database: ${process.env.DB_NAME || 'acdyon-jobs'
        }`
      );

      await this.createIndexes();

      return this.db;
    } catch (error) {
      logger.error(
        `MongoDB connection failed: ${error.message}`
      );

      // Clean up failed connection
      if (this.client) {
        try {
          await this.client.close();
        } catch (closeError) {
          logger.error(
            `MongoDB cleanup failed: ${closeError.message}`
          );
        }
      }

      this.client = null;
      this.db = null;

      throw error;
    }
  }

  /**
   * Create indexes
   */
  static async createIndexes() {
    if (!this.db) {
      throw new Error(
        'Cannot create indexes: database is not connected'
      );
    }

    try {
      const jobsCollection = this.db.collection('jobs');

      await jobsCollection.createIndex(
        { jobId: 1 },
        { unique: true }
      );

      await jobsCollection.createIndex({
        source: 1,
        scrapedAt: -1
      });

      await jobsCollection.createIndex({
        title: 'text',
        description: 'text',
        company: 'text'
      });

      await jobsCollection.createIndex({
        scrapedAt: -1
      });

      logger.info('Database indexes created successfully');
    } catch (error) {
      logger.warn(
        `Index creation warning: ${error.message}`
      );
    }
  }

  /**
   * Get database instance
   */
  static getDb() {
    if (!this.db) {
      throw new Error(
        'Database not connected. Call MongoDB.connect() first.'
      );
    }

    return this.db;
  }

  /**
   * Disconnect MongoDB
   */
  static async disconnect() {
    try {
      if (this.client) {
        await this.client.close();

        logger.info(
          'Disconnected from MongoDB'
        );
      }
    } catch (error) {
      logger.error(
        `MongoDB disconnect failed: ${error.message}`
      );
    } finally {
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Check connection
   */
  static isConnected() {
    return this.client !== null && this.db !== null;
  }
}

module.exports = {
  MongoDB
};