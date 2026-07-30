import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import { catalogSchema, type Catalog, type CatalogItem } from '../src/types.ts'
import {
  classifyItems,
  diffCatalog,
  loadItems,
  loadTranslations,
  mapToolCapabilities,
  parseRecordedMedia,
  findFiles,
  TOOL_RULES,
  type GeneratorReport
} from './lib/catalog-generator.ts'

function argument(name: string, required = false) {
  const index = process.argv.indexOf(name)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  if (required && !value) throw new Error(`Missing required argument ${name}`)
  return value
}

const mediaPath = resolve(argument('--media', true)!)
const build = argument('--build', true)!
const outputPath = resolve(argument('--output') ?? `src/data/catalogs/${build}.json`)
const reportPath = resolve(argument('--report') ?? `data/catalog-report-${build}.json`)
const previousPath = argument('--previous')
const catalogVersion = argument('--catalog-version') ?? `${build}-catalog.${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`
const generatedAt = argument('--generated-at') ?? new Date().toISOString()

const items = await loadItems(mediaPath)
const translations = await loadTranslations(mediaPath)
const { books, literature, missingTranslations } = classifyItems(items, translations)
const { tools, unmatched } = mapToolCapabilities(items, translations)

const mediaCandidates = await findFiles(
  join(mediaPath, 'lua', 'shared', 'RecordedMedia'),
  (path) => /recorded_media\.lua$/i.test(path)
)
if (!mediaCandidates[0]) throw new Error('Could not find lua/shared/RecordedMedia/recorded_media.lua')
const recordedSource = await readFile(mediaCandidates[0], 'utf8')
const { entries: vhs, unknownRewardCodes } = parseRecordedMedia(recordedSource, translations)
const rawCatalogItems: CatalogItem[] = [...books, ...literature, ...vhs, ...tools]
const occurrences = rawCatalogItems.reduce((counts, item) => {
  counts.set(item.id, (counts.get(item.id) ?? 0) + 1)
  return counts
}, new Map<string, number>())
const sourceDuplicateIds = [...occurrences]
  .filter(([, count]) => count > 1)
  .map(([id]) => id)
  .sort()
// Build 42.20's generated literature script declares these items twice. Their
// progression-facing fields are identical, so the public catalog retains one.
const knownSourceDuplicateIds = new Set([
  'Base.WatermelonBagSeed',
  'Base.WatermelonBagSeed_Empty'
])
const duplicateIds = sourceDuplicateIds.filter((id) => !knownSourceDuplicateIds.has(id))
const catalogItems = [...new Map(rawCatalogItems.map((item) => [item.id, item])).values()]
  .sort((a, b) => {
    const kindOrder = ['skill-book', 'recipe-literature', 'educational-vhs', 'tool-capability']
    const byKind = kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind)
    if (byKind) return byKind
    if (a.kind === 'educational-vhs' && b.kind === 'educational-vhs') {
      const categoryOrder = { 'Retail VHS': 0, 'Home VHS': 1 } as Record<string, number>
      const byMediaCategory = (categoryOrder[a.category] ?? 2) - (categoryOrder[b.category] ?? 2)
      if (byMediaCategory) return byMediaCategory
    }
    const byCategory = a.category.localeCompare(b.category)
    if (byCategory) return byCategory
    if (a.kind === 'skill-book' && b.kind === 'skill-book') return a.tier - b.tier
    return a.name.localeCompare(b.name)
  })

let previous: Catalog | undefined
if (previousPath) {
  previous = catalogSchema.parse(JSON.parse(await readFile(resolve(previousPath), 'utf8')))
}

const catalog = catalogSchema.parse({
  schemaVersion: 1,
  catalogVersion,
  gameBuild: build,
  generatedAt,
  source: `Project Zomboid Build ${build} installed media files`,
  items: catalogItems
})

const generatedSlugs = new Set(tools.map((tool) => tool.id.replace('tool-capability:', '')))
const missingGroups = TOOL_RULES.map((rule) => rule.slug).filter((slug) => !generatedSlugs.has(slug))
const report: GeneratorReport = {
  build,
  catalogVersion: catalog.catalogVersion,
  generatedAt,
  counts: {
    skillBooks: books.length,
    skillFamilies: new Set(books.map((book) => book.skill)).size,
    recipeLiterature: catalogItems.filter((item) => item.kind === 'recipe-literature' && item.category !== 'Seeds').length,
    seedPackets: catalogItems.filter((item) => item.kind === 'recipe-literature' && item.category === 'Seeds').length,
    educationalVhs: vhs.length,
    homeVhs: vhs.filter((item) => item.category === 'Home VHS').length,
    retailVhs: vhs.filter((item) => item.category === 'Retail VHS').length,
    toolCapabilities: tools.length,
    total: catalogItems.length
  },
  missingTranslations,
  sourceDuplicateIds,
  duplicateIds,
  unmatchedCapabilityGroups: missingGroups,
  unknownQualifyingItems: [...unmatched, ...unknownRewardCodes],
  changesFromPrevious: diffCatalog(previous, catalogItems)
}

const failures = [
  ...report.missingTranslations.map((id) => `missing translation: ${id}`),
  ...report.duplicateIds.map((id) => `duplicate id: ${id}`),
  ...report.unknownQualifyingItems.map((id) => `unknown qualifying entry: ${id}`)
]
if (tools.length < 25) failures.push(`only ${tools.length}/25 tool capability groups matched`)

await Promise.all([mkdir(dirname(outputPath), { recursive: true }), mkdir(dirname(reportPath), { recursive: true })])
await Promise.all([
  writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`),
  writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
])

console.log(`Generated ${catalogItems.length} catalog entries for Build ${build}`)
console.log(`Catalog: ${outputPath}`)
console.log(`Report:  ${reportPath}`)
if (failures.length > 0) {
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exitCode = 1
}
