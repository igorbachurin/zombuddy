import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MediaPage } from '../pages/MediaPage'

describe('media checklist', () => {
  it('searches recipe content and filters empty states', async () => {
    const user = userEvent.setup()
    render(<MediaPage section="recipes" runId="run-1" progress={[]} />)
    const search = screen.getByRole('searchbox', { name: 'Search this checklist' })
    await user.type(search, 'generator')
    expect(screen.getByRole('heading', { name: 'Magazine: How to Use Generators' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Magazine: Herbal Remedy Growing' })).not.toBeInTheDocument()
    await user.clear(search)
    await user.click(screen.getByRole('button', { name: 'Complete' }))
    expect(screen.getByRole('heading', { name: 'Nothing in this margin' })).toBeInTheDocument()
  })

  it('keeps seed packets out of Recipes and gives them their own checklist', () => {
    const { rerender } = render(<MediaPage section="recipes" runId="run-1" progress={[]} />)
    expect(screen.queryByRole('heading', { name: 'Seed Packet - Tomato' })).not.toBeInTheDocument()

    rerender(<MediaPage section="seeds" runId="run-1" progress={[]} />)
    expect(screen.getByRole('heading', { name: 'Seeds', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Seed Packet - Tomato' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Magazine: How to Use Generators' })).not.toBeInTheDocument()
  })

  it('lists Retail VHS before rare Home VHS', () => {
    render(<MediaPage section="vhs" runId="run-1" progress={[]} />)
    const groupNames = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

    expect(groupNames.indexOf('Retail VHS')).toBeLessThan(groupNames.indexOf('Home VHS'))
  })
})
