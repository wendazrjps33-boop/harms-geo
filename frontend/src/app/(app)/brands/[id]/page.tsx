'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import { useI18n } from '../../../i18n/context'
import { brandAPI, reportAPI } from '@/services/api'
import VisibilityChart from '@/components/VisibilityChart'
import EngineCompareChart from '@/components/EngineCompareChart'
import ScoringRules from '@/components/ScoringRules'
import CompetitorManager from '@/components/CompetitorManager'
import { getEngineOptions } from '@/lib/constants'

export default function BrandDetailPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const ENGINES = getEngineOptions(t)
  const params = useParams()
  const brandId = params.id

  const [brand, setBrand] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [engine, setEngine] = useState('mimo')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBrandData()
  }, [brandId])

  const fetchBrandData = async () => {
    try {
      const [brandData, reportsRes] = await Promise.all([
        brandAPI.getById(brandId),
        reportAPI.getByBrand(brandId),
      ])
      setBrand(brandData)
      const reportList = Array.isArray(reportsRes) ? reportsRes : reportsRes.data || []
      setReports(reportList)
    } catch (err) {
      if (err?.status === 401) router.push('/login')
      else setError(t('brands.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCheckVisibility = async () => {
    if (!brand) return
    setChecking(true)
    try {
      const query = brand.queries?.[0] || 'best tech companies'
      const report = await reportAPI.check({
        brand_id: parseInt(brandId),
        query,
        engine,
      })
      setReports(prev => [report, ...prev])
      setBrand(prev => ({ ...prev, visibility_score: report.visibility_score }))
    } catch {
      setError(t('brands.checkFailed'))
    } finally {
      setChecking(false)
    }
  }

  const handleExport = async (format) => {
    try {
      await reportAPI.export(brandId, format, locale)
    } catch {
      setError(t('brands.exportFailed'))
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('brands.title')} />
        <Skeleton count={4} />
      </div>
    )
  }

  if (!brand) return null

  return (
    <div>
      <PageHeader
        title={brand.name}
        description={brand.website}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push('/brands')}>
              {t('common.back')}
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/brands/${brandId}/edit`)}>
              {t('brandDetail.editBrand')}
            </Button>
            <Button onClick={() => router.push(`/brands/${brandId}/analysis`)}>
              {t('brandDetail.statisticalAnalysis')}
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/brands/${brandId}/compare`)}>
              {t('competitor.compareButton')}
            </Button>
            <Button variant="secondary" onClick={() => router.push('/content')}>
              {t('brandDetail.contentStudio')}
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

      {/* Quick Actions: Visibility Check */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-sm font-medium text-gray-700">{t('common.checkVisibility')}</p>
          <Select
            options={ENGINES}
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            containerClassName="w-36"
          />
          <Button onClick={handleCheckVisibility} loading={checking} disabled={checking}>
            {checking ? t('common.checking') : t('common.runCheck')}
          </Button>
        </div>
      </Card>

      {/* Visibility Score */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">{t('dashboard.visibilityScore')}</h3>
          <span className="text-2xl font-bold text-brand-600">{brand.visibility_score || 0}</span>
        </div>
        <div className="bg-gray-100 rounded-full h-3">
          <div
            className="bg-brand-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${brand.visibility_score || 0}%` }}
          />
        </div>
      </Card>

      {/* Charts */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <VisibilityChart reports={reports} />
          </Card>
          <Card>
            <EngineCompareChart reports={reports} />
          </Card>
        </div>
      )}

      {/* Scoring Rules */}
      <ScoringRules />

      {/* Competitor Management */}
      <CompetitorManager brandId={brandId} onUpdate={fetchBrandData} />

      {/* Reports */}
      <Card>
        <Card.Header>
          <Card.Title>{t('dashboard.recentReports')}</Card.Title>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
              {t('common.exportCSV')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleExport('pdf')}>
              {t('common.exportPDF')}
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          {reports.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">{t('brandDetail.noReports')}</p>
          ) : (
            <div className="space-y-3">
              {reports.slice(0, 20).map((report) => (
                <div key={report.id} className="p-3 border border-gray-100 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={report.mentioned ? 'success' : 'neutral'}>
                        {report.engine}
                      </Badge>
                      <span className="text-sm text-gray-700 truncate max-w-xs">{report.query}</span>
                    </div>
                    <Badge variant={report.mentioned ? 'success' : 'neutral'}>
                      {report.mentioned ? t('common.mentioned') : t('common.notMentioned')}
                    </Badge>
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>{t('common.score')}: {report.visibility_score}</span>
                    <span>{t('common.position')}: {report.position || '-'}</span>
                    <span>{t('common.words')}: {report.word_count || '-'}</span>
                  </div>
                  {report.citation_text && (
                    <p className="mt-2 text-xs text-gray-400 italic truncate">
                      &quot;{report.citation_text.substring(0, 120)}...&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>
    </div>
  )
}
