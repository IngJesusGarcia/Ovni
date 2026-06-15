import { create } from 'zustand';
import api from '../api/axios';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutos

export const useStockAlertStore = create((set, get) => ({
  count: 0,
  lastChecked: null,
  _timerId: null,

  fetchCount: async () => {
    try {
      const res = await api.get('/products?low_stock=1&per_page=1');
      set({ count: res.data.total ?? 0, lastChecked: new Date() });
    } catch {
      // silently ignore (e.g. if user is logged out)
    }
  },

  startPolling: () => {
    const { _timerId, fetchCount } = get();
    if (_timerId) return; // already polling

    // fetch immediately
    fetchCount();

    const id = setInterval(() => {
      fetchCount();
    }, POLL_INTERVAL);

    set({ _timerId: id });
  },

  stopPolling: () => {
    const { _timerId } = get();
    if (_timerId) {
      clearInterval(_timerId);
      set({ _timerId: null });
    }
  },
}));
