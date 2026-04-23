import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {

  const { auth } = useAuth();
  const [socket, setSocket] = useState(null);

useEffect(() => {
  if (!auth.accessToken) return;

  const ws = new WebSocket(`ws://localhost:8000/ws/alerts/`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("NEW ALERT", data);
  };

  setSocket(ws);

  return () => ws.close();
}, [auth.accessToken]);
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);