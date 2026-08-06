'use client'

import { useState, useEffect, useRef } from 'react'
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
import { contentAPI, brandAPI } from '../../services/api'
import { contentStatusVariant, contentStatusLabel, contentTypeLabel } from '../../lib/status'
import { getEngineOptions } from '../../lib/constants'


export default function ContentPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [contents, setContents] = useState([])
  const [loading, setLoading] = useState(true)
  const [brands, setBrands] = useState([])
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState(null)
  const abortControllerRef = useRef(null)

  // Filters
  const [filters, setFilters] = useState({
    brand_id: '',
    content_type: '',
    status: '',
  })

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
    { value: '', label: t('content.allTypes') },
    { value: 'faq', label: t('content.typeFaq') },
    { value: 'community_qa', label: t('content.typeCommunityQa') },
    { value: 'article', label: t('content.typeArticle') },
    { value: 'press_release', label: t('content.typePressRelease') },
  ]

  const STATUS_OPTIONS = [
    { value: '', label: t('content.allStatus') },
    { value: 'generating', label: t('content.statusGenerating') },
    { value: 'draft', label: t('content.statusDraft') },
    { value: 'ready', label: t('content.statusReady') },
    { value: 'published', label: t('content.statusPublished') },
    { value: 'failed', label: t('content.statusFailed') },
  ]

  const ENGINES = getEngineOptions(t)

  useEffect(() => {
    fetchBrands()
  }, [])

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    fetchContents(true, controller.signal)
    return () => controller.abort()
  }, [filters])

  const fetchBrands = async () => {
    try {
      const data = await brandAPI.getAll()
      setBrands(Array.isArray(data) ? data : data.data || [])
    } catch {
      setError(t('brands.loadFailed'))
    }
  }

  const fetchContents = async (reset = false, signal) => {
    setLoading(true)
    try {
      const params = {
        limit: 20,
        ...(filters.brand_id && { brand_id: filters.brand_id }),
        ...(filters.content_type && { content_type: filters.content_type }),
        ...(filters.status && { status: filters.status }),
        ...(!reset && cursor && { cursor }),
      }
      const data = await contentAPI.list(params, { signal })
      const items = data.data.items || []
      setContents(prev => reset ? items : [...prev, ...items])
      setHasMore(data.data.has_more)
      setCursor(data.data.next_cursor)
    } catch (err) {
      if (err?.name !== 'AbortError') setError(t('content.loadFailed'))
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
      setError(t('content.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <PageHeader
        title={t('content.title')}
        description={t('content.description')}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            {t('content.createContent')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select
          aria-label={t('content.filterBrand')}
          options={brands.map(b => ({ value: String(b.id), label: b.name })).concat([{ value: '', label: t('content.allBrands') }])}
          value={filters.brand_id}
          onChange={(e) => setFilters({ ...filters, brand_id: e.target.value })}
          containerClassName="w-40"
        />
        <Select
          aria-label={t('content.filterContentType')}
          options={CONTENT_TYPES}
          value={filters.content_type}
          onChange={(e) => setFilters({ ...filters, content_type: e.target.value })}
          containerClassName="w-36"
        />
        <Select
          aria-label={t('content.filterStatus')}
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          containerClassName="w-36"
        />
      </div>

      {/* Content List */}
      {loading && contents.length === 0 ? (
        <Skeleton count={4} />
      ) : contents.length === 0 ? (
        <EmptyState
          icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          title={t('content.noContents')}
          description={t('content.noContentsDesc')}
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              {t('content.createFirst')}
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card padding={false}>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{t('content.title')}</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{t('content.brand')}</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{t('content.type')}</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{t('content.status')}</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{t('content.words')}</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">{t('content.date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {contents.map((content) => (
                    <tr
                      key={content.id}
                      role="button"
                      tabIndex={0}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/content/${content.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/content/${content.id}`) } }}
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{content.title || t('content.untitled')}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{content.brand_name}</td>
                      <td className="px-5 py-3 text-sm text-gray-500">{contentTypeLabel(content.content_type, t)}</td>
                      <td className="px-5 py-3"><Badge variant={contentStatusVariant(content.status)}>{contentStatusLabel(content.status, t)}</Badge></td>
                      <td className="px-5 py-3 text-sm text-gray-500">{content.word_count || 0}</td>
                      <td className="px-5 py-3 text-sm text-gray-400">{content.created_at ? new Date(content.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {contents.map((content) => (
              <Card
                key={content.id}
                hover
                onClick={() => router.push(`/content/${content.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{content.title || t('content.untitled')}</p>
                    <p className="text-xs text-gray-500 mt-1">{content.brand_name} · {contentTypeLabel(content.content_type, t)}</p>
                  </div>
                  <Badge variant={contentStatusVariant(content.status)}>{contentStatusLabel(content.status, t)}</Badge>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
                  <span>{content.word_count || 0} {t('content.wordsUnit')}</span>
                  <span>{content.created_at ? new Date(content.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US') : '-'}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-4 text-center">
              <Button variant="secondary" onClick={() => fetchContents(false)} loading={loading}>
                {t('content.loadMore')}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Content Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('content.createContent')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateContent} loading={creating} disabled={!createForm.brand_id}>
              {t('content.startGeneration')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t('content.selectBrand')}
            options={brands.map(b => ({ value: String(b.id), label: b.name }))}
            value={createForm.brand_id}
            onChange={(e) => setCreateForm({ ...createForm, brand_id: e.target.value })}
          />
          <Select
            label={t('content.contentType')}
            options={CONTENT_TYPES.filter(ct => ct.value).map(ct => ({ value: ct.value, label: ct.label }))}
            value={createForm.content_type}
            onChange={(e) => setCreateForm({ ...createForm, content_type: e.target.value })}
          />
          <Input
            label={t('content.targetWordCount')}
            type="number"
            min={500}
            value={createForm.target_word_count}
            onChange={(e) => setCreateForm({ ...createForm, target_word_count: Number(e.target.value) })}
          />
          <Select
            label={t('content.selectEngine')}
            options={ENGINES}
            value={createForm.engine}
            onChange={(e) => setCreateForm({ ...createForm, engine: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  )
}
