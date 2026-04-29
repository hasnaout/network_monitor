import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { API_URL } from '../services/api';

const SocketContext = createContext();

export function SocketProvider({ children }) {

  const { auth } = useAuth();
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);

useEffect(() => {
  if (!auth.accessToken) return;

  const wsUrl = process.env.REACT_APP_WS_URL
    || API_URL.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/alerts/';
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
      return [data, ...prev];
    });
  };

  ws.onerror = (e) => {
    console.log("WebSocket error", e);
  };

  ws.onclose = () => {
    console.log("WebSocket disconnected");
    setConnected(false);
  };

  setSocket(ws);
  return () => {
    ws.close();
  };

}, [auth.accessToken]);
  return (
    <SocketContext.Provider value={{ socket, alerts, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
