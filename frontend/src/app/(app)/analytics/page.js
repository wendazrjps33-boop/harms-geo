'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Select from '../../components/ui/Select'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { useI18n } from '../../i18n/context'
import { brandAPI, analysisAPI, competitorAPI } from '../../services/api'
import { getEngineOptions } from '../../lib/constants'

const TABS = [
  { key: 'visibility', labelKey: 'analytics.visibility' },
  { key: 'competitor', labelKey: 'analytics.competitor' },
  { key: 'compare', labelKey: 'analytics.compare' },
]

export default function AnalyticsPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const ENGINES = getEngineOptions(t)
  const [brands, setBrands] = useState([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [activeTab, setActiveTab] = useState('visibility')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Visibility data
  const [runs, setRuns] = useState([])

  // Competitor data
  const [competitors, setCompetitors] = useState([])
  const [selectedEngines, setSelectedEngines] = useState(['mimo'])
  const [analyzing, setAnalyzing] = useState(false)

  const fetchControllerRef = useRef(null)

  useEffect(() => {
    return () => { if (fetchControllerRef.current) fetchControllerRef.current.abort() }
  }, [])

  useEffect(() => {
    fetchBrands()
  }, [])

  useEffect(() => {
    if (selectedBrand) {
      if (fetchControllerRef.current) fetchControllerRef.current.abort()
      fetchControllerRef.current = new AbortController()
      fetchTabData(fetchControllerRef.current.signal)
      return () => { if (fetchControllerRef.current) fetchControllerRef.current.abort() }
    }
  }, [selectedBrand, activeTab])

  const fetchBrands = async () => {
    try {
      const data = await brandAPI.getAll()
      const brandList = Array.isArray(data) ? data : data.data || []
      setBrands(brandList)
      if (brandList.length > 0) {
        setSelectedBrand(String(brandList[0].id))
      }
    } catch {
      setError(t('analytics.loadBrandsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchTabData = async (signal) => {
    if (!selectedBrand) return
    try {
      if (activeTab === 'visibility') {
        const runsRes = await analysisAPI.getRuns(selectedBrand, { signal })
        setRuns(Array.isArray(runsRes) ? runsRes : runsRes.data || [])
      } else if (activeTab === 'competitor') {
        const compRes = await competitorAPI.list(selectedBrand)
        setCompetitors(Array.isArray(compRes) ? compRes : compRes.data || [])
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setError(t('analytics.loadFailed'))
    }
  }

  const toggleEngine = (engine) => {
    setSelectedEngines(prev =>
      prev.includes(engine) ? prev.filter(e => e !== engine) : [...prev, engine]
    )
  }

  const handleRunAnalysis = async () => {
    if (!selectedBrand || selectedEngines.length === 0 || analyzing) return
    setAnalyzing(true)
    try {
      await analysisAPI.startRun(selectedBrand, { engines: selectedEngines })
      if (fetchControllerRef.current) fetchControllerRef.current.abort()
      fetchControllerRef.current = new AbortController()
      fetchTabData(fetchControllerRef.current.signal)
    } catch {
      setError(t('analytics.startFailed'))
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('analytics.title')} />
        <Skeleton count={3} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('analytics.title')}
        description={t('analytics.description')}
        actions={
          activeTab === 'visibility' ? (
            <Button onClick={handleRunAnalysis} loading={analyzing} disabled={!selectedBrand || selectedEngines.length === 0 || analyzing}>
              {analyzing ? t('analytics.analyzing') : t('analytics.startAnalysis')}
            </Button>
          ) : null
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Brand Selector */}
      <div className="mb-6">
        <Select
          aria-label={t('analytics.selectBrand')}
          options={brands.map(b => ({ value: String(b.id), label: b.name }))}
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          containerClassName="w-60"
        />
      </div>

      {/* Engine Selector */}
      {activeTab === 'visibility' && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">{t('analytics.selectEngines')}</p>
          <div className="flex flex-wrap gap-2">
            {ENGINES.map(engine => (
              <button
                key={engine.value}
                onClick={() => toggleEngine(engine.value)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  selectedEngines.includes(engine.value)
                    ? 'bg-brand-50 border-brand-300 text-brand-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {engine.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6" role="tablist" aria-label={t('analytics.tabs')}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            id={`tab-${tab.key}`}
            aria-selected={activeTab === tab.key}
            aria-controls={`panel-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
      {activeTab === 'visibility' && (
        <div className="space-y-4">
          {runs.length === 0 ? (
            <EmptyState
              icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              title={t('analytics.noRuns')}
              description={t('analytics.noRunsDesc')}
              action={
                <Button onClick={handleRunAnalysis} loading={analyzing}>{t('analytics.startFirstAnalysis')}</Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {runs.map((run) => (
                <Card key={run.id} className="cursor-pointer hover:border-brand-300 transition-colors" onClick={() => router.push(`/analytics/${run.id}`)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Run #{run.id}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {run.created_at ? new Date(run.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') : '-'}
                      </p>
                    </div>
                    <Badge variant={run.status === 'completed' ? 'success' : run.status === 'running' ? 'info' : 'neutral'}>
                      {run.status}
                    </Badge>
                  </div>
                  {run.summary && (
                    <div className="mt-3 text-xs text-gray-500">
                      {t('analytics.mentionRate')}: {run.summary.mention_rate || 0}%
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'competitor' && (
        <div className="space-y-4">
          {competitors.length === 0 ? (
            <EmptyState
              icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              title={t('analytics.noCompetitors')}
              description={t('analytics.noCompetitorsDesc')}
              action={
                <Button onClick={() => router.push('/analytics/competitors')}>{t('competitor.addCompetitor')}</Button>
              }
            />
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => router.push('/analytics/competitors')}>
                  {t('competitor.manageCompetitors')}
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {competitors.map((comp) => (
                  <Card key={comp.id} className="cursor-pointer hover:border-brand-300 transition-colors" onClick={() => router.push(`/brands/${comp.id}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{comp.name}</p>
                        <p className="text-xs text-gray-500">{comp.website}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="bg-gray-100 rounded-full h-1.5 flex-1 w-24">
                            <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${comp.visibility_score || 0}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{comp.visibility_score || 0}</span>
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/brands/${selectedBrand}/compare`) }}>
                        {t('analytics.compare')}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-4">
          {selectedBrand ? (
            <EmptyState
              icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              title={t('competitor.comparisonTitle')}
              description={t('analytics.compareBrandDesc')}
              action={
                <Button onClick={() => router.push(`/brands/${selectedBrand}/compare`)}>
                  {t('competitor.compareButton')}
                </Button>
              }
            />
          ) : (
            <Card>
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">{t('analytics.selectBrandFirst')}</p>
              </div>
            </Card>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
