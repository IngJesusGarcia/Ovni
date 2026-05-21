import { useState, useEffect } from 'react';
import api from '../api/axios';
import { AlertTriangle, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LowStock() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const navigate = useNavigate();

  const load = (p = 1) => {
    setLoading(true);
    api.get(`/products?low_stock=1&page=${p}&per_page=20`)
      .then(r => {
        setProducts(r.data.data);
        setMeta(r.data);
        setPage(p);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const pageRange = () => {
    const t = meta.last_page || 1;
    if (t <= 7) return Array.from({length:t},(_,i)=>i+1);
    const r=[1]; if (page>3) r.push('…');
    for (let i=Math.max(2,page-1);i<=Math.min(t-1,page+1);i++) r.push(i);
    if (page<t-2) r.push('…'); r.push(t); return r;
  };

  return (
    <div className="low-stock-page">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle color="var(--warning)" /> Productos bajo stock
        </h1>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          {meta.total || 0} productos requieren atención
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          {loading ? <div className="loader"><div className="spinner"/></div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th style={{ textAlign: 'center' }}>Stock Actual</th>
                    <th style={{ textAlign: 'center' }}>Stock Mínimo</th>
                    <th style={{ textAlign: 'center' }}>Diferencia</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:48,color:'var(--text-muted)'}}>¡Excelente! No hay productos con stock bajo.</td></tr>
                  ) : products.map(p => {
                    const diff = Number(p.stock) - Number(p.min_stock);
                    return (
                      <tr key={p.id}>
                        <td><code>{p.code}</code></td>
                        <td>{p.name}</td>
                        <td>{p.category?.name || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-danger" style={{ fontSize: 13 }}>
                            {Number(p.stock).toFixed(p.unit === 'kg' ? 3 : 0)} {p.unit}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          {Number(p.min_stock).toFixed(p.unit === 'kg' ? 3 : 0)}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 600 }}>
                          {diff.toFixed(p.unit === 'kg' ? 3 : 0)}
                        </td>
                        <td>
                          <button className="btn btn-sm btn-secondary" onClick={() => navigate('/inventory', { state: { productId: p.id, productName: p.name, productCode: p.code } })}>
                            Surtir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {meta.last_page > 1 && (
            <div style={{display:'flex',gap:4,justifyContent:'center',alignItems:'center',marginTop:16}}>
              <button className="btn btn-sm btn-secondary" disabled={page===1} onClick={()=>load(page-1)}><ChevronLeft size={14}/></button>
              {pageRange().map((p,i)=>p==='…'?<span key={i} style={{padding:'0 4px',color:'var(--text-muted)'}}>…</span>
                :<button key={p} className={`btn btn-sm ${page===p?'btn-primary':'btn-secondary'}`} onClick={()=>load(p)}>{p}</button>)}
              <button className="btn btn-sm btn-secondary" disabled={page===meta.last_page} onClick={()=>load(page+1)}><ChevronRight size={14}/></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
