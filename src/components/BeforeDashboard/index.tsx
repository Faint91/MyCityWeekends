import { Banner } from '@payloadcms/ui/elements/Banner'
import React from 'react'
import './index.scss'

const baseClass = 'before-dashboard'

const BeforeDashboard: React.FC = () => {
  return (
    <div className={baseClass}>
      <Banner className={`${baseClass}__banner`} type="success">
        <h4>MyCityWeekends admin</h4>
      </Banner>

      <p>Use this dashboard to manage venues, events, weekend drops, and media.</p>
    </div>
  )
}

export default BeforeDashboard
