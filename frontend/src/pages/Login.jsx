import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/' : '/pos');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <ShoppingCart size={40} color="var(--accent)" />
        </div>
        <h1 className="login-title">SICAR POS</h1>
        <p className="login-subtitle">Sistema de Punto de Venta</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Correo electrónico</label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@sicar.pos"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              id="login-password"
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            id="login-submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
        <div style={{ marginTop: 24, padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text-muted)' }}>
          <strong>Demo:</strong><br />
          Admin: admin@sicar.pos / admin123<br />
          Cajero: cajero@sicar.pos / cajero123
        </div>
      </div>
    </div>
  );
}
