import { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Connexion from "./pages/login/connexion.js";
import Home from "./pages/dashboard/home.js";
import Devices from "./pages/devices/devices.js";
import DeviceDetail from "./pages/devices/deviceDetail.js";
import Alerts from "./pages/alerts/alerts.js";

import { createAlertSocket } from './services/socket';
import { getDevices } from './services/devicesService';

function App() {

  // ---------------- STATES ----------------
  const [auth, setAuth] = useState(() => ({
    accessToken: localStorage.getItem('access_token') || '',
  }));

  const [devices, setDevices] = useState([]);

  // ---------------- FETCH DEVICES ----------------
  useEffect(() => {
    if (!auth.accessToken) return;

    getDevices(auth.accessToken)
      .then(setDevices)
      .catch(err => console.error(err));
  }, [auth.accessToken]);

  // ---------------- WEBSOCKET ALERTS ----------------
  useEffect(() => {
    if (!auth.accessToken) return;

    const socket = createAlertSocket(auth.accessToken, (alert) => {
      console.log("New alert:", alert);
      // ici tu peux appeler notification
    });

    return () => socket.close();
  }, [auth.accessToken]);

  // ---------------- ROUTER ----------------
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/" element={<Home />} />
        <Route   path="/devices" element={<Devices devices={devices} />}/>
        <Route path="/devices/:id" element={<DeviceDetail />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="*" element={<Navigate to="/connexion" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;