import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {

  const { auth } = useAuth();
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!auth.accessToken) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/alerts/`);

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

    ws.onerror = () => {
      console.log("WebSocket error");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
    };

    setSocket(ws);

    return () => ws.close();

  }, [auth.accessToken]);

  return (
    <SocketContext.Provider value={{ socket, alerts, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);