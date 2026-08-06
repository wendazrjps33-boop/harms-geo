'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Badge from '../../../components/ui/Badge'
import Modal from '../../../components/ui/Modal'
import Input from '../../../components/ui/Input'
import Textarea from '../../../components/ui/Textarea'
import Select from '../../../components/ui/Select'
import Skeleton from '../../../components/ui/Skeleton'
import TipTapEditor from '../../../components/TipTapEditor'
import { useI18n } from '../../../i18n/context'
import { contentAPI } from '../../../services/api'
import DOMPurify from 'dompurify'
import { contentStatusVariant, contentStatusLabel } from '../../../lib/status'


export default function ContentEditorPage() {
  const { t } = useI18n()
  const router = useRouter()
  const params = useParams()
  const contentId = params.id

  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('preview')
  const [adoption, setAdoption] = useState(null)

  // Polling for generating status
  const pollingRef = useRef(null)
  const pollCountRef = useRef(0)

  // Edit state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState([])

  // Regenerate modal
  const [showRegenModal, setShowRegenModal] = useState(false)
  const [regenInstructions, setRegenInstructions] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  // Publish modal
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishForm, setPublishForm] = useState({
    target_platform: 'website',
    platform_url: '',
  })
  const [publishing, setPublishing] = useState(false)

  const PLATFORMS = [
    { value: 'website', label: 'Website' },
    { value: 'medium', label: 'Medium' },
    { value: 'zhihu', label: t('content.platformZhihu') },
    { value: 'xiaohongshu', label: t('content.platformXiaohongshu') },
    { value: 'wechat', label: t('content.platformWechat') },
    { value: 'reddit', label: 'Reddit' },
  ]

  useEffect(() => {
    fetchContent()
  }, [contentId])

  useEffect(() => {
    if (content?.status === 'generating') {
      startPolling()
    }
    return () => stopPolling()
  }, [content?.status])

  const fetchContent = async () => {
    try {
      const data = await contentAPI.getById(contentId)
      setContent(data.data)
      setTitle(data.data.title || '')
      setBody(data.data.body || '')
      setTags(data.data.tags || [])

      if (data.data.status === 'published') {
        fetchAdoption()
      }
    } catch {
      setError(t('editor.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchAdoption = async () => {
    try {
      const data = await contentAPI.getAdoption(contentId)
      setAdoption(data.data)
    } catch {}
  }

  const abortControllerRef = useRef(null)

  const startPolling = () => {
    stopPolling()
    pollCountRef.current = 0
    abortControllerRef.current = new AbortController()
    pollingRef.current = setInterval(async () => {
      pollCountRef.current++
      if (pollCountRef.current > 60) {
        stopPolling()
        setError(t('content.generationTimeout'))
        return
      }
      try {
        const data = await contentAPI.getById(contentId, { signal: abortControllerRef.current?.signal })
        if (data.data.status !== 'generating') {
          setContent(data.data)
          setTitle(data.data.title || '')
          setBody(data.data.body || '')
          setTags(data.data.tags || [])
          stopPolling()
        }
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (pollCountRef.current >= 3) {
          stopPolling()
        }
      }
    }, 2000)
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await contentAPI.update(contentId, { title, body, tags })
      setContent(prev => ({ ...prev, title, body, tags }))
    } catch {
      setError(t('editor.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleConfirm = async () => {
    try {
      await contentAPI.confirm(contentId)
      setContent(prev => ({ ...prev, status: 'ready' }))
    } catch {
      setError(t('editor.confirmFailed'))
    }
  }

  const handleRegenerate = async () => {
    if (!regenInstructions.trim()) return
    setRegenerating(true)
    try {
      await contentAPI.regenerate(contentId, { modification_instructions: regenInstructions })
      setShowRegenModal(false)
      setRegenInstructions('')
      setContent(prev => ({ ...prev, status: 'generating' }))
      startPolling()
    } catch {
      setError(t('editor.regenerateFailed'))
    } finally {
      setRegenerating(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await contentAPI.publish(contentId, publishForm)
      setShowPublishModal(false)
      setContent(prev => ({ ...prev, status: 'published' }))
      fetchAdoption()
    } catch {
      setError(t('editor.publishFailed'))
    } finally {
      setPublishing(false)
    }
  }

  const isGenerating = content?.status === 'generating'

  const sanitizedBody = typeof window !== 'undefined' ? DOMPurify.sanitize(body) : body

  if (loading) {
    return (
      <div>
        <Skeleton count={1} className="mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton count={1} />
          </div>
          <div>
            <Skeleton count={1} />
          </div>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">{t('content.notFound')}</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push('/content')}>
          {t('common.back')}
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <button onClick={() => router.push('/content')} className="hover:text-gray-700 transition-colors">
          {t('content.title')}
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{content.title || t('content.untitled')}</span>
        <Badge variant={contentStatusVariant(content.status)} className="ml-2">{contentStatusLabel(content.status, t)}</Badge>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {content.status === 'draft' && (
            <Button size="sm" onClick={handleConfirm}>{t('content.confirm')}</Button>
          )}
          {content.status === 'ready' && (
            <Button size="sm" onClick={() => setShowPublishModal(true)}>{t('content.publish')}</Button>
          )}
          {(content.status === 'draft' || content.status === 'ready') && (
            <Button size="sm" variant="secondary" onClick={() => setShowRegenModal(true)}>
              {t('content.regenerate')}
            </Button>
          )}
        </div>
        {(content.status === 'draft' || content.status === 'ready') && (
          <Button size="sm" loading={saving} onClick={handleSave}>
            {t('common.save')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Editor */}
        <div className="lg:col-span-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('content.titlePlaceholder')}
            className="text-lg font-semibold mb-4"
            containerClassName="mb-4"
          />

          {isGenerating ? (
            <Card className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
              <p className="text-sm text-gray-500">{t('content.generating')}</p>
            </Card>
          ) : (
            <TipTapEditor
              content={body}
              onChange={setBody}
              editable={content.status === 'draft' || content.status === 'ready'}
            />
          )}

          {/* Tags */}
          {(content.status === 'draft' || content.status === 'ready') && (
            <div className="mt-4">
              <Input
                label={t('content.tags')}
                value={tags.join(', ')}
                onChange={(e) => setTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder={t('content.tagsPlaceholder')}
              />
            </div>
          )}
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-1">
          {/* Mobile: Accordion */}
          <div className="lg:hidden space-y-4">
            <Card>
              <button
                onClick={() => setActiveTab(activeTab === 'preview' ? '' : 'preview')}
                aria-expanded={activeTab === 'preview'}
                aria-controls="panel-preview-mobile"
                className="w-full flex items-center justify-between text-sm font-medium text-gray-900"
              >
                {t('content.preview')}
                <svg className={`w-4 h-4 transition-transform ${activeTab === 'preview' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {activeTab === 'preview' && (
                <div id="panel-preview-mobile" role="region" className="mt-3 max-h-[36rem] overflow-y-auto prose prose-sm max-w-none text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizedBody }} />
              )}
            </Card>

            <Card>
              <button
                onClick={() => setActiveTab(activeTab === 'distribution' ? '' : 'distribution')}
                aria-expanded={activeTab === 'distribution'}
                aria-controls="panel-distribution-mobile"
                className="w-full flex items-center justify-between text-sm font-medium text-gray-900"
              >
                {t('content.distributionGuide')}
                <svg className={`w-4 h-4 transition-transform ${activeTab === 'distribution' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {activeTab === 'distribution' && (
                <div id="panel-distribution-mobile" role="region" className="mt-3 max-h-[36rem] overflow-y-auto">
                  {content.distribution_guide?.platforms?.length ? (
                    <div className="space-y-3">
                      {content.distribution_guide.platforms.map((p, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          {p.best_time && <p className="text-xs text-gray-500 mt-1">{t('content.bestTime')}: {p.best_time}</p>}
                          {p.steps?.length > 0 && (
                            <ol className="mt-2 space-y-1 list-decimal list-inside text-xs text-gray-600">
                              {p.steps.map((step, j) => <li key={j}>{step}</li>)}
                            </ol>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t('content.noDistributionGuide')}</p>
                  )}
                </div>
              )}
            </Card>

            <Card>
              <button
                onClick={() => setActiveTab(activeTab === 'adoption' ? '' : 'adoption')}
                aria-expanded={activeTab === 'adoption'}
                aria-controls="panel-adoption-mobile"
                className="w-full flex items-center justify-between text-sm font-medium text-gray-900"
              >
                {t('content.adoptionTracking')}
                <svg className={`w-4 h-4 transition-transform ${activeTab === 'adoption' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {activeTab === 'adoption' && (
                <div id="panel-adoption-mobile" role="region" className="mt-3">
                  {adoption ? <AdoptionPanel data={adoption} t={t} /> : <p className="text-sm text-gray-400">{t('content.noAdoptionData')}</p>}
                </div>
              )}
            </Card>
          </div>

          {/* Desktop: Tabs */}
          <div className="hidden lg:block">
            <div className="flex border-b border-gray-200 mb-4" role="tablist" aria-label={t('content.sideTabs')}>
              {[
                { key: 'preview', label: t('content.preview') },
                { key: 'distribution', label: t('content.distributionGuide') },
                { key: 'adoption', label: t('content.adoptionTracking') },
              ].map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  id={`side-tab-${tab.key}`}
                  aria-selected={activeTab === tab.key}
                  aria-controls={`side-panel-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Card>
              {activeTab === 'preview' && (
                <div role="tabpanel" id="side-panel-preview" aria-labelledby="side-tab-preview" className="max-h-[36rem] overflow-y-auto prose prose-sm max-w-none text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: sanitizedBody }} />
              )}
              {activeTab === 'distribution' && (
                <div role="tabpanel" id="side-panel-distribution" aria-labelledby="side-tab-distribution" className="max-h-[36rem] overflow-y-auto">
                  {content.distribution_guide?.platforms?.length ? (
                    <div className="space-y-3">
                      {content.distribution_guide.platforms.map((p, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900">{p.name}</p>
                          {p.best_time && <p className="text-xs text-gray-500 mt-1">{t('content.bestTime')}: {p.best_time}</p>}
                          {p.steps?.length > 0 && (
                            <ol className="mt-2 space-y-1 list-decimal list-inside text-xs text-gray-600">
                              {p.steps.map((step, j) => <li key={j}>{step}</li>)}
                            </ol>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">{t('content.noDistributionGuide')}</p>
                  )}
                </div>
              )}
              {activeTab === 'adoption' && (
                <div role="tabpanel" id="side-panel-adoption" aria-labelledby="side-tab-adoption">
                  {adoption ? <AdoptionPanel data={adoption} t={t} /> : <p className="text-sm text-gray-400">{t('content.noAdoptionData')}</p>}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Regenerate Modal */}
      <Modal
        isOpen={showRegenModal}
        onClose={() => setShowRegenModal(false)}
        title={t('content.regenerate')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRegenModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRegenerate} loading={regenerating} disabled={!regenInstructions.trim()}>
              {t('content.startRegeneration')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Textarea
            label={t('content.modificationInstructions')}
            rows={3}
            value={regenInstructions}
            onChange={(e) => setRegenInstructions(e.target.value)}
            placeholder={t('content.modificationInstructionsPlaceholder')}
          />
        </div>
      </Modal>

      {/* Publish Modal */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title={t('content.publish')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPublishModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handlePublish} loading={publishing}>
              {t('content.confirmPublish')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label={t('content.targetPlatform')}
            options={PLATFORMS}
            value={publishForm.target_platform}
            onChange={(e) => setPublishForm({ ...publishForm, target_platform: e.target.value })}
          />
          <Input
            label={t('content.platformUrl')}
            type="url"
            value={publishForm.platform_url}
            onChange={(e) => setPublishForm({ ...publishForm, platform_url: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </Modal>
    </div>
  )
}

function AdoptionPanel({ data, t }) {
  return (
    <div className="space-y-4 text-sm">
      {/* Platform Indexing */}
      <div>
        <p className="font-medium text-gray-900 mb-2">{t('content.platformIndexing')}</p>
        <div className="flex items-center gap-2">
          {data.platform_indexing?.is_indexed ? (
            <Badge variant="success">{t('content.indexed')}</Badge>
          ) : (
            <Badge variant="neutral">{t('content.notIndexed')}</Badge>
          )}
          {data.platform_indexing?.search_rank && (
            <span className="text-gray-500">{t('content.rank')} #{data.platform_indexing.search_rank}</span>
          )}
        </div>
      </div>

      {/* AI Citations */}
      <div>
        <p className="font-medium text-gray-900 mb-2">{t('content.aiCitations')} ({data.ai_citations?.total_citations || 0})</p>
        <div className="space-y-1">
          {data.ai_citations?.engines?.map((engine) => (
            <div key={engine.engine} className="flex items-center justify-between">
              <span className="text-gray-600 capitalize">{engine.engine}</span>
              {engine.cited ? (
                <Badge variant="success">{t('content.cited')}</Badge>
              ) : (
                <Badge variant="neutral">{t('content.notCited')}</Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ranking Delta */}
      {data.ranking_delta?.delta != null && (
        <div>
          <p className="font-medium text-gray-900 mb-2">{t('content.rankingChange')}</p>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${data.ranking_delta.delta > 0 ? 'text-success' : data.ranking_delta.delta < 0 ? 'text-danger' : 'text-gray-500'}`}>
              {data.ranking_delta.delta > 0 ? '+' : ''}{data.ranking_delta.delta}
            </span>
            {data.ranking_delta.delta_percent != null && (
              <span className="text-gray-400">({data.ranking_delta.delta_percent > 0 ? '+' : ''}{data.ranking_delta.delta_percent}%)</span>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div>
        <p className="font-medium text-gray-900 mb-2">{t('content.checkTimeline')}</p>
        <div className="space-y-2">
          {data.timeline?.map((node) => (
            <div key={node.days_after_publish} className="flex items-center justify-between">
              <span className="text-gray-600">{t('content.dayN', { n: node.days_after_publish })}</span>
              <Badge variant={
                node.status === 'done' ? (node.is_adopted ? 'success' : 'neutral') :
                node.status === 'overdue' ? 'danger' : 'info'
              }>
                {node.status === 'done' ? (node.is_adopted ? t('content.adopted') : t('content.notAdopted')) :
                 node.status === 'overdue' ? t('content.overdue') : t('content.pending')}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
