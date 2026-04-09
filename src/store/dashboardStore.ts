import { create } from 'zustand'
import { Platform } from '@/lib/types'

interface DashboardState {
  selectedPlatform: Platform | 'all'
  dateRange: 'today' | '7d' | '30d' | 'custom'
  sidebarOpen: boolean
  setSelectedPlatform: (platform: Platform | 'all') => void
  setDateRange: (range: 'today' | '7d' | '30d' | 'custom') => void
  toggleSidebar: () => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedPlatform: 'all',
  dateRange: 'today',
  sidebarOpen: true,
  setSelectedPlatform: (platform) => set({ selectedPlatform: platform }),
  setDateRange: (range) => set({ dateRange: range }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
