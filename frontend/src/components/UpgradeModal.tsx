'use client'

import { useState, useEffect } from 'react'
import { subscriptionAPI } from '@/services/api'
import { useI18n } from '@/app/i18n/context'

export default function UpgradeModal({ isOpen, onClose, currentPlan, requiredFeature }) {
  const { t } = useI18n()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadPlans()
    }
  }, [isOpen])

  const loadPlans = async () => {
    try {
      const response = await subscriptionAPI.getPlans()
      setPlans(response.data.plans)
    } catch (error) {
      console.error('Failed to load plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planCode) => {
    setUpgrading(true)
    try {
      const response = await subscriptionAPI.createCheckout({
        plan_code: planCode,
        billing_cycle: 'monthly',
      })
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url
      }
    } catch (error) {
      console.error('Failed to create checkout:', error)
      alert(t('upgrade.upgradeFailed'))
    } finally {
      setUpgrading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">{t('upgrade.title')}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            {t('upgrade.subtitle')}
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const isCurrent = plan.plan_code === currentPlan
                const isRecommended = plan.plan_code === 'pro'

                return (
                  <div
                    key={plan.plan_code}
                    className={`relative border-2 rounded-xl p-6 ${
                      isCurrent
                        ? 'border-gray-300 bg-gray-50'
                        : isRecommended
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {isRecommended && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-brand-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                          {t('upgrade.recommended')}
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <div className="text-4xl font-bold text-gray-900">
                        ${plan.price_monthly}
                        <span className="text-lg text-gray-500 font-normal">{t('upgrade.perMonth')}</span>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      <li className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('upgrade.brandLimit', { n: plan.brand_limit })}
                      </li>
                      <li className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('upgrade.queryLimit', { n: plan.query_limit_per_brand })}
                      </li>
                      <li className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('upgrade.contentLimit', { n: plan.content_monthly_limit })}
                      </li>
                      <li className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-success mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {t('upgrade.engineLimit', { n: plan.engine_limit })}
                      </li>
                    </ul>

                    <button
                      onClick={() => handleUpgrade(plan.plan_code)}
                      disabled={isCurrent || upgrading}
                      className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        isCurrent
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : isRecommended
                          ? 'bg-brand-600 text-white hover:bg-brand-700'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isCurrent ? t('upgrade.currentPlan') : upgrading ? t('upgrade.processing') : t('upgrade.selectPlan')}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 rounded-b-2xl">
          <p className="text-sm text-gray-500 text-center">
            {t('upgrade.freeTrial')}
          </p>
        </div>
      </div>
    </div>
  )
}
