import { Navigate } from 'react-router-dom';
import MasterAdminPanel from './MasterAdminPanel';

export default function MasterRoute() {
  const token = localStorage.getItem('masterToken');
  return token ? <MasterAdminPanel /> : <Navigate to="/login" replace />;
}
