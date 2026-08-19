import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Database, Zap, AlertCircle } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [scraperStats, setScraperStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [jobsRes, scraperRes] = await Promise.all([
          fetch(`${API_URL}/api/jobs/stats`),
          fetch(`${API_URL}/api/scraper/stats`)
        ]);

        if (!jobsRes.ok || !scraperRes.ok) throw new Error('Failed to fetch stats');

        const jobsData = await jobsRes.json();
        const scraperData = await scraperRes.json();

        setStats(jobsData);
        setScraperStats(scraperData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [API_URL]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="dashboard"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="dashboard-header">
        <h1>Scraper Dashboard</h1>
        <p>Real-time job scraping statistics and insights</p>
      </div>

      {error && (
        <motion.div className="alert alert-error" variants={cardVariants}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </motion.div>
      )}

      <motion.div className="stats-grid" variants={containerVariants}>
        {/* Total Jobs Card */}
        <motion.div className="stat-card" variants={cardVariants}>
          <div className="stat-icon database">
            <Database size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Jobs</h3>
            <p className="stat-number">{stats?.totalJobs || 0}</p>
            <span className="stat-label">Indexed in database</span>
          </div>
        </motion.div>

        {/* Total Requests Card */}
        <motion.div className="stat-card" variants={cardVariants}>
          <div className="stat-icon trending">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>API Requests</h3>
            <p className="stat-number">{scraperStats?.totalRequests || 0}</p>
            <span className="stat-label">Total requests made</span>
          </div>
        </motion.div>

        {/* Block Detection Card */}
        <motion.div className="stat-card" variants={cardVariants}>
          <div className="stat-icon warning">
            <Zap size={24} />
          </div>
          <div className="stat-content">
            <h3>Block Rate</h3>
            <p className="stat-number">{scraperStats?.blockRate || '0%'}</p>
            <span className="stat-label">Detection events</span>
          </div>
        </motion.div>

        {/* Last Update Card */}
        <motion.div className="stat-card" variants={cardVariants}>
          <div className="stat-icon info">
            <div className="info-icon">📅</div>
          </div>
          <div className="stat-content">
            <h3>Last Updated</h3>
            <p className="stat-time">
              {stats?.lastUpdated
                ? new Date(stats.lastUpdated).toLocaleString()
                : 'Never'}
            </p>
            <span className="stat-label">Most recent scrape</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Sources Breakdown */}
      {stats?.bySource && stats.bySource.length > 0 && (
        <motion.div className="sources-section" variants={cardVariants}>
          <h2>Jobs by Source</h2>
          <div className="sources-grid">
            {stats.bySource.map((source, idx) => (
              <motion.div
                key={source._id}
                className="source-card"
                variants={cardVariants}
                custom={idx}
              >
                <div className="source-header">
                  <h4>{source._id}</h4>
                  <span className="source-count">{source.count}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(source.count / stats.totalJobs) * 100}%`
                    }}
                  ></div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Top Locations */}
      {stats?.topLocations && stats.topLocations.length > 0 && (
        <motion.div className="locations-section" variants={cardVariants}>
          <h2>Top Job Locations</h2>
          <div className="locations-list">
            {stats.topLocations.slice(0, 8).map((location, idx) => (
              <motion.div
                key={location._id}
                className="location-item"
                variants={cardVariants}
                custom={idx}
              >
                <span className="location-name">{location._id || 'Unknown'}</span>
                <span className="location-count">{location.count}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Scraper Health */}
      <motion.div className="health-section" variants={cardVariants}>
        <h2>Scraper Health</h2>
        <div className="health-grid">
          <div className="health-item">
            <span>Status</span>
            <span className="health-value">🟢 Operational</span>
          </div>
          <div className="health-item">
            <span>Detection Avoidance</span>
            <span className="health-value">✓ Active</span>
          </div>
          <div className="health-item">
            <span>Uptime</span>
            <span className="health-value">
              {scraperStats?.uptime
                ? `${Math.floor(scraperStats.uptime / 60)}m`
                : '-'}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default Dashboard;
