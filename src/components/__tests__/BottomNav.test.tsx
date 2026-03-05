import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { BottomNav } from '../BottomNav'

// Mock next/navigation for usePathname
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('BottomNav', () => {
  it('renders the three main links', () => {
    render(<BottomNav />)

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Weekend' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Free' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Under $15' })).toBeInTheDocument()
  })
})
