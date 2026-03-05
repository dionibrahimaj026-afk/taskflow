import { useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function TaskCounter() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user) {
      setStats(null);
      return;
    }
    const fetchStats = async () => {
      try {
        const data = await api.get('/tasks/stats');
        setStats(data);
      } catch {
        setStats(null);
      }
    };
    fetchStats();
    const onFocus = () => fetchStats();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user]);

  if (!user || !stats) return null;

  return (
    <Badge bg="secondary" className="ms-1" title={`${stats.done} done of ${stats.total} tasks`}>
      {stats.total} task{stats.total !== 1 ? 's' : ''}
    </Badge>
  );
}
