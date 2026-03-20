import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import type { Media } from '@/payload-types'
import { EventPickCard } from '../EventPickCard'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}))

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
    expect(screen.getByRole('link', { name: /official link/i })).toHaveAttribute(
      'href',
      'https://example.com',
    )
  })

  it('renders a thumbnail when an image is provided', () => {
    const image: Media = {
      id: 1,
      alt: 'Comedy poster',
      updatedAt: '2026-03-19T00:00:00.000Z',
      createdAt: '2026-03-19T00:00:00.000Z',
      url: '/media/comedy-poster.jpg',
      filename: 'comedy-poster.jpg',
      mimeType: 'image/jpeg',
      filesize: 12345,
      width: 1200,
      height: 800,
    }

    render(<EventPickCard title="Free Comedy Night" price="Free" image={image} />)

    expect(screen.getByAltText('Comedy poster')).toBeInTheDocument()
  })
})
