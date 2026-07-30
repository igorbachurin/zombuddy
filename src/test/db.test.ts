import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRun,
  db,
  deleteRun,
  exportBackup,
  restoreBackup,
  setMediaStatus,
  setRunArchived,
  setToolProgress
} from '../db'

describe('local run persistence', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('isolates progress by run and removes missing records', async () => {
    const first = await createRun('First')
    const second = await createRun('Second')
    await setMediaStatus(first.id, 'Base.BookCarpentry1', 'owned')
    await setMediaStatus(second.id, 'Base.BookCarpentry1', 'consumed')

    expect((await db.progress.get([first.id, 'Base.BookCarpentry1']))?.type).toBe('media')
    expect(await db.progress.get([second.id, 'Base.BookCarpentry1'])).toMatchObject({ status: 'consumed' })

    await setMediaStatus(first.id, 'Base.BookCarpentry1', 'missing')
    expect(await db.progress.get([first.id, 'Base.BookCarpentry1'])).toBeUndefined()
    expect(await db.progress.get([second.id, 'Base.BookCarpentry1'])).toBeDefined()
  })

  it('clamps tool quantities and deletes a truly empty tool record', async () => {
    const run = await createRun('Tools')
    await setToolProgress(run.id, 'tool-capability:hammering', { quantity: 1200, location: 'Garage', note: '' })
    expect(await db.progress.get([run.id, 'tool-capability:hammering'])).toMatchObject({ quantity: 999, location: 'Garage' })
    await setToolProgress(run.id, 'tool-capability:hammering', { quantity: 0, location: '', note: '' })
    expect(await db.progress.get([run.id, 'tool-capability:hammering'])).toBeUndefined()
  })

  it('archives and permanently deletes a run transactionally', async () => {
    const run = await createRun('Short life')
    await setMediaStatus(run.id, 'Base.BookCarpentry1', 'owned')
    await setRunArchived(run.id, true)
    expect((await db.runs.get(run.id))?.archivedAt).toBeTruthy()
    await deleteRun(run.id)
    expect(await db.runs.get(run.id)).toBeUndefined()
    expect(await db.progress.where('runId').equals(run.id).count()).toBe(0)
  })

  it('validates and atomically replaces a complete backup', async () => {
    const run = await createRun('Backup run')
    await setMediaStatus(run.id, 'Base.BookCooking1', 'consumed')
    const backup = await exportBackup()
    await createRun('Disposable')
    await restoreBackup(backup, true)
    expect(await db.runs.toArray()).toHaveLength(1)
    expect(await db.progress.toArray()).toHaveLength(1)
    await expect(restoreBackup({ schemaVersion: 99 }, true)).rejects.toThrow()
    expect(await db.runs.toArray()).toHaveLength(1)
  })

  it('rejects internally inconsistent backups before opening a transaction', async () => {
    const run = await createRun('Keep me')
    const backup = await exportBackup()
    const invalid = {
      ...backup,
      progress: [{
        type: 'media',
        runId: 'missing-run',
        itemId: 'Base.BookCooking1',
        status: 'owned',
        updatedAt: new Date().toISOString()
      }]
    }

    await expect(restoreBackup(invalid, true)).rejects.toThrow(/unknown run/i)
    expect(await db.runs.get(run.id)).toBeDefined()
  })
})
