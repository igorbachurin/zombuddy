import { describe, expect, it } from 'vitest'
import {
  classifyItems,
  diffCatalog,
  mapToolCapabilities,
  parseItemScript,
  parseRecordedMedia,
  parseRewardCodes,
  resolveTranslation
} from '../../scripts/lib/catalog-generator'
import type { Catalog } from '../types'

const script = `
module Base
{
  item BookCarpentry1
  {
    DisplayName = BookCarpentry1,
    SkillTrained = Carpentry,
    LvlSkillTrained = 1,
    NumLevelsTrained = 2,
    NumberOfPages = 220,
  }
  item RecipeNotes
  {
    DisplayName = RecipeNotes,
    LearnedRecipe = MakeBread;MakePie,
  }
  item Hammer
  {
    DisplayName = Hammer,
    Tags = base:hammer;base:metal,
  }
}
`

describe('catalog generator primitives', () => {
  it('parses item blocks and resolves English names', () => {
    const items = parseItemScript(script)
    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({ fullId: 'Base.BookCarpentry1', fields: { SkillTrained: 'Carpentry' } })
    expect(resolveTranslation({ 'ItemName_Base.BookCarpentry1': 'Carpentry Vol. 1' }, items[0])).toBe('Carpentry Vol. 1')
  })

  it('accepts compatibility aliases for recipe literature', () => {
    const { books, literature } = classifyItems(parseItemScript(script), {
      'ItemName_Base.BookCarpentry1': 'Carpentry Vol. 1',
      'ItemName_Base.RecipeNotes': 'Recipe Notes',
      Recipe_MakeBread: 'Make Bread',
      Recipe_MakePie: 'Make Pie'
    })
    expect(books[0]).toMatchObject({ levelStart: 1, levelEnd: 2, pages: 220 })
    expect(literature[0].recipes).toEqual(['Make Bread', 'Make Pie'])
  })

  it('maps namespaced, lowercase game tags to capabilities', () => {
    const items = parseItemScript(script)
    const mapped = mapToolCapabilities(items, { 'ItemName_Base.Hammer': 'Claw Hammer' })
    expect(mapped.tools.find((tool) => tool.id === 'tool-capability:hammering')?.variants).toContain('Claw Hammer')
    expect(mapped.unmatched).toEqual([])
  })

  it('parses VHS reward codes and rejects entertainment-only entries', () => {
    expect(parseRewardCodes('Skill=Carpentry;Recipe=MakeChair')).toEqual({
      skills: ['Carpentry'],
      recipes: ['MakeChair'],
      unknown: []
    })
    const lua = `
      RecMedia["edu-1"] = {
        itemDisplayName="RM_Edu",
        category="Home-VHS",
        lines = {
          { codes="CRP+1" },
          { codes="RCP=MakeChair" },
          { codes="BOR-1" },
        },
      };
      RecMedia["fun-1"] = {
        itemDisplayName="RM_Fun",
        category="Retail-VHS",
        lines = { { codes="BOR-1" }, },
      };
    `
    const parsed = parseRecordedMedia(lua, { RM_Edu: 'Woodcraft: Chairs', Recipe_MakeChair: 'Make Chair' })
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.entries[0]).toMatchObject({ id: 'recorded-media:edu-1', name: 'Woodcraft: Chairs', recipes: ['Make Chair'] })
  })

  it('decodes real recorded-media skill and recipe codes while ignoring mood effects', () => {
    expect(parseRewardCodes('FRM+1,RCP=base:corn growing season,BOR-1,STS+0.2')).toEqual({
      skills: ['Agriculture'],
      recipes: ['base:corn growing season'],
      unknown: []
    })
  })

  it('resolves namespaced recipe codes without exact-case source matches', () => {
    const { literature } = classifyItems(parseItemScript(`
      module Base {
        item Notes {
          DisplayName = Notes,
          LearnedRecipes = base:kitchentools;MakeSlugTrap,
        }
      }
    `), {
      'Base.Notes': 'Smithing Notes',
      KitchenTools: 'Forge Kitchen Tools'
    })

    expect(literature[0].recipes).toEqual(['Forge Kitchen Tools', 'Make Slug Trap'])
  })

  it('classifies recipe-teaching seed packets separately from literature', () => {
    const { literature } = classifyItems(parseItemScript(`
      module Base {
        item TomatoBagSeed2 {
          DisplayName = TomatoBagSeed2,
          DisplayCategory = Gardening,
          LearnedRecipes = TomatoGrowingSeason,
        }
      }
    `), {
      'Base.TomatoBagSeed2': 'Seed Packet - Tomato',
      TomatoGrowingSeason: 'Tomato Growing Season'
    })

    expect(literature[0]).toMatchObject({
      id: 'Base.TomatoBagSeed2',
      category: 'Seeds',
      recipes: ['Tomato Growing Season']
    })
  })

  it('diffs stable IDs across catalogs', () => {
    const next = classifyItems(parseItemScript(script), {
      'ItemName_Base.BookCarpentry1': 'Carpentry Vol. 1',
      'ItemName_Base.RecipeNotes': 'Recipe Notes'
    }).books
    const previous = {
      schemaVersion: 1,
      catalogVersion: 'old',
      gameBuild: '42.19',
      generatedAt: new Date(0).toISOString(),
      source: 'test',
      items: [{ ...next[0], name: 'Old name' }, {
        ...next[0],
        id: 'Base.Removed'
      }]
    } satisfies Catalog
    expect(diffCatalog(previous, next)).toEqual({
      added: [],
      removed: ['Base.Removed'],
      changed: ['Base.BookCarpentry1']
    })
  })
})
