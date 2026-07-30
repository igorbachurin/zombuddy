import type { CatalogItem, MediaStatus } from '../types'

export function StatusControl({
  item,
  status,
  onChange
}: {
  item: CatalogItem
  status: MediaStatus
  onChange: (status: MediaStatus) => void
}) {
  const consumedLabel = item.kind === 'educational-vhs' ? 'Watched' : 'Read'
  return (
    <div className="status-control" aria-label={`Status for ${item.name}`}>
      {([
        ['missing', 'Missing'],
        ['owned', 'Owned'],
        ['consumed', consumedLabel]
      ] as const).map(([value, label]) => (
        <button
          key={value}
          className={status === value ? 'is-active' : ''}
          aria-pressed={status === value}
          onClick={() => onChange(value)}
        >
          <span className="status-dot" />
          {label}
        </button>
      ))}
    </div>
  )
}
