import { useSyncExternalStore } from 'react'
import type { TabId } from '../types'

const tabs = new Set<TabId>(['dashboard', 'books', 'recipes', 'seeds', 'vhs', 'tools', 'runs'])

const readTab = (): TabId => {
  const hash = window.location.hash.replace(/^#\/?/, '') as TabId
  return tabs.has(hash) ? hash : 'dashboard'
}

const subscribe = (listener: () => void) => {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}

export function useHashTab(): TabId {
  return useSyncExternalStore(subscribe, readTab, () => 'dashboard')
}

export function navigate(tab: TabId) {
  window.location.hash = tab
}
