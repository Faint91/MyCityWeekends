import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { EventPickCard } from '../EventPickCard'

describe('EventPickCard', () => {
  it('renders title, price, and details link', () => {
    render(
      <EventPickCard
        rank={1}
        title="Free Comedy Night"
        when="Fri, Mar 7 • 8:00 PM"
        where="Granville Island"
        price="Free"
        whyWorthIt="Great vibe."
        detailsUrl="https://example.com"
      />,
    )

    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Free Comedy Night' })).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view details/i })).toHaveAttribute(
      'href',
      'https://example.com',
    )
  })
})
