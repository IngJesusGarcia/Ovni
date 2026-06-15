import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStockAlertStore } from '../../stores/stockAlertStore';

export default function MainLayout() {
  const startPolling = useStockAlertStore(s => s.startPolling);
  const stopPolling  = useStockAlertStore(s => s.stopPolling);

  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
