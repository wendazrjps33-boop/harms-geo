'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/context'
import { subscriptionAPI } from '../services/api'
import UpgradeModal from './UpgradeModal'

const FEATURE_PLAN_MAP = {
  competitor_analysis: ['pro', 'agency'],
  content_generation: ['pro', 'agency'],
  adoption_tracking: ['pro', 'agency'],
  api_access: ['agency'],
  white_label: ['agency'],
  team_management: ['agency'],
  advanced_analytics: ['agency'],
}

export default function FeatureGate({ feature, children, fallback }) {
  const { t } = useI18n()
  const [hasAccess, setHasAccess] = useState(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [currentPlan, setCurrentPlan] = useState('free')

  useEffect(() => {
    checkAccess()
  }, [feature])

  const checkAccess = async () => {
    try {
      const response = await subscriptionAPI.getCurrent()
      const planCode = response.data.subscription.plan_code
      setCurrentPlan(planCode)
      const allowedPlans = FEATURE_PLAN_MAP[feature] || []
      setHasAccess(allowedPlans.includes(planCode))
    } catch (error) {
      console.error('Failed to check feature access:', error)
      setHasAccess(false)
    }
  }

  if (hasAccess === null) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-4">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    )
  }

  if (hasAccess) {
    return children
  }

  if (fallback) {
    return fallback({ onUpgrade: () => setShowUpgrade(true), currentPlan })
  }

  return (
    <>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('featureGate.title')}</h3>
        <p className="text-gray-600 mb-4">
          {t('featureGate.requires', { plan: FEATURE_PLAN_MAP[feature]?.join(t('featureGate.or')) })}
        </p>
        <button
          onClick={() => setShowUpgrade(true)}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 transition-colors"
        >
          {t('featureGate.upgrade')}
        </button>
      </div>
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        currentPlan={currentPlan}
        requiredFeature={feature}
      />
    </>
  )
}
