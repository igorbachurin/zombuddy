import { useState, useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, setActiveRun } from './db'
import type { ProgressRecord, RecentChange, RunRecord, TabId } from './types'
import { useHashTab, navigate } from './hooks/useHashTab'
import { DashboardPage } from './pages/DashboardPage'
import { MediaPage } from './pages/MediaPage'
import { ToolsPage } from './pages/ToolsPage'
import { RunsPage } from './pages/RunsPage'
import { Icon } from './components/Icon'
import { Onboarding } from './components/Onboarding'
import { PwaPrompt } from './components/PwaPrompt'

const navigation: Array<{ id: TabId; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'books', label: 'Books' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'seeds', label: 'Seeds' },
  { id: 'vhs', label: 'VHS' },
  { id: 'tools', label: 'Tools' },
  { id: 'runs', label: 'Runs' }
]

const STORAGE_WARNING_DISMISSED_KEY = 'zombuddy:storage-warning-dismissed'

const shouldShowStorageWarning = () => {
  try {
    return localStorage.getItem(STORAGE_WARNING_DISMISSED_KEY) !== '1'
  } catch {
    return true
  }
}

const subscribeOnline = (listener: () => void) => {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

export default function App() {
  const tab = useHashTab()
  const [showStorageWarning, setShowStorageWarning] = useState(shouldShowStorageWarning)
  const runs = useLiveQuery(() => db.runs.orderBy('updatedAt').reverse().toArray(), [])
  const activePreference = useLiveQuery(() => db.preferences.get('activeRunId'), [])
  const activeRuns = runs?.filter((run) => !run.archivedAt) ?? []
  const activeRun: RunRecord | undefined =
    activeRuns.find((run) => run.id === activePreference?.value) ?? activeRuns[0]
  const progress = useLiveQuery<ProgressRecord[], ProgressRecord[]>(
    () => activeRun ? db.progress.where('runId').equals(activeRun.id).toArray() : Promise.resolve([] as ProgressRecord[]),
    [activeRun?.id],
    []
  )
  const recent = useLiveQuery<RecentChange[], RecentChange[]>(
    () => activeRun ? db.recent.where('runId').equals(activeRun.id).reverse().sortBy('changedAt') : Promise.resolve([] as RecentChange[]),
    [activeRun?.id],
    []
  )
  const isOnline = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const dismissStorageWarning = () => {
    try {
      localStorage.setItem(STORAGE_WARNING_DISMISSED_KEY, '1')
    } catch {
      // The banner can still be dismissed for this session if storage is unavailable.
    }
    setShowStorageWarning(false)
  }

  if (!runs) return <div className="app-loading"><span>z</span><p>Opening field notebook…</p></div>

  const page = tab === 'runs'
    ? <RunsPage runs={runs} activeRunId={activeRun?.id} />
    : !activeRun
      ? <NoActiveRun />
      : tab === 'dashboard'
        ? <DashboardPage run={activeRun} progress={progress} recent={recent} />
        : tab === 'books'
          ? <MediaPage section="books" runId={activeRun.id} progress={progress} />
          : tab === 'recipes'
            ? <MediaPage section="recipes" runId={activeRun.id} progress={progress} />
            : tab === 'seeds'
              ? <MediaPage section="seeds" runId={activeRun.id} progress={progress} />
              : tab === 'vhs'
                ? <MediaPage section="vhs" runId={activeRun.id} progress={progress} />
                : <ToolsPage runId={activeRun.id} progress={progress} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('dashboard')} aria-label="zombuddy dashboard">
          <span className="brand__mark">z</span>
          <span><strong>zombuddy</strong><small>run companion</small></span>
        </button>
        <nav aria-label="Primary navigation">
          {navigation.map((item) => (
            <button key={item.id} className={tab === item.id ? 'is-active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
              <Icon name={item.id} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar__foot">
          <span className={`connection-dot ${isOnline ? '' : 'is-offline'}`} />
          <span><strong>{isOnline ? 'Local save active' : 'Offline mode'}</strong><small>Build 42.20</small></span>
        </div>
      </aside>

      <div className="app-column">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => navigate('dashboard')} aria-label="zombuddy dashboard"><span>z</span><strong>zombuddy</strong></button>
          {activeRun ? (
            <label className="run-select">
              <span>Current run</span>
              <select value={activeRun.id} onChange={async (event) => { await setActiveRun(event.target.value); navigate('dashboard') }}>
                {activeRuns.map((run) => <option key={run.id} value={run.id}>{run.name}</option>)}
              </select>
            </label>
          ) : <span className="no-run-label">No active run</span>}
          <span className="build-badge">B42.20</span>
        </header>
        <main id="main-content" tabIndex={-1}>{page}</main>
        {showStorageWarning && (
          <aside className="storage-warning" role="note">
            <span>!</span>
            <p><strong>Local-only notebook.</strong> Browser storage can be cleared—export backups often.</p>
            <div className="storage-warning__actions">
              <button onClick={() => navigate('runs')}>Backups</button>
              <button className="storage-warning__dismiss" aria-label="Dismiss storage warning" onClick={dismissStorageWarning}>
                <Icon name="close" />
              </button>
            </div>
          </aside>
        )}
      </div>

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navigation.map((item) => (
          <button key={item.id} className={tab === item.id ? 'is-active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
            <Icon name={item.id} /><span>{item.label}</span>
          </button>
        ))}
      </nav>

      <Onboarding open={runs.length === 0} onCreated={() => navigate('dashboard')} />
      <PwaPrompt />
    </div>
  )
}

function NoActiveRun() {
  return (
    <div className="page no-active">
      <div className="empty-state">
        <span aria-hidden="true">×</span>
        <h1>No active field log</h1>
        <p>All runs are archived. Restore one or start a new run.</p>
        <button className="button button--primary" onClick={() => navigate('runs')}>Go to runs</button>
      </div>
    </div>
  )
}
