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

  // Refund and cancellation states
  const [isRefundMode, setIsRefundMode] = useState(false);
  const [refundQuantities, setRefundQuantities] = useState({}); // { detailId: quantity }
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [isCancelConfirm, setIsCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

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
    setIsRefundMode(false);
    setRefundQuantities({});
    setRefundReason('');
    setIsCancelConfirm(false);
    setCancelReason('');
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundReason.trim()) {
      alert('Por favor ingresa un motivo para el reembolso.');
      return;
    }

    const items = Object.entries(refundQuantities)
      .map(([detailId, qty]) => ({
        sale_detail_id: parseInt(detailId),
        quantity: parseFloat(qty),
      }))
      .filter(item => item.quantity > 0);

    if (items.length === 0) {
      alert('Debes seleccionar al menos un artículo para reembolsar.');
      return;
    }

    setSubmittingRefund(true);
    try {
      const res = await api.post(`/sales/${selectedSale.id}/refund`, {
        reason: refundReason,
        items: items,
      });
      alert(res.data.message || 'Reembolso procesado correctamente.');
      
      // Actualizar localmente y recargar
      setSaleDetail(res.data.sale);
      setSelectedSale(res.data.sale);
      setIsRefundMode(false);
      setRefundQuantities({});
      setRefundReason('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al procesar el reembolso.');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      alert('Por favor ingresa un motivo para la cancelación.');
      return;
    }

    setSubmittingCancel(true);
    try {
      const res = await api.post(`/sales/${selectedSale.id}/cancel`, {
        reason: cancelReason,
      });
      alert(res.data.message || 'Venta cancelada correctamente.');
      
      setSaleDetail(res.data.sale);
      setSelectedSale(res.data.sale);
      setIsCancelConfirm(false);
      setCancelReason('');
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al cancelar la venta.');
    } finally {
      setSubmittingCancel(false);
    }
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
                      <tr key={s.id} style={{ cursor: 'pointer', opacity: s.status === 'cancelada' ? 0.65 : 1 }} onClick={() => openSaleDetail(s)}>
                        <td><code>{s.ticket_number}</code></td>
                        <td style={{ fontSize: 12 }}>{new Date(s.created_at).toLocaleString('es-MX')}</td>
                        <td>{s.user?.name || '—'}</td>
                        <td>{s.client?.name || 'General'}</td>
                        <td style={{ fontWeight: 600, textDecoration: s.status === 'cancelada' ? 'line-through' : 'none' }}>${Number(s.total).toFixed(2)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {s.status === 'cancelada' && (
                              <span style={{
                                fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                                background: 'rgba(239,68,68,0.12)', color: 'var(--danger)',
                              }}>Cancelada</span>
                            )}
                            <span style={{
                              fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                              background: badge.bg, color: badge.color,
                            }}>{badge.label}</span>
                          </div>
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
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: selectedSale.status === 'cancelada' ? 'var(--danger)' : 'var(--primary)', textDecoration: selectedSale.status === 'cancelada' ? 'line-through' : 'none' }}>
                  ${Number(selectedSale.total).toFixed(2)}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {selectedSale.status === 'cancelada' ? (
                    <span style={{
                      fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                      background: 'rgba(239,68,68,0.12)', color: 'var(--danger)',
                    }}>Cancelada</span>
                  ) : (saleDetail?.details || []).some(d => Number(d.refunded_quantity) > 0) ? (
                    <span style={{
                      fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                      background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
                    }}>Devolución Parcial</span>
                  ) : (
                    <span style={{
                      fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                      background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                    }}>Completada</span>
                  )}
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
            </div>

            {loadingDetail ? (
              <div className="loader"><div className="spinner" /></div>
            ) : isRefundMode && saleDetail ? (
              /* ── MODO REEMBOLSO PARCIAL ── */
              <form onSubmit={handleRefundSubmit}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Selecciona piezas a reembolsar
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-hover)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)' }}>Producto</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', width: 100 }}>Disponible</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', width: 130 }}>Cantidad a Dev.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(saleDetail.details || []).map((item) => {
                        const maxQty = Number(item.quantity) - Number(item.refunded_quantity || 0);
                        const isKg = item.product?.unit === 'kg';
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                                {item.product_name || item.product?.name || '—'}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Precio unitario: ${Number(item.price).toFixed(2)}
                              </div>
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                              {maxQty.toFixed(isKg ? 3 : 0)} {item.product?.unit || 'pieza'}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <input
                                type="number"
                                step={isKg ? '0.001' : '1'}
                                min="0"
                                max={maxQty}
                                value={refundQuantities[item.id] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRefundQuantities(prev => ({
                                    ...prev,
                                    [item.id]: val === '' ? '' : Math.min(maxQty, Math.max(0, parseFloat(val) || 0))
                                  }));
                                }}
                                disabled={maxQty <= 0}
                                placeholder="0"
                                style={{ width: '90px', padding: '6px 8px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Motivo del Reembolso</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Ej: Producto dañado, cliente cambió de opinión, error en cobro, etc."
                    required
                  />
                </div>

                <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsRefundMode(false); setRefundQuantities({}); setRefundReason(''); }}>
                    Atrás
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#d97706', color: '#fff' }} disabled={submittingRefund}>
                    {submittingRefund ? 'Procesando...' : 'Confirmar Reembolso'}
                  </button>
                </div>
              </form>
            ) : isCancelConfirm && saleDetail ? (
              /* ── MODO CONFIRMAR CANCELACIÓN TOTAL ── */
              <form onSubmit={handleCancelSubmit}>
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 10, padding: '14px 16px', marginBottom: 20, color: 'var(--danger)',
                  fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  <strong style={{ fontSize: 14 }}>⚠️ Confirmar Cancelación de Venta</strong>
                  Esta acción es irreversible. Se reintegrará todo el stock al inventario, se restará el monto total de la caja chica y se anulará la venta.
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Motivo de la Cancelación</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Ej: Error al ingresar productos, cliente canceló la compra antes de llevarla, etc."
                    required
                  />
                </div>

                <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => { setIsCancelConfirm(false); setCancelReason(''); }}>
                    Atrás
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={submittingCancel}>
                    {submittingCancel ? 'Cancelando...' : 'Confirmar Cancelación'}
                  </button>
                </div>
              </form>
            ) : saleDetail ? (
              /* ── DETALLE ESTÁNDAR DE LA VENTA ── */
              <>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Productos vendidos
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-hover)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)' }}>Producto</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', width: 80 }}>Cantidad</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', width: 90 }}>Precio</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', width: 90 }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(saleDetail.details || []).map((item, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13, textDecoration: Number(item.quantity) === Number(item.refunded_quantity) ? 'line-through' : 'none' }}>
                              {item.product_name || item.product?.name || '—'}
                            </div>
                            {item.product?.code && (
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.product.code}</div>
                            )}
                            {Number(item.discount) > 0 && (
                              <div style={{ fontSize: 11, color: 'var(--danger)' }}>Desc: -${Number(item.discount).toFixed(2)}</div>
                            )}
                            {Number(item.refunded_quantity) > 0 && (
                              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <span>↩ devueltos: {Number(item.refunded_quantity).toFixed(item.product?.unit === 'kg' ? 3 : 0)}</span>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                            {Number(item.quantity).toFixed(item.product?.unit === 'kg' ? 3 : 0)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, color: 'var(--text-primary)' }}>
                            ${Number(item.price).toFixed(2)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textDecoration: Number(item.quantity) === Number(item.refunded_quantity) ? 'line-through' : 'none' }}>
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
                  {saleDetail.cancel_reason && (
                    <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,0.06)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.15)', marginTop: 4 }}>
                      <strong>Motivo de Cancelación:</strong> {saleDetail.cancel_reason}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2 }}>
                    <span>Total</span>
                    <span style={{ color: selectedSale.status === 'cancelada' ? 'var(--danger)' : 'var(--primary)', fontSize: 18, textDecoration: selectedSale.status === 'cancelada' ? 'line-through' : 'none' }}>
                      ${Number(saleDetail.total).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Acciones de Reembolso/Cancelación */}
                <div className="modal-actions" style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={closeSaleDetail}>
                    <X size={14}/> Cerrar
                  </button>
                  
                  {selectedSale.status !== 'cancelada' && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => { setIsRefundMode(true); setRefundQuantities({}); setRefundReason(''); }}
                        style={{ marginLeft: 'auto', border: '1px solid #f59e0b', color: '#d97706', background: 'rgba(245,158,11,0.05)' }}
                      >
                        Reembolsar Artículos
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => { setIsCancelConfirm(true); setCancelReason(''); }}
                      >
                        Cancelar Venta
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                No se pudo cargar el detalle de la venta.
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
