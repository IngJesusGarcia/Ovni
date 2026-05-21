import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Tag, Save, Search, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function Pricing() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterNoPrice, setFilterNoPrice] = useState(false);
  const [saving, setSaving] = useState({}); // { productId: boolean }
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});

  const load = (p = 1) => {
    setLoading(true);
    let url = `/products?page=${p}&per_page=50`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    
    api.get(url).then(r => {
      let data = r.data.data;
      if (filterNoPrice) {
        data = data.filter(p => Number(p.price) === 0 || Number(p.cost) === 0);
      }
      setProducts(data);
      setMeta(r.data);
      setPage(p);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => load(1), 400);
    return () => clearTimeout(timer);
  }, [search, filterNoPrice]);

  const updateProduct = async (id, field, value) => {
    const updatedProducts = products.map(p => {
      if (p.id === id) return { ...p, [field]: value };
      return p;
    });
    setProducts(updatedProducts);
  };

  const saveProduct = async (product) => {
    setSaving(prev => ({ ...prev, [product.id]: true }));
    try {
      await api.put(`/products/${product.id}`, {
        ...product,
        price: parseFloat(product.price),
        cost: parseFloat(product.cost)
      });
      toast.success(`${product.name} actualizado`);
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pricing-page">
      <Toaster position="top-right" />
      <div className="page-header no-print">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag color="var(--accent)" /> Etiquetado Inteligente
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Buscar producto..." 
              style={{ paddingLeft: 34, width: 250 }} 
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={filterNoPrice} onChange={e => setFilterNoPrice(e.target.checked)} />
            Solo sin precio/costo
          </label>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Imprimir Etiquetas
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          <p className="no-print" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            Gestiona los precios de tus productos de forma masiva. Los cambios se guardan por producto.
          </p>

          {loading ? <div className="loader"><div className="spinner" /></div> : (
            <div className="table-wrap">
              <table className="pricing-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Producto</th>
                    <th style={{ width: 140 }}>Costo ($)</th>
                    <th style={{ width: 140 }}>Precio ($)</th>
                    <th style={{ width: 100 }}>Margen</th>
                    <th className="no-print">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>No se encontraron productos</td></tr>
                  ) : products.map(p => {
                    const cost = parseFloat(p.cost) || 0;
                    const price = parseFloat(p.price) || 0;
                    const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : 0;
                    const isMissing = price === 0 || cost === 0;

                    return (
                      <tr key={p.id} className={isMissing ? 'row-warning' : ''}>
                        <td>
                          <code>{p.code}</code>
                          <div className="print-only-barcode" style={{ display: 'none' }}>
                             {/* Hier would go a barcode if we had a lib, but we'll simulate with text for now */}
                             *{p.code}*
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.category?.name || 'Sin categoría'}</div>
                        </td>
                        <td>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <input 
                              type="number" 
                              className="form-input" 
                              value={p.cost} 
                              onChange={e => updateProduct(p.id, 'cost', e.target.value)}
                              step="0.01"
                              style={{ border: cost === 0 ? '1px solid var(--danger)' : '' }}
                            />
                          </div>
                        </td>
                        <td>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <input 
                              type="number" 
                              className="form-input" 
                              value={p.price} 
                              onChange={e => updateProduct(p.id, 'price', e.target.value)}
                              step="0.01"
                              style={{ border: price === 0 ? '1px solid var(--danger)' : '' }}
                            />
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ color: margin < 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                            {margin}%
                          </span>
                        </td>
                        <td className="no-print">
                          <button 
                            className={`btn btn-sm ${saving[p.id] ? 'btn-secondary' : 'btn-primary'}`} 
                            onClick={() => saveProduct(p)}
                            disabled={saving[p.id]}
                          >
                            {saving[p.id] ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
                            {saving[p.id] ? '' : 'Guardar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .page-body { padding: 0 !important; }
          .card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          table { border: 1px solid #ddd; }
          th, td { border: 1px solid #ddd; padding: 8px !important; color: black !important; }
          input { border: none !important; background: transparent !important; color: black !important; width: auto !important; }
          .row-warning { background: transparent !important; }
          code { background: transparent !important; color: black !important; padding: 0 !important; }
          .pricing-table th:last-child, .pricing-table td:last-child { display: none; }
          .print-only-barcode { display: block !important; font-family: monospace; font-size: 10px; margin-top: 4px; }
        }
        .row-warning td { background: var(--danger-soft); }
      `}</style>
    </div>
  );
}
