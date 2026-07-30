import { describe, expect, it } from 'vitest'
import { catalog } from '../data/catalog'

describe('Build 42.20 catalog', () => {
  it('has stable, unique and translated IDs', () => {
    const ids = catalog.items.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(catalog.items.every((item) => item.name.trim().length > 0)).toBe(true)
  })

  it('meets the public invariant for every discriminant', () => {
    for (const item of catalog.items) {
      if (item.kind === 'skill-book') {
        expect(item.id).toMatch(/^Base\./)
        expect(item.levelEnd).toBeGreaterThanOrEqual(item.levelStart)
        expect(item.pages).toBeGreaterThan(0)
      }
      if (item.kind === 'recipe-literature') {
        expect(item.id).toMatch(/^Base\./)
        expect(item.recipes.length).toBeGreaterThan(0)
      }
      if (item.kind === 'educational-vhs') {
        expect(item.id).toBe(`recorded-media:${item.mediaUuid}`)
        expect(item.skills.length + item.recipes.length).toBeGreaterThan(0)
      }
      if (item.kind === 'tool-capability') {
        expect(item.id).toMatch(/^tool-capability:/)
        expect(item.variants.length).toBeGreaterThan(0)
      }
    }
  })

  it('covers every planned tool capability group', () => {
    expect(catalog.items.filter((item) => item.kind === 'tool-capability')).toHaveLength(25)
  })

  it('contains all 24 Build 42.20 skill-book families and all five tiers', () => {
    const books = catalog.items.filter((item) => item.kind === 'skill-book')
    const families = books.reduce((grouped, book) => {
      grouped.set(book.skill, [...(grouped.get(book.skill) ?? []), book])
      return grouped
    }, new Map<string, typeof books>())

    expect(books).toHaveLength(120)
    expect(families.size).toBe(24)
    for (const family of families.values()) {
      expect(family.map((book) => book.tier).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
    }
  })

  it('contains every progression-relevant Home and Retail VHS in Build 42.20', () => {
    const vhs = catalog.items.filter((item) => item.kind === 'educational-vhs')

    expect(vhs).toHaveLength(62)
    expect(vhs.filter((item) => item.category === 'Home VHS')).toHaveLength(14)
    expect(vhs.filter((item) => item.category === 'Retail VHS')).toHaveLength(48)
  })

  it('contains the complete normalized Build 42.20 catalog', () => {
    const recipeTeachingItems = catalog.items.filter((item) => item.kind === 'recipe-literature')
    expect(recipeTeachingItems.filter((item) => item.category === 'Seeds')).toHaveLength(110)
    expect(recipeTeachingItems.filter((item) => item.category !== 'Seeds')).toHaveLength(87)
    expect(catalog.items).toHaveLength(404)
  })
})
