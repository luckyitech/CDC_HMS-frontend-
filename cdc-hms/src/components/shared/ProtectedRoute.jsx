import { Navigate } from 'react-router-dom';
import { useUserContext } from '../../contexts/UserContext';

/**
 * Wraps a portal layout and ensures the logged-in user has the correct role.
 * If not authenticated → redirect to portal selector ("/").
 * If wrong role → redirect to portal selector ("/").
 *
 * requiredRole must match the lowercase DB role value:
 *   'staff' | 'doctor' | 'patient' | 'lab' | 'admin'
 */
const ProtectedRoute = ({ requiredRole, children }) => {
  const { currentUser } = useUserContext();

  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.role === 'admin') return children; // admin can access any portal
  if (currentUser.role !== requiredRole) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
