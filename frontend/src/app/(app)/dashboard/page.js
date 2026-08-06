'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Select from '../../components/ui/Select'
import Input from '../../components/ui/Input'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { useI18n } from '../../i18n/context'
import { brandAPI, contentAPI } from '../../services/api'
import { contentStatusVariant, contentStatusLabel, contentTypeLabel } from '../../lib/status'
import { getEngineOptions } from '../../lib/constants'


export default function DashboardPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [recentContents, setRecentContents] = useState([])
  const [brands, setBrands] = useState([])
  const [error, setError] = useState('')

  // Create content modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    brand_id: '',
    content_type: 'faq',
    target_word_count: 1000,
    engine: 'mimo',
    custom_instructions: '',
  })
  const [creating, setCreating] = useState(false)

  const CONTENT_TYPES = [
    { value: 'faq', label: t('content.typeFaq') },
    { value: 'community_qa', label: t('content.typeCommunityQa') },
    { value: 'article', label: t('content.typeArticle') },
    { value: 'press_release', label: t('content.typePressRelease') },
  ]

  const ENGINES = getEngineOptions(t)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, contentsRes, brandsRes] = await Promise.all([
        contentAPI.getStats(),
        contentAPI.list({ limit: 5 }),
        brandAPI.getAll(),
      ])
      setStats(statsRes.data)
      setRecentContents(contentsRes.data.items || [])
      setBrands(Array.isArray(brandsRes) ? brandsRes : brandsRes.data || [])
    } catch {
      setError(t('dashboard.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateContent = async () => {
    if (!createForm.brand_id) return
    setCreating(true)
    try {
      const res = await contentAPI.generate({
        brand_id: Number(createForm.brand_id),
        content_type: createForm.content_type,
        target_word_count: createForm.target_word_count,
        engine: createForm.engine,
        custom_instructions: createForm.custom_instructions || undefined,
      })
      setShowCreateModal(false)
      router.push(`/content/${res.data.content_id}`)
    } catch {
      setError(t('dashboard.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('dashboard.title')} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-8 bg-gray-100 rounded w-1/3" />
              </div>
            </Card>
          ))}
        </div>
        <Skeleton count={3} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            {t('dashboard.createContent')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-sm text-gray-500">{t('dashboard.totalContents')}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{stats?.total_contents || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">{t('dashboard.published')}</p>
          <p className="text-2xl font-semibold text-success mt-1">{stats?.adoption_summary?.total_published || 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">{t('dashboard.adoptionRate')}</p>
          <p className="text-2xl font-semibold text-brand-600 mt-1">{stats?.adoption_summary?.adoption_rate || 0}%</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">{t('dashboard.monthlyUsage')}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {stats?.this_month?.generated || 0} / {stats?.this_month?.limit || '∞'}
          </p>
        </Card>
      </div>

      {/* Recent Contents */}
      <Card>
        <Card.Header>
          <Card.Title>{t('dashboard.recentContents')}</Card.Title>
          <Button variant="ghost" size="sm" onClick={() => router.push('/content')}>
            {t('dashboard.viewAll')}
          </Button>
        </Card.Header>
        <Card.Content>
          {recentContents.length === 0 ? (
            <EmptyState
              icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              title={t('dashboard.noContents')}
              description={t('dashboard.noContentsDesc')}
              action={
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  {t('dashboard.createFirst')}
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {recentContents.map((content) => (
                <div
                  key={content.id}
                  role="button"
                  tabIndex={0}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/content/${content.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/content/${content.id}`) } }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{content.title || t('dashboard.untitled')}</p>
                      <p className="text-xs text-gray-500">{content.brand_name} · {contentTypeLabel(content.content_type, t)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">{content.word_count || 0} {t('content.wordsUnit')}</span>
                    <Badge variant={contentStatusVariant(content.status)}>{contentStatusLabel(content.status, t)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Create Content Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('dashboard.createContent')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateContent} loading={creating} disabled={!createForm.brand_id}>
              {t('dashboard.startGeneration')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t('dashboard.selectBrand')}
            options={brands.map(b => ({ value: String(b.id), label: b.name }))}
            value={createForm.brand_id}
            onChange={(e) => setCreateForm({ ...createForm, brand_id: e.target.value })}
          />
          <Select
            label={t('dashboard.contentType')}
            options={CONTENT_TYPES}
            value={createForm.content_type}
            onChange={(e) => setCreateForm({ ...createForm, content_type: e.target.value })}
          />
          <Input
            label={t('dashboard.targetWordCount')}
            type="number"
            min={500}
            value={createForm.target_word_count}
            onChange={(e) => setCreateForm({ ...createForm, target_word_count: Number(e.target.value) })}
          />
          <Select
            label={t('dashboard.selectEngine')}
            options={ENGINES}
            value={createForm.engine}
            onChange={(e) => setCreateForm({ ...createForm, engine: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  )
}
