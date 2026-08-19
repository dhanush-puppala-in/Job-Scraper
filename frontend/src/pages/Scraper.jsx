import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import './Scraper.css';

function Scraper() {
  const [scrapeSource, setScrapeSource] = useState('public-api');
  const [isRunning, setIsRunning] = useState(false);
  const [activeScrapes, setActiveScrapes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  // IMPORTANT:
  // REACT_APP_API_URL is injected when Netlify builds the frontend.
  const API_URL = (
    process.env.REACT_APP_API_URL ||
    'http://localhost:5000'
  ).replace(/\/$/, '');

  const sources = [
    {
      id: 'public-api',
      label: 'Public Job API',
      description:
        'Scrape from publicly available APIs (no ToS violations)',
      risk: 'low'
    },
    {
      id: 'rss',
      label: 'RSS Feeds',
      description: 'Aggregate from public RSS feeds',
      risk: 'low'
    }
  ];

  const addLog = (message, type = 'info') => {
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        message,
        type,
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ].slice(0, 50));
  };

  /**
   * Read backend response safely.
   * This is useful when Railway returns JSON, plain text,
   * or an HTML error page.
   */
  const readResponse = async (response) => {
    const contentType =
      response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await response.json();
    }

    const text = await response.text();

    return {
      message: text || `HTTP ${response.status}`
    };
  };

  /**
   * Poll scraper status
   */
  const pollScrapeStatus = async (scrapeId) => {
    const maxAttempts = 120;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/scraper/status/${scrapeId}`
        );

        const data = await readResponse(response);

        if (!response.ok) {
          throw new Error(
            data?.message ||
            data?.error ||
            `Status request failed with HTTP ${response.status}`
          );
        }

        setActiveScrapes((prev) => {
          const exists = prev.some(
            (scrape) => scrape.scrapeId === scrapeId
          );

          if (!exists) {
            return [...prev, data];
          }

          return prev.map((scrape) =>
            scrape.scrapeId === scrapeId
              ? data
              : scrape
          );
        });

        if (data.status === 'completed') {
          addLog(
            `Scrape completed! Scraped ${data.jobsScraped || 0} jobs`,
            'success'
          );

          setIsRunning(false);
          return;
        }

        if (data.status === 'failed') {
          const backendError =
            data.error || 'Scrape failed on the backend';

          addLog(
            `Scrape failed: ${backendError}`,
            'error'
          );

          setError(backendError);
          setIsRunning(false);
          return;
        }

        if (attempts < maxAttempts) {
          attempts += 1;
          setTimeout(poll, 1000);
        } else {
          addLog(
            'Scrape timed out while waiting for status.',
            'error'
          );

          setError(
            'Scrape timed out while waiting for the backend.'
          );

          setIsRunning(false);
        }
      } catch (err) {
        console.error('Polling error:', err);

        if (attempts < maxAttempts) {
          attempts += 1;
          setTimeout(poll, 1000);
        } else {
          addLog(
            `Unable to retrieve scrape status: ${err.message}`,
            'error'
          );

          setError(
            `Unable to retrieve scrape status: ${err.message}`
          );

          setIsRunning(false);
        }
      }
    };

    poll();
  };

  /**
   * Start scrape
   */
  const startScrape = async () => {
    try {
      setError(null);
      setIsRunning(true);

      addLog(
        `Starting scrape from ${scrapeSource}...`,
        'info'
      );

      addLog(
        `Backend: ${API_URL}`,
        'info'
      );

      const response = await fetch(
        `${API_URL}/api/scraper/start`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            source: scrapeSource
          })
        }
      );

      const data = await readResponse(response);

      console.log('Start scrape response:', {
        status: response.status,
        data
      });

      if (!response.ok) {
        const backendMessage =
          data?.message ||
          data?.error ||
          `Backend returned HTTP ${response.status}`;

        throw new Error(
          `${backendMessage} (HTTP ${response.status})`
        );
      }

      if (!data.scrapeId) {
        throw new Error(
          'Backend responded successfully but did not return a scrape ID.'
        );
      }

      addLog(
        `Scrape started successfully. ID: ${data.scrapeId}`,
        'success'
      );

      pollScrapeStatus(data.scrapeId);

    } catch (err) {
      console.error('Start scrape error:', err);

      const message =
        err?.message ||
        'Unable to connect to the backend.';

      setError(message);

      addLog(
        `Error: ${message}`,
        'error'
      );

      setIsRunning(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <motion.div
      className="scraper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="scraper-header">
        <h1>Scraper Control Panel</h1>

        <p>
          Configure and monitor job listing
          scraping operations
        </p>
      </div>

      <div className="scraper-layout">

        {/* Control Section */}
        <motion.div
          className="scraper-controls"
          initial={{
            opacity: 0,
            x: -20
          }}
          animate={{
            opacity: 1,
            x: 0
          }}
          transition={{
            delay: 0.2
          }}
        >
          <h2>Scrape Configuration</h2>

          <div className="control-section">
            <label>Data Source</label>

            <div className="source-selector">
              {sources.map((source) => (
                <motion.label
                  key={source.id}
                  className={`source-option ${
                    scrapeSource === source.id
                      ? 'selected'
                      : ''
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <input
                    type="radio"
                    name="source"
                    value={source.id}
                    checked={
                      scrapeSource === source.id
                    }
                    onChange={(e) =>
                      setScrapeSource(e.target.value)
                    }
                    disabled={isRunning}
                  />

                  <div className="source-info">
                    <div className="source-label">
                      {source.label}
                    </div>

                    <div className="source-desc">
                      {source.description}
                    </div>

                    <div
                      className={`risk-badge risk-${source.risk}`}
                    >
                      ✓ {source.risk.toUpperCase()} RISK
                    </div>
                  </div>
                </motion.label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="control-section">
            <label>Actions</label>

            <motion.button
              type="button"
              className={`btn-primary ${
                isRunning ? 'running' : ''
              }`}
              onClick={startScrape}
              disabled={isRunning}
              whileHover={
                !isRunning
                  ? { scale: 1.02 }
                  : {}
              }
              whileTap={
                !isRunning
                  ? { scale: 0.98 }
                  : {}
              }
            >
              {isRunning ? (
                <>
                  <Pause size={18} />
                  <span>
                    Scraping in Progress...
                  </span>
                </>
              ) : (
                <>
                  <Play size={18} />
                  <span>
                    Start Scrape
                  </span>
                </>
              )}
            </motion.button>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              className="error-banner"
              initial={{
                opacity: 0,
                y: -10
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
            >
              <AlertTriangle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Features */}
          <div className="features-section">
            <h3>
              Anti-Detection Features Enabled
            </h3>

            <ul className="features-list">
              <li>
                <CheckCircle size={16} />
                <span>User-Agent Rotation</span>
              </li>

              <li>
                <CheckCircle size={16} />
                <span>Request Rate Limiting</span>
              </li>

              <li>
                <CheckCircle size={16} />
                <span>Session Management</span>
              </li>

              <li>
                <CheckCircle size={16} />
                <span>Exponential Backoff</span>
              </li>

              <li>
                <CheckCircle size={16} />
                <span>Browser Header Spoofing</span>
              </li>

              <li>
                <CheckCircle size={16} />
                <span>Resilience Mode Fallback</span>
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Monitoring Section */}
        <motion.div
          className="scraper-monitor"
          initial={{
            opacity: 0,
            x: 20
          }}
          animate={{
            opacity: 1,
            x: 0
          }}
          transition={{
            delay: 0.2
          }}
        >

          {/* Active Scrapes */}
          {activeScrapes.length > 0 && (
            <div className="active-scrapes">
              <h2>Active Scrapes</h2>

              {activeScrapes.map((scrape) => (
                <motion.div
                  key={scrape.scrapeId}
                  className={`scrape-item status-${scrape.status}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="scrape-status-icon">
                    {scrape.status === 'running' && (
                      <div className="spinner-small"></div>
                    )}

                    {scrape.status === 'completed' && (
                      <CheckCircle size={20} />
                    )}

                    {scrape.status === 'failed' && (
                      <AlertTriangle size={20} />
                    )}
                  </div>

                  <div className="scrape-details">
                    <div className="scrape-id">
                      ID:{' '}
                      {scrape.scrapeId
                        ? scrape.scrapeId.slice(0, 8)
                        : 'N/A'}
                    </div>

                    <div className="scrape-status">
                      {scrape.status
                        ? scrape.status.toUpperCase()
                        : 'UNKNOWN'}
                    </div>

                    {scrape.jobsScraped !== undefined && (
                      <div className="scrape-result">
                        ✓ Scraped {scrape.jobsScraped} jobs
                      </div>
                    )}

                    {scrape.error && (
                      <div className="scrape-error">
                        Error: {scrape.error}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Logs */}
          <div className="logs-container">
            <div className="logs-header">
              <h2>Live Logs</h2>

              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={clearLogs}
                disabled={logs.length === 0}
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="logs-view">
              {logs.length === 0 ? (
                <div className="logs-empty">
                  <Clock size={32} />

                  <p>
                    No logs yet. Start a scrape
                    to see activity.
                  </p>
                </div>
              ) : (
                logs.map((log) => (
                  <motion.div
                    key={log.id}
                    className={`log-entry log-${log.type}`}
                    initial={{
                      opacity: 0,
                      x: -10
                    }}
                    animate={{
                      opacity: 1,
                      x: 0
                    }}
                  >
                    <span className="log-time">
                      {log.timestamp}
                    </span>

                    <span className="log-message">
                      {log.message}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default Scraper;
