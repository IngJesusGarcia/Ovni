import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';

export default function Inventory() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('movements');
  const [form, setForm] = useState({ product_id: '', quantity: '', notes: '', type: 'entry' });
  const [filters, setFilters] = useState({ product_id: '', type: '' });
  const [meta, setMeta] = useState({});
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const location = useLocation();

  // Handle incoming selection from LowStock
  useEffect(() => {
    if (location.state?.productId) {
      setTab('register');
      const p = { id: location.state.productId, name: location.state.productName, code: location.state.productCode };
      // We don't have the stock/unit here, but we can fetch them if needed
      // For now, we'll just set the minimum info to select it
      setSelectedProduct(p);
      setForm(prev => ({ ...prev, product_id: p.id }));
      setSearchTerm(`${p.code} — ${p.name}`);
      
      // Fetch full info to show current stock
      api.get(`/products/${p.id}`).then(res => {
        setSelectedProduct(res.data);
      });
    }
  }, [location.state]);

  // Search products
  useEffect(() => {
    if (searchTerm.length < 1) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      api.get(`/products/search?q=${encodeURIComponent(searchTerm)}`)
        .then(res => { setSearchResults(res.data); setShowResults(true); });
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const selectProduct = (p) => {
    setSelectedProduct(p);
    setForm({ ...form, product_id: p.id });
    setSearchTerm(`${p.code} — ${p.name}`);
    setShowResults(false);
  };

  const handleSearchKey = (e) => {
    if (e.key === 'Enter' && searchTerm) {
      e.preventDefault();
      // If exactly one result or a barcode match is expected
      if (searchResults.length === 1) {
        selectProduct(searchResults[0]);
        document.getElementById('quantity-input')?.focus();
      } else {
        // Try exact barcode match
        api.get(`/products/barcode/${encodeURIComponent(searchTerm)}`)
          .then(res => {
            selectProduct(res.data);
            document.getElementById('quantity-input')?.focus();
          })
          .catch(() => {
            if (searchResults.length > 0) setShowResults(true);
          });
      }
    }
  };

  const loadMovements = (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p, per_page: 25 });
    if (filters.product_id) params.append('product_id', filters.product_id);
    if (filters.type) params.append('type', filters.type);
    api.get(`/inventory/movements?${params}`).then(r => {
      setMovements(r.data.data);
      setMeta(r.data);
      setPage(p);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadMovements(); }, [filters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoints = { entry: '/inventory/entry', exit: '/inventory/exit', adjust: '/inventory/adjust' };
    const payload = form.type === 'adjust'
      ? { product_id: form.product_id, new_quantity: parseFloat(form.quantity), notes: form.notes }
      : { product_id: form.product_id, quantity: parseFloat(form.quantity), notes: form.notes };

    try {
      await api.post(endpoints[form.type], payload);
      toast.success('Movimiento registrado');
      setForm({ ...form, quantity: '', notes: '' });
      setSearchTerm('');
      setSelectedProduct(null);
      loadMovements(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const typeLabels = { entrada: 'badge-success', salida: 'badge-danger', ajuste: 'badge-warning', venta: 'badge-accent', cancelacion: 'badge-warning' };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />
      <div className="page-header">
        <h1 className="page-title">Inventario</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`btn btn-sm ${tab === 'movements' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('movements')}>Movimientos</button>
          <button className={`btn btn-sm ${tab === 'register' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('register')}>Registrar</button>
        </div>
      </div>
      <div className="page-body">
        {tab === 'register' ? (
          <div className="card" style={{ maxWidth: 500 }}>
            <div className="card-header"><span className="card-title">Registrar Movimiento</span></div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['entry', 'Entrada', ArrowUpCircle], ['exit', 'Salida', ArrowDownCircle], ['adjust', 'Ajuste', RefreshCw]].map(([val, label, Icon]) => (
                    <button key={val} type="button" className={`btn ${form.type === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setForm({ ...form, type: val })}>
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Producto</label>
                <input
                  className="form-input"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); if (!e.target.value) setSelectedProduct(null); }}
                  onKeyDown={handleSearchKey}
                  placeholder="Buscar por nombre o código..."
                  required
                  autoComplete="off"
                />
                {selectedProduct && (
                  <div style={{ fontSize: 11, marginTop: 4, color: 'var(--accent)', fontWeight: 500 }}>
                    Seleccionado: {selectedProduct.name} (Stock actual: {Number(selectedProduct.stock).toFixed(selectedProduct.unit === 'kg' ? 3 : 0)} {selectedProduct.unit})
                  </div>
                )}
                {showResults && searchResults.length > 0 && (
                  <div className="pos-search-results" style={{ top: '100%', width: '100%', zIndex: 100 }}>
                    {searchResults.map(p => (
                      <div key={p.id} className="pos-search-item" onClick={() => selectProduct(p)}>
                        <div>
                          <div className="pos-search-item-name">{p.name}</div>
                          <div className="pos-search-item-meta">{p.code} · Stock: {Number(p.stock).toFixed(p.unit === 'kg' ? 3 : 0)} {p.unit}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">{form.type === 'adjust' ? 'Nuevo Stock' : 'Cantidad'}</label>
                <input id="quantity-input" className="form-input" type="number" step="0.001" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Registrar</button>
            </form>
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <span className="card-title">Historial de Movimientos</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <select style={{ width: 160 }} value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value })}>
                  <option value="">Todos los tipos</option>
                  <option value="entrada">Entrada</option><option value="salida">Salida</option>
                  <option value="ajuste">Ajuste</option><option value="venta">Venta</option><option value="cancelacion">Cancelación</option>
                </select>
              </div>
            </div>
            {loading ? <div className="loader"><div className="spinner" /></div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Antes</th><th>Después</th><th>Usuario</th><th>Notas</th></tr></thead>
                  <tbody>
                    {movements.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontSize: 12 }}>{new Date(m.created_at).toLocaleString('es-MX')}</td>
                        <td>{m.product?.name || '—'}</td>
                        <td><span className={`badge ${typeLabels[m.type] || ''}`}>{m.type}</span></td>
                        <td>{Number(m.quantity).toFixed(3)}</td>
                        <td>{Number(m.stock_before).toFixed(3)}</td>
                        <td>{Number(m.stock_after).toFixed(3)}</td>
                        <td>{m.user?.name || '—'}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {meta.last_page > 1 && (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 16 }}>
                {Array.from({ length: Math.min(meta.last_page, 10) }, (_, i) => (
                  <button key={i} className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => loadMovements(i + 1)}>{i + 1}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
