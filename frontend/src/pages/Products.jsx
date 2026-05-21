import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import Modal from '../components/common/Modal';
import toast, { Toaster } from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, Upload, Download, FileDown, X, CheckCircle, AlertCircle, FileSpreadsheet, ChevronLeft, ChevronRight, ArrowRight, Percent } from 'lucide-react';

const emptyProduct = { code:'', name:'', price:'', cost:'', stock:'', min_stock:'0', unit:'pieza', has_expiration:false, category_id:'', description:'', use_inventory: true };

const SYSTEM_FIELDS = [
  { value:'',              label:'— No importar —' },
  { value:'codigo',        label:'Código *' },
  { value:'nombre',        label:'Nombre *' },
  { value:'precio',        label:'Precio *' },
  { value:'costo',         label:'Costo' },
  { value:'stock',         label:'Stock inicial' },
  { value:'stock_minimo',  label:'Stock mínimo' },
  { value:'unidad',        label:'Unidad (pieza/kg)' },
  { value:'categoria',     label:'Categoría' },
  { value:'descripcion',   label:'Descripción' },
  { value:'tiene_caducidad', label:'Tiene caducidad' },
];

function downloadBlob(data, filename, mime) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyProduct);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1=upload, 2=map, 3=result
  const [importFile, setImportFile] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState(null);   // { detected_columns, suggested_mapping, sample_rows, total_rows }
  const [mapping, setMapping] = useState({});      // { 'Col archivo': 'campo_sistema' }
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef();

  // Price percentage calculator (inside the form)
  const [formPct, setFormPct] = useState('');

  const load = (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: p, per_page: 20 });
    if (search) params.append('search', search);
    api.get(`/products?${params}`).then(r => { setProducts(r.data.data); setMeta(r.data); setPage(p); }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { api.get('/categories').then(r => setCategories(r.data)); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      editing ? await api.put(`/products/${editing}`, form) : await api.post('/products', form);
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      setShowForm(false); setForm(emptyProduct); setEditing(null); setFormPct(''); load(page);
    } catch (err) { toast.error(err.response?.data?.message || 'Error al guardar'); }
  };

  const edit = (p) => { setForm({ code:p.code, name:p.name, price:p.price, cost:p.cost, stock:p.stock, min_stock:p.min_stock||0, unit:p.unit, has_expiration:p.has_expiration, category_id:p.category_id||'', description:p.description||'', use_inventory: p.use_inventory }); setEditing(p.id); setFormPct(''); setShowForm(true); };
  const remove = async (id) => { if (!confirm('¿Eliminar?')) return; await api.delete(`/products/${id}`); toast.success('Eliminado'); load(page); };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams(); if (search) params.append('search', search);
      const res = await api.get(`/products/export?${params}`, { responseType:'blob' });
      downloadBlob(res.data, `productos_${new Date().toISOString().slice(0,10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      toast.success('Exportación completada');
    } catch { toast.error('Error al exportar'); } finally { setExporting(false); }
  };

  const handleTemplate = async () => {
    try {
      const res = await api.get('/products/template', { responseType:'blob' });
      downloadBlob(res.data, 'plantilla_productos.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      toast.success('Plantilla descargada');
    } catch { toast.error('Error'); }
  };

  // ── IMPORT STEP 1: select file + preview ──
  const handleFilePicked = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) { toast.error('Solo archivos .xlsx o .xls'); return; }
    setImportFile(file); setPreview(null); setImportResult(null); setMapping({});
  };

  const handlePreview = async () => {
    if (!importFile) return;
    setPreviewing(true);
    try {
      const fd = new FormData(); fd.append('file', importFile);
      const res = await api.post('/products/import/preview', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setPreview(res.data);
      setMapping(res.data.suggested_mapping || {});
      setImportStep(2);
    } catch (err) { toast.error(err.response?.data?.message || 'Error al leer el archivo'); }
    finally { setPreviewing(false); }
  };

  // ── IMPORT STEP 2: confirm mapping + execute ──
  const handleImport = async () => {
    const mappedFields = Object.values(mapping);
    for (const req of ['codigo','nombre','precio']) {
      if (!mappedFields.includes(req)) { toast.error(`Debes mapear la columna "${req}"`); return; }
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('mapping', JSON.stringify(mapping));
      const res = await api.post('/products/import', fd, { headers:{'Content-Type':'multipart/form-data'} });
      setImportResult(res.data); setImportStep(3);
      toast.success(res.data.message);
      load(1);
    } catch (err) {
      const d = err.response?.data;
      setImportResult({ message: d?.message || 'Error', errors: d?.errors||[], created:0, updated:0 });
      setImportStep(3);
      toast.error(d?.message || 'Error al importar');
    } finally { setImporting(false); }
  };

  const openImport = () => { setImportFile(null); setPreview(null); setImportResult(null); setMapping({}); setImportStep(1); setShowImport(true); };

  // Check duplicated field assignments
  const usedFields = Object.values(mapping).filter(Boolean);
  const isDuplicate = (col, val) => val && usedFields.filter(v => v === val).length > 1;

  const pageRange = () => {
    const t = meta.last_page || 1;
    if (t <= 7) return Array.from({length:t},(_,i)=>i+1);
    const r=[1]; if (page>3) r.push('…');
    for (let i=Math.max(2,page-1);i<=Math.min(t-1,page+1);i++) r.push(i);
    if (page<t-2) r.push('…'); r.push(t); return r;
  };

  // ── Styles for steps ──
  const stepStyle = (n) => ({
    display:'flex', alignItems:'center', gap:6,
    color: importStep >= n ? 'var(--primary)' : 'var(--text-muted)',
    fontWeight: importStep === n ? 700 : 400, fontSize:13,
  });
  const stepCircle = (n) => ({
    width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700,
    background: importStep > n ? 'var(--primary)' : importStep === n ? 'var(--primary)' : 'var(--bg-hover)',
    color: importStep >= n ? '#fff' : 'var(--text-muted)',
    border: `2px solid ${importStep >= n ? 'var(--primary)' : 'var(--border)'}`,
    flexShrink:0,
  });

  // ── Price calculator helpers ──
  const applyPctToPrice = () => {
    const pct = parseFloat(formPct);
    if (!pct || !form.price) return;
    const newP = parseFloat((Number(form.price) * (1 + pct / 100)).toFixed(2));
    setForm(prev => ({ ...prev, price: newP }));
    setFormPct('');
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style:{ background:'var(--bg-card)', color:'var(--text-primary)', border:'1px solid var(--border)' } }} />

      <div className="page-header">
        <h1 className="page-title">Productos</h1>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={16} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o código..." style={{ paddingLeft:34, width:250 }} />
          </div>

          <button className="btn btn-secondary" onClick={openImport}><Upload size={16}/> Importar</button>
          <button className="btn btn-secondary" onClick={handleExport} disabled={exporting}><Download size={16}/> {exporting?'Exportando…':'Exportar'}</button>
          <button className="btn btn-primary" onClick={()=>{setForm(emptyProduct);setEditing(null);setShowForm(true);}}><Plus size={16}/> Nuevo</button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          {loading ? <div className="loader"><div className="spinner"/></div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Unidad</th><th></th></tr></thead>
                <tbody>
                  {products.length===0 ? <tr><td colSpan={8} style={{textAlign:'center',color:'var(--text-muted)',padding:32}}>Sin productos</td></tr>
                  : products.map(p=>(
                    <tr key={p.id}>
                      <td><code>{p.code}</code></td><td>{p.name}</td><td>{p.category?.name||'—'}</td>
                      <td>${Number(p.price).toFixed(2)}</td><td>${Number(p.cost).toFixed(2)}</td>
                      <td><span className={Number(p.stock)<=Number(p.min_stock)&&Number(p.min_stock)>0?'badge badge-danger':''}>{Number(p.stock).toFixed(p.unit==='kg'?3:0)}</span></td>
                      <td>{p.unit}</td>
                      <td style={{whiteSpace:'nowrap'}}>
                        <button className="btn btn-icon btn-sm" onClick={()=>edit(p)}><Pencil size={14}/></button>
                        <button className="btn btn-icon btn-sm" onClick={()=>remove(p.id)}><Trash2 size={14} color="var(--danger)"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {meta.last_page>1&&(
            <div style={{display:'flex',gap:4,justifyContent:'center',alignItems:'center',marginTop:16}}>
              <button className="btn btn-sm btn-secondary" disabled={page===1} onClick={()=>load(page-1)}><ChevronLeft size={14}/></button>
              {pageRange().map((p,i)=>p==='…'?<span key={i} style={{padding:'0 4px',color:'var(--text-muted)'}}>…</span>
                :<button key={p} className={`btn btn-sm ${page===p?'btn-primary':'btn-secondary'}`} onClick={()=>load(p)}>{p}</button>)}
              <button className="btn btn-sm btn-secondary" disabled={page===meta.last_page} onClick={()=>load(page+1)}><ChevronRight size={14}/></button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal Crear/Editar ── */}
      <Modal isOpen={showForm} onClose={()=>setShowForm(false)} title={editing?'Editar Producto':'Nuevo Producto'} width="500px">
        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Código</label><input className="form-input" value={form.code} onChange={e=>setForm({...form,code:e.target.value})} required/></div>
            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Precio</label>
              <input className="form-input" type="number" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required/>
            </div>
            <div className="form-group"><label className="form-label">Costo</label><input className="form-input" type="number" step="0.01" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})} required/></div>
          </div>
          {/* ── Calculador de % sobre el precio ── */}
          <div style={{
            display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
            background:'var(--bg-hover)', borderRadius:10, padding:'10px 14px', marginBottom:8,
          }}>
            <Percent size={14} color="var(--primary)" style={{flexShrink:0}}/>
            <span style={{fontSize:13, color:'var(--text-muted)', flexShrink:0}}>Aplicar % al precio:</span>
            <input
              type="number"
              step="0.1"
              min="-99"
              max="1000"
              value={formPct}
              onChange={e=>setFormPct(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),applyPctToPrice())}
              placeholder="Ej: 10"
              style={{width:90, textAlign:'center', fontWeight:600}}
            />
            <span style={{fontSize:13, color:'var(--text-muted)', flexShrink:0}}>%</span>
            {formPct && form.price && (
              <span style={{fontSize:12, color:'var(--text-muted)', flexShrink:0}}>
                → <strong style={{color: parseFloat(formPct)>=0 ? 'var(--success,#22c55e)' : 'var(--danger)'}}>
                  ${(Number(form.price) * (1 + parseFloat(formPct||0)/100)).toFixed(2)}
                </strong>
              </span>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              style={{marginLeft:'auto', flexShrink:0}}
              onClick={applyPctToPrice}
              disabled={!formPct || !form.price}
            >
              Aplicar
            </button>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Stock</label><input className="form-input" type="number" step="0.001" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} required={!editing} disabled={!!editing}/></div>
            <div className="form-group"><label className="form-label">Stock Mínimo</label><input className="form-input" type="number" step="0.001" value={form.min_stock} onChange={e=>setForm({...form,min_stock:e.target.value})}/></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Unidad</label>
              <select className="form-input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                <option value="pieza">Pieza</option><option value="kg">Kilogramo</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Categoría</label>
              <select className="form-input" value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}>
                <option value="">Sin categoría</option>
                {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <input type="checkbox" id="use_inventory" checked={form.use_inventory} onChange={e=>setForm({...form,use_inventory:e.target.checked})} />
            <label htmlFor="use_inventory" className="form-label" style={{ marginBottom: 0 }}>¿Maneja inventario? (Desactivar para servicios/recargas)</label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editing?'Actualizar':'Crear'}</button>
          </div>
        </form>
      </Modal>

      {/* ── Modal Importar ── */}
      <Modal isOpen={showImport} onClose={()=>setShowImport(false)} title="Importar Productos desde Excel" width="640px">

        {/* Steps indicator */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, padding:'10px 14px', background:'var(--bg-hover)', borderRadius:10 }}>
          <div style={stepStyle(1)}><div style={stepCircle(1)}>{importStep>1?'✓':1}</div> Seleccionar archivo</div>
          <ArrowRight size={14} color="var(--text-muted)"/>
          <div style={stepStyle(2)}><div style={stepCircle(2)}>{importStep>2?'✓':2}</div> Mapear columnas</div>
          <ArrowRight size={14} color="var(--text-muted)"/>
          <div style={stepStyle(3)}><div style={stepCircle(3)}>3</div> Resultado</div>
        </div>

        {/* ── STEP 1: Upload ── */}
        {importStep===1&&(
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <button className="btn btn-secondary" onClick={handleTemplate} style={{alignSelf:'flex-start'}}>
              <FileDown size={15}/> Descargar plantilla de ejemplo
            </button>

            {/* Drop zone */}
            <div
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);handleFilePicked(e.dataTransfer.files[0]);}}
              onClick={()=>fileRef.current?.click()}
              style={{
                border:`2px dashed ${dragging?'var(--primary)':importFile?'var(--success,#22c55e)':'var(--border)'}`,
                borderRadius:12, padding:32, textAlign:'center', cursor:'pointer',
                background: dragging?'rgba(56,189,248,.05)':'var(--bg-hover)', transition:'all .2s',
              }}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>handleFilePicked(e.target.files[0])}/>
              {importFile?(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <FileSpreadsheet size={36} color="var(--success,#22c55e)"/>
                  <strong style={{color:'var(--text-primary)'}}>{importFile.name}</strong>
                  <span style={{color:'var(--text-muted)',fontSize:12}}>{(importFile.size/1024).toFixed(1)} KB</span>
                  <button className="btn btn-sm btn-secondary" onClick={e=>{e.stopPropagation();setImportFile(null);}} style={{marginTop:4}}><X size={12}/> Quitar</button>
                </div>
              ):(
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,color:'var(--text-muted)'}}>
                  <Upload size={32}/>
                  <span style={{fontWeight:500,color:'var(--text-primary)'}}>Arrastra tu archivo aquí</span>
                  <span style={{fontSize:13}}>o haz clic para seleccionar (.xlsx)</span>
                </div>
              )}
            </div>

            <p style={{margin:0,fontSize:12,color:'var(--text-muted)'}}>
              💡 El sistema detectará automáticamente tus columnas y sugerirá el mapeo. Funciona con <strong>cualquier formato</strong> de tu base de datos anterior.
            </p>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setShowImport(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handlePreview} disabled={!importFile||previewing}>
                {previewing?<><span className="spinner" style={{width:14,height:14,borderWidth:2,marginRight:6}}/>Analizando…</>:<>Analizar archivo <ArrowRight size={15}/></>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Map columns ── */}
        {importStep===2&&preview&&(
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{background:'var(--bg-hover)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'var(--text-muted)'}}>
              📊 Se encontraron <strong style={{color:'var(--text-primary)'}}>{preview.total_rows} filas</strong> y <strong style={{color:'var(--text-primary)'}}>{preview.detected_columns.length} columnas</strong> en <em>{importFile.name}</em>.
              Asigna cada columna al campo correspondiente. Los campos marcados con <span style={{color:'var(--danger)'}}>*</span> son obligatorios.
            </div>

            {/* Column mapping table */}
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr style={{background:'var(--bg-hover)'}}>
                    <th style={{padding:'8px 12px',textAlign:'left',fontSize:12,color:'var(--text-muted)',borderBottom:'1px solid var(--border)'}}>Columna en tu archivo</th>
                    <th style={{padding:'8px 12px',textAlign:'left',fontSize:12,color:'var(--text-muted)',borderBottom:'1px solid var(--border)'}}>Ejemplo de valor</th>
                    <th style={{padding:'8px 12px',textAlign:'left',fontSize:12,color:'var(--text-muted)',borderBottom:'1px solid var(--border)'}}>Campo del sistema</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.detected_columns.map((col,i)=>{
                    const example = preview.sample_rows[0]?.[col] ?? preview.sample_rows[0]?.[i] ?? '';
                    const val = mapping[i]||'';
                    const dup = val && usedFields.filter(v=>v===val).length>1;
                    return (
                      <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                        <td style={{padding:'8px 12px'}}>
                          <code style={{fontSize:13,color:'var(--text-primary)'}}>{col || `(Columna ${i + 1})`}</code>
                        </td>
                        <td style={{padding:'8px 12px',color:'var(--text-muted)',fontSize:13,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {example||<em>vacío</em>}
                        </td>
                        <td style={{padding:'8px 12px'}}>
                          <select
                            value={val}
                            onChange={e=>setMapping(prev=>({...prev,[i]:e.target.value||undefined}))}
                            style={{
                              width:'100%', padding:'6px 8px', borderRadius:6, fontSize:13,
                              background:'var(--bg-card)', color: dup?'var(--danger)':'var(--text-primary)',
                              border:`1px solid ${dup?'var(--danger)':val?'var(--primary)':'var(--border)'}`,
                            }}
                          >
                            {SYSTEM_FIELDS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                          {dup&&<span style={{fontSize:11,color:'var(--danger)'}}>⚠ Campo ya asignado</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Required fields check */}
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['codigo','nombre','precio'].map(f=>{
                const ok = Object.values(mapping).includes(f);
                return <span key={f} style={{fontSize:12,padding:'3px 10px',borderRadius:20,background:ok?'rgba(34,197,94,.12)':'rgba(239,68,68,.1)',color:ok?'var(--success,#22c55e)':'var(--danger)',border:`1px solid ${ok?'var(--success,#22c55e)':'var(--danger)'}`}}>{ok?'✓':''} {f} *</span>;
              })}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>setImportStep(1)}>← Atrás</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing?<><span className="spinner" style={{width:14,height:14,borderWidth:2,marginRight:6}}/>Importando…</>:<><Upload size={15}/> Importar {preview.total_rows} productos</>}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Result ── */}
        {importStep===3&&importResult&&(
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{
              borderRadius:10, border:`1px solid ${importResult.errors?.length&&importResult.created===0&&importResult.updated===0?'var(--danger)':importResult.errors?.length?'var(--warning,#f59e0b)':'var(--success,#22c55e)'}`,
              overflow:'hidden',
            }}>
              <div style={{padding:'14px 16px', background: importResult.created>0||importResult.updated>0?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)', display:'flex',alignItems:'center',gap:12}}>
                {importResult.created>0||importResult.updated>0
                  ?<CheckCircle size={22} color="var(--success,#22c55e)"/>
                  :<AlertCircle size={22} color="var(--danger)"/>}
                <div>
                  <p style={{margin:0,fontWeight:700,color:'var(--text-primary)'}}>{importResult.message}</p>
                  <p style={{margin:0,fontSize:12,color:'var(--text-muted)'}}>
                    {importResult.created} creados · {importResult.updated} actualizados
                    {importResult.errors?.length?` · ${importResult.errors.length} errores`:''}
                  </p>
                </div>
              </div>
              {importResult.errors?.length>0&&(
                <div style={{maxHeight:200,overflowY:'auto',padding:'8px 16px'}}>
                  {importResult.errors.map((e,i)=>(
                    <div key={i} style={{fontSize:12,padding:'5px 0',borderBottom:'1px solid var(--border)',color:'var(--text-muted)'}}>
                      <span style={{color:'var(--danger)',fontWeight:700}}>Fila {e.fila}</span>
                      {e.codigo&&<span> ({e.codigo})</span>} — {e.error}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={()=>{setImportStep(1);setImportFile(null);setPreview(null);setImportResult(null);setMapping({});}}>
                Importar otro archivo
              </button>
              <button className="btn btn-primary" onClick={()=>setShowImport(false)}>Cerrar</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
