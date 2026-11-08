import { create } from 'zustand';
import type { Machine, Anomaly, EnergyReading } from '@/data/mockData';

export type TimeFilter = 'day' | 'week' | 'month' | 'year';
export type Department = 'All' | 'Production' | 'Assembly' | 'Packaging' | 'Warehouse' | 'Office';

interface AppState {
  // Filters
  timeFilter: TimeFilter;
  selectedDepartment: Department;
  searchQuery: string;

  // Data
  machines: Machine[];
  anomalies: Anomaly[];
  readings: EnergyReading[];
  selectedMachine: Machine | null;

  // UI State
  sidebarCollapsed: boolean;
  chatbotOpen: boolean;
  isDarkMode: boolean;

  // Actions
  setTimeFilter: (filter: TimeFilter) => void;
  setSelectedDepartment: (dept: Department) => void;
  setSearchQuery: (query: string) => void;
  setSelectedMachine: (machine: Machine | null) => void;
  toggleSidebar: () => void;
  toggleChatbot: () => void;
  setDarkMode: (isDark: boolean) => void;
  resolveAnomaly: (id: string) => void;
  setMachines: (machines: Machine[]) => void;
  setAnomalies: (anomalies: Anomaly[]) => void;
  setReadings: (readings: EnergyReading[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  timeFilter: 'week',
  selectedDepartment: 'All',
  searchQuery: '',
  machines: [],
  anomalies: [],
  readings: [],
  selectedMachine: null,
  sidebarCollapsed: false,
  chatbotOpen: false,
  isDarkMode: localStorage.getItem('carbotrack_theme') === 'dark' || 
              (!localStorage.getItem('carbotrack_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),

  // Actions
  setTimeFilter: (filter) => set({ timeFilter: filter }),
  setSelectedDepartment: (dept) => set({ selectedDepartment: dept }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedMachine: (machine) => set({ selectedMachine: machine }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleChatbot: () => set((state) => ({ chatbotOpen: !state.chatbotOpen })),
  setDarkMode: (isDark) => {
    localStorage.setItem('carbotrack_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ isDarkMode: isDark });
  },
  resolveAnomaly: (id) => set((state) => ({
    anomalies: state.anomalies.map(a =>
      a.id === id ? { ...a, resolved: true } : a
    ),
  })),
  setMachines: (machines) => set({ machines }),
  setAnomalies: (anomalies) => set({ anomalies }),
  setReadings: (readings) => set({ readings }),
}));

