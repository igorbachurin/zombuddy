import Dexie, { type Table } from 'dexie'
import {
  backupEnvelopeSchema,
  type BackupEnvelopeV1,
  type PreferenceRecord,
  type ProgressRecord,
  type RecentChange,
  type RunRecord
} from './types'
import { catalog } from './data/catalog'

export class ZombuddyDatabase extends Dexie {
  runs!: Table<RunRecord, string>
  progress!: Table<ProgressRecord, [string, string]>
  recent!: Table<RecentChange, string>
  preferences!: Table<PreferenceRecord, string>

  constructor(name = 'zombuddy') {
    super(name)
    this.version(1).stores({
      runs: 'id, archivedAt, updatedAt',
      progress: '[runId+itemId], runId, itemId, updatedAt',
      recent: 'id, runId, changedAt, [runId+changedAt]',
      preferences: 'key'
    })
  }
}

export const db = new ZombuddyDatabase()

const isoNow = () => new Date().toISOString()
const newId = () => crypto.randomUUID()

export async function createRun(name: string, note?: string): Promise<RunRecord> {
  const now = isoNow()
  const run: RunRecord = {
    id: newId(),
    name: name.trim(),
    note: note?.trim() || undefined,
    catalogVersion: catalog.catalogVersion,
    createdAt: now,
    updatedAt: now,
    archivedAt: null
  }
  await db.transaction('rw', db.runs, db.preferences, async () => {
    await db.runs.add(run)
    await db.preferences.put({ key: 'activeRunId', value: run.id })
  })
  return run
}

export async function setActiveRun(runId: string): Promise<void> {
  await db.preferences.put({ key: 'activeRunId', value: runId })
}

export async function renameRun(runId: string, name: string, note?: string): Promise<void> {
  await db.runs.update(runId, {
    name: name.trim(),
    note: note?.trim() || undefined,
    updatedAt: isoNow()
  })
}

export async function setRunArchived(runId: string, archived: boolean): Promise<void> {
  await db.runs.update(runId, {
    archivedAt: archived ? isoNow() : null,
    updatedAt: isoNow()
  })
}

export async function deleteRun(runId: string): Promise<void> {
  await db.transaction('rw', db.runs, db.progress, db.recent, db.preferences, async () => {
    await db.progress.where('runId').equals(runId).delete()
    await db.recent.where('runId').equals(runId).delete()
    await db.runs.delete(runId)
    const active = await db.preferences.get('activeRunId')
    if (active?.value === runId) await db.preferences.delete('activeRunId')
  })
}

async function addRecent(runId: string, itemId: string, summary: string) {
  await db.recent.add({
    id: newId(),
    runId,
    itemId,
    changedAt: isoNow(),
    summary
  })
  const old = await db.recent.where('runId').equals(runId).reverse().sortBy('changedAt')
  if (old.length > 30) {
    await db.recent.bulkDelete(old.slice(30).map((entry) => entry.id))
  }
}

export async function setMediaStatus(
  runId: string,
  itemId: string,
  status: 'missing' | 'owned' | 'consumed'
): Promise<void> {
  await db.transaction('rw', db.progress, db.runs, db.recent, async () => {
    if (status === 'missing') {
      await db.progress.delete([runId, itemId])
    } else {
      await db.progress.put({ type: 'media', runId, itemId, status, updatedAt: isoNow() })
    }
    await db.runs.update(runId, { updatedAt: isoNow() })
    await addRecent(runId, itemId, status === 'consumed' ? 'Marked complete' : status === 'owned' ? 'Added to kit' : 'Marked missing')
  })
}

export async function setToolProgress(
  runId: string,
  itemId: string,
  values: { quantity: number; location: string; note: string }
): Promise<void> {
  const quantity = Math.max(0, Math.min(999, Math.floor(values.quantity)))
  await db.transaction('rw', db.progress, db.runs, db.recent, async () => {
    if (quantity === 0 && !values.location.trim() && !values.note.trim()) {
      await db.progress.delete([runId, itemId])
    } else {
      await db.progress.put({
        type: 'tool',
        runId,
        itemId,
        quantity,
        location: values.location.trim(),
        note: values.note.trim(),
        updatedAt: isoNow()
      })
    }
    await db.runs.update(runId, { updatedAt: isoNow() })
    await addRecent(runId, itemId, quantity > 0 ? `${quantity} acquired` : 'Marked missing')
  })
}

export async function exportBackup(): Promise<BackupEnvelopeV1> {
  const [runs, progress] = await Promise.all([db.runs.toArray(), db.progress.toArray()])
  return {
    schemaVersion: 1,
    exportedAt: isoNow(),
    catalogVersions: [...new Set(runs.map((run) => run.catalogVersion))],
    runs,
    progress
  }
}

export async function restoreBackup(input: unknown, replace: boolean): Promise<void> {
  const backup = backupEnvelopeSchema.parse(input)
  await db.transaction('rw', db.runs, db.progress, db.recent, db.preferences, async () => {
    if (replace) {
      await Promise.all([
        db.runs.clear(),
        db.progress.clear(),
        db.recent.clear(),
        db.preferences.clear()
      ])
    }
    await db.runs.bulkPut(backup.runs)
    await db.progress.bulkPut(backup.progress)
    const activeRuns = backup.runs.filter((run) => !run.archivedAt)
    if (activeRuns[0]) {
      await db.preferences.put({ key: 'activeRunId', value: activeRuns[0].id })
    }
  })
}

export async function resolveActiveRun(runs: RunRecord[]): Promise<RunRecord | undefined> {
  const preferred = await db.preferences.get('activeRunId')
  const activeRuns = runs.filter((run) => !run.archivedAt)
  return activeRuns.find((run) => run.id === preferred?.value) ?? activeRuns[0]
}
