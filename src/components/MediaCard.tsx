import type { CatalogItem, MediaProgressRecord, MediaStatus } from '../types'
import { setMediaStatus } from '../db'
import { Icon } from './Icon'
import { StatusControl } from './StatusControl'

export function MediaCard({
  item,
  record,
  runId
}: {
  item: Exclude<CatalogItem, { kind: 'tool-capability' }>
  record?: MediaProgressRecord
  runId: string
}) {
  const status: MediaStatus = record?.status ?? 'missing'
  const completeLabel = item.kind === 'educational-vhs' ? 'watched' : 'read'

  return (
    <article className="check-card" data-status={status}>
      <div className="check-card__rail" aria-hidden="true" />
      <div className="check-card__main">
        <div className="check-card__top">
          <div>
            <p className="card-kicker">
              {item.kind === 'skill-book' && `VOL. ${item.tier} · LVL ${item.levelStart}–${item.levelEnd}`}
              {item.kind === 'recipe-literature' && `${item.recipes.length} ${item.recipes.length === 1 ? 'RECIPE' : 'RECIPES'}`}
              {item.kind === 'educational-vhs' && 'EDUCATIONAL TAPE'}
            </p>
            <h3>{item.name}</h3>
          </div>
          <span className={`state-stamp state-stamp--${status}`}>
            {status === 'missing' ? 'Missing' : status === 'owned' ? 'In kit' : completeLabel}
          </span>
        </div>

        {item.kind === 'skill-book' && (
          <p className="card-summary">{item.pages} pages · boosts {item.skill} levels {item.levelStart}–{item.levelEnd}</p>
        )}
        {item.kind === 'recipe-literature' && (
          <div className="tag-list" aria-label="Recipes taught">
            {item.recipes.map((recipe) => <span key={recipe}>{recipe}</span>)}
          </div>
        )}
        {item.kind === 'educational-vhs' && (
          <div className="reward-grid">
            {item.skills.length > 0 && (
              <div><span>Skills</span><strong>{item.skills.join(', ')}</strong></div>
            )}
            {item.recipes.length > 0 && (
              <div><span>Recipes</span><strong>{item.recipes.join(', ')}</strong></div>
            )}
          </div>
        )}

        <div className="check-card__actions">
          <StatusControl
            item={item}
            status={status}
            onChange={(next) => setMediaStatus(runId, item.id, next)}
          />
          <a className="wiki-link" href={item.wikiUrl} target="_blank" rel="noreferrer">
            PZwiki <Icon name="external" />
          </a>
        </div>
      </div>
    </article>
  )
}
