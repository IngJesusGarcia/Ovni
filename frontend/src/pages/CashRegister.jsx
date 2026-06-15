import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import {
  DollarSign, Lock, ArrowUpCircle, ArrowDownCircle,
  FileSpreadsheet, Clock, TrendingUp, Activity,
  ChevronDown, ChevronUp, RefreshCw, AlertCircle
} from 'lucide-react';
import Modal from '../components/common/Modal';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const timeSince = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 60000);
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60); const m = diff % 60;
  return `${h}h ${m}m`;
};

export default function CashRegister() {
  const [current, setCurrent]           = useState(null);
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [report, setReport]             = useState(null);
  const [showOpen, setShowOpen]         = useState(false);
  const [showClose, setShowClose]       = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [movementType, setMovementType] = useState('ingreso');
  const [showMovements, setShowMovements] = useState(false);
  const [showSales, setShowSales]       = useState(false);
  const [exporting, setExporting]       = useState(false);
  const [form, setForm] = useState({ initial_amount: '', final_amount: '', notes: '', amount: '', description: '' });

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/cash-registers/current'),
      api.get('/cash-registers/history'),
    ]).then(([curr, hist]) => {
      const reg = curr.data.cash_register;
      setCurrent(reg);
      setHistory(hist.data.data || []);
      if (reg) {
        return api.get(`/cash-registers/${reg.id}/report`).then(r => setReport(r.data));
      }
      setReport(null);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openRegister = async () => {
    try {
      await api.post('/cash-registers/open', { initial_amount: parseFloat(form.initial_amount) || 0 });
      toast.success('✅ Caja abierta correctamente');
      setShowOpen(false);
      setForm(f => ({ ...f, initial_amount: '' }));
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error al abrir caja'); }
  };

  const closeRegister = async () => {
    try {
      await api.post(`/cash-registers/${current.id}/close`, { final_amount: parseFloat(form.final_amount), notes: form.notes });
      toast.success('🔒 Caja cerrada correctamente');
      setShowClose(false);
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error al cerrar caja'); }
  };

  const addMovement = async () => {
    const endpoint = movementType === 'ingreso' ? 'income' : 'withdrawal';
    try {
      await api.post(`/cash-registers/${current.id}/${endpoint}`, { amount: parseFloat(form.amount), description: form.description });
      toast.success(`${movementType === 'ingreso' ? '➕ Ingreso' : '➖ Retiro'} registrado`);
      setShowMovement(false);
      setForm(f => ({ ...f, amount: '', description: '' }));
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const exportCorte = async (id) => {
    setExporting(true);
    try {
      const res = await api.get(`/cash-registers/${id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `corte_caja_${id}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success('📥 Corte exportado');
    } catch { toast.error('Error al exportar'); }
    finally { setExporting(false); }
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  const summary = report?.summary;
  const movements = report?.movements || [];
  const sales = report?.sales || [];
  const diff = summary?.difference;

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />

      <div className="page-header">
        <h1 className="page-title">Control de Caja</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!current ? (
            <button className="btn btn-primary" id="btn-abrir-caja" onClick={() => setShowOpen(true)}>
              <DollarSign size={16} /> Abrir Caja
            </button>
          ) : (
            <>
              <button className="btn btn-success btn-sm" id="btn-ingreso" onClick={() => { setMovementType('ingreso'); setShowMovement(true); }}>
                <ArrowUpCircle size={14} /> Ingreso
              </button>
              <button className="btn btn-secondary btn-sm" id="btn-retiro" onClick={() => { setMovementType('retiro'); setShowMovement(true); }}>
                <ArrowDownCircle size={14} /> Retiro
              </button>
              <button className="btn btn-sm" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                onClick={() => exportCorte(current.id)} disabled={exporting} id="btn-exportar-corte">
                <FileSpreadsheet size={14} /> {exporting ? 'Exportando…' : 'Exportar Corte'}
              </button>
              <button className="btn btn-danger btn-sm" id="btn-cerrar-caja" onClick={() => setShowClose(true)}>
                <Lock size={14} /> Cerrar Caja
              </button>
            </>
          )}
          <button className="btn btn-icon btn-secondary btn-sm" onClick={loadData} title="Actualizar">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* ── Estado actual ── */}
        {current && (
          <div className="cash-status-banner" style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius)',
            marginBottom: 20
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%', background: 'var(--success)',
              boxShadow: '0 0 0 4px rgba(16,185,129,0.25)',
              animation: 'pulse 2s infinite'
            }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 15 }}>Caja Abierta</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16, marginTop: 2 }}>
                <span><Clock size={11} style={{ marginRight: 4 }} />{fmtDate(current.opened_at)}</span>
                <span style={{ color: 'var(--accent)' }}>⏱ {timeSince(current.opened_at)} activa</span>
              </div>
            </div>
          </div>
        )}

        {!current && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
            background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius)', marginBottom: 20
          }}>
            <AlertCircle size={18} color="var(--danger)" />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--danger)' }}>Sin caja abierta</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Abre la caja para registrar ventas</div>
            </div>
          </div>
        )}

        {/* ── Métricas del turno ── */}
        {current && summary && (
          <>
            <div className="stats-grid" style={{ marginBottom: 16 }}>
              <div className="stat-card">
                <span className="stat-label">Monto Inicial</span>
                <div className="stat-value">{fmt(summary.initial_amount)}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Ventas del Turno</span>
                <div className="stat-value stat-accent">{fmt(summary.sales_total)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{summary.sales_count} transacciones</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Ingresos Extras</span>
                <div className="stat-value stat-success">{fmt(summary.incomes)}</div>
              </div>
              <div className="stat-card">
                <span className="stat-label">Retiros</span>
                <div className="stat-value stat-warning">{fmt(summary.withdrawals)}</div>
              </div>
              <div className="stat-card" style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
                border: '1px solid rgba(99,102,241,0.3)'
              }}>
                <span className="stat-label" style={{ fontWeight: 700 }}>💰 Esperado en Caja</span>
                <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 26 }}>{fmt(summary.expected_amount)}</div>
              </div>
            </div>

            {/* ── Movimientos del turno ── */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowMovements(v => !v)}>
                <span className="card-title"><Activity size={15} style={{ marginRight: 6 }} />Movimientos del Turno</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-accent">{movements.length}</span>
                  {showMovements ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              {showMovements && (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Hora</th><th>Tipo</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
                    <tbody>
                      {movements.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Sin movimientos en este turno</td></tr>
                      ) : movements.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(m.created_at)}</td>
                          <td>
                            <span className={`badge ${m.type === 'ingreso' ? 'badge-success' : m.type === 'retiro' ? 'badge-warning' : 'badge-accent'}`}>
                              {m.type}
                            </span>
                          </td>
                          <td>{m.description}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: m.type === 'ingreso' ? 'var(--success)' : 'var(--warning)' }}>
                            {m.type === 'retiro' ? '-' : '+'}{fmt(m.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Ventas del turno ── */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowSales(v => !v)}>
                <span className="card-title"><TrendingUp size={15} style={{ marginRight: 6 }} />Ventas del Turno</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-success">{sales.length}</span>
                  {showSales ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>
              {showSales && (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Folio</th><th>Hora</th><th>Cliente</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th></tr></thead>
                    <tbody>
                      {sales.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Sin ventas en este turno</td></tr>
                      ) : sales.map(s => (
                        <tr key={s.id}>
                          <td><code>#{s.id}</code></td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(s.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>{s.client?.name || 'Público General'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmt(s.total)}</td>
                          <td><span className="badge badge-success">{s.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Historial de cajas ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Historial de Cajas</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha Apertura</th><th>Cajero</th><th>Inicial</th><th>Esperado</th>
                  <th>Contado</th><th>Diferencia</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Sin historial de cajas</td></tr>
                ) : history.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12 }}>{fmtDate(r.opened_at || r.created_at)}</td>
                    <td>{r.user?.name || '—'}</td>
                    <td>{fmt(r.initial_amount)}</td>
                    <td>{r.expected_amount != null ? fmt(r.expected_amount) : '—'}</td>
                    <td>{r.final_amount != null ? fmt(r.final_amount) : '—'}</td>
                    <td style={{ color: r.difference > 0 ? 'var(--success)' : r.difference < 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {r.difference != null ? fmt(r.difference) : '—'}
                    </td>
                    <td><span className={`badge ${r.status === 'abierta' ? 'badge-success' : 'badge-accent'}`}>{r.status}</span></td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => exportCorte(r.id)} disabled={exporting} title="Exportar Excel">
                        <FileSpreadsheet size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modal: Abrir Caja ── */}
      <Modal isOpen={showOpen} onClose={() => setShowOpen(false)} title="Abrir Caja">
        <div className="form-group">
          <label className="form-label">Monto Inicial en Caja</label>
          <input className="form-input" type="number" value={form.initial_amount}
            onChange={e => setForm({ ...form, initial_amount: e.target.value })}
            autoFocus placeholder="0.00" min="0" step="0.01" />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
            Ingresa el efectivo que hay físicamente en la caja al inicio del turno.
          </span>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowOpen(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={openRegister}>
            <DollarSign size={15} /> Abrir Caja
          </button>
        </div>
      </Modal>

      {/* ── Modal: Cerrar Caja ── */}
      <Modal isOpen={showClose} onClose={() => setShowClose(false)} title="Corte de Caja">
        {summary && (
          <div style={{ marginBottom: 16, padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Monto inicial</span><div style={{ fontWeight: 700 }}>{fmt(summary.initial_amount)}</div></div>
            <div><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ventas del turno</span><div style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(summary.sales_total)}</div></div>
            <div><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ingresos extras</span><div style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(summary.incomes)}</div></div>
            <div><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Retiros</span><div style={{ fontWeight: 700, color: 'var(--warning)' }}>{fmt(summary.withdrawals)}</div></div>
            <div style={{ gridColumn: '1/-1', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Monto esperado en caja</span>
              <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--accent)' }}>{fmt(summary.expected_amount)}</div>
            </div>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Monto Contado (efectivo físico)</label>
          <input className="form-input" type="number" value={form.final_amount}
            onChange={e => setForm({ ...form, final_amount: e.target.value })}
            autoFocus placeholder="0.00" min="0" step="0.01" />
          {form.final_amount && summary && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius)',
              background: parseFloat(form.final_amount) - summary.expected_amount >= 0
                ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: parseFloat(form.final_amount) - summary.expected_amount >= 0
                ? 'var(--success)' : 'var(--danger)',
              fontWeight: 700, fontSize: 14
            }}>
              Diferencia: {fmt(parseFloat(form.final_amount) - summary.expected_amount)}
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Notas (opcional)</label>
          <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowClose(false)}>Cancelar</button>
          <button className="btn btn-danger" onClick={closeRegister}>
            <Lock size={15} /> Cerrar Caja
          </button>
        </div>
      </Modal>

      {/* ── Modal: Movimiento ── */}
      <Modal isOpen={showMovement} onClose={() => setShowMovement(false)}
        title={movementType === 'ingreso' ? '➕ Registrar Ingreso' : '➖ Registrar Retiro'}>
        <div className="form-group">
          <label className="form-label">Monto</label>
          <input className="form-input" type="number" value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            autoFocus placeholder="0.00" min="0.01" step="0.01" />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <input className="form-input" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder={movementType === 'ingreso' ? 'Ej: Pago con transferencia' : 'Ej: Compra de cambio'} required />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowMovement(false)}>Cancelar</button>
          <button className={`btn ${movementType === 'ingreso' ? 'btn-success' : 'btn-warning'}`} onClick={addMovement}>
            {movementType === 'ingreso' ? <ArrowUpCircle size={15} /> : <ArrowDownCircle size={15} />}
            Registrar {movementType === 'ingreso' ? 'Ingreso' : 'Retiro'}
          </button>
        </div>
      </Modal>
    </>
  );
}
