import { useState, type FormEvent } from 'react'
import { setToolProgress } from '../db'
import type { ToolCapability, ToolProgressRecord } from '../types'
import { Icon } from './Icon'

export function ToolCard({
  item,
  record,
  runId
}: {
  item: ToolCapability
  record?: ToolProgressRecord
  runId: string
}) {
  const [quantity, setQuantity] = useState(record?.quantity ?? 0)
  const [location, setLocation] = useState(record?.location ?? '')
  const [note, setNote] = useState(record?.note ?? '')
  const [saved, setSaved] = useState(false)

  const save = async (event?: FormEvent) => {
    event?.preventDefault()
    await setToolProgress(runId, item.id, { quantity, location, note })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1400)
  }

  const adjust = async (amount: number) => {
    const next = Math.max(0, Math.min(999, quantity + amount))
    setQuantity(next)
    await setToolProgress(runId, item.id, { quantity: next, location, note })
  }

  return (
    <article className="tool-card" data-status={quantity > 0 ? 'owned' : 'missing'}>
      <div className="tool-card__head">
        <div>
          <p className="card-kicker">{item.category}</p>
          <h3>{item.name}</h3>
          <p>{item.details}</p>
        </div>
        <div className="quantity-stepper" aria-label={`Quantity of ${item.name}`}>
          <button aria-label="Decrease quantity" onClick={() => adjust(-1)} disabled={quantity === 0}>−</button>
          <output aria-label={`${quantity} acquired`}>{quantity}</output>
          <button aria-label="Increase quantity" onClick={() => adjust(1)}>+</button>
        </div>
      </div>
      <details className="tool-details">
        <summary>Qualifying tools <span>{item.variants.length}</span></summary>
        <div className="tag-list">
          {item.variants.map((variant) => <span key={variant}>{variant}</span>)}
        </div>
        <a className="wiki-link" href={item.wikiUrl} target="_blank" rel="noreferrer">
          Check PZwiki <Icon name="external" />
        </a>
      </details>
      <form className="tool-notes" onSubmit={save}>
        <label>
          <span>Base location</span>
          <input maxLength={120} placeholder="e.g. Garage shelf" value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <label>
          <span>Field note</span>
          <input maxLength={500} placeholder="Condition, spare parts…" value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <button className="button button--small button--secondary" type="submit">
          {saved ? <><Icon name="check" /> Saved</> : 'Save note'}
        </button>
      </form>
    </article>
  )
}
