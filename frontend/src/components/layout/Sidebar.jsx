import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Package, Layers,
  DollarSign, Users, BarChart3, LogOut, AlertTriangle, Tag
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filtered = navItems.filter(item => !item.roles || item.roles.includes(user?.role));

  // En móvil mostramos máximo 5 items para que quepan bien
  const mobileItems = filtered.slice(0, 5);

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
        {mobileItems.map(item => (
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
        <button
          className="bottom-nav-item"
          onClick={handleLogout}
          style={{ background: 'none', border: 'none' }}
        >
          <LogOut size={20} />
          <span>Salir</span>
        </button>
      </nav>
    </>
  );
}
