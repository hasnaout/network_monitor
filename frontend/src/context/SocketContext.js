import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { API_URL } from '../services/api';

const SocketContext = createContext();

export function SocketProvider({ children }) {

  const { auth } = useAuth();
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

useEffect(() => {
  if (!auth.accessToken) return;

  let reconnectTimer;
  let closedByCleanup = false;

  const baseWsUrl = process.env.REACT_APP_WS_URL
    || API_URL.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/alerts/';
  const separator = baseWsUrl.includes('?') ? '&' : '?';
  const wsUrl = `${baseWsUrl}${separator}token=${encodeURIComponent(auth.accessToken)}`;
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    console.log("WebSocket connected");
    setConnected(true);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    setAlerts((prev) => {
      const exists = prev.some(a => a.id === data.id);
      if (exists) return prev;
      // Add new alert at the beginning for real-time display
      return [data, ...prev];
    });
  };

  ws.onerror = (e) => {
    console.error("WebSocket error", e);
  };

  ws.onclose = () => {
    console.log("WebSocket disconnected");
    setConnected(false);
    setSocket(null);

    if (!closedByCleanup && auth.accessToken) {
      reconnectTimer = setTimeout(() => {
        setReconnectAttempt((attempt) => attempt + 1);
      }, 3000);
    }
  };

  setSocket(ws);
  return () => {
    closedByCleanup = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  };

}, [auth.accessToken, reconnectAttempt]);

  return (
    <SocketContext.Provider value={{ socket, alerts, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
