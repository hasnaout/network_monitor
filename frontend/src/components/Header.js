import React, { useState } from 'react';
import { FiHome, FiServer, FiBell, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import './Header.css';

export default function Header({ onLogout }) {

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="app-header">

      <div className="header-container">

        {/* LOGO */}
        <div className="header-logo">

          <div className="logo-icon">
            <img
              src={`${process.env.PUBLIC_URL}/logo.png`}
              alt="NetworkMonitor"
              className="logo-img"
            />
          </div>

          <div className="logo-text">
            <h1>NetworkMonitor</h1>
            <span>Surveillance Infrastructure</span>
          </div>

        </div>

        {/* NAV */}
        <nav className={`header-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>

          <NavLink
            to="/"
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            onClick={closeMobileMenu}
          >
            <FiHome className="nav-icon" />
            Dashboard
          </NavLink>

          <NavLink
            to="/devices"
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            onClick={closeMobileMenu}
          >
            <FiServer className="nav-icon" />
            Équipements
          </NavLink>

          <NavLink
            to="/alerts"
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            onClick={closeMobileMenu}
          >
            <FiBell className="nav-icon" />
            Alertes
          </NavLink>

        </nav>

        {/* ACTIONS */}
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