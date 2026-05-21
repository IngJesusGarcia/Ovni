import { useState, useEffect } from 'react';
import api from '../api/axios';
import Modal from '../components/common/Modal';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, Pencil, Trash2, CreditCard } from 'lucide-react';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [editing, setEditing] = useState(null);
  const [payClient, setPayClient] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', credit_limit: '' });

  const load = () => {
    setLoading(true);
    api.get('/clients?per_page=100').then(r => setClients(r.data.data || r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/clients/${editing}`, form); toast.success('Cliente actualizado'); }
      else { await api.post('/clients', form); toast.success('Cliente creado'); }
      setShowForm(false); setEditing(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const edit = (c) => { setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', credit_limit: c.credit_limit }); setEditing(c.id); setShowForm(true); };
  const remove = async (id) => { if (!confirm('¿Eliminar?')) return; await api.delete(`/clients/${id}`); toast.success('Eliminado'); load(); };

  const handlePay = async () => {
    try {
      await api.post(`/clients/${payClient.id}/pay-balance`, { amount: parseFloat(payAmount) });
      toast.success('Abono registrado'); setShowPay(false); setPayAmount(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', phone: '', email: '', address: '', credit_limit: '' }); setEditing(null); setShowForm(true); }}><Plus size={16} /> Nuevo</button>
      </div>
      <div className="page-body">
        <div className="card">
          {loading ? <div className="loader"><div className="spinner" /></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nombre</th><th>Teléfono</th><th>Límite Crédito</th><th>Saldo</th><th></th></tr></thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.name}</td>
                      <td>{c.phone || '—'}</td>
                      <td>${Number(c.credit_limit).toFixed(2)}</td>
                      <td><span className={Number(c.balance) > 0 ? 'badge badge-danger' : ''}>${Number(c.balance).toFixed(2)}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {Number(c.balance) > 0 && <button className="btn btn-icon btn-sm" onClick={() => { setPayClient(c); setShowPay(true); }} title="Abonar"><CreditCard size={14} color="var(--success)" /></button>}
                        {c.id !== 1 && <>
                          <button className="btn btn-icon btn-sm" onClick={() => edit(c)}><Pencil size={14} /></button>
                          <button className="btn btn-icon btn-sm" onClick={() => remove(c.id)}><Trash2 size={14} color="var(--danger)" /></button>
                        </>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Límite Crédito</label><input className="form-input" type="number" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} /></div>
          </div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editing ? 'Actualizar' : 'Crear'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={showPay} onClose={() => setShowPay(false)} title={`Abonar — ${payClient?.name}`}>
        <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>Saldo: <strong style={{ color: 'var(--danger)' }}>${Number(payClient?.balance || 0).toFixed(2)}</strong></p>
        <div className="form-group"><label className="form-label">Monto de Abono</label><input className="form-input" type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} autoFocus /></div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowPay(false)}>Cancelar</button><button className="btn btn-success" onClick={handlePay}>Abonar</button></div>
      </Modal>
    </>
  );
}
