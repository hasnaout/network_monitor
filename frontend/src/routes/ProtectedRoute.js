import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {

  const { auth } = useAuth();

  // 🔵 loading safe check (évite flash redirect)
  if (auth.accessToken === undefined) {
    return null; // ou spinner
  }

  // 🔴 not logged in
  if (!auth.accessToken) {
    return <Navigate to="/connexion" replace />;
  }

  return children;
}