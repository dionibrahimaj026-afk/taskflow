const API_URL = '/api';

function getErrorMessage(err) {
  if (!err) return 'Request failed';
  if (typeof err.message === 'string') return err.message;
  if (typeof err.error === 'string') return err.error;
  return 'Request failed';
}

export const api = {
  async request(path, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
      });
    } catch (fetchErr) {
      throw { message: 'Cannot connect to server. Make sure the backend is running on port 5000.' };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = { status: res.status, ...data };
      err.message = getErrorMessage(err);
      throw err;
    }
    return { data, status: res.status };
  },
  get(path) {
    return this.request(path).then((r) => r.data);
  },
  post(path, body) {
    return this.request(path, { method: 'POST', body: JSON.stringify(body) }).then((r) => r.data);
  },
  put(path, body) {
    return this.request(path, { method: 'PUT', body: JSON.stringify(body) }).then((r) => r.data);
  },
  delete(path) {
    return this.request(path, { method: 'DELETE' }).then((r) => r.data);
  },
};
