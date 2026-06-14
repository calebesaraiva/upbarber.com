import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { unwrap } from '../services/api';
import { masterLogin } from '../services/master.service';
import { homeForRole } from '../utils/access';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [barbershop, setBarbershop] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('upbarber:token');
    if (token) {
      authService.me()
        .then(res => {
          const data = unwrap(res.data);
          setUser(data.user);
          setBarbershop(data.barbershop);
        })
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authService.login(email, password);
      const data = unwrap(res.data);
      localStorage.removeItem('masterToken');
      localStorage.setItem('upbarber:token', data.accessToken);
      localStorage.setItem('upbarber:refreshToken', data.refreshToken);
      setUser(data.user);
      setBarbershop(data.user?.barbershop || data.barbershop);
      navigate(homeForRole(data.user?.role));
      return { type: 'barbershop', user: data.user };
    } catch (normalError) {
      try {
        const res = await masterLogin({ email, password });
        const data = unwrap(res.data);
        localStorage.removeItem('upbarber:token');
        localStorage.removeItem('upbarber:refreshToken');
        localStorage.removeItem('upbarber:branchId');
        localStorage.setItem('masterToken', data.token);
        setUser(null);
        setBarbershop(null);
        navigate('/master');
        return { type: 'master', admin: data.admin };
      } catch {
        throw normalError;
      }
    }
  };

  const logout = async () => {
    const refresh = localStorage.getItem('upbarber:refreshToken');
    await authService.logout(refresh).catch(() => {});
    localStorage.clear();
    setUser(null);
    setBarbershop(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, barbershop, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
