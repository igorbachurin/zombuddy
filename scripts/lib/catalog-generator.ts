import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import type { Catalog, CatalogItem, EducationalVhs, RecipeLiterature, SkillBook, ToolCapability } from '../../src/types.ts'

export interface RawItem {
  module: string
  itemId: string
  fullId: string
  fields: Record<string, string>
  sourceFile: string
}

export interface GeneratorReport {
  build: string
  catalogVersion: string
  generatedAt: string
  counts: {
    skillBooks: number
    skillFamilies: number
    recipeLiterature: number
    seedPackets: number
    educationalVhs: number
    homeVhs: number
    retailVhs: number
    toolCapabilities: number
    total: number
  }
  missingTranslations: string[]
  sourceDuplicateIds: string[]
  duplicateIds: string[]
  unmatchedCapabilityGroups: string[]
  unknownQualifyingItems: string[]
  changesFromPrevious: {
    added: string[]
    removed: string[]
    changed: string[]
  }
}

interface ToolRule {
  slug: string
  name: string
  category: string
  details: string
  tags: string[]
  ids: string[]
}

export const TOOL_RULES: ToolRule[] = [
  { slug: 'hammering', name: 'Hammering', category: 'Construction', details: 'Drive and remove nails for carpentry and repairs.', tags: ['Hammer'], ids: ['Base.Hammer', 'Base.BallPeenHammer', 'Base.ClubHammer', 'Base.StoneHammer'] },
  { slug: 'wood-sawing', name: 'Wood sawing', category: 'Construction', details: 'Cut logs and planks for construction.', tags: ['Saw'], ids: ['Base.Saw', 'Base.GardenSaw'] },
  { slug: 'screwdriving', name: 'Screwdriving', category: 'Construction', details: 'Install and remove screws in electronics, furniture, and vehicles.', tags: ['Screwdriver'], ids: ['Base.Screwdriver'] },
  { slug: 'can-opening', name: 'Can opening', category: 'Kitchen', details: 'Open sealed canned food without wasting it.', tags: ['CanOpener'], ids: ['Base.TinOpener'] },
  { slug: 'prying', name: 'Prying', category: 'Heavy work', details: 'Pry fixtures and boards apart.', tags: ['Crowbar'], ids: ['Base.Crowbar'] },
  { slug: 'demolition', name: 'Demolition', category: 'Heavy work', details: 'Destroy walls, stairs, and large fixtures.', tags: ['Sledgehammer'], ids: ['Base.Sledgehammer', 'Base.Sledgehammer2'] },
  { slug: 'tree-cutting', name: 'Tree cutting', category: 'Cutting', details: 'Fell trees and split wood.', tags: ['Axe'], ids: ['Base.Axe', 'Base.HandAxe', 'Base.WoodAxe', 'Base.AxeStone'] },
  { slug: 'fine-cutting', name: 'Fine cutting', category: 'Cutting', details: 'Perform controlled cutting and detailed crafting.', tags: ['SharpKnife'], ids: ['Base.HuntingKnife', 'Base.KitchenKnife', 'Base.Scissors'] },
  { slug: 'butchering', name: 'Butchering', category: 'Cutting', details: 'Dress animals and prepare carcasses.', tags: ['Butcher'], ids: ['Base.MeatCleaver', 'Base.HuntingKnife'] },
  { slug: 'digging', name: 'Digging', category: 'Groundwork', details: 'Move soil, dig graves, and prepare ground.', tags: ['DigPlow'], ids: ['Base.Shovel', 'Base.Shovel2', 'Base.HandShovel'] },
  { slug: 'tilling', name: 'Tilling', category: 'Groundwork', details: 'Prepare furrows and plots for crops.', tags: ['DigPlow'], ids: ['Base.GardenHoe', 'Base.HandShovel'] },
  { slug: 'stump-removal', name: 'Stump removal', category: 'Groundwork', details: 'Break roots and remove tree stumps.', tags: ['PickAxe'], ids: ['Base.PickAxe'] },
  { slug: 'masonry', name: 'Masonry', category: 'Groundwork', details: 'Lay and shape stone, brick, and mortar.', tags: ['MasonsTrowel'], ids: ['Base.MasonsTrowel', 'Base.MasonsTrowel_Wood'] },
  { slug: 'vehicle-wrench', name: 'Vehicle wrenching', category: 'Vehicles', details: 'Remove and install mechanical vehicle parts.', tags: ['Wrench'], ids: ['Base.Wrench'] },
  { slug: 'lug-tire', name: 'Lug & tire work', category: 'Vehicles', details: 'Remove and install wheels and tires.', tags: [], ids: ['Base.LugWrench'] },
  { slug: 'vehicle-jack', name: 'Vehicle lifting', category: 'Vehicles', details: 'Lift vehicles safely for underbody work.', tags: [], ids: ['Base.Jack'] },
  { slug: 'tire-pump', name: 'Tire inflation', category: 'Vehicles', details: 'Inflate vehicle tires.', tags: [], ids: ['Base.TirePump'] },
  { slug: 'metal-sawing', name: 'Metal sawing', category: 'Workshop', details: 'Cut metal stock and parts.', tags: ['MetalSaw', 'SmallSaw'], ids: ['Base.Saw', 'Base.SmallSaw'] },
  { slug: 'drilling', name: 'Drilling', category: 'Workshop', details: 'Bore holes for joinery and fabrication.', tags: ['Drill'], ids: ['Base.HandDrill', 'Base.PoweredDrill'] },
  { slug: 'filing-sharpening', name: 'Filing & sharpening', category: 'Workshop', details: 'Shape edges and restore cutting tools.', tags: ['File', 'SharpeningTool'], ids: ['Base.MetalworkFile', 'Base.Whetstone'] },
  { slug: 'chiseling', name: 'Chiseling', category: 'Workshop', details: 'Cut joints and shape wood, stone, or metal.', tags: ['MasonsChisel', 'MetalworkingChisel', 'CarpentryChisel'], ids: ['Base.MasonsChisel', 'Base.MetalworkingChisel', 'Base.CarpentryChisel', 'Base.StoneChisel'] },
  { slug: 'sewing-leather', name: 'Sewing & leatherworking', category: 'Workshop', details: 'Repair fabric and work leather.', tags: ['SewingNeedle', 'LeatherTool'], ids: ['Base.Needle', 'Base.Awl'] },
  { slug: 'forging-tongs', name: 'Forging tongs', category: 'Workshop', details: 'Safely hold hot metal while forging.', tags: ['Tongs', 'CrudeTongs'], ids: ['Base.Tongs', 'Base.CrudeWoodenTongs'] },
  { slug: 'welding-equipment', name: 'Welding equipment', category: 'Workshop', details: 'Cut and join metal. A torch and welding mask are both required.', tags: ['Welding'], ids: ['Base.BlowTorch', 'Base.WeldingMask'] },
  { slug: 'generator', name: 'Generator power', category: 'Utility', details: 'Provide local electrical power after the grid fails.', tags: [], ids: ['Base.Generator'] }
]

const RECIPE_FIELD_ALIASES = ['LearnedRecipes', 'LearnedRecipe', 'TeachedRecipes', 'TeachRecipes']

export const RECORDED_MEDIA_SKILL_CODES: Record<string, string> = {
  SPR: 'Running',
  LFT: 'Lightfooted',
  NIM: 'Nimble',
  SNE: 'Sneaking',
  BAA: 'Axe',
  BUA: 'Long Blunt',
  CRP: 'Carpentry',
  COO: 'Cooking',
  FRM: 'Agriculture',
  DOC: 'First Aid',
  ELC: 'Electrical',
  MTL: 'Welding',
  FKN: 'Knapping',
  CRV: 'Carving',
  AIM: 'Aiming',
  REL: 'Reloading',
  FIS: 'Fishing',
  TRA: 'Trapping',
  FOR: 'Foraging',
  TAI: 'Tailoring',
  MEC: 'Mechanics',
  CMB: 'Combat',
  SPE: 'Spear',
  SBU: 'Short Blunt',
  LBA: 'Long Blade',
  SBA: 'Short Blade',
  MAS: 'Masonry',
  POT: 'Pottery',
  BLA: 'Blacksmithing',
  GLA: 'Glassmaking',
  HUS: 'Animal Care',
  BUT: 'Butchering',
  TRK: 'Tracking'
}

const RECORDED_MEDIA_STAT_CODES = new Set([
  'ANG', 'BOR', 'END', 'FAT', 'FIT', 'HUN', 'MOR', 'STS', 'PAN', 'SAN', 'SIC', 'PAI', 'DRU', 'THI', 'UHP'
])

const SKILL_DISPLAY_NAMES: Record<string, string> = {
  Blacksmith: 'Blacksmithing',
  Electricity: 'Electrical',
  Farming: 'Agriculture',
  FirstAid: 'First Aid',
  FlintKnapping: 'Knapping',
  Husbandry: 'Animal Care',
  LongBlade: 'Long Blade',
  MetalWelding: 'Welding'
}

export function parseItemScript(text: string, sourceFile = 'unknown.txt'): RawItem[] {
  const moduleMatch = text.match(/\bmodule\s+([A-Za-z0-9_.-]+)/)
  const moduleName = moduleMatch?.[1] ?? 'Base'
  const items: RawItem[] = []
  const itemPattern = /\bitem\s+([A-Za-z0-9_.-]+)\s*\{/g
  let match: RegExpExecArray | null

  while ((match = itemPattern.exec(text))) {
    let depth = 1
    let cursor = itemPattern.lastIndex
    let quote: string | null = null
    for (; cursor < text.length && depth > 0; cursor += 1) {
      const char = text[cursor]
      const previous = text[cursor - 1]
      if ((char === '"' || char === "'") && previous !== '\\') quote = quote === char ? null : quote ? quote : char
      if (quote) continue
      if (char === '{') depth += 1
      if (char === '}') depth -= 1
    }
    if (depth !== 0) throw new Error(`Unclosed item block ${match[1]} in ${sourceFile}`)
    const body = text.slice(itemPattern.lastIndex, cursor - 1)
    const fields: Record<string, string> = {}
    const fieldPattern = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.*?)\s*,?\s*$/gm
    let fieldMatch: RegExpExecArray | null
    while ((fieldMatch = fieldPattern.exec(body))) {
      fields[fieldMatch[1]] = stripQuotes(fieldMatch[2].replace(/,\s*$/, '').trim())
    }
    items.push({
      module: moduleName,
      itemId: match[1],
      fullId: `${moduleName}.${match[1]}`,
      fields,
      sourceFile
    })
    itemPattern.lastIndex = cursor
  }
  return items
}

function stripQuotes(value: string) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}

function splitList(value = '') {
  return value
    .split(/[;,]/)
    .map((entry) => stripQuotes(entry.trim()))
    .filter(Boolean)
}

function normalizeTag(tag: string) {
  return (tag.split(':').at(-1) ?? tag).toLowerCase()
}

function resolveRecipeName(translations: Record<string, string>, recipeCode: string) {
  const unqualifiedCode = recipeCode.split(':').at(-1) ?? recipeCode
  const exact = translations[recipeCode]
    ?? translations[unqualifiedCode]
    ?? translations[`Recipe_${recipeCode}`]
    ?? translations[`Recipe_${unqualifiedCode}`]
  if (exact) return exact

  const normalizedCode = unqualifiedCode.toLowerCase()
  const caseInsensitiveKey = Object.keys(translations)
    .find((key) => key.toLowerCase() === normalizedCode || key.toLowerCase() === `recipe_${normalizedCode}`)
  if (caseInsensitiveKey) return translations[caseInsensitiveKey]

  return unqualifiedCode
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

export function resolveTranslation(
  translations: Record<string, string>,
  item: RawItem
): string | undefined {
  const keys = [
    item.fullId,
    `ItemName_${item.module}.${item.itemId}`,
    `ItemName_${item.itemId}`,
    item.fields.DisplayName
  ].filter(Boolean)
  return keys.map((key) => translations[key]).find(Boolean) ?? item.fields.DisplayName
}

export function parseRewardCodes(input: string): { skills: string[]; recipes: string[]; unknown: string[] } {
  const skills = new Set<string>()
  const recipes = new Set<string>()
  const unknown = new Set<string>()
  for (const token of input.split(/[,;|\n]/).map((entry) => entry.trim()).filter(Boolean)) {
    const recipeCode = token.match(/^RCP=(.+)$/i)
    if (recipeCode) {
      recipes.add(recipeCode[1].trim())
      continue
    }

    const interaction = token.match(/^([A-Z]{3})([+-])(?:\d+(?:\.\d+)?)$/)
    if (interaction) {
      const [, code] = interaction
      if (RECORDED_MEDIA_SKILL_CODES[code]) skills.add(RECORDED_MEDIA_SKILL_CODES[code])
      else if (!RECORDED_MEDIA_STAT_CODES.has(code)) unknown.add(token)
      continue
    }

    const legacy = token.match(/^(?:add)?(skill|recipe|perk)\s*[:=]\s*(.+)$/i)
    if (legacy) {
      const values = splitList(legacy[2])
      if (/recipe/i.test(legacy[1])) values.forEach((value) => recipes.add(value))
      else values.forEach((value) => skills.add(value))
      continue
    }

    unknown.add(token)
  }
  return { skills: [...skills], recipes: [...recipes], unknown: [...unknown] }
}

export function mapToolCapabilities(
  items: RawItem[],
  translations: Record<string, string>
): { tools: ToolCapability[]; unmatched: string[] } {
  const matchedIds = new Set<string>()
  const tools = TOOL_RULES.map((rule): ToolCapability | null => {
    const variants = items.filter((item) => {
      const tags = splitList(item.fields.Tags).map(normalizeTag)
      const matched = rule.ids.includes(item.fullId) || rule.tags.some((tag) => tags.includes(normalizeTag(tag)))
      if (matched) matchedIds.add(item.fullId)
      return matched
    })
    if (variants.length === 0) return null
    return {
      id: `tool-capability:${rule.slug}`,
      name: rule.name,
      kind: 'tool-capability',
      category: rule.category,
      wikiUrl: wikiSearch(rule.name),
      sourceIds: variants.map((item) => item.fullId).sort(),
      variants: [...new Set(variants.map((item) => resolveTranslation(translations, item) ?? item.itemId))].sort(),
      details: rule.details
    }
  }).filter((entry): entry is ToolCapability => !!entry)

  const reviewedTags = new Set(TOOL_RULES.flatMap((rule) => rule.tags.map(normalizeTag)))
  const unmatched = items
    .filter((item) => splitList(item.fields.Tags).some((tag) => reviewedTags.has(normalizeTag(tag))) && !matchedIds.has(item.fullId))
    .map((item) => item.fullId)
  return { tools, unmatched }
}

export function classifyItems(
  items: RawItem[],
  translations: Record<string, string>
): {
  books: SkillBook[]
  literature: RecipeLiterature[]
  missingTranslations: string[]
} {
  const books: SkillBook[] = []
  const literature: RecipeLiterature[] = []
  const missingTranslations: string[] = []

  for (const item of items) {
    const displayName = resolveTranslation(translations, item)
    const isBook = item.fields.SkillTrained && item.fields.LvlSkillTrained && item.fields.NumLevelsTrained
    const recipeField = RECIPE_FIELD_ALIASES.find((field) => item.fields[field])
    if (!isBook && !recipeField) continue
    if (!displayName) {
      missingTranslations.push(item.fullId)
      continue
    }
    if (isBook) {
      const skill = SKILL_DISPLAY_NAMES[item.fields.SkillTrained] ?? item.fields.SkillTrained
      const start = Number.parseInt(item.fields.LvlSkillTrained, 10)
      const count = Number.parseInt(item.fields.NumLevelsTrained, 10)
      const tierMatch = item.itemId.match(/(\d+)$/)
      books.push({
        id: item.fullId,
        name: displayName,
        kind: 'skill-book',
        category: skill,
        wikiUrl: wikiSearch(displayName),
        skill,
        tier: Number.parseInt(tierMatch?.[1] ?? '1', 10),
        levelStart: start,
        levelEnd: start + count - 1,
        pages: Number.parseInt(item.fields.NumberOfPages ?? item.fields.Pages ?? '1', 10)
      })
    }
    if (recipeField) {
      const isSeedPacket = /BagSeed(?:2)?(?:_Empty)?$/.test(item.itemId)
      literature.push({
        id: item.fullId,
        name: displayName,
        kind: 'recipe-literature',
        category: isSeedPacket ? 'Seeds' : item.fields.DisplayCategory ?? item.fields.Category ?? 'Recipe literature',
        wikiUrl: wikiSearch(displayName),
        recipes: [...new Set(
          splitList(item.fields[recipeField]).map((recipe) => resolveRecipeName(translations, recipe))
        )]
      })
    }
  }
  return { books, literature, missingTranslations }
}

export function parseRecordedMedia(
  text: string,
  translations: Record<string, string>
): { entries: EducationalVhs[]; unknownRewardCodes: string[] } {
  const entries: EducationalVhs[] = []
  const unknownRewardCodes: string[] = []
  const blockPattern = /RecMedia\["([^"]+)"\]\s*=\s*\{/g
  let block: RegExpExecArray | null
  while ((block = blockPattern.exec(text))) {
    let depth = 1
    let cursor = blockPattern.lastIndex
    let quote: string | null = null
    for (; cursor < text.length && depth > 0; cursor += 1) {
      const character = text[cursor]
      const previous = text[cursor - 1]
      if ((character === '"' || character === "'") && previous !== '\\') {
        quote = quote === character ? null : quote ? quote : character
      }
      if (quote) continue
      if (character === '{') depth += 1
      if (character === '}') depth -= 1
    }
    if (depth !== 0) throw new Error(`Unclosed recorded-media block ${block[1]}`)

    const uuid = block[1]
    const source = text.slice(blockPattern.lastIndex, cursor - 1)
    const field = (name: string) => source.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
    const categoryCode = field('category') ?? ''
    if (categoryCode !== 'Retail-VHS' && categoryCode !== 'Home-VHS') {
      blockPattern.lastIndex = cursor
      continue
    }

    const allCodes = [...source.matchAll(/\bcodes\s*=\s*["']([^"']*)["']/gi)].map((match) => match[1])
    const rewards = parseRewardCodes(allCodes.join(','))
    if (rewards.skills.length === 0 && rewards.recipes.length === 0) continue
    unknownRewardCodes.push(...rewards.unknown.map((code) => `${uuid}:${code}`))
    const displayCode = field('itemDisplayName') ?? field('title') ?? uuid
    const title = translations[displayCode] ?? translations[`Recorded_Media_${displayCode}`] ?? displayCode
    entries.push({
      id: `recorded-media:${uuid}`,
      name: title,
      kind: 'educational-vhs',
      category: categoryCode === 'Home-VHS' ? 'Home VHS' : 'Retail VHS',
      wikiUrl: wikiSearch(title),
      mediaUuid: uuid,
      skills: rewards.skills,
      recipes: [...new Set(rewards.recipes.map((recipe) => resolveRecipeName(translations, recipe)))]
    })
    blockPattern.lastIndex = cursor
  }
  return {
    entries,
    unknownRewardCodes: [...new Set(unknownRewardCodes)]
  }
}

function wikiSearch(name: string) {
  return `https://pzwiki.net/w/index.php?search=${encodeURIComponent(name)}`
}

export function diffCatalog(previous: Catalog | undefined, nextItems: CatalogItem[]) {
  if (!previous) return { added: [], removed: [], changed: [] }
  const before = new Map(previous.items.map((item) => [item.id, item]))
  const after = new Map(nextItems.map((item) => [item.id, item]))
  return {
    added: [...after.keys()].filter((id) => !before.has(id)).sort(),
    removed: [...before.keys()].filter((id) => !after.has(id)).sort(),
    changed: [...after.keys()].filter((id) => before.has(id) && JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id))).sort()
  }
}

export async function findFiles(root: string, predicate: (path: string) => boolean): Promise<string[]> {
  const found: string[] = []
  async function walk(directory: string) {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    await Promise.all(entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (predicate(path)) found.push(path)
    }))
  }
  await walk(root)
  return found.sort()
}

export async function loadItems(mediaPath: string): Promise<RawItem[]> {
  const candidates = [
    join(mediaPath, 'scripts', 'generated', 'items'),
    join(mediaPath, 'scripts')
  ]
  let files: string[] = []
  for (const candidate of candidates) {
    files = await findFiles(candidate, (path) => extname(path) === '.txt')
    if (files.length > 0) break
  }
  if (files.length === 0) throw new Error(`No item scripts found below ${relative(process.cwd(), mediaPath)}`)
  const parsed = await Promise.all(files.map(async (file) => parseItemScript(await readFile(file, 'utf8'), file)))
  return parsed.flat()
}

export async function loadTranslations(mediaPath: string): Promise<Record<string, string>> {
  const translateRoot = join(mediaPath, 'lua', 'shared', 'Translate', 'EN')
  const files = await findFiles(
    translateRoot,
    (path) => /\.(json|txt|lua)$/i.test(path) && /(ItemName|Recipe|Recorded|Media|IGUI|IG_UI)/i.test(path)
  )
  const translations: Record<string, string> = {}
  for (const file of files) {
    const content = await readFile(file, 'utf8')
    if (extname(file).toLowerCase() === '.json') {
      const parsed = JSON.parse(content) as Record<string, unknown>
      flattenTranslations(parsed, translations)
    } else {
      const pattern = /^\s*([A-Za-z0-9_.-]+)\s*=\s*["'](.*?)["']\s*,?\s*$/gm
      let match: RegExpExecArray | null
      while ((match = pattern.exec(content))) translations[match[1]] = match[2]
    }
  }
  return translations
}

function flattenTranslations(input: Record<string, unknown>, output: Record<string, string>, prefix = '') {
  for (const [key, value] of Object.entries(input)) {
    const fullKey = prefix ? `${prefix}_${key}` : key
    if (typeof value === 'string') output[fullKey] = value
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenTranslations(value as Record<string, unknown>, output, fullKey)
    }
  }
}
