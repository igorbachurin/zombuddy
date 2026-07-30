import { useState, type FormEvent } from 'react'
import { createRun } from '../db'
import { Modal } from './Modal'

export function Onboarding({ open, onCreated }: { open: boolean; onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const run = await createRun(name)
      onCreated(run.id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Name this run" eyebrow="Build 42.20 · field notebook" dismissible={false}>
      <div className="onboarding-mark" aria-hidden="true">
        <span>DAY</span>
        <strong>01</strong>
      </div>
      <p className="modal__lede">
        Every good run starts with a name. Your blank checklist stays on this device and works without a connection.
      </p>
      <form onSubmit={submit} className="stack">
        <label className="field">
          <span>Run name</span>
          <input
            autoFocus
            required
            maxLength={80}
            placeholder="e.g. Rosewood, no regrets"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button className="button button--primary button--wide" disabled={busy || !name.trim()}>
          {busy ? 'Opening notebook…' : 'Start this run'}
        </button>
      </form>
      <p className="fine-print">Unofficial fan companion. No account, telemetry, or cloud sync.</p>
    </Modal>
  )
}
