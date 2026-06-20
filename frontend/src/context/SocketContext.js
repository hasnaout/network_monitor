import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {

  const { auth } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

useEffect(() => {
  if (!auth.accessToken) return;

  let reconnectTimer;
  let closedByCleanup = false;

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const baseWsUrl = process.env.REACT_APP_WS_URL
    || `${wsProtocol}//${window.location.host}/ws/alerts/`;
  const separator = baseWsUrl.includes('?') ? '&' : '?';
  const wsUrl = `${baseWsUrl}${separator}token=${encodeURIComponent(auth.accessToken)}`;
  const ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (error) {
      console.error("Invalid WebSocket alert payload", error);
      return;
    }

    if (!data?.id) return;

    setAlerts((prev) => {
      const exists = prev.some(a => a.id === data.id);
      if (exists) return prev;
      
      return [data, ...prev];
    });
  };

  ws.onerror = (e) => {
    console.error("WebSocket error", e);
  };

  ws.onclose = () => {
    if (!closedByCleanup && auth.accessToken) {
      reconnectTimer = setTimeout(() => {
        setReconnectAttempt((attempt) => attempt + 1);
      }, 3000);
    }
  };

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
    <SocketContext.Provider value={{ alerts }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
