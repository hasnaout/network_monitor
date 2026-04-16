import React, { useState, useEffect } from "react";
import "./header.css";

const navItems = [
  { href: "#/", label: "Dashboard" },
  { href: "#/machines/new", label: "Machines" },
];

export default function Header({ auth, onLogout, route }) {
  const isAuthenticated = Boolean(auth?.accessToken);
  const currentRoute = route || window.location.hash || "#/";

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);


  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`site-header ${scrolled ? "scrolled" : ""}`}>

      <div className="site-header__left">
        <a className="brand" href="#/">
          <img src="/assets/logo.png" alt="logo" />
          <h1>Network Monitor</h1>
        </a>
      </div>

      <nav className={`top-nav ${menuOpen ? "open" : ""}`}>
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={currentRoute === item.href ? "nav-link active" : "nav-link"}
            onClick={() => setMenuOpen(false)}
          >
            {item.label}
          </a>
        ))}

        {isAuthenticated ? (
          <button className="nav-action" onClick={onLogout}>
            Se déconnecter
          </button>
        ) : (
          <a
            href="#/connexion"
            className={currentRoute === "#/connexion" ? "nav-link active" : "nav-link"}
            onClick={() => setMenuOpen(false)}
          >
            Connexion
          </a>
        )}
      </nav>

      <div
        className={`burger ${menuOpen ? "active" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>
    </header>
  );
}