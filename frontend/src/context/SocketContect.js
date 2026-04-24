import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {

  const { auth } = useAuth();
  const [socket, setSocket] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!auth.accessToken) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/alerts/`);

    setSocket(ws); // ✅ IMPORTANT

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setAlerts(prev => [data, ...prev]);
    };

    return () => ws.close();

  }, [auth.accessToken]);

  return (
    <SocketContext.Provider value={{ socket, alerts }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);