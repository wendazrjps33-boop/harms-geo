'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import PageHeader from '../../../../components/ui/PageHeader'
import Card from '../../../../components/ui/Card'
import Button from '../../../../components/ui/Button'
import Badge from '../../../../components/ui/Badge'
import Select from '../../../../components/ui/Select'
import Textarea from '../../../../components/ui/Textarea'
import Skeleton from '../../../../components/ui/Skeleton'
import FeatureGate from '../../../../components/FeatureGate'
import { useI18n } from '../../../../i18n/context'
import { brandAPI, competitorAPI } from '../../../../services/api'
import CompetitorCharts from '../../../../components/CompetitorCharts'
import { getEngineOptions } from '../../../../lib/constants'

export default function ComparePage() {
  const { t } = useI18n()
  const router = useRouter()
  const ENGINES = getEngineOptions(t)
  const params = useParams()
  const brandId = params.id

  const [brand, setBrand] = useState(null)
  const [competitors, setCompetitors] = useState([])
  const [selectedCompetitors, setSelectedCompetitors] = useState([])
  const [selectedEngines, setSelectedEngines] = useState(['mimo'])
  const [queries, setQueries] = useState('')
  const [samplesPerQuery, setSamplesPerQuery] = useState(3)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [brandId])

  const fetchData = async () => {
    try {
      const [brandData, competitorsData, historyData] = await Promise.all([
        brandAPI.getById(brandId),
        competitorAPI.list(brandId),
        competitorAPI.getHistory(brandId),
      ])
      setBrand(brandData)
      const compList = Array.isArray(competitorsData) ? competitorsData : competitorsData.data || []
      setCompetitors(compList)
      setHistory(historyData?.history || [])
      if (brandData.queries && brandData.queries.length > 0) {
        setQueries(brandData.queries.join('\n'))
      }
    } catch {
      setError(t('brands.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCompetitorToggle = (id) => {
    setSelectedCompetitors(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleEngineToggle = (engine) => {
    setSelectedEngines(prev =>
      prev.includes(engine) ? prev.filter(e => e !== engine) : [...prev, engine]
    )
  }

  const handleStartComparison = async () => {
    if (selectedCompetitors.length === 0) {
      setError(t('competitor.selectAtLeastOneCompetitor'))
      return
    }
    if (!queries.trim()) {
      setError(t('competitor.enterQueries'))
      return
    }
    if (selectedEngines.length === 0) {
      setError(t('competitor.selectAtLeastOneEngine'))
      return
    }

    setAnalyzing(true)
    setError('')
    try {
      const queryList = queries.split('\n').filter(q => q.trim())
      const result = await competitorAPI.startComparison(brandId, {
        competitor_ids: selectedCompetitors,
        queries: queryList,
        engines: selectedEngines,
        samples_per_query: samplesPerQuery,
      })
      setResults(result)
      const historyData = await competitorAPI.getHistory(brandId)
      setHistory(historyData?.history || [])
    } catch (err) {
      setError(err?.data?.detail || t('competitor.comparisonFailed'))
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('competitor.comparisonTitle')} />
        <Skeleton count={4} />
      </div>
    )
  }

  return (
    <FeatureGate feature="competitor_analysis">
      <div>
        <PageHeader
          title={t('competitor.comparisonTitle')}
          description={brand?.name}
          actions={
            <Button variant="secondary" onClick={() => router.push(`/brands/${brandId}`)}>
              {t('common.back')}
            </Button>
          }
        />

        {error && (
          <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark" aria-label="Dismiss error">✕</button>
          </div>
        )}

        {/* Configuration Panel */}
        <Card className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-4">{t('competitor.configuration')}</h3>

          {/* Competitor Selection */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">{t('competitor.selectCompetitors')}</p>
            {competitors.length === 0 ? (
              <p className="text-sm text-gray-500">{t('competitor.noCompetitorsAdded')}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {competitors.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => handleCompetitorToggle(comp.id)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      selectedCompetitors.includes(comp.id)
                        ? 'bg-brand-50 border-brand-300 text-brand-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {comp.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Engine Selection */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">{t('competitor.selectEngines')}</p>
            <div className="flex flex-wrap gap-2">
              {ENGINES.map((engine) => (
                <button
                  key={engine.value}
                  onClick={() => handleEngineToggle(engine.value)}
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

          {/* Queries */}
          <div className="mb-4">
            <Textarea
              label={t('competitor.queries')}
              value={queries}
              onChange={(e) => setQueries(e.target.value)}
              placeholder={t('competitor.queriesPlaceholder')}
              rows={4}
            />
          </div>

          {/* Samples Per Query */}
          <div className="mb-4">
            <Select
              label={t('competitor.samplesPerQuery')}
              options={[
                { value: '1', label: '1' },
                { value: '3', label: '3' },
                { value: '5', label: '5' },
                { value: '10', label: '10' },
              ]}
              value={String(samplesPerQuery)}
              onChange={(e) => setSamplesPerQuery(parseInt(e.target.value))}
              containerClassName="w-32"
            />
          </div>

          <Button
            onClick={handleStartComparison}
            loading={analyzing}
            disabled={analyzing || selectedCompetitors.length === 0}
          >
            {analyzing ? t('competitor.analyzing') : t('competitor.startComparison')}
          </Button>
        </Card>

        {/* Results */}
        {results && (
          <div className="mb-6">
            <CompetitorCharts results={results} />
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card>
            <Card.Header>
              <Card.Title>{t('competitor.history')}</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {history.map((run) => (
                  <div key={run.run_id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('competitor.run')} #{run.run_id}</p>
                      <p className="text-xs text-gray-500">
                        {run.total_queries} {t('competitor.queriesCount')} · {run.samples_per_query} {t('competitor.samples')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={run.status === 'completed' ? 'success' : 'info'}>
                        {run.status}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        {run.created_at ? new Date(run.created_at).toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}
      </div>
    </FeatureGate>
  )
}
