import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import { DollarSign, Lock, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Modal from '../components/common/Modal';

export default function CashRegister() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showMovement, setShowMovement] = useState(false);
  const [movementType, setMovementType] = useState('ingreso');
  const [form, setForm] = useState({ initial_amount: '', final_amount: '', notes: '', amount: '', description: '' });
  const [report, setReport] = useState(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/cash-registers/current'),
      api.get('/cash-registers/history'),
    ]).then(([curr, hist]) => {
      setCurrent(curr.data.cash_register);
      setHistory(hist.data.data || []);
      if (curr.data.cash_register) {
        api.get(`/cash-registers/${curr.data.cash_register.id}/report`).then(r => setReport(r.data));
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const openRegister = async () => {
    try {
      await api.post('/cash-registers/open', { initial_amount: parseFloat(form.initial_amount) || 0 });
      toast.success('Caja abierta');
      setShowOpen(false);
      setForm({ ...form, initial_amount: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const closeRegister = async () => {
    try {
      await api.post(`/cash-registers/${current.id}/close`, { final_amount: parseFloat(form.final_amount), notes: form.notes });
      toast.success('Caja cerrada');
      setShowClose(false);
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const addMovement = async () => {
    const endpoint = movementType === 'ingreso' ? 'income' : 'withdrawal';
    try {
      await api.post(`/cash-registers/${current.id}/${endpoint}`, { amount: parseFloat(form.amount), description: form.description });
      toast.success(`${movementType === 'ingreso' ? 'Ingreso' : 'Retiro'} registrado`);
      setShowMovement(false);
      setForm({ ...form, amount: '', description: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
      <div className="page-header">
        <h1 className="page-title">Caja</h1>
        {!current ? (
          <button className="btn btn-primary" onClick={() => setShowOpen(true)}><DollarSign size={16} /> Abrir Caja</button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-success btn-sm" onClick={() => { setMovementType('ingreso'); setShowMovement(true); }}><ArrowUpCircle size={14} /> Ingreso</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setMovementType('retiro'); setShowMovement(true); }}><ArrowDownCircle size={14} /> Retiro</button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowClose(true)}><Lock size={14} /> Cerrar Caja</button>
          </div>
        )}
      </div>
      <div className="page-body">
        {current && report && (
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card"><span className="stat-label">Monto Inicial</span><div className="stat-value">${Number(report.summary?.initial_amount || 0).toFixed(2)}</div></div>
            <div className="stat-card"><span className="stat-label">Ventas</span><div className="stat-value stat-accent">${Number(report.summary?.sales_total || 0).toFixed(2)}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{report.summary?.sales_count || 0} transacciones</div></div>
            <div className="stat-card"><span className="stat-label">Ingresos</span><div className="stat-value stat-success">${Number(report.summary?.incomes || 0).toFixed(2)}</div></div>
            <div className="stat-card"><span className="stat-label">Retiros</span><div className="stat-value stat-warning">${Number(report.summary?.withdrawals || 0).toFixed(2)}</div></div>
            <div className="stat-card"><span className="stat-label">Esperado en Caja</span><div className="stat-value">${Number(report.summary?.expected_amount || 0).toFixed(2)}</div></div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><span className="card-title">Historial de Cajas</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Inicial</th><th>Esperado</th><th>Final</th><th>Diferencia</th><th>Estado</th></tr></thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12 }}>{new Date(r.opened_at || r.created_at).toLocaleString('es-MX')}</td>
                    <td>{r.user?.name || '—'}</td>
                    <td>${Number(r.initial_amount).toFixed(2)}</td>
                    <td>{r.expected_amount != null ? `$${Number(r.expected_amount).toFixed(2)}` : '—'}</td>
                    <td>{r.final_amount != null ? `$${Number(r.final_amount).toFixed(2)}` : '—'}</td>
                    <td style={{ color: r.difference > 0 ? 'var(--success)' : r.difference < 0 ? 'var(--danger)' : '' }}>
                      {r.difference != null ? `$${Number(r.difference).toFixed(2)}` : '—'}
                    </td>
                    <td><span className={`badge ${r.status === 'abierta' ? 'badge-success' : 'badge-accent'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={showOpen} onClose={() => setShowOpen(false)} title="Abrir Caja">
        <div className="form-group"><label className="form-label">Monto Inicial</label><input className="form-input" type="number" value={form.initial_amount} onChange={e => setForm({ ...form, initial_amount: e.target.value })} autoFocus placeholder="0.00" /></div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowOpen(false)}>Cancelar</button><button className="btn btn-primary" onClick={openRegister}>Abrir Caja</button></div>
      </Modal>

      <Modal isOpen={showClose} onClose={() => setShowClose(false)} title="Cerrar Caja">
        {report && <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius)' }}><strong>Monto esperado:</strong> <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 18 }}>${Number(report.summary?.expected_amount || 0).toFixed(2)}</span></div>}
        <div className="form-group"><label className="form-label">Monto Contado</label><input className="form-input" type="number" value={form.final_amount} onChange={e => setForm({ ...form, final_amount: e.target.value })} autoFocus placeholder="0.00" /></div>
        <div className="form-group"><label className="form-label">Notas</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowClose(false)}>Cancelar</button><button className="btn btn-danger" onClick={closeRegister}>Cerrar Caja</button></div>
      </Modal>

      <Modal isOpen={showMovement} onClose={() => setShowMovement(false)} title={movementType === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Retiro'}>
        <div className="form-group"><label className="form-label">Monto</label><input className="form-input" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} autoFocus placeholder="0.00" /></div>
        <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowMovement(false)}>Cancelar</button><button className="btn btn-primary" onClick={addMovement}>Registrar</button></div>
      </Modal>
    </>
  );
}
