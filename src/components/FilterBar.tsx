import type { FilterStatus } from '../types'
import { Icon } from './Icon'

export function FilterBar({
  query,
  setQuery,
  status,
  setStatus,
  itemType = 'media'
}: {
  query: string
  setQuery: (query: string) => void
  status: FilterStatus
  setStatus: (status: FilterStatus) => void
  itemType?: 'media' | 'tools'
}) {
  const filters: Array<[FilterStatus, string]> = itemType === 'tools'
    ? [['all', 'All'], ['missing', 'Missing'], ['owned', 'Acquired']]
    : [['all', 'All'], ['missing', 'Missing'], ['owned', 'Owned'], ['consumed', 'Complete']]

  return (
    <div className="filter-bar">
      <label className="search-field">
        <span className="sr-only">Search this checklist</span>
        <Icon name="search" />
        <input
          type="search"
          placeholder="Search names, skills, recipes…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button aria-label="Clear search" onClick={() => setQuery('')}>
            <Icon name="close" />
          </button>
        )}
      </label>
      <div className="filter-chips" aria-label="Filter by status">
        {filters.map(([value, label]) => (
          <button
            key={value}
            className={status === value ? 'is-active' : ''}
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
