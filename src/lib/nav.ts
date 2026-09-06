// Navegación en memoria (sin persistir). Pila simple para el botón atrás.
import { create } from 'zustand'
import type { Screen } from './types'

export type NavParams = Record<string, string>

export interface NavState {
  screen: Screen
  params?: NavParams
  history: { screen: Screen; params?: NavParams }[]
  go: (screen: Screen, params?: NavParams) => void
  back: () => void
  reset: () => void
}

const HOME: Screen = 'today'

export const useNav = create<NavState>((set, get) => ({
  screen: HOME,
  params: undefined,
  history: [],
  go: (screen, params) => {
    const { screen: current, params: currentParams, history } = get()
    if (current === screen && JSON.stringify(currentParams) === JSON.stringify(params)) return
    set({
      screen,
      params,
      history: [...history, { screen: current, params: currentParams }].slice(-20),
    })
  },
  back: () => {
    const { history } = get()
    const prev = history[history.length - 1]
    if (!prev) {
      set({ screen: HOME, params: undefined, history: [] })
      return
    }
    set({ screen: prev.screen, params: prev.params, history: history.slice(0, -1) })
  },
  reset: () => set({ screen: HOME, params: undefined, history: [] }),
}))
