'use client'

import { useState, useEffect } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import { useI18n } from '../../i18n/context'
import { subscriptionAPI, usageAPI } from '../../services/api'


export default function SubscriptionPage() {
  const { t, locale } = useI18n()
  const [subscription, setSubscription] = useState(null)
  const [plans, setPlans] = useState([])
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [billingCycle, setBillingCycle] = useState('monthly')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [subRes, plansRes, usageRes] = await Promise.all([
        subscriptionAPI.getCurrent(),
        subscriptionAPI.getPlans(),
        usageAPI.getCurrent(),
      ])
      setSubscription(subRes.data)
      setPlans(plansRes.data.plans || [])
      setUsage(usageRes.data)
    } catch {
      setError(t('subscription.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planCode) => {
    setActionLoading(true)
    try {
      const response = await subscriptionAPI.createCheckout({
        plan_code: planCode,
        billing_cycle: billingCycle,
      })
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url
      }
    } catch {
      setError(t('subscription.checkoutFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm(t('subscription.cancelConfirm'))) return
    setActionLoading(true)
    try {
      await subscriptionAPI.cancel()
      await loadData()
    } catch {
      setError(t('subscription.cancelFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivate = async () => {
    setActionLoading(true)
    try {
      await subscriptionAPI.reactivate()
      await loadData()
    } catch {
      setError(t('subscription.reactivateFailed'))
    } finally {
      setActionLoading(false)
    }
  }

  const planNameKey = (code) => {
    const map = { free: 'subscription.planFree', pro: 'subscription.planPro', enterprise: 'subscription.planEnterprise' }
    return map[code] || code
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('subscription.title')} />
        <Skeleton count={3} />
      </div>
    )
  }

  const currentPlan = subscription?.subscription

  return (
    <div>
      <PageHeader
        title={t('subscription.title')}
        description={t('subscription.description')}
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Current Plan */}
      <Card className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t('subscription.currentPlan')}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {t(planNameKey(currentPlan?.plan_code || 'free'))}
              {currentPlan?.cancel_at_period_end && (
                <span className="ml-2 text-warning">({t('subscription.willCancelAtPeriodEnd')})</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {currentPlan?.cancel_at_period_end ? (
              <Button variant="success" size="sm" onClick={handleReactivate} loading={actionLoading}>
                {t('subscription.reactivate')}
              </Button>
            ) : currentPlan?.plan_code !== 'free' ? (
              <Button variant="danger" size="sm" onClick={handleCancel} loading={actionLoading}>
                {t('subscription.cancel')}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-xs text-gray-500">{t('subscription.plan')}</p>
            <p className="text-sm font-medium text-gray-900">{t(planNameKey(currentPlan?.plan_code || 'free'))}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('subscription.status')}</p>
            <Badge variant={currentPlan?.status === 'active' ? 'success' : 'warning'}>
              {currentPlan?.status === 'active' ? t('subscription.active') : currentPlan?.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('subscription.billingCycle')}</p>
            <p className="text-sm font-medium text-gray-900">
              {currentPlan?.billing_cycle === 'monthly' ? t('subscription.monthly') : t('subscription.yearly')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('subscription.nextBilling')}</p>
            <p className="text-sm font-medium text-gray-900">
              {currentPlan?.next_billing_date
                ? new Date(currentPlan.next_billing_date).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')
                : '--'}
            </p>
          </div>
        </div>
      </Card>

      {/* Usage */}
      {usage && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">{t('subscription.usage')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(usage.dimensions || {}).map(([dim, data]) => (
              <Card key={dim}>
                <p className="text-xs text-gray-500 capitalize">{dim}</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {data.used} / {data.limit === -1 ? '∞' : data.limit}
                </p>
                {data.limit > 0 && (
                  <div className="mt-2 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (data.used / data.limit) * 100)}%` }}
                    />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">{t('subscription.selectPlan')}</h3>
          {/* Billing Cycle Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              {t('subscription.monthly')}
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setBillingCycle('yearly')}
            >
              {t('subscription.yearly')}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.plan_code === currentPlan?.plan_code
            const isRecommended = plan.plan_code === 'pro'
            const savePercent = plan.price_yearly > 0
              ? Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)
              : 0
            const displayPrice = billingCycle === 'yearly' && plan.price_yearly > 0
              ? Math.round(plan.price_yearly / 12)
              : plan.price_monthly

            return (
              <Card
                key={plan.plan_code}
                className={`relative ${isRecommended ? 'border-brand-500 shadow-md' : ''}`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="info">{t('subscription.recommended')}</Badge>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h4 className="text-lg font-semibold text-gray-900">{t(planNameKey(plan.plan_code))}</h4>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">${displayPrice}</span>
                    <span className="text-sm text-gray-500">{t('subscription.perMonth')}</span>
                  </div>
                  {billingCycle === 'yearly' && plan.price_yearly > 0 && (
                    <p className="text-xs text-success mt-1">
                      {t('subscription.savePercent', { percent: savePercent })} {t('subscription.yearlyDiscount')}
                    </p>
                  )}
                  {billingCycle === 'monthly' && plan.price_yearly > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('subscription.yearly')}: ${plan.price_yearly}/yr
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {[
                    t('subscription.brandLimit', { n: plan.brand_limit }),
                    t('subscription.queryLimitPerBrand', { n: plan.query_limit_per_brand }),
                    t('subscription.contentMonthlyLimit', { n: plan.content_monthly_limit }),
                    t('subscription.engineLimit', { n: plan.engine_limit }),
                    plan.api_access && t('subscription.apiAccess'),
                    plan.white_label && t('subscription.whiteLabel'),
                  ].filter(Boolean).map((feature, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 text-success mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={isCurrent ? 'secondary' : isRecommended ? 'primary' : 'secondary'}
                  className="w-full"
                  disabled={isCurrent || actionLoading}
                  loading={actionLoading && !isCurrent}
                  onClick={() => handleUpgrade(plan.plan_code)}
                >
                  {isCurrent ? t('subscription.currentPlan') : t('subscription.selectPlan')}
                </Button>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
