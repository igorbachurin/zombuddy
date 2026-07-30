import rawCatalog from './catalogs/42.20.0.json'
import { catalogSchema, type Catalog, type CatalogItem, type TabId } from '../types'

export const catalog: Catalog = catalogSchema.parse(rawCatalog)
export const catalogItems: CatalogItem[] = catalog.items

export const catalogById = new Map(catalogItems.map((item) => [item.id, item]))

export const itemLabel = (item: CatalogItem): string => {
  if (item.kind === 'skill-book') return `${item.skill} · Vol. ${item.tier}`
  if (item.kind === 'educational-vhs') return 'Educational VHS'
  if (item.kind === 'tool-capability') return 'Tool capability'
  return item.category
}

export const categoryItems = (kind: CatalogItem['kind']) =>
  catalogItems.filter((item) => item.kind === kind)

export type ChecklistTab = Exclude<TabId, 'dashboard' | 'runs'>

export const checklistItems = (tab: ChecklistTab): CatalogItem[] => {
  if (tab === 'books') return categoryItems('skill-book')
  if (tab === 'recipes') {
    return categoryItems('recipe-literature').filter((item) => item.category !== 'Seeds')
  }
  if (tab === 'seeds') {
    return categoryItems('recipe-literature').filter((item) => item.category === 'Seeds')
  }
  if (tab === 'vhs') return categoryItems('educational-vhs')
  return categoryItems('tool-capability')
}

export const wikiSearchUrl = (name: string) =>
  `https://pzwiki.net/w/index.php?search=${encodeURIComponent(name)}`
