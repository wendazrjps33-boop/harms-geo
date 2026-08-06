'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { brandAPI, analysisAPI } from '@/services/api'
import { useI18n } from '../../../../i18n/context'
import { MentionRateChart, EngineConsistencyChart, QueryHeatmap } from '@/components/StatisticalCharts'
import { getEngineOptions } from '@/lib/constants'

export default function AnalysisPage() {
  const [brand, setBrand] = useState(null)
  const [runs, setRuns] = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [summary, setSummary] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedEngines, setSelectedEngines] = useState(['openai', 'claude', 'gemini'])
  const [samplesPerQuery, setSamplesPerQuery] = useState(3)
  const router = useRouter()
  const params = useParams()
  const brandId = params.id
  const { t, locale } = useI18n()
  const ENGINES = getEngineOptions(t)

  useEffect(() => {
    fetchData()
  }, [brandId])

  const fetchData = async () => {
    try {
      const [brandData, runsData] = await Promise.all([
        brandAPI.getById(brandId),
        analysisAPI.getRuns(brandId),
      ])
      setBrand(brandData)
      setRuns(runsData)

      if (runsData.length > 0) {
        loadRunDetail(runsData[0].id)
      }
    } catch (error) {
      if (error.status === 401) router.push('/login')
      else router.push('/brands')
    } finally {
      setLoading(false)
    }
  }

  const loadRunDetail = async (runId) => {
    try {
      const [detailData, summaryData] = await Promise.all([
        analysisAPI.getRunDetail(runId),
        analysisAPI.getRunSummary(runId),
      ])
      setSelectedRun(runId)
      setDetail(detailData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading run detail:', error)
    }
  }

  const handleStartAnalysis = async () => {
    if (!brand) return
    setAnalyzing(true)
    try {
      const run = await analysisAPI.startRun(brandId, {
        engines: selectedEngines,
        samples_per_query: samplesPerQuery,
      })
      setRuns(prev => [run, ...prev])
      loadRunDetail(run.id)
    } catch (error) {
      console.error('Error starting analysis:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleExport = async (format) => {
    if (!selectedRun) return
    try {
      await analysisAPI.exportAnalysis(brandId, selectedRun, format, locale)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const toggleEngine = (engine) => {
    setSelectedEngines(prev =>
      prev.includes(engine)
        ? prev.filter(e => e !== engine)
        : [...prev, engine]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!brand) return null

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.push(`/brands/${brandId}`)} className="text-brand-600 hover:text-brand-800 text-sm font-medium">
          ← {t('common.back')}
        </button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('analysis.title')} - {brand.name}
        </h1>
        <p className="text-gray-500">{brand.website}</p>
      </div>

      {/* Analysis Configuration */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('analysis.configuration')}</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('analysis.selectEngines')}
          </label>
          <div className="flex flex-wrap gap-2">
            {ENGINES.map(engine => (
              <button
                key={engine.value}
                onClick={() => toggleEngine(engine.value)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedEngines.includes(engine.value)
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {engine.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('analysis.samplesPerQuery')}
          </label>
          <select
            value={samplesPerQuery}
            onChange={(e) => setSamplesPerQuery(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={5}>5</option>
            <option value={10}>10</option>
          </select>
        </div>

        <button
          onClick={handleStartAnalysis}
          disabled={analyzing || selectedEngines.length === 0}
          className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
        >
          {analyzing ? t('analysis.analyzing') : t('analysis.startAnalysis')}
        </button>
      </div>

      {/* Historical Runs */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('analysis.historicalRuns')}</h2>
        {runs.length > 0 ? (
          <div className="space-y-2">
            {runs.map(run => (
              <div
                key={run.id}
                onClick={() => loadRunDetail(run.id)}
                className={`p-3 border rounded-lg cursor-pointer ${
                  selectedRun === run.id
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">#{run.id}</span>
                    <span className="text-gray-500 ml-2">
                      {new Date(run.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      run.status === 'completed'
                        ? 'bg-success-light text-success-dark'
                        : run.status === 'running'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {run.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {run.completed_queries}/{run.total_queries}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">{t('analysis.noRuns')}</p>
        )}
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">{t('analysis.totalQueries')}</h3>
            <p className="text-2xl font-bold text-gray-900">{summary.total_queries}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">{t('analysis.mentionRate')}</h3>
            <p className="text-2xl font-bold text-brand-600">{summary.overall_mention_rate}%</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">{t('analysis.avgScore')}</h3>
            <p className="text-2xl font-bold text-success">{summary.overall_avg_score}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">{t('analysis.engineConsistency')}</h3>
            <p className="text-2xl font-bold text-brand-600">{summary.engine_consistency}%</p>
          </div>
        </div>
      )}

      {/* Charts */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow p-6">
            <MentionRateChart engineSummary={summary.engine_summary} />
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <EngineConsistencyChart engineSummary={summary.engine_summary} />
          </div>
        </div>
      )}

      {/* Query Heatmap */}
      {detail && detail.results && (
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{t('analysis.queryHeatmap')}</h2>
          <QueryHeatmap results={detail.results} />
        </div>
      )}

      {/* Export Buttons */}
      {selectedRun && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{t('analysis.exportReport')}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
            >
              {t('common.exportCSV')}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
            >
              {t('common.exportPDF')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
