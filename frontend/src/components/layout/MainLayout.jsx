import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
