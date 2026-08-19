import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Radio } from 'lucide-react';
import './Navbar.css';

function Navbar({ apiHealth }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="navbar">
      <div className="navbar-container">

        <Link to="/" className="navbar-brand">
          <div className="logo-icon">🔍</div>
          <span>JobScraper</span>
        </Link>

        <button
          className="menu-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </button>

        <div
          className={`navbar-menu ${isOpen ? 'active' : ''
            }`}
        >
          <Link
            to="/"
            className="nav-link"
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </Link>

          <Link
            to="/scraper"
            className="nav-link"
            onClick={() => setIsOpen(false)}
          >
            Scraper
          </Link>

          <Link
            to="/jobs"
            className="nav-link"
            onClick={() => setIsOpen(false)}
          >
            Jobs
          </Link>
        </div>

        <div className="navbar-status">
          <div
            className={`status-indicator ${apiHealth
                ? 'healthy'
                : 'unhealthy'
              }`}
          >
            <Radio size={12} />

            <span>
              {apiHealth
                ? 'API Online'
                : 'API Offline'}
            </span>
          </div>
        </div>

      </div>
    </nav>
  );
}

export default Navbar;