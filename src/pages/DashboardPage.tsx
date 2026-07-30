import { categoryItems, catalogById, checklistItems, type ChecklistTab } from '../data/catalog'
import type { CatalogItem, ProgressRecord, RecentChange, RunRecord } from '../types'
import { navigate } from '../hooks/useHashTab'
import { Icon } from '../components/Icon'

const categories: Array<{
  label: string
  tab: ChecklistTab
  short: string
}> = [
  { label: 'Skill books', tab: 'books', short: 'BK' },
  { label: 'Recipes', tab: 'recipes', short: 'RC' },
  { label: 'Seeds', tab: 'seeds', short: 'SD' },
  { label: 'Useful VHS', tab: 'vhs', short: 'VH' },
  { label: 'Tool kit', tab: 'tools', short: 'TL' }
]

function isComplete(item: CatalogItem, record?: ProgressRecord) {
  if (item.kind === 'tool-capability') return record?.type === 'tool' && record.quantity > 0
  return record?.type === 'media' && record.status === 'consumed'
}

export function DashboardPage({
  run,
  progress,
  recent
}: {
  run: RunRecord
  progress: ProgressRecord[]
  recent: RecentChange[]
}) {
  const progressMap = new Map(progress.map((record) => [record.itemId, record]))
  const stats = categories.map((category) => {
    const items = checklistItems(category.tab)
    const done = items.filter((item) => isComplete(item, progressMap.get(item.id))).length
    return { ...category, done, total: items.length, percent: Math.round((done / items.length) * 100) }
  })
  const total = stats.reduce((sum, stat) => sum + stat.total, 0)
  const done = stats.reduce((sum, stat) => sum + stat.done, 0)
  const overall = Math.round((done / total) * 100)
  const missingBooks = categoryItems('skill-book').filter((item) => !progressMap.has(item.id)).length
  const missingTools = categoryItems('tool-capability').filter((item) => !isComplete(item, progressMap.get(item.id))).length

  return (
    <div className="page dashboard">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Current field log</p>
          <h1>{run.name}</h1>
          <p>{run.note || 'A clean checklist. Make every find count.'}</p>
        </div>
        <div className="overall-ring" style={{ '--progress': `${overall * 3.6}deg` } as React.CSSProperties}>
          <div><strong>{overall}%</strong><span>prepared</span></div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-panel dashboard-panel--progress">
          <div className="panel-heading">
            <div><p className="eyebrow">Run readiness</p><h2>Progress overview</h2></div>
            <span>{done} / {total}</span>
          </div>
          <div className="stat-grid">
            {stats.map((stat) => (
              <button className="stat-card" key={stat.tab} onClick={() => navigate(stat.tab)}>
                <span className="stat-card__monogram">{stat.short}</span>
                <span className="stat-card__data">
                  <strong>{stat.label}</strong>
                  <span>{stat.done} of {stat.total}</span>
                  <i><b style={{ width: `${stat.percent}%` }} /></i>
                </span>
                <span className="stat-card__percent">{stat.percent}%</span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Last marks</p><h2>Recently changed</h2></div>
          </div>
          {recent.length > 0 ? (
            <ol className="recent-list">
              {recent.slice(0, 6).map((change) => {
                const item = catalogById.get(change.itemId)
                return (
                  <li key={change.id}>
                    <span className="recent-mark"><Icon name="check" /></span>
                    <div><strong>{item?.name ?? 'Legacy entry'}</strong><span>{change.summary}</span></div>
                    <time dateTime={change.changedAt}>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(change.changedAt))}</time>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="panel-empty">
              <span>—</span><p>No marks yet. Your latest checklist changes will appear here.</p>
            </div>
          )}
        </section>
      </div>

      <section className="shortcuts">
        <div className="panel-heading">
          <div><p className="eyebrow">Supply gaps</p><h2>Missing-item shortcuts</h2></div>
        </div>
        <div className="shortcut-grid">
          <button onClick={() => navigate('books')}>
            <span>Books to find</span><strong>{missingBooks}</strong><Icon name="arrow" />
          </button>
          <button onClick={() => navigate('tools')}>
            <span>Capabilities needed</span><strong>{missingTools}</strong><Icon name="arrow" />
          </button>
        </div>
      </section>
    </div>
  )
}
