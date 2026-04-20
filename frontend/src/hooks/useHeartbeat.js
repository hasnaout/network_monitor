// hooks/useHeartbeat.js
import { useState, useEffect } from 'react';

export function useHeartbeat(intervalMs = 30000) {
  const [postes, setPostes] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const res = await fetch('/api/heartbeat/postes');
      const data = await res.json();
      setPostes(data);
      setLastUpdate(new Date());
    };

    fetch();
    const timer = setInterval(fetch, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return { postes, lastUpdate };
}