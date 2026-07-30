import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ZodError } from 'zod'
import {
  createRun,
  deleteRun,
  exportBackup,
  renameRun,
  restoreBackup,
  setActiveRun,
  setRunArchived
} from '../db'
import { catalog } from '../data/catalog'
import { backupEnvelopeSchema, type BackupEnvelopeV1, type RunRecord } from '../types'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { navigate } from '../hooks/useHashTab'

export function RunsPage({
  runs,
  activeRunId
}: {
  runs: RunRecord[]
  activeRunId?: string
}) {
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<RunRecord | null>(null)
  const [deleting, setDeleting] = useState<RunRecord | null>(null)
  const [pendingBackup, setPendingBackup] = useState<BackupEnvelopeV1 | null>(null)
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const active = runs.filter((run) => !run.archivedAt)
  const archived = runs.filter((run) => run.archivedAt)

  const download = async () => {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `zombuddy-backup-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const chooseBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImportError('')
    try {
      const parsed: unknown = JSON.parse(await file.text())
      setPendingBackup(backupEnvelopeSchema.parse(parsed))
    } catch (error) {
      setImportError(error instanceof ZodError ? 'That file is JSON, but it is not a valid zombuddy backup.' : 'Could not read that backup file.')
    } finally {
      event.target.value = ''
    }
  }

  const confirmRestore = async () => {
    if (!pendingBackup) return
    await restoreBackup(pendingBackup, runs.length > 0)
    setPendingBackup(null)
  }

  return (
    <div className="page runs-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Runs & settings</p>
          <h1>Your field logs</h1>
          <p>Every run has its own clean checklist. Archive old stories without losing their marks.</p>
        </div>
        <button className="button button--primary" onClick={() => setShowNew(true)}><Icon name="plus" /> New run</button>
      </header>

      <section className="run-section">
        <div className="group-heading"><h2>Active runs</h2><span>{active.length}</span></div>
        <div className="run-list">
          {active.map((run) => (
            <article className={`run-card ${run.id === activeRunId ? 'is-current' : ''}`} key={run.id}>
              <div className="run-card__index" aria-hidden="true">{String(active.indexOf(run) + 1).padStart(2, '0')}</div>
              <div className="run-card__body">
                <div>
                  <div className="run-card__title">
                    <h3>{run.name}</h3>
                    {run.id === activeRunId && <span>Current</span>}
                  </div>
                  <p>{run.note || `Started ${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(run.createdAt))}`}</p>
                </div>
                <div className="run-card__actions">
                  {run.id !== activeRunId && (
                    <button className="button button--small button--secondary" onClick={async () => { await setActiveRun(run.id); navigate('dashboard') }}>Open run</button>
                  )}
                  <button className="icon-button" aria-label={`Edit ${run.name}`} onClick={() => setEditing(run)}><Icon name="edit" /></button>
                  <button className="icon-button" aria-label={`Archive ${run.name}`} onClick={() => setRunArchived(run.id, true)}><Icon name="archive" /></button>
                  <button className="icon-button icon-button--danger" aria-label={`Delete ${run.name}`} onClick={() => setDeleting(run)}><Icon name="close" /></button>
                </div>
              </div>
            </article>
          ))}
          {active.length === 0 && <div className="empty-state empty-state--compact"><h3>No active runs</h3><p>Restore an archive or start a new field log.</p></div>}
        </div>
      </section>

      {archived.length > 0 && (
        <section className="run-section">
          <div className="group-heading"><h2>Archived</h2><span>{archived.length}</span></div>
          <div className="run-list run-list--archived">
            {archived.map((run) => (
              <article className="run-card" key={run.id}>
                <div className="run-card__index" aria-hidden="true">×</div>
                <div className="run-card__body">
                  <div><h3>{run.name}</h3><p>Archived {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(run.archivedAt!))}</p></div>
                  <div className="run-card__actions">
                    <button className="button button--small button--secondary" onClick={() => setRunArchived(run.id, false)}>Restore</button>
                    <button className="icon-button icon-button--danger" aria-label={`Delete ${run.name}`} onClick={() => setDeleting(run)}><Icon name="close" /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="settings-card">
        <div>
          <p className="eyebrow">Local backup</p>
          <h2>Carry your notebook out</h2>
          <p>Browser storage can disappear when site data is cleared. Keep a JSON backup somewhere safe.</p>
          {importError && <p className="form-error" role="alert">{importError}</p>}
        </div>
        <div className="settings-actions">
          <button className="button button--secondary" onClick={download}><Icon name="download" /> Export backup</button>
          <button className="button button--secondary" onClick={() => fileRef.current?.click()}><Icon name="upload" /> Restore backup</button>
          <input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={chooseBackup} />
        </div>
      </section>

      <section className="about-card">
        <div className="about-card__brand"><span>z</span><div><strong>zombuddy</strong><small>v0.1 · catalog {catalog.catalogVersion}</small></div></div>
        <p>Unofficial, noncommercial fan companion for Project Zomboid Build {catalog.gameBuild}. Project Zomboid and The Indie Stone are trademarks of their respective owners.</p>
        <div className="about-links">
          <a href="https://projectzomboid.com/" target="_blank" rel="noreferrer">Project Zomboid <Icon name="external" /></a>
          <a href="https://pzwiki.net/" target="_blank" rel="noreferrer">PZwiki <Icon name="external" /></a>
        </div>
      </section>

      <RunFormModal open={showNew} title="Start a new run" onClose={() => setShowNew(false)} onSave={async (name, note) => {
        const run = await createRun(name, note)
        await setActiveRun(run.id)
        setShowNew(false)
        navigate('dashboard')
      }} />
      <RunFormModal key={editing?.id ?? 'edit-run'} open={!!editing} title="Edit field log" run={editing ?? undefined} onClose={() => setEditing(null)} onSave={async (name, note) => {
        if (editing) await renameRun(editing.id, name, note)
        setEditing(null)
      }} />

      <Modal open={!!deleting} title="Permanently delete this run?" eyebrow="No way back" onClose={() => setDeleting(null)}>
        <p className="modal__lede">This removes <strong>{deleting?.name}</strong> and every checklist mark attached to it. Export a backup first if you might want it later.</p>
        <div className="modal-actions">
          <button className="button button--ghost" onClick={() => setDeleting(null)}>Keep run</button>
          <button className="button button--danger" onClick={async () => { if (deleting) await deleteRun(deleting.id); setDeleting(null) }}>Delete forever</button>
        </div>
      </Modal>

      <Modal open={!!pendingBackup} title={runs.length ? 'Replace local notebook?' : 'Restore this notebook?'} eyebrow="Validated backup" onClose={() => setPendingBackup(null)}>
        <p className="modal__lede">
          The backup contains {pendingBackup?.runs.length ?? 0} runs and {pendingBackup?.progress.length ?? 0} checklist marks.
          {runs.length > 0 && ' Restoring will atomically replace every run currently on this device.'}
        </p>
        <div className="modal-actions">
          <button className="button button--ghost" onClick={() => setPendingBackup(null)}>Cancel</button>
          <button className="button button--primary" onClick={confirmRestore}>{runs.length ? 'Replace & restore' : 'Restore backup'}</button>
        </div>
      </Modal>
    </div>
  )
}

function RunFormModal({
  open,
  title,
  run,
  onClose,
  onSave
}: {
  open: boolean
  title: string
  run?: RunRecord
  onClose: () => void
  onSave: (name: string, note: string) => Promise<void>
}) {
  const [name, setName] = useState(run?.name ?? '')
  const [note, setNote] = useState(run?.note ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await onSave(name, note)
      setName('')
      setNote('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title={title} eyebrow="Blank Build 42.20 checklist" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <label className="field"><span>Run name</span><input autoFocus required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Run name" /></label>
        <label className="field"><span>Note <small>optional</small></span><textarea maxLength={1000} rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Spawn, rules, or a reminder…" /></label>
        <div className="modal-actions">
          <button type="button" className="button button--ghost" onClick={onClose}>Cancel</button>
          <button className="button button--primary" disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save run'}</button>
        </div>
      </form>
    </Modal>
  )
}
