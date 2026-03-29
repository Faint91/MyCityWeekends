import clsx from 'clsx'
import Image from 'next/image'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
  sizes?: string
}

export const Logo = ({
  className,
  loading = 'lazy',
  priority = 'low',
  sizes = '(min-width: 768px) 520px, 90vw',
}: Props) => {
  return (
    <Image
      alt="MyCityWeekends"
      src="/mycityweekends-logo.png"
      width={1200}
      height={240}
      loading={loading}
      fetchPriority={priority}
      sizes={sizes}
      className={clsx('h-auto w-full', className)}
    />
  )
}
