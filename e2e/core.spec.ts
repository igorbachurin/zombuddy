import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const firstCarpentryBook = 'Carpentry I: "A Guide to Nailing"'

async function startRun(page: import('@playwright/test').Page, name = 'Rosewood, no regrets') {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Name this run' })).toBeVisible()
  await page.getByLabel('Run name').fill(name)
  await page.getByRole('button', { name: 'Start this run' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

test('first run onboarding and persistence across reloads', async ({ page }) => {
  await startRun(page)
  await page.getByRole('button', { name: 'Books', exact: true }).last().click()
  const firstBook = page.getByRole('article').filter({ hasText: firstCarpentryBook })
  await firstBook.getByRole('button', { name: 'Owned' }).click()
  await expect(firstBook).toContainText('In kit')
  await page.reload()
  await expect(page.getByRole('article').filter({ hasText: firstCarpentryBook })).toContainText('In kit')
})

test('separate runs start with clean progress', async ({ page }) => {
  await startRun(page, 'First run')
  await page.getByRole('button', { name: 'Books', exact: true }).last().click()
  await page.getByRole('article').filter({ hasText: firstCarpentryBook }).getByRole('button', { name: 'Read' }).click()
  await page.getByRole('button', { name: 'Runs', exact: true }).last().click()
  await page.getByRole('button', { name: 'New run' }).click()
  const newRunDialog = page.locator('dialog[open]')
  await newRunDialog.getByLabel('Run name').fill('Second run')
  await newRunDialog.getByRole('button', { name: 'Save run' }).click()
  await page.getByRole('button', { name: 'Books', exact: true }).last().click()
  const secondBook = page.getByRole('article').filter({ hasText: firstCarpentryBook })
  await expect(secondBook).toContainText('Missing')
})

test('dashboard has no serious automated accessibility violations', async ({ page }) => {
  await startRun(page, 'Accessible run')
  const results = await new AxeBuilder({ page }).exclude('dialog:not([open])').analyze()
  expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([])
})

test('storage warning stays dismissed after reload', async ({ page }) => {
  await startRun(page, 'Dismissible warning')
  const warning = page.getByRole('note')
  await expect(warning).toBeVisible()
  await warning.getByRole('button', { name: 'Dismiss storage warning' }).click()
  await expect(warning).toBeHidden()
  await page.reload()
  await expect(page.getByRole('note')).toHaveCount(0)
})

test('app shell and run progress remain available offline', async ({ page, context }) => {
  await startRun(page, 'Offline run')
  await page.reload()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Offline run' })).toBeVisible()
})
