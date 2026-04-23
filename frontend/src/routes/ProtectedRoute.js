import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { auth } = useAuth();
  if (!auth.accessToken) {
    return <Navigate to="/connexion" />;
  }
  return children;
}