import { create } from 'zustand';

const usePosStore = create((set, get) => ({
  // Cart items: [{ product_id, code, name, price, cost, quantity, unit, discount, subtotal }]
  items: [],
  client: null,
  discount: 0,
  selectedIndex: 0,

  // Computed
  get subtotal() {
    return get().items.reduce((sum, item) => sum + item.subtotal, 0);
  },

  getSubtotal: () => get().items.reduce((sum, item) => sum + item.subtotal, 0),
  getTotal: () => {
    const subtotal = get().items.reduce((sum, item) => sum + item.subtotal, 0);
    return subtotal - get().discount;
  },
  getItemCount: () => get().items.length,

  // Add product to cart
  addItem: (product, quantity = 1) => set((state) => {
    const existingIndex = state.items.findIndex(i => 
      i.product_id === product.id && 
      i.name === product.name && 
      i.price === product.price
    );

    if (existingIndex >= 0) {
      const updated = [...state.items];
      const item = { ...updated[existingIndex] };
      item.quantity += quantity;
      item.subtotal = (item.price * item.quantity) - item.discount;
      updated[existingIndex] = item;
      return { items: updated, selectedIndex: existingIndex };
    }

    const newItem = {
      product_id: product.id,
      code: product.code,
      name: product.name,
      price: product.price,
      cost: product.cost,
      quantity,
      unit: product.unit,
      discount: 0,
      subtotal: product.price * quantity,
    };

    return {
      items: [...state.items, newItem],
      selectedIndex: state.items.length,
    };
  }),

  // Update quantity
  updateQuantity: (index, quantity) => set((state) => {
    if (index < 0 || index >= state.items.length) return state;
    const updated = [...state.items];
    const item = { ...updated[index] };
    item.quantity = quantity;
    item.subtotal = (item.price * item.quantity) - item.discount;
    updated[index] = item;
    return { items: updated };
  }),

  // Update price
  updatePrice: (index, price) => set((state) => {
    if (index < 0 || index >= state.items.length) return state;
    const updated = [...state.items];
    const item = { ...updated[index] };
    item.price = price;
    item.subtotal = (item.price * item.quantity) - item.discount;
    updated[index] = item;
    return { items: updated };
  }),

  // Update item discount
  updateItemDiscount: (index, discount) => set((state) => {
    if (index < 0 || index >= state.items.length) return state;
    const updated = [...state.items];
    const item = { ...updated[index] };
    item.discount = discount;
    item.subtotal = (item.price * item.quantity) - item.discount;
    updated[index] = item;
    return { items: updated };
  }),

  // Remove item
  removeItem: (index) => set((state) => {
    const updated = state.items.filter((_, i) => i !== index);
    return {
      items: updated,
      selectedIndex: Math.min(state.selectedIndex, Math.max(0, updated.length - 1)),
    };
  }),

  // Set selected index
  setSelectedIndex: (index) => set({ selectedIndex: index }),

  // Set client
  setClient: (client) => set({ client }),

  // Set global discount
  setDiscount: (discount) => set({ discount }),

  // Clear cart
  clearCart: () => set({ items: [], client: null, discount: 0, selectedIndex: 0 }),

  // Load held sale into cart
  loadHeldSale: (data) => set({
    items: data.items || [],
    client: data.client_id ? { id: data.client_id } : null,
    discount: data.discount || 0,
    selectedIndex: 0,
  }),
}));

export default usePosStore;
