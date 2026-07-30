import { useMemo, useState } from 'react'
import { checklistItems, type ChecklistTab } from '../data/catalog'
import type { CatalogItem, FilterStatus, ProgressRecord } from '../types'
import { FilterBar } from '../components/FilterBar'
import { MediaCard } from '../components/MediaCard'

type MediaSection = Exclude<ChecklistTab, 'tools'>

const copy: Record<MediaSection, { eyebrow: string; title: string; description: string }> = {
  books: {
    eyebrow: 'Shelf inventory',
    title: 'Skill books',
    description: 'Track every volume from first page to finished. Grouped by the skill it boosts.'
  },
  recipes: {
    eyebrow: 'Plans & know-how',
    title: 'Recipes',
    description: 'Magazines, manuals, catalogs, and schematics that unlock practical recipes.'
  },
  seeds: {
    eyebrow: 'Growing seasons',
    title: 'Seeds',
    description: 'Seed packets and their planting knowledge, kept separate from recipe literature.'
  },
  vhs: {
    eyebrow: 'Recorded media',
    title: 'Useful VHS',
    description: 'Only tapes with progression rewards. Skills and recipe codes are shown without XP estimates.'
  }
}

function searchable(item: CatalogItem) {
  const extras =
    item.kind === 'skill-book' ? item.skill
      : item.kind === 'recipe-literature' ? item.recipes.join(' ')
        : item.kind === 'educational-vhs' ? [...item.skills, ...item.recipes].join(' ')
          : item.variants.join(' ')
  return `${item.name} ${item.category} ${extras}`.toLowerCase()
}

export function MediaPage({
  section,
  runId,
  progress
}: {
  section: MediaSection
  runId: string
  progress: ProgressRecord[]
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<FilterStatus>('all')
  const progressMap = useMemo(() => new Map(progress.map((record) => [record.itemId, record])), [progress])
  const items = checklistItems(section) as Array<Exclude<CatalogItem, { kind: 'tool-capability' }>>
  const filtered = items.filter((item) => {
    const record = progressMap.get(item.id)
    const current = record?.type === 'media' ? record.status : 'missing'
    return (!query || searchable(item).includes(query.trim().toLowerCase())) &&
      (status === 'all' || current === status)
  })

  const groups = filtered.reduce<Record<string, typeof filtered>>((result, item) => {
    const key = item.kind === 'skill-book' ? item.skill : item.category
    result[key] ??= []
    result[key].push(item)
    return result
  }, {})
  const complete = items.filter((item) => {
    const record = progressMap.get(item.id)
    return record?.type === 'media' && record.status === 'consumed'
  }).length
  const groupedEntries = Object.entries(groups).sort(([left], [right]) => {
    if (section !== 'vhs') return 0
    const order = { 'Retail VHS': 0, 'Home VHS': 1 } as Record<string, number>
    return (order[left] ?? 2) - (order[right] ?? 2)
  })

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{copy[section].eyebrow}</p>
          <h1>{copy[section].title}</h1>
          <p>{copy[section].description}</p>
        </div>
        <div className="page-tally" aria-label={`${complete} of ${items.length} complete`}>
          <strong>{complete}</strong><span>/ {items.length}<br />complete</span>
        </div>
      </header>
      <FilterBar query={query} setQuery={setQuery} status={status} setStatus={setStatus} />
      <p className="result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} found</p>
      {groupedEntries.length > 0 ? groupedEntries.map(([group, grouped]) => (
        <section className="item-group" key={group}>
          <div className="group-heading">
            <h2>{group}</h2>
            <span>{grouped.length} {grouped.length === 1 ? 'item' : 'items'}</span>
          </div>
          <div className="card-list">
            {grouped.map((item) => {
              const record = progressMap.get(item.id)
              return (
                <MediaCard
                  key={`${runId}:${item.id}`}
                  item={item}
                  record={record?.type === 'media' ? record : undefined}
                  runId={runId}
                />
              )
            })}
          </div>
        </section>
      )) : (
        <div className="empty-state">
          <span aria-hidden="true">×</span>
          <h2>Nothing in this margin</h2>
          <p>Try a different search or status filter.</p>
          <button className="button button--secondary" onClick={() => { setQuery(''); setStatus('all') }}>Clear filters</button>
        </div>
      )}
    </div>
  )
}
