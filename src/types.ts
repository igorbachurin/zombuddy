import { z } from 'zod'

const catalogBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(['skill-book', 'recipe-literature', 'educational-vhs', 'tool-capability']),
  category: z.string().min(1),
  wikiUrl: z.string().url(),
  sourceIds: z.array(z.string()).optional(),
  legacy: z.boolean().optional()
})

export const skillBookSchema = catalogBaseSchema.extend({
  kind: z.literal('skill-book'),
  skill: z.string().min(1),
  tier: z.number().int().min(1),
  levelStart: z.number().int().min(0),
  levelEnd: z.number().int().min(1),
  pages: z.number().int().positive()
})

export const recipeLiteratureSchema = catalogBaseSchema.extend({
  kind: z.literal('recipe-literature'),
  recipes: z.array(z.string().min(1)).min(1)
})

export const educationalVhsSchema = catalogBaseSchema.extend({
  kind: z.literal('educational-vhs'),
  mediaUuid: z.string().min(1),
  skills: z.array(z.string().min(1)),
  recipes: z.array(z.string().min(1))
}).refine((item) => item.skills.length > 0 || item.recipes.length > 0, {
  message: 'Educational VHS entries need at least one reward'
})

export const toolCapabilitySchema = catalogBaseSchema.extend({
  kind: z.literal('tool-capability'),
  variants: z.array(z.string().min(1)).min(1),
  details: z.string().min(1)
})

export const catalogItemSchema = z.discriminatedUnion('kind', [
  skillBookSchema,
  recipeLiteratureSchema,
  educationalVhsSchema,
  toolCapabilitySchema
])

export const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.string().min(1),
  gameBuild: z.string().min(1),
  generatedAt: z.string().datetime(),
  source: z.string().min(1),
  items: z.array(catalogItemSchema)
})

export type SkillBook = z.infer<typeof skillBookSchema>
export type RecipeLiterature = z.infer<typeof recipeLiteratureSchema>
export type EducationalVhs = z.infer<typeof educationalVhsSchema>
export type ToolCapability = z.infer<typeof toolCapabilitySchema>
export type CatalogItem = z.infer<typeof catalogItemSchema>
export type Catalog = z.infer<typeof catalogSchema>

export const runRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  catalogVersion: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable(),
  note: z.string().max(1000).optional()
})

export type RunRecord = z.infer<typeof runRecordSchema>

const progressBaseSchema = z.object({
  runId: z.string().min(1),
  itemId: z.string().min(1),
  updatedAt: z.string().datetime()
})

export const mediaProgressSchema = progressBaseSchema.extend({
  type: z.literal('media'),
  status: z.enum(['owned', 'consumed'])
})

export const toolProgressSchema = progressBaseSchema.extend({
  type: z.literal('tool'),
  quantity: z.number().int().min(0).max(999),
  location: z.string().max(120),
  note: z.string().max(500)
})

export const progressRecordSchema = z.discriminatedUnion('type', [
  mediaProgressSchema,
  toolProgressSchema
])

export type MediaProgressRecord = z.infer<typeof mediaProgressSchema>
export type ToolProgressRecord = z.infer<typeof toolProgressSchema>
export type ProgressRecord = z.infer<typeof progressRecordSchema>

export const recentChangeSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  itemId: z.string().min(1),
  changedAt: z.string().datetime(),
  summary: z.string().min(1)
})

export type RecentChange = z.infer<typeof recentChangeSchema>

export const preferenceSchema = z.object({
  key: z.string().min(1),
  value: z.string()
})

export type PreferenceRecord = z.infer<typeof preferenceSchema>

export const backupEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  catalogVersions: z.array(z.string().min(1)),
  runs: z.array(runRecordSchema),
  progress: z.array(progressRecordSchema)
}).superRefine((backup, context) => {
  const runIds = new Set<string>()
  backup.runs.forEach((run, index) => {
    if (runIds.has(run.id)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate run ID: ${run.id}`,
        path: ['runs', index, 'id']
      })
    }
    runIds.add(run.id)
  })

  const progressKeys = new Set<string>()
  backup.progress.forEach((record, index) => {
    if (!runIds.has(record.runId)) {
      context.addIssue({
        code: 'custom',
        message: `Progress references an unknown run: ${record.runId}`,
        path: ['progress', index, 'runId']
      })
    }
    const key = `${record.runId}\u0000${record.itemId}`
    if (progressKeys.has(key)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate progress record: ${record.itemId}`,
        path: ['progress', index, 'itemId']
      })
    }
    progressKeys.add(key)
  })
})

export type BackupEnvelopeV1 = z.infer<typeof backupEnvelopeSchema>

export type MediaStatus = 'missing' | 'owned' | 'consumed'
export type FilterStatus = 'all' | MediaStatus
export type TabId = 'dashboard' | 'books' | 'recipes' | 'seeds' | 'vhs' | 'tools' | 'runs'
