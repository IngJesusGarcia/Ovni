import { useState, useRef, useEffect, useCallback } from 'react';
import api from '../api/axios';
import usePosStore from '../stores/posStore';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';
import BarcodeScanner from '../components/common/BarcodeScanner';
import toast, { Toaster } from 'react-hot-toast';
import { Search, Trash2, ShoppingCart, Pause, Play, X, Zap, UserCircle, CreditCard, ChevronDown, AlertCircle, Camera } from 'lucide-react';

export default function POS() {
  const [mobileTab, setMobileTab] = useState('search'); // 'search' | 'cart'
  const { user } = useAuth();
  const store = usePosStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [focusedResult, setFocusedResult] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [cashRegister, setCashRegister] = useState(null);
  const [paymentType, setPaymentType] = useState('efectivo');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [heldSales, setHeldSales] = useState([]);
  const [weightQty, setWeightQty] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  // Barcode camera scanner state
  const [showScanner, setShowScanner] = useState(false);

  // Fast product state
  const [showFastProduct, setShowFastProduct] = useState(false);
  const [fastProductName, setFastProductName] = useState('');
  const [fastProductPrice, setFastProductPrice] = useState('');

  // Client selector state
  const [clientSearch, setClientSearch] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const clientSearchRef = useRef(null);
  const clientDropdownRef = useRef(null);

  // Pay balance modal (quick payment from POS)
  const [showPayBalance, setShowPayBalance] = useState(false);
  const [payBalanceAmount, setPayBalanceAmount] = useState('');
  const [payingBalance, setPayingBalance] = useState(false);

  const searchRef = useRef(null);

  // Load current cash register
  useEffect(() => {
    api.get('/cash-registers/current').then(res => setCashRegister(res.data.cash_register));
  }, []);

  // Search products
  useEffect(() => {
    if (searchTerm.length < 1) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      api.get(`/products/search?q=${encodeURIComponent(searchTerm)}`)
        .then(res => { setSearchResults(res.data); setFocusedResult(0); });
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search clients
  useEffect(() => {
    if (clientSearch.length < 1) { setClientResults([]); return; }
    setClientSearchLoading(true);
    const timer = setTimeout(() => {
      api.get(`/clients?search=${encodeURIComponent(clientSearch)}&per_page=8`)
        .then(res => {
          // Exclude client id=1 (Público General) from search results
          const list = (res.data.data || res.data || []).filter(c => c.id !== 1);
          setClientResults(list);
        })
        .finally(() => setClientSearchLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // Close client dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target)) {
        setShowClientSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Add product to cart
  const addProduct = useCallback((product) => {
    if (product.unit === 'kg') {
      setPendingProduct(product);
      setWeightQty('');
      setShowWeightModal(true);
      return;
    }
    if (product.use_inventory && product.stock <= 0) { toast.error('Producto sin stock'); return; }
    store.addItem(product, 1);
    setSearchTerm('');
    setSearchResults([]);
    toast.success(`${product.name} agregado`, { duration: 1500 });
    searchRef.current?.focus();
  }, [store]);

  // Handle barcode detected from camera
  const handleScan = useCallback((code) => {
    setShowScanner(false);
    setSearchTerm(code);
    // Buscar por código de barras directamente
    api.get(`/products/barcode/${encodeURIComponent(code)}`)
      .then(res => addProduct(res.data))
      .catch(() => {
        // Si no encuentra por barcode exacto, poner en el buscador
        toast('Código escaneado, refinando búsqueda...', { icon: '🔍', duration: 2000 });
        api.get(`/products/search?q=${encodeURIComponent(code)}`)
          .then(res => {
            if (res.data.length === 1) {
              addProduct(res.data[0]);
            } else if (res.data.length > 1) {
              setSearchResults(res.data);
              setFocusedResult(0);
            } else {
              toast.error('Producto no encontrado');
            }
          });
      });
  }, [addProduct]);

  const addWeightProduct = () => {
    const qty = parseFloat(weightQty);
    if (!qty || qty <= 0) { toast.error('Cantidad inválida'); return; }
    if (qty > pendingProduct.stock) { toast.error('Stock insuficiente'); return; }
    store.addItem(pendingProduct, qty);
    setShowWeightModal(false);
    setPendingProduct(null);
    setSearchTerm('');
    setSearchResults([]);
    toast.success(`${pendingProduct.name} agregado (${qty} kg)`);
    searchRef.current?.focus();
  };

  const addFastProduct = () => {
    if (!fastProductName.trim()) { toast.error('Ingresa un nombre para el producto'); return; }
    const price = parseFloat(fastProductPrice);
    if (isNaN(price) || price < 0) { toast.error('Ingresa un precio válido'); return; }

    const genericProduct = {
      id: 102,
      code: 'RAPIDO',
      name: fastProductName.trim(),
      price: price,
      cost: 0,
      stock: 99999,
      unit: 'pieza'
    };

    store.addItem(genericProduct, 1);
    setShowFastProduct(false);
    setFastProductName('');
    setFastProductPrice('');
    toast.success('Producto rápido agregado');
    searchRef.current?.focus();
  };

  // Select client from dropdown
  const selectClient = (client) => {
    store.setClient(client);
    setShowClientSearch(false);
    setClientSearch('');
    setClientResults([]);
    // If credit was selected but we now have no client, reset
    if (paymentType === 'credito') setPaymentType('efectivo');
  };

  const clearClient = () => {
    store.setClient(null);
    if (paymentType === 'credito') setPaymentType('efectivo');
  };

  // Pay client balance from POS
  const handlePayBalance = async () => {
    const amount = parseFloat(payBalanceAmount);
    if (!amount || amount <= 0) { toast.error('Ingresa un monto válido'); return; }
    setPayingBalance(true);
    try {
      const res = await api.post(`/clients/${store.client.id}/pay-balance`, { amount });
      toast.success(res.data.message);
      // Update client info in store with fresh data
      store.setClient(res.data.client);
      setShowPayBalance(false);
      setPayBalanceAmount('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar abono');
    } finally {
      setPayingBalance(false);
    }
  };

  // Keyboard handler
  useEffect(() => {
    const handler = (e) => {
      if (showPayment || showWeightModal) return;

      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F4') {
        e.preventDefault();
        const idx = store.selectedIndex;
        if (store.items[idx]) {
          const newPrice = prompt('Nuevo precio:', store.items[idx].price);
          if (newPrice !== null && !isNaN(newPrice)) store.updatePrice(idx, parseFloat(newPrice));
        }
      }
      if (e.key === 'F6') { e.preventDefault(); store.removeItem(store.selectedIndex); }
      if (e.key === 'F8') { e.preventDefault(); if (store.items.length > 0 && cashRegister) setShowPayment(true); }
      if (e.key === 'Escape') { setSearchTerm(''); setSearchResults([]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store, showPayment, showWeightModal, cashRegister]);

  // Search keyboard nav
  const handleSearchKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedResult(f => Math.min(f + 1, searchResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedResult(f => Math.max(f - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0) {
        addProduct(searchResults[focusedResult]);
      } else if (searchTerm) {
        api.get(`/products/barcode/${encodeURIComponent(searchTerm)}`)
          .then(res => addProduct(res.data))
          .catch(() => toast.error('Producto no encontrado'));
      }
    }
  };

  // Process sale
  const processSale = async () => {
    if (processing) return;
    // Validate credit
    if (paymentType === 'credito') {
      if (!store.client || store.client.id === 1) {
        toast.error('El crédito solo está disponible para clientes registrados');
        return;
      }
      const available = (Number(store.client.credit_limit) || 0) - (Number(store.client.balance) || 0);
      if (total > available) {
        toast.error(`Crédito insuficiente. Disponible: $${available.toFixed(2)}`);
        return;
      }
    }

    setProcessing(true);
    try {
      const payload = {
        items: store.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
          name: i.name,
          discount: i.discount,
        })),
        client_id: store.client?.id || null,
        payment_type: paymentType,
        payment_details: paymentType === 'efectivo' ? { received: parseFloat(cashReceived) || 0 } : null,
        discount: store.discount,
        cash_register_id: cashRegister?.id,
      };
      const res = await api.post('/sales', payload);
      toast.success(`Venta ${res.data.sale.ticket_number} registrada`);
      // Close modal and reset state FIRST, then clear cart
      // This avoids a crash where the modal is still open but store.client becomes null
      setShowPayment(false);
      setCashReceived('');
      setPaymentType('efectivo');
      store.clearCart();
      searchRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al procesar venta');
    } finally {
      setProcessing(false);
    }
  };

  // Hold sale
  const holdSale = async () => {
    if (store.items.length === 0) return;
    try {
      await api.post('/sales/hold', {
        items: store.items,
        client_id: store.client?.id || null,
        subtotal: store.getSubtotal(),
        discount: store.discount,
        total: store.getTotal(),
      });
      toast.success('Venta guardada en espera');
      store.clearCart();
    } catch (err) {
      toast.error('Error al guardar venta');
    }
  };

  const loadHeldSales = async () => {
    const res = await api.get('/sales/held');
    setHeldSales(res.data);
    setShowHeld(true);
  };

  const resumeHeld = async (id) => {
    try {
      const res = await api.post(`/sales/${id}/resume`);
      store.loadHeldSale(res.data.data);
      setShowHeld(false);
      toast.success('Venta recuperada');
    } catch (err) {
      toast.error('Error al recuperar venta');
    }
  };

  const total = store.getTotal();
  const change = parseFloat(cashReceived) - total;

  // Client helpers
  const hasRealClient = store.client && store.client.id !== 1;
  const clientAvailableCredit = hasRealClient
    ? Math.max(0, (Number(store.client.credit_limit) || 0) - (Number(store.client.balance) || 0))
    : 0;
  const creditExceeded = paymentType === 'credito' && total > clientAvailableCredit;

  if (!cashRegister) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
        <ShoppingCart size={48} color="var(--text-muted)" />
        <h2 style={{ color: 'var(--text-secondary)' }}>No hay caja abierta</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Ve a la sección de Caja para abrir una.</p>
      </div>
    );
  }

  return (
    <div className="pos-layout">
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' } }} />

      {/* ── Mobile Tab Switcher ── */}
      <div className="pos-tabs">
        <div
          className={`pos-tab${mobileTab === 'search' ? ' active' : ''}`}
          onClick={() => setMobileTab('search')}
        >
          <Search size={15} /> Buscar
        </div>
        <div
          className={`pos-tab${mobileTab === 'cart' ? ' active' : ''}`}
          onClick={() => setMobileTab('cart')}
        >
          <ShoppingCart size={15} />
          Carrito
          {store.items.length > 0 && (
            <span className="badge badge-accent" style={{ marginLeft: 4, fontSize: 10 }}>
              {store.items.length}
            </span>
          )}
        </div>
      </div>

      {/* Left: Search + Cart Items Area */}
      <div className={`pos-products pos-panel${mobileTab === 'search' ? ' visible' : ''}`}>
        <div className="pos-search">
          <Search size={18} className="pos-search-icon" />
          <input
            ref={searchRef}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Escanear código o buscar producto... (F2)"
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="pos-search-results">
              {searchResults.map((p, i) => (
                <div
                  key={p.id}
                  className={`pos-search-item${i === focusedResult ? ' focused' : ''}`}
                  onClick={() => addProduct(p)}
                >
                  <div>
                    <div className="pos-search-item-name">{p.name}</div>
                    <div className="pos-search-item-meta">{p.code} · Stock: {Number(p.stock).toFixed(p.unit === 'kg' ? 3 : 0)} {p.unit}</div>
                  </div>
                  <strong style={{ color: 'var(--accent)' }}>${Number(p.price).toFixed(2)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {/* Botón escanear con cámara — visible siempre pero destacado en móvil */}
          <button className="pos-scan-btn" onClick={() => setShowScanner(true)}>
            <Camera size={16} /> Escanear
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowFastProduct(true)}>
            <Zap size={14} /> Prod. Rápido
          </button>
          <button className="btn btn-secondary btn-sm" onClick={holdSale} disabled={store.items.length === 0}>
            <Pause size={14} /> Espera
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadHeldSales}>
            <Play size={14} /> Recuperar
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => store.clearCart()} disabled={store.items.length === 0}>
            <X size={14} /> Limpiar
          </button>
          <div className="kbd-hints" style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
            <span className="kbd">F2</span> Buscar
            <span className="kbd">F4</span> Precio
            <span className="kbd">F6</span> Eliminar
            <span className="kbd">F8</span> Cobrar
          </div>
        </div>

        {/* Cart items */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {store.items.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={48} />
              <p>Escanea o busca un producto para comenzar</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Producto</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th>
                </tr>
              </thead>
              <tbody>
                {store.items.map((item, i) => (
                  <tr
                    key={i}
                    onClick={() => store.setSelectedIndex(i)}
                    style={i === store.selectedIndex ? { background: 'var(--accent-soft)' } : {}}
                  >
                    <td>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.code}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        $
                        <input
                          type="number"
                          value={item.price}
                          onChange={e => store.updatePrice(i, parseFloat(e.target.value) || 0)}
                          style={{ width: 80, marginLeft: 2, padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                          min="0"
                          step="0.01"
                          onClick={(e) => e.target.select()}
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => store.updateQuantity(i, parseFloat(e.target.value) || 0)}
                        style={{ width: 70, textAlign: 'center' }}
                        min="0.001"
                        step={item.unit === 'kg' ? '0.001' : '1'}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>{item.unit}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>${Number(item.subtotal).toFixed(2)}</td>
                    <td>
                      <button className="btn btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); store.removeItem(i); }}>
                        <Trash2 size={14} color="var(--danger)" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: Cart Summary */}
      <div className={`pos-cart pos-panel${mobileTab === 'cart' ? ' visible' : ''}`}>
        <div className="pos-cart-header">
          <span>Resumen</span>
          <span className="badge badge-accent">{store.items.length} items</span>
        </div>

        {/* ── Client Selector ── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
            Cliente
          </div>

          {store.client ? (
            /* Selected client card */
            <div style={{
              background: hasRealClient ? 'rgba(6,182,212,0.08)' : 'var(--bg-hover)',
              border: `1px solid ${hasRealClient ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8, padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <UserCircle size={18} color={hasRealClient ? 'var(--accent)' : 'var(--text-muted)'} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {store.client.name}
                    </div>
                    {hasRealClient && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Crédito disp.: <span style={{ color: clientAvailableCredit > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          ${clientAvailableCredit.toFixed(2)}
                        </span>
                        {Number(store.client?.balance) > 0 && (
                          <span style={{ color: 'var(--danger)', marginLeft: 6 }}>· Saldo: ${Number(store.client?.balance || 0).toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {hasRealClient && Number(store.client?.balance) > 0 && (
                    <button
                      className="btn btn-icon btn-sm"
                      title="Registrar abono"
                      onClick={() => { setPayBalanceAmount(''); setShowPayBalance(true); }}
                      style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid var(--success)' }}
                    >
                      <CreditCard size={13} color="var(--success)" />
                    </button>
                  )}
                  <button className="btn btn-icon btn-sm" title="Cambiar cliente" onClick={clearClient}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Client search */
            <div ref={clientDropdownRef} style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  ref={clientSearchRef}
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowClientSearch(true); }}
                  onFocus={() => setShowClientSearch(true)}
                  placeholder="Buscar cliente..."
                  style={{ paddingLeft: 30, width: '100%', fontSize: 13, padding: '8px 8px 8px 30px' }}
                />
                {clientSearchLoading && (
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                    <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  </div>
                )}
              </div>

              {showClientSearch && clientSearch.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 8, overflow: 'hidden', marginTop: 4,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {clientResults.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                      {clientSearchLoading ? 'Buscando...' : 'Sin resultados'}
                    </div>
                  ) : clientResults.map(c => (
                    <div
                      key={c.id}
                      onClick={() => selectClient(c)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {c.phone && <span>{c.phone} · </span>}
                        Crédito disp.: <span style={{ color: Math.max(0, (c.credit_limit || 0) - (c.balance || 0)) > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                          ${Math.max(0, (Number(c.credit_limit) || 0) - (Number(c.balance) || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {/* ── End Client Selector ── */}

        <div style={{ flex: 1 }} />
        <div className="pos-cart-footer">
          <div className="pos-total-row"><span>Subtotal</span><span>${store.getSubtotal().toFixed(2)}</span></div>
          {store.discount > 0 && <div className="pos-total-row"><span>Descuento</span><span style={{ color: 'var(--danger)' }}>-${store.discount.toFixed(2)}</span></div>}
          <div className="pos-total-row total"><span>TOTAL</span><span>${total.toFixed(2)}</span></div>
          <button
            className="pos-pay-btn"
            onClick={() => setShowPayment(true)}
            disabled={store.items.length === 0}
          >
            Cobrar
          </button>
        </div>
      </div>

      {/* ── Barcode Camera Scanner ── */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── Payment Modal ── */}
      <Modal isOpen={showPayment} onClose={() => { setShowPayment(false); setPaymentType('efectivo'); }} title="Cobrar Venta">
        <div className="payment-amount">${total.toFixed(2)}</div>

        {/* Client info in payment */}
        {store.client && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            padding: '8px 12px', borderRadius: 8,
            background: hasRealClient ? 'rgba(6,182,212,0.08)' : 'var(--bg-hover)',
            border: `1px solid ${hasRealClient ? 'rgba(6,182,212,0.3)' : 'var(--border)'}`,
          }}>
            <UserCircle size={16} color={hasRealClient ? 'var(--accent)' : 'var(--text-muted)'} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{store.client.name}</span>
            {hasRealClient && (
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                Créd. disp.: <strong style={{ color: clientAvailableCredit > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  ${clientAvailableCredit.toFixed(2)}
                </strong>
              </span>
            )}
          </div>
        )}

        <label className="form-label">Método de Pago</label>
        <div className="payment-methods">
          {['efectivo', 'tarjeta', 'transferencia', 'mixto'].map(m => (
            <div key={m} className={`payment-method${paymentType === m ? ' selected' : ''}`} onClick={() => setPaymentType(m)}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </div>
          ))}
          {/* Credit option — only for real clients */}
          <div
            className={`payment-method${paymentType === 'credito' ? ' selected' : ''}${!hasRealClient ? ' disabled' : ''}`}
            onClick={() => {
              if (!hasRealClient) {
                toast.error('Selecciona un cliente registrado para dar crédito');
                return;
              }
              setPaymentType(paymentType === 'credito' ? 'efectivo' : 'credito');
            }}
            style={{
              gridColumn: 'span 2',
              opacity: hasRealClient ? 1 : 0.45,
              cursor: hasRealClient ? 'pointer' : 'not-allowed',
              borderColor: paymentType === 'credito' ? 'var(--warning)' : undefined,
              background: paymentType === 'credito' ? 'rgba(245,158,11,0.12)' : undefined,
              color: paymentType === 'credito' ? 'var(--warning)' : undefined,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <CreditCard size={14} />
            Crédito
            {!hasRealClient && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>(requiere cliente)</span>}
          </div>
        </div>

        {/* Credit warning */}
        {paymentType === 'credito' && hasRealClient && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            padding: '10px 14px', borderRadius: 8,
            background: creditExceeded ? 'var(--danger-soft)' : 'var(--warning-soft)',
            border: `1px solid ${creditExceeded ? 'var(--danger)' : 'var(--warning)'}`,
          }}>
            <AlertCircle size={15} color={creditExceeded ? 'var(--danger)' : 'var(--warning)'} />
            <div style={{ fontSize: 13 }}>
              {creditExceeded
                ? <><strong style={{ color: 'var(--danger)' }}>Crédito insuficiente.</strong> Disponible: ${clientAvailableCredit.toFixed(2)}, necesario: ${total.toFixed(2)}</>
                : <>Se agregarán <strong style={{ color: 'var(--warning)' }}>${total.toFixed(2)}</strong> al saldo del cliente. Quedará con ${(Number(store.client?.balance || 0) + total).toFixed(2)} de deuda.</>
              }
            </div>
          </div>
        )}

        {paymentType === 'efectivo' && (
          <div className="form-group">
            <label className="form-label">Efectivo Recibido</label>
            <input
              className="form-input"
              type="number"
              value={cashReceived}
              onChange={e => setCashReceived(e.target.value)}
              placeholder="0.00"
              autoFocus
              min="0"
              step="0.01"
              onKeyDown={e => { if (e.key === 'Enter' && change >= 0) processSale(); }}
            />
            {cashReceived && change >= 0 && (
              <div className="payment-change" style={{ marginTop: 12 }}>
                Cambio: ${change.toFixed(2)}
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => { setShowPayment(false); setPaymentType('efectivo'); }}>Cancelar</button>
          <button
            className="btn btn-success btn-lg"
            onClick={processSale}
            disabled={
              processing ||
              (paymentType === 'efectivo' && change < 0) ||
              (paymentType === 'credito' && creditExceeded)
            }
          >
            {processing ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      </Modal>

      {/* ── Pay Balance Modal (from POS) ── */}
      <Modal isOpen={showPayBalance} onClose={() => setShowPayBalance(false)} title={`Abonar — ${store.client?.name}`}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: 'var(--danger-soft)', borderRadius: 8, marginBottom: 16,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Saldo pendiente</span>
          <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--danger)' }}>
            ${Number(store.client?.balance || 0).toFixed(2)}
          </span>
        </div>
        <div className="form-group">
          <label className="form-label">Monto de Abono ($)</label>
          <input
            className="form-input"
            type="number"
            value={payBalanceAmount}
            onChange={e => setPayBalanceAmount(e.target.value)}
            placeholder="0.00"
            min="0.01"
            step="0.01"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handlePayBalance(); }}
          />
          {payBalanceAmount && parseFloat(payBalanceAmount) > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Saldo restante: <strong style={{ color: 'var(--success)' }}>
                ${Math.max(0, Number(store.client?.balance || 0) - parseFloat(payBalanceAmount)).toFixed(2)}
              </strong>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowPayBalance(false)}>Cancelar</button>
          <button
            className="btn btn-success"
            onClick={handlePayBalance}
            disabled={payingBalance || !payBalanceAmount || parseFloat(payBalanceAmount) <= 0}
          >
            {payingBalance
              ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />Registrando…</>
              : <><CreditCard size={14} /> Registrar Abono</>
            }
          </button>
        </div>
      </Modal>

      {/* Weight Modal */}
      <Modal isOpen={showWeightModal} onClose={() => setShowWeightModal(false)} title={`Cantidad — ${pendingProduct?.name}`}>
        <div className="form-group">
          <label className="form-label">Peso en kg (stock: {pendingProduct?.stock})</label>
          <input
            className="form-input"
            type="number"
            value={weightQty}
            onChange={e => setWeightQty(e.target.value)}
            placeholder="0.000"
            autoFocus
            step="0.001"
            min="0.001"
            onKeyDown={e => { if (e.key === 'Enter') addWeightProduct(); }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowWeightModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={addWeightProduct}>Agregar</button>
        </div>
      </Modal>

      {/* Fast Product Modal */}
      <Modal isOpen={showFastProduct} onClose={() => setShowFastProduct(false)} title="Agregar Producto Rápido">
        <div className="form-group">
          <label className="form-label">Nombre del producto / Descripción</label>
          <input
            className="form-input"
            value={fastProductName}
            onChange={e => setFastProductName(e.target.value)}
            placeholder="Ej: Envío, Venta general, Flete..."
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') document.getElementById('fastPrice').focus(); }}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Precio ($)</label>
          <input
            id="fastPrice"
            className="form-input"
            type="number"
            value={fastProductPrice}
            onChange={e => setFastProductPrice(e.target.value)}
            placeholder="0.00"
            min="0"
            step="0.01"
            onKeyDown={e => { if (e.key === 'Enter') addFastProduct(); }}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowFastProduct(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={addFastProduct}>Agregar a la venta</button>
        </div>
      </Modal>

      {/* Held Sales Modal */}
      <Modal isOpen={showHeld} onClose={() => setShowHeld(false)} title="Ventas en Espera">
        {heldSales.length === 0 ? (
          <div className="empty-state"><p>No hay ventas en espera</p></div>
        ) : (
          <div>
            {heldSales.map(h => (
              <div key={h.id} style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{h.items?.length || 0} productos — ${Number(h.total).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(h.created_at).toLocaleString('es-MX')}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => resumeHeld(h.id)}>Recuperar</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
