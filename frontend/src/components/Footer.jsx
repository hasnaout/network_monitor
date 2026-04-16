function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <p className="eyebrow">Network Monitor</p>
        <h3>Un front plus clair pour suivre, presenter et administrer votre reseau.</h3>
        <p>
          Dashboard, inventaire et administration ont ete repenses pour offrir une lecture
          plus premium et plus immediate.
        </p>
      </div>

      <div className="footer-meta">
        <h4>Navigation</h4>
        <div className="footer-links">
          <a href="#/">Dashboard</a>
          <a href="#/machines/new">Machines</a>
          <a href="#/connexion">Connexion</a>
        </div>
      </div>

      <div className="footer-meta">
        <h4>Plateforme</h4>
        <p>Support : support@networkmonitor.com</p>
        <p>Environnement : supervision reseau</p>
        <p>{currentYear} Network Monitor</p>
      </div>
    </footer>
  )
}

export default Footer
