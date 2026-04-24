import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContect';
import { LoadingProvider } from './context/LoadingContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Connexion from "./pages/login/connexion.js";
import Home from "./pages/dashboard/home.js";
import Devices from "./pages/devices/devices.js";
import DeviceDetail from "./pages/devices/deviceDetail.js";
import Alerts from "./pages/alerts/alerts.js";

function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/connexion" element={<Connexion />} />
              <Route path="/" element={  <ProtectedRoute>  <Home />  </ProtectedRoute>} />
              <Route path="/devices" element={  <ProtectedRoute>  <Devices /></ProtectedRoute>} />
              <Route path="/devices/:id" element={<ProtectedRoute>  <DeviceDetail /></ProtectedRoute>  } />
              <Route path="/alerts" element={  <ProtectedRoute>    <Alerts />    </ProtectedRoute>  } />
              <Route path="*" element={<Navigate to="/connexion" />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </LoadingProvider>
    </AuthProvider>
  );
}

export default App;