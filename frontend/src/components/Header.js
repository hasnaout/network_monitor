import React, { useState } from 'react';
import { FiHome, FiServer, FiBell, FiBarChart2, FiLogOut, FiShield, FiMenu, FiX } from 'react-icons/fi';
import './Header.css';

export default function Header({ currentRoute, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isActive = (route) => currentRoute === route || (route !== '#/' && currentRoute.startsWith(route));

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-logo">
          <div className="logo-icon">
            <FiShield />
          </div>
          <div className="logo-text">
            <h1>NetworkMonitor</h1>
            <span>Surveillance Infrastructure</span>
          </div>
        </div>

        <nav className={`header-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <a href="#/" className={`nav-link ${isActive('#/') ? 'active' : ''}`} onClick={closeMobileMenu}>
            <FiHome className="nav-icon" />
            Dashboard
          </a>
          <a href="#/devices" className={`nav-link ${isActive('#/devices') ? 'active' : ''}`} onClick={closeMobileMenu}>
            <FiServer className="nav-icon" />
            Équipements
          </a>
          <a href="#/alerts" className={`nav-link ${isActive('#/alerts') ? 'active' : ''}`} onClick={closeMobileMenu}>
            <FiBell className="nav-icon" />
            Alertes
          </a>
          <a href="#/reports" className={`nav-link ${isActive('#/reports') ? 'active' : ''}`} onClick={closeMobileMenu}>
            <FiBarChart2 className="nav-icon" />
            Rapports
          </a>
        </nav>

        <div className="header-actions">
          <button className="logout-btn" onClick={onLogout}>
            <FiLogOut className="logout-icon" />
            Déconnexion
          </button>

          <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>
    </header>
  );
}