import { useState, useEffect } from 'react';
import api from '../api/axios';
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/dashboard')
      .then(res => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>
      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="flex-between">
              <span className="stat-label">Ventas Hoy</span>
              <ShoppingCart size={20} color="var(--accent)" />
            </div>
            <div className="stat-value stat-accent">${stats?.sales_total?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stats?.sales_count || 0} transacciones</div>
          </div>
          <div className="stat-card">
            <div className="flex-between">
              <span className="stat-label">Ganancia</span>
              <TrendingUp size={20} color="var(--success)" />
            </div>
            <div className="stat-value stat-success">${stats?.profit?.toLocaleString('es-MX', { minimumFractionDigits: 2 }) || '0.00'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ganancia neta del día</div>
          </div>
          <div className="stat-card">
            <div className="flex-between">
              <span className="stat-label">Ticket Promedio</span>
              <DollarSign size={20} color="var(--warning)" />
            </div>
            <div className="stat-value stat-warning">
              ${stats?.sales_count > 0 ? (stats.sales_total / stats.sales_count).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
            </div>
          </div>
          <div className="stat-card">
            <div className="flex-between">
              <span className="stat-label">Stock Bajo</span>
              <AlertTriangle size={20} color="var(--danger)" />
            </div>
            <div className="stat-value" style={{ color: stats?.low_stock_count > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
              {stats?.low_stock_count || 0}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Productos por reabastecer</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Productos Más Vendidos Hoy</span>
          </div>
          {stats?.top_products?.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Producto</th><th>Cantidad</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {stats.top_products.map((p, i) => (
                    <tr key={i}>
                      <td>{p.product_name}</td>
                      <td>{Number(p.total_qty).toFixed(2)}</td>
                      <td>${Number(p.total_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state"><p>Sin ventas hoy aún</p></div>
          )}
        </div>
      </div>
    </>
  );
}
