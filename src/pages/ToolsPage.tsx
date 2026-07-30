import { useMemo, useState } from 'react'
import { categoryItems } from '../data/catalog'
import type { FilterStatus, ProgressRecord, ToolCapability } from '../types'
import { FilterBar } from '../components/FilterBar'
import { ToolCard } from '../components/ToolCard'

export function ToolsPage({ runId, progress }: { runId: string; progress: ProgressRecord[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<FilterStatus>('all')
  const items = categoryItems('tool-capability') as ToolCapability[]
  const progressMap = useMemo(() => new Map(progress.map((record) => [record.itemId, record])), [progress])
  const filtered = items.filter((item) => {
    const record = progressMap.get(item.id)
    const acquired = record?.type === 'tool' && record.quantity > 0
    const matchesStatus = status === 'all' || (status === 'owned' ? acquired : !acquired)
    const text = `${item.name} ${item.category} ${item.details} ${item.variants.join(' ')}`.toLowerCase()
    return matchesStatus && (!query || text.includes(query.trim().toLowerCase()))
  })
  const groups = filtered.reduce<Record<string, ToolCapability[]>>((result, item) => {
    result[item.category] ??= []
    result[item.category].push(item)
    return result
  }, {})
  const acquired = items.filter((item) => {
    const record = progressMap.get(item.id)
    return record?.type === 'tool' && record.quantity > 0
  }).length

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Capability kit</p>
          <h1>Essential tools</h1>
          <p>Track what the tool lets you do. Open a card to see every qualifying vanilla variant.</p>
        </div>
        <div className="page-tally"><strong>{acquired}</strong><span>/ {items.length}<br />acquired</span></div>
      </header>
      <FilterBar query={query} setQuery={setQuery} status={status} setStatus={setStatus} itemType="tools" />
      <p className="result-count" aria-live="polite">{filtered.length} capabilities found</p>
      {Object.entries(groups).map(([group, grouped]) => (
        <section className="item-group" key={group}>
          <div className="group-heading"><h2>{group}</h2><span>{grouped.length} capabilities</span></div>
          <div className="card-list">
            {grouped.map((item) => {
              const record = progressMap.get(item.id)
              return (
                <ToolCard
                  key={`${runId}:${item.id}`}
                  item={item}
                  record={record?.type === 'tool' ? record : undefined}
                  runId={runId}
                />
              )
            })}
          </div>
        </section>
      ))}
      {filtered.length === 0 && (
        <div className="empty-state">
          <span aria-hidden="true">×</span><h2>No tools match</h2><p>Broaden the search or clear the filter.</p>
          <button className="button button--secondary" onClick={() => { setQuery(''); setStatus('all') }}>Clear filters</button>
        </div>
      )}
    </div>
  )
}
