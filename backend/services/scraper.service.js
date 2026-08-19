const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const PQueue = require('p-queue').default;

class ScraperService {

  constructor() {
    this.queue = new PQueue({
      concurrency: 2,
      interval: 1000,
      intervalCap: 3
    });

    this.requestCount = 0;
    this.blockCount = 0;
  }

  async delay(min = 1000, max = 3000) {
    const delayMs =
      Math.random() * (max - min) + min;

    await new Promise(resolve =>
      setTimeout(resolve, delayMs)
    );
  }

  buildHeaders() {
    return {
      'User-Agent':
        'ACDYON-Job-Scraper/1.0',
      'Accept':
        'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language':
        'en-US,en;q=0.9'
    };
  }

  async fetchWithRetry(
    url,
    maxRetries = 3
  ) {
    for (
      let attempt = 1;
      attempt <= maxRetries;
      attempt++
    ) {
      try {

        if (attempt > 1) {
          await this.delay(1000, 3000);
        }

        const response =
          await axios.get(url, {
            headers: this.buildHeaders(),
            timeout: 20000,
            maxRedirects: 5,
            validateStatus:
              status => status < 500
          });

        this.requestCount++;

        if (
          response.status === 403 ||
          response.status === 429
        ) {
          this.blockCount++;

          logger.warn(
            `Request blocked/rate limited: ${url}`
          );

          if (
            attempt < maxRetries
          ) {
            continue;
          }
        }

        if (
          response.status >= 200 &&
          response.status < 300
        ) {
          return response.data;
        }

        throw new Error(
          `HTTP ${response.status}`
        );

      } catch (error) {

        logger.warn(
          `Request attempt ${attempt}/${maxRetries} failed: ${error.message}`
        );

        if (
          attempt === maxRetries
        ) {
          throw error;
        }
      }
    }

    throw new Error(
      `Failed to fetch ${url}`
    );
  }

  /**
   * Main scraper
   */
  async scrapeJobs(
    source = 'public-api'
  ) {
    try {

      logger.info(
        `Starting scrape for source: ${source}`
      );

      let jobs = [];

      switch (source) {

        case 'public-api':
          jobs =
            await this.scrapePublicJobsAPI();
          break;

        case 'rss':
          jobs =
            await this.scrapeRSSFeed();
          break;

        default:
          throw new Error(
            `Unsupported source: ${source}`
          );
      }

      logger.info(
        `Scraped ${jobs.length} jobs from ${source}`
      );

      return jobs;

    } catch (error) {

      logger.error(
        `Scraping failed for ${source}: ${error.message}`
      );

      throw error;
    }
  }

  /**
   * Public job API
   *
   * Uses Remotive's public jobs API.
   */
  async scrapePublicJobsAPI() {

    try {

      const url =
        'https://remotive.com/api/remote-jobs';

      const data =
        await this.fetchWithRetry(url);

      if (
        !data ||
        !Array.isArray(data.jobs)
      ) {
        logger.warn(
          'Public API returned no jobs'
        );

        return [];
      }

      return data.jobs.map(job => ({
        jobId:
          `remotive-${job.id}`,

        title:
          job.title || 'Unknown',

        company:
          job.company_name || 'Unknown',

        location:
          job.candidate_required_location ||
          'Remote',

        description:
          this.cleanHtml(
            job.description || ''
          ),

        source:
          'public-api',

        url:
          job.url || null,

        scrapedAt:
          job.publication_date
            ? new Date(job.publication_date)
            : new Date(),

        salary:
          job.salary || null,

        jobType:
          job.job_type || 'Full-time'
      }));

    } catch (error) {

      logger.error(
        `Public API scraping failed: ${error.message}`
      );

      throw error;
    }
  }

  /**
   * RSS scraper
   */
  async scrapeRSSFeed() {

    const rssUrls = [
      'https://news.ycombinator.com/rss'
    ];

    const jobs = [];

    for (
      const rssUrl of rssUrls
    ) {

      try {

        const xml =
          await this.fetchWithRetry(
            rssUrl,
            2
          );

        const $ =
          cheerio.load(
            xml,
            {
              xmlMode: true
            }
          );

        $('item').each(
          (index, element) => {

            const item =
              $(element);

            const title =
              item.find('title')
                .text()
                .trim();

            const description =
              item.find('description')
                .text()
                .trim();

            const link =
              item.find('link')
                .text()
                .trim();

            const pubDate =
              item.find('pubDate')
                .text()
                .trim();

            if (
              !title ||
              !link
            ) {
              return;
            }

            const isJob =
              /job|hiring|developer|engineer|frontend|backend|software/i
                .test(title);

            if (!isJob) {
              return;
            }

            jobs.push({
              jobId:
                `rss-${uuidv4()}`,

              title,

              company:
                'Hacker News',

              location:
                'Remote',

              description:
                this.cleanHtml(
                  description
                ).substring(0, 500),

              source:
                'rss',

              url:
                link,

              scrapedAt:
                pubDate
                  ? new Date(pubDate)
                  : new Date(),

              salary:
                null,

              jobType:
                'Full-time'
            });
          }
        );

      } catch (error) {

        logger.warn(
          `RSS feed failed: ${error.message}`
        );
      }
    }

    return jobs;
  }

  cleanHtml(html) {
    return cheerio
      .load(`<div>${html}</div>`)
      .text()
      .replace(/\s+/g, ' ')
      .trim();
  }

  getStatistics() {
    return {
      totalRequests:
        this.requestCount,

      blockDetections:
        this.blockCount,

      blockRate:
        this.requestCount > 0
          ? (
            (
              this.blockCount /
              this.requestCount
            ) * 100
          ).toFixed(2) + '%'
          : '0%',

      uptime:
        process.uptime(),

      timestamp:
        new Date()
    };
  }
}

module.exports = new ScraperService();