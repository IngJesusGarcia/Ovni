import { useState } from 'react';
import api from '../api/axios';
import Modal from '../components/common/Modal';
import { BarChart3, ShoppingCart, X, Receipt } from 'lucide-react';

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [from, setFrom] = useState(new Date().toISOString().split('T')[0]);
  const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sale detail modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetail, setSaleDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const endpoints = {
        sales: `/reports/sales?from=${from}&to=${to} 23:59:59`,
        users: `/reports/sales-by-user?from=${from}&to=${to} 23:59:59`,
        products: `/reports/top-products?from=${from}&to=${to} 23:59:59`,
        profits: `/reports/profits?from=${from}&to=${to} 23:59:59`,
      };
      const res = await api.get(endpoints[tab]);
      setData(res.data);
    } catch (err) {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const openSaleDetail = async (sale) => {
    setSelectedSale(sale);
    setSaleDetail(null);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/sales/${sale.id}`);
      setSaleDetail(res.data);
    } catch {
      setSaleDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeSaleDetail = () => {
    setSelectedSale(null);
    setSaleDetail(null);
  };

  const paymentBadgeColor = (type) => {
    const map = {
      efectivo: { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', label: 'Efectivo' },
      tarjeta:  { bg: 'rgba(56,189,248,0.12)', color: 'var(--primary)', label: 'Tarjeta' },
      transferencia: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', label: 'Transferencia' },
      mixto:    { bg: 'rgba(249,115,22,0.12)', color: '#f97316', label: 'Mixto' },
      credito:  { bg: 'rgba(239,68,68,0.12)', color: 'var(--danger)', label: 'Crédito' },
    };
    return map[type] || { bg: 'rgba(100,116,139,0.12)', color: 'var(--text-muted)', label: type };
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <span style={{ color: 'var(--text-muted)' }}>a</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
          <button className="btn btn-primary" onClick={load}><BarChart3 size={14} /> Generar</button>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[['sales', 'Ventas'], ['users', 'Por Usuario'], ['products', 'Top Productos'], ['profits', 'Ganancias']].map(([key, label]) => (
            <button key={key} className={`btn btn-sm ${tab === key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab(key); setData(null); }}>{label}</button>
          ))}
        </div>

        {loading && <div className="loader"><div className="spinner" /></div>}

        {!loading && data && tab === 'sales' && (
          <div className="card">
            <div className="stats-grid" style={{ marginBottom: 16 }}>
              <div className="stat-card"><span className="stat-label">Total Ventas</span><div className="stat-value stat-accent">${Number(data.summary?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div></div>
              <div className="stat-card"><span className="stat-label">Transacciones</span><div className="stat-value">{data.summary?.count || 0}</div></div>
              <div className="stat-card"><span className="stat-label">Promedio</span><div className="stat-value stat-warning">${Number(data.summary?.average || 0).toFixed(2)}</div></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Fecha</th>
                    <th>Cajero</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Pago</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.sales?.map(s => {
                    const badge = paymentBadgeColor(s.payment_type);
                    return (
                      <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => openSaleDetail(s)}>
                        <td><code>{s.ticket_number}</code></td>
                        <td style={{ fontSize: 12 }}>{new Date(s.created_at).toLocaleString('es-MX')}</td>
                        <td>{s.user?.name || '—'}</td>
                        <td>{s.client?.name || 'General'}</td>
                        <td style={{ fontWeight: 600 }}>${Number(s.total).toFixed(2)}</td>
                        <td>
                          <span style={{
                            fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                            background: badge.bg, color: badge.color,
                          }}>{badge.label}</span>
                        </td>
                        <td>
                          <button className="btn btn-icon btn-sm" title="Ver detalle" onClick={e => { e.stopPropagation(); openSaleDetail(s); }}>
                            <Receipt size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && tab === 'users' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Usuario</th><th>Ventas</th><th>Total</th></tr></thead>
                <tbody>
                  {data.map(u => (
                    <tr key={u.user_id}>
                      <td>{u.user?.name || `ID ${u.user_id}`}</td>
                      <td>{u.sales_count}</td>
                      <td style={{ fontWeight: 600 }}>${Number(u.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && tab === 'products' && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Producto</th><th>Cantidad</th><th>Ingresos</th><th>Ganancia</th></tr></thead>
                <tbody>
                  {data.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i + 1}</td>
                      <td>{p.product_name}</td>
                      <td>{Number(p.total_quantity).toFixed(2)}</td>
                      <td>${Number(p.total_revenue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      <td style={{ color: 'var(--success)' }}>${Number(p.total_profit).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && data && tab === 'profits' && (
          <div className="card">
            <div className="stats-grid" style={{ marginBottom: 16 }}>
              <div className="stat-card"><span className="stat-label">Ingresos Totales</span><div className="stat-value stat-accent">${Number(data.totals?.revenue || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div></div>
              <div className="stat-card"><span className="stat-label">Costo Total</span><div className="stat-value stat-warning">${Number(data.totals?.cost || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div></div>
              <div className="stat-card"><span className="stat-label">Ganancia Neta</span><div className="stat-value stat-success">${Number(data.totals?.profit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Fecha</th><th>Ventas</th><th>Ingresos</th><th>Costos</th><th>Ganancia</th></tr></thead>
                <tbody>
                  {data.daily?.map(d => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.sales_count}</td>
                      <td>${Number(d.revenue).toFixed(2)}</td>
                      <td>${Number(d.cost).toFixed(2)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>${Number(d.profit).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !data && <div className="empty-state"><BarChart3 size={48} /><p>Selecciona un rango de fechas y presiona Generar</p></div>}
      </div>

      {/* ── Modal Detalle de Venta ── */}
      <Modal isOpen={!!selectedSale} onClose={closeSaleDetail} title={null} width="580px">
        {selectedSale && (
          <div>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.04))',
              border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingCart size={22} color="var(--primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                  Ticket #{selectedSale.ticket_number}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {new Date(selectedSale.created_at).toLocaleString('es-MX')}
                  {selectedSale.user?.name && <> · {selectedSale.user.name}</>}
                  {selectedSale.client?.name && <> · Cliente: {selectedSale.client.name}</>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>
                  ${Number(selectedSale.total).toFixed(2)}
                </div>
                {(() => {
                  const badge = paymentBadgeColor(selectedSale.payment_type);
                  return (
                    <span style={{
                      fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                      background: badge.bg, color: badge.color,
                    }}>{badge.label}</span>
                  );
                })()}
              </div>
            </div>

            {/* Products detail */}
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Productos vendidos
            </div>

            {loadingDetail ? (
              <div className="loader"><div className="spinner" /></div>
            ) : saleDetail ? (
              <>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-hover)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Producto</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', width: 80 }}>Cantidad</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', width: 90 }}>Precio</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', width: 90 }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(saleDetail.details || []).map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                              {item.product_name || item.product?.name || '—'}
                            </div>
                            {item.product?.code && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.product.code}</div>
                            )}
                            {Number(item.discount) > 0 && (
                              <div style={{ fontSize: 11, color: 'var(--danger)' }}>Desc: -${Number(item.discount).toFixed(2)}</div>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                            {Number(item.quantity).toFixed(item.product?.unit === 'kg' ? 3 : 0)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: 'var(--text-primary)' }}>
                            ${Number(item.price).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                            ${Number(item.subtotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals summary */}
                <div style={{
                  marginTop: 12, padding: '12px 16px',
                  background: 'var(--bg-hover)', borderRadius: 10,
                  display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  {Number(saleDetail.discount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--danger)' }}>
                      <span>Descuento general</span>
                      <span>-${Number(saleDetail.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2 }}>
                    <span>Total</span>
                    <span style={{ color: 'var(--primary)', fontSize: 18 }}>${Number(saleDetail.total).toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                No se pudo cargar el detalle de la venta.
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={closeSaleDetail}><X size={14}/> Cerrar</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
