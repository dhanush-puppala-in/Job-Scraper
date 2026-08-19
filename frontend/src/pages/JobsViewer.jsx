import React, {
  useState,
  useEffect,
  useCallback
} from 'react';

import { motion } from 'framer-motion';

import {
  Search,
  MapPin,
  Building2,
  Briefcase,
  ExternalLink
} from 'lucide-react';

import './JobsViewer.css';

function JobsViewer() {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] =
    useState('all');

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL =
    process.env.REACT_APP_API_URL ||
    'http://localhost:5000';

  const limit = 12;

  const sources = [
    'all',
    'indeed',
    'rss'
  ];

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url =
        `${API_URL}/api/jobs?page=${page}&limit=${limit}`;

      if (searchQuery.trim()) {
        url =
          `${API_URL}/api/jobs/search/${encodeURIComponent(
            searchQuery.trim()
          )}?page=${page}&limit=${limit}`;
      } else if (selectedSource !== 'all') {
        url +=
          `&source=${encodeURIComponent(
            selectedSource
          )}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const data = await response.json();

      setJobs(data.jobs || []);
      setPagination(data.pagination || null);

    } catch (err) {
      setError(err.message);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [
    API_URL,
    page,
    selectedSource,
    searchQuery
  ]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  const handleSourceChange = (source) => {
    setSelectedSource(source);
    setPage(1);
  };

  return (
    <motion.div
      className="jobs-viewer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="jobs-header">
        <h1>Job Listings</h1>

        <p>
          Browse scraped job opportunities
          from multiple sources
        </p>
      </div>

      <motion.div
        className="search-section"
        initial={{
          opacity: 0,
          y: -20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
      >
        <form
          onSubmit={handleSearch}
          className="search-form"
        >
          <div className="search-input-wrapper">
            <Search size={20} />

            <input
              type="text"
              placeholder="Search jobs by title, company, or skills..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="search-input"
            />
          </div>

          <button
            type="submit"
            className="btn-search"
          >
            Search
          </button>
        </form>

        <div className="filters">
          <div className="filter-label">
            Filter by Source:
          </div>

          <div className="filter-buttons">
            {sources.map((source) => (
              <motion.button
                key={source}
                type="button"
                className={`filter-btn ${selectedSource === source
                    ? 'active'
                    : ''
                  }`}
                onClick={() =>
                  handleSourceChange(source)
                }
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {source === 'all'
                  ? 'All Sources'
                  : source.toUpperCase()}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {pagination && pagination.total > 0 && (
        <div className="results-info">
          <p>
            Showing{' '}
            <strong>
              {(page - 1) * limit + 1}-
              {Math.min(
                page * limit,
                pagination.total
              )}
            </strong>{' '}
            of{' '}
            <strong>
              {pagination.total}
            </strong>{' '}
            jobs
            {searchQuery &&
              ` for "${searchQuery}"`}
          </p>
        </div>
      )}

      {error && (
        <motion.div
          className="error-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p>Error: {error}</p>

          <button onClick={fetchJobs}>
            Try Again
          </button>
        </motion.div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="loader"></div>
          <p>Loading jobs...</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <motion.div
          className="jobs-grid"
          initial="hidden"
          animate="visible"
        >
          {jobs.map((job) => (
            <motion.div
              key={job._id || job.jobId}
              className="job-card"
            >
              <div className="job-header">
                <div className="job-title-section">
                  <h3 className="job-title">
                    {job.title}
                  </h3>

                  <span className="source-badge">
                    {job.source?.toUpperCase() ||
                      'UNKNOWN'}
                  </span>
                </div>
              </div>

              <div className="job-company">
                <Building2 size={16} />

                <span>
                  {job.company ||
                    'Company Unknown'}
                </span>
              </div>

              {job.location && (
                <div className="job-location">
                  <MapPin size={16} />

                  <span>
                    {job.location}
                  </span>
                </div>
              )}

              {job.jobType && (
                <div className="job-type">
                  <Briefcase size={16} />

                  <span>
                    {job.jobType}
                  </span>
                </div>
              )}

              {job.salary && (
                <div className="job-salary">
                  💰 {job.salary}
                </div>
              )}

              <p className="job-description">
                {job.description?.substring(0, 120)}

                {job.description?.length > 120
                  ? '...'
                  : ''}
              </p>

              <div className="job-footer">
                <span className="job-date">
                  {job.scrapedAt
                    ? new Date(
                      job.scrapedAt
                    ).toLocaleDateString()
                    : 'Unknown date'}
                </span>

                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="job-link"
                  >
                    <span>View Job</span>

                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading &&
        jobs.length === 0 &&
        !error && (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="empty-icon">
              📭
            </div>

            <h3>No jobs found</h3>

            <p>
              {searchQuery
                ? `No jobs match your search for "${searchQuery}".`
                : 'Start by scraping jobs to see them here.'}
            </p>
          </motion.div>
        )}

      {pagination &&
        pagination.pages > 1 && (
          <motion.div
            className="pagination"
            initial={{
              opacity: 0,
              y: 20
            }}
            animate={{
              opacity: 1,
              y: 0
            }}
          >
            <button
              className="btn-page"
              onClick={() =>
                setPage((p) =>
                  Math.max(1, p - 1)
                )
              }
              disabled={page === 1}
            >
              ← Previous
            </button>

            <span>
              Page {page} of {pagination.pages}
            </span>

            <button
              className="btn-page"
              onClick={() =>
                setPage((p) =>
                  Math.min(
                    pagination.pages,
                    p + 1
                  )
                )
              }
              disabled={
                page === pagination.pages
              }
            >
              Next →
            </button>
          </motion.div>
        )}
    </motion.div>
  );
}

export default JobsViewer;