'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import PageHeader from '../../../components/ui/PageHeader'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Skeleton from '../../../components/ui/Skeleton'
import { useI18n } from '../../../i18n/context'
import { analysisAPI } from '../../../services/api'
import { MentionRateChart, EngineConsistencyChart, QueryHeatmap } from '../../../components/StatisticalCharts'

export default function RunDetailPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const params = useParams()
  const runId = params.runId

  const [detail, setDetail] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRunDetail()
  }, [runId])

  const fetchRunDetail = async () => {
    try {
      const [detailData, summaryData] = await Promise.all([
        analysisAPI.getRunDetail(runId),
        analysisAPI.getRunSummary(runId),
      ])
      setDetail(detailData)
      setSummary(summaryData)
    } catch {
      setError(t('analytics.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format) => {
    try {
      await analysisAPI.exportAnalysis(detail.run.brand_id, runId, format, locale)
    } catch {
      setError(t('brands.exportFailed'))
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('analysis.title')} />
        <Skeleton count={4} />
      </div>
    )
  }

  if (!detail || !summary) {
    return (
      <div>
        <PageHeader title={t('analysis.title')} />
        <Card>
          <p className="text-sm text-gray-500 text-center py-8">{error || t('analytics.loadFailed')}</p>
        </Card>
      </div>
    )
  }

  const { run, results } = detail

  return (
    <div>
      <PageHeader
        title={`${t('analysis.title')} — Run #${run.id}`}
        description={run.created_at ? new Date(run.created_at).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US') : ''}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push('/analytics')}>
              {t('common.back')}
            </Button>
            <Button variant="secondary" onClick={() => handleExport('csv')}>
              {t('common.exportCSV')}
            </Button>
            <Button variant="secondary" onClick={() => handleExport('pdf')}>
              {t('common.exportPDF')}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Run Status */}
      <div className="mb-6 flex items-center gap-3">
        <Badge variant={run.status === 'completed' ? 'success' : run.status === 'running' ? 'info' : 'neutral'}>
          {run.status}
        </Badge>
        <span className="text-sm text-gray-500">
          {run.completed_queries}/{run.total_queries} {t('analysis.totalQueries')}
        </span>
        <span className="text-sm text-gray-400">
          {t('analysis.samplesPerQuery')}: {run.sample_count}
        </span>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gray-500">{t('analysis.totalQueries')}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{summary.total_queries}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">{t('analysis.mentionRate')}</p>
          <p className="text-2xl font-semibold text-brand-600 mt-1">{summary.overall_mention_rate}%</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">{t('analysis.avgScore')}</p>
          <p className="text-2xl font-semibold text-success mt-1">{summary.overall_avg_score}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">{t('analysis.engineConsistency')}</p>
          <p className="text-2xl font-semibold text-brand-600 mt-1">{summary.engine_consistency}%</p>
        </Card>
      </div>

      {/* Charts */}
      {summary.engine_summary && Object.keys(summary.engine_summary).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <MentionRateChart engineSummary={summary.engine_summary} />
          </Card>
          <Card>
            <EngineConsistencyChart engineSummary={summary.engine_summary} />
          </Card>
        </div>
      )}

      {/* Query Heatmap & Results */}
      {results && results.length > 0 ? (
        <>
          <Card className="mb-6">
            <Card.Header>
              <Card.Title>{t('analysis.queryHeatmap')}</Card.Title>
            </Card.Header>
            <Card.Content>
              <QueryHeatmap results={results} />
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>{t('analysis.detailResults')}</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">{t('content.type')}</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">{t('content.brand')}</th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">{t('analysis.mentionRate')}</th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">{t('analysis.avgScore')}</th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">{t('common.position')}</th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">{t('common.words')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-900 max-w-xs truncate">{r.query}</td>
                        <td className="px-4 py-2">
                          <Badge variant="neutral">{r.engine}</Badge>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`font-medium ${
                            r.mention_rate >= 80 ? 'text-success' :
                            r.mention_rate >= 50 ? 'text-warning' :
                            r.mention_rate > 0 ? 'text-orange-600' : 'text-danger'
                          }`}>
                            {r.mention_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center text-gray-700">{r.avg_score}</td>
                        <td className="px-4 py-2 text-center text-gray-500">{r.avg_position || '-'}</td>
                        <td className="px-4 py-2 text-center text-gray-500">{r.avg_word_count || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Content>
          </Card>
        </>
      ) : (
        <Card>
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">{t('common.noData')}</p>
          </div>
        </Card>
      )}
    </div>
  )
}
