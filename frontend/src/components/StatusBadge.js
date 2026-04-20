function getStatus(lastSeenIso) {
  const diff = (Date.now() - new Date(lastSeenIso)) / 1000; // en secondes
  if (diff < 90)  return 'ok';     // connecté
  if (diff < 120) return 'warn';   // en attente
  return 'err';                    // déconnecté
}