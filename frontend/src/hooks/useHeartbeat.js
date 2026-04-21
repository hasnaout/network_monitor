// hooks/useHeartbeat.js
import { useState, useEffect } from 'react';

export function useHeartbeat(intervalMs = 30000) {
  const [postes, setPostes] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const fetchHeartbeats = async () => {
      try {
        const res = await fetch('/api/monitoring/');
        if (!res.ok) throw new Error('Failed to fetch heartbeats');
        const data = await res.json();
        setPostes(data);
        setLastUpdate(new Date());
      } catch (err) {
        console.error('Error fetching heartbeats:', err);
      }
    };

    fetchHeartbeats();
    const timer = setInterval(fetchHeartbeats, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return { postes, lastUpdate };
}