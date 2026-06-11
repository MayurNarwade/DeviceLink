import { create } from 'zustand';

const useUiStore = create((set) => ({
  darkMode: true,
  activePage: 'home',
  toasts: [],
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  setActivePage: (page) => set({ activePage: page }),
  addToast: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export default useUiStore;