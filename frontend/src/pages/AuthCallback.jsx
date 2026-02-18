import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    localStorage.setItem('token', token);
    api
      .get('/auth/me')
      .then((res) => {
        login(token, res.user);
        navigate('/');
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login');
      });
  }, [token, login, navigate]);

  return <div className="text-center py-5">Completing sign in...</div>;
}
