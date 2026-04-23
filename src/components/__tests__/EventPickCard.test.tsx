/* eslint-disable @next/next/no-img-element */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import type { Media } from '@/payload-types'
import { EventPickCard } from '../EventPickCard'

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={props.alt ?? ''} {...props} />
  ),
}))

describe('EventPickCard', () => {
  it('renders title, price, and event details link', () => {
    render(
      <EventPickCard
        rank={1}
        title="Free Comedy Night"
        when="Sat Apr 25 11:00 am"
        where="Gastown"
        price="Free"
        whyWorthIt="A fun stand-up show."
        internalHref="/event/test-event"
        backHref="/"
      />,
    )

    expect(screen.queryByText('#1')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Free Comedy Night' })).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /event details/i })).toHaveAttribute(
      'href',
      '/event/test-event?back=%2F',
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
