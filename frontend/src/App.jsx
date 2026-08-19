import React, {
  useState,
  useEffect
} from 'react';

import {
  BrowserRouter as Router,
  Routes,
  Route
} from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Scraper from './pages/Scraper';
import JobsViewer from './pages/JobsViewer';
import Navbar from './components/Navbar';

import './App.css';

function App() {
  const [apiHealth, setApiHealth] =
    useState(null);

  const API_URL =
    process.env.REACT_APP_API_URL ||
    'http://localhost:5000';

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/health`
        );

        setApiHealth(response.ok);
      } catch (error) {
        console.error(
          'API health check failed:',
          error
        );

        setApiHealth(false);
      }
    };

    checkHealth();

    const interval = setInterval(
      checkHealth,
      30000
    );

    return () =>
      clearInterval(interval);
  }, [API_URL]);

  return (
    <Router>
      <div className="app">

        <Navbar
          apiHealth={apiHealth}
        />

        <div className="app-content">
          <Routes>

            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/scraper"
              element={<Scraper />}
            />

            <Route
              path="/jobs"
              element={<JobsViewer />}
            />

          </Routes>
        </div>

      </div>
    </Router>
  );
}

export default App;