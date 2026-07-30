import { useRegisterSW } from 'virtual:pwa-register/react'

export function PwaPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed', error)
    }
  })

  if (!offlineReady && !needRefresh) return null

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  return (
    <aside className="toast" role="status" aria-live="polite">
      <span className="toast__mark">{needRefresh ? '↑' : '✓'}</span>
      <div>
        <strong>{needRefresh ? 'Fresh supplies arrived' : 'Ready beyond the grid'}</strong>
        <p>{needRefresh ? 'A new zombuddy version is ready.' : 'zombuddy now works offline.'}</p>
      </div>
      {needRefresh && <button className="button button--small" onClick={() => updateServiceWorker(true)}>Update</button>}
      <button className="button button--ghost button--small" onClick={close}>Dismiss</button>
    </aside>
  )
}
