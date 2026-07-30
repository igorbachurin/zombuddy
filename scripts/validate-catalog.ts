import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { catalogSchema } from '../src/types.ts'

const requested = process.argv[2] ?? 'src/data/catalogs/42.20.0.json'
const path = resolve(requested)
const catalog = catalogSchema.parse(JSON.parse(await readFile(path, 'utf8')))
const errors: string[] = []
const ids = new Set<string>()

for (const item of catalog.items) {
  if (ids.has(item.id)) errors.push(`Duplicate stable ID: ${item.id}`)
  ids.add(item.id)
  if (!item.name.trim()) errors.push(`Missing translated name: ${item.id}`)
  if (item.kind === 'skill-book' && item.levelEnd < item.levelStart) errors.push(`Invalid level range: ${item.id}`)
  if (item.kind === 'recipe-literature' && item.recipes.length === 0) errors.push(`No recipes: ${item.id}`)
  if (item.kind === 'educational-vhs' && item.skills.length + item.recipes.length === 0) errors.push(`No VHS rewards: ${item.id}`)
  if (item.kind === 'tool-capability' && item.variants.length === 0) errors.push(`No qualifying tool: ${item.id}`)
}

const capabilityCount = catalog.items.filter((item) => item.kind === 'tool-capability').length
if (capabilityCount < 25) errors.push(`Expected 25 tool capability groups, found ${capabilityCount}`)

if (catalog.gameBuild === '42.20.0') {
  const books = catalog.items.filter((item) => item.kind === 'skill-book')
  const families = books.reduce((grouped, book) => {
    grouped.set(book.skill, [...(grouped.get(book.skill) ?? []), book])
    return grouped
  }, new Map<string, typeof books>())
  const incompleteFamilies = [...families]
    .filter(([, family]) => family.map((book) => book.tier).sort((a, b) => a - b).join(',') !== '1,2,3,4,5')
    .map(([skill]) => skill)
  const vhs = catalog.items.filter((item) => item.kind === 'educational-vhs')
  const homeVhs = vhs.filter((item) => item.category === 'Home VHS')
  const retailVhs = vhs.filter((item) => item.category === 'Retail VHS')
  const recipeTeachingItems = catalog.items.filter((item) => item.kind === 'recipe-literature')
  const seeds = recipeTeachingItems.filter((item) => item.category === 'Seeds')
  const recipeLiterature = recipeTeachingItems.filter((item) => item.category !== 'Seeds')

  if (books.length !== 120 || families.size !== 24 || incompleteFamilies.length > 0) {
    errors.push(`Expected 120 books across 24 complete skill families; found ${books.length} books across ${families.size} families${incompleteFamilies.length ? ` (incomplete: ${incompleteFamilies.join(', ')})` : ''}`)
  }
  if (vhs.length !== 62 || homeVhs.length !== 14 || retailVhs.length !== 48) {
    errors.push(`Expected 62 progression VHS (14 Home, 48 Retail); found ${vhs.length} (${homeVhs.length} Home, ${retailVhs.length} Retail)`)
  }
  if (seeds.length !== 110 || recipeLiterature.length !== 87) {
    errors.push(`Expected 110 seed packets and 87 recipe-literature entries; found ${seeds.length} seeds and ${recipeLiterature.length} literature`)
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(`Catalog ${catalog.catalogVersion} is valid: ${catalog.items.length} entries, ${capabilityCount} tool groups.`)
}
