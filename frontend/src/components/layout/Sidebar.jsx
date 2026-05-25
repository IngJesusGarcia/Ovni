import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Package, Layers,
  DollarSign, Users, BarChart3, LogOut, AlertTriangle, Tag,
  Menu, X
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', short: 'Inicio', roles: ['admin'] },
  { to: '/pos', icon: ShoppingCart, label: 'Punto de Venta', short: 'POS' },
  { to: '/products', icon: Package, label: 'Productos', short: 'Productos' },
  { to: '/inventory', icon: Layers, label: 'Inventario', short: 'Inventario' },
  { to: '/pricing', icon: Tag, label: 'Etiquetado Inteligente', short: 'Precios' },
  { to: '/low-stock', icon: AlertTriangle, label: 'Bajo Stock', short: 'Stock' },
  { to: '/cash-register', icon: DollarSign, label: 'Caja', short: 'Caja' },
  { to: '/clients', icon: Users, label: 'Clientes', short: 'Clientes' },
  { to: '/reports', icon: BarChart3, label: 'Reportes', short: 'Reportes', roles: ['admin'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filtered = navItems.filter(item => !item.roles || item.roles.includes(user?.role));

  // En móvil: primeros 4 items en bottom bar + botón menú
  const mobileBarItems = filtered.slice(0, 4);

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">SICAR POS</div>
        <nav className="sidebar-nav">
          {filtered.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
            <div style={{ fontSize: 11 }}>{user?.role}</div>
          </div>
          <button className="btn btn-icon btn-secondary" onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="bottom-nav">
        {mobileBarItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.short}</span>
          </NavLink>
        ))}
        {/* Botón "Más" para abrir el drawer */}
        <button
          className={`bottom-nav-item${drawerOpen ? ' active' : ''}`}
          onClick={() => setDrawerOpen(true)}
          style={{ background: 'none', border: 'none' }}
        >
          <Menu size={20} />
          <span>Más</span>
        </button>
      </nav>

      {/* ── Mobile Full Menu Drawer ── */}
      {drawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="mobile-drawer" onClick={e => e.stopPropagation()}>
            {/* Drawer header */}
            <div className="mobile-drawer-header">
              <div className="sidebar-logo" style={{ fontSize: 16, padding: 0 }}>SICAR POS</div>
              <button className="btn btn-icon btn-secondary" onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* User info */}
            <div className="mobile-drawer-user">
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{user?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>

            {/* All nav items */}
            <nav className="mobile-drawer-nav">
              {filtered.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `mobile-drawer-link${isActive ? ' active' : ''}`}
                  onClick={() => setDrawerOpen(false)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Logout */}
            <div className="mobile-drawer-footer">
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>
                <LogOut size={16} />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
