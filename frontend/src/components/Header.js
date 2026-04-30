import React, { useState } from 'react';
import { FiHome, FiServer, FiBell, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import './Header.css';

import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function Header() {

  const { logout } = useAuth();
  const { alerts = [] } = useSocket();
  const unreadAlerts = alerts.length;

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
          <div className='logo-icon'>
            <img
              src={`${process.env.PUBLIC_URL}/logo.png`}
              alt="NetworkMonitor"
              className="logo-img"
            />
          </div>

          <div className="logo-text">
            <img
              src={`${process.env.PUBLIC_URL}/logo2.png`}
              alt="NetworkMonitor"
              className="logo-img2"
            />
          </div>
        </div>
        <nav className={`header-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`}>

          <NavLink to="/" className="nav-link" onClick={closeMobileMenu}>
            <FiHome className="nav-icon" />
            Dashboard
          </NavLink>

          <NavLink to="/devices" className="nav-link" onClick={closeMobileMenu}>
            <FiServer className="nav-icon" />
            Équipements
          </NavLink>

          <NavLink to="/alerts" className="nav-link" onClick={closeMobileMenu}>
            <FiBell className="nav-icon" />
            Alertes
            {unreadAlerts > 0 && (
              <span className="alert-badge">
                {unreadAlerts}
              </span>
            )}

          </NavLink>

        </nav>
        <div className="header-actions">

          <button className="logout-btn" onClick={logout}>
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