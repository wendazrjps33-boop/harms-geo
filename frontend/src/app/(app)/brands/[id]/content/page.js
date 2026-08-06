'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { contentAPI, brandAPI, subscriptionAPI } from '../../../../services/api'
import { useI18n } from '../../../../i18n/context'
import ContentEditor from '../../../../components/ContentEditor'
import FeatureGate from '../../../../components/FeatureGate'
import PublishModal from '../../../../components/PublishModal'
import { ENGINE_I18N_KEYS } from '../../../../lib/constants'

const WORD_COUNT_PRESETS = [500, 800, 1000, 1500, 2000]

export default function ContentStudioPage() {
  const { id: brandId } = useParams()
  const { t } = useI18n()
  const [brand, setBrand] = useState(null)
  const [contents, setContents] = useState([])
  const [selectedContent, setSelectedContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editorLoading, setEditorLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [generateType, setGenerateType] = useState('faq')
  const [customInstructions, setCustomInstructions] = useState('')
  const [language, setLanguage] = useState('zh')
  const [targetWordCount, setTargetWordCount] = useState(1000)
  const [customWordCount, setCustomWordCount] = useState('')
  const [selectedEngine, setSelectedEngine] = useState('mimo')
  const [userPlan, setUserPlan] = useState('free')
  const pollRef = useRef(null)
  const pollCountRef = useRef(0)

  const CONTENT_TYPES = [
    { value: 'faq', label: t('content.typeFaq'), icon: '❓' },
    { value: 'community_qa', label: t('content.typeCommunityQa'), icon: '💬' },
    { value: 'article', label: t('content.typeArticle'), icon: '📝' },
    { value: 'press_release', label: t('content.typePressRelease'), icon: '📰' },
  ]

  const AI_MODELS = [
    { value: 'mimo', label: 'MIMO', desc: t('content.engineMiMo') },
    { value: 'deepseek', label: 'DeepSeek', desc: t('content.engineDeepSeek') },
    { value: 'openai', label: 'OpenAI', desc: t('content.engineOpenAI') },
    { value: 'qianwen', label: t('common.engineQianwen'), desc: t('content.engineQianwen') },
    { value: 'claude', label: 'Claude', desc: t('content.engineClaude'), premium: true },
    { value: 'gemini', label: 'Gemini', desc: t('content.engineGemini'), premium: true },
  ]

  const ENGINE_LABELS = Object.fromEntries(
    Object.entries(ENGINE_I18N_KEYS).map(([k, v]) => [k, t(v)])
  )

  const STATUS_MAP = {
    generating: t('content.statusGenerating'),
    failed: t('content.statusFailed'),
    draft: t('content.statusDraft'),
    ready: t('content.statusReady'),
    published: t('content.statusPublished'),
  }

  const STATUS_COLOR = {
    generating: 'bg-orange-100 text-orange-800',
    failed: 'bg-danger-light text-danger-dark',
    draft: 'bg-amber-100 text-amber-800',
    ready: 'bg-brand-100 text-brand-800',
    published: 'bg-success-light text-success-dark',
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [brandId])

  const availableModels = AI_MODELS.filter((m) => !m.premium || userPlan === 'agency')

  useEffect(() => {
    const saved = localStorage.getItem('georank_engine')
    if (saved && availableModels.some((m) => m.value === saved)) {
      setSelectedEngine(saved)
    } else if (saved) {
      setSelectedEngine('mimo')
      localStorage.removeItem('georank_engine')
    }
  }, [userPlan, availableModels])

  const startPolling = (contentId) => {
    if (pollRef.current) clearInterval(pollRef.current)
    let failCount = 0
    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1
      if (pollCountRef.current > 60) {
        clearInterval(pollRef.current)
        pollRef.current = null
        setGenerating(false)
        alert(t('content.timeoutError'))
        return
      }
      try {
        const res = await contentAPI.getById(contentId)
        const data = res.data
        failCount = 0
        if (data.status !== 'generating') {
          clearInterval(pollRef.current)
          pollRef.current = null
          setSelectedContent(data)
          await loadData()
          setGenerating(false)
        }
      } catch (err) {
        failCount += 1
        if (failCount >= 3) {
          clearInterval(pollRef.current)
          pollRef.current = null
          setGenerating(false)
          alert(t('content.generationError'))
        }
      }
    }, 2000)
  }

  const loadData = async () => {
    try {
      const [brandResponse, contentsResponse, subResponse] = await Promise.all([
        brandAPI.getById(brandId),
        contentAPI.list({ brand_id: brandId }),
        subscriptionAPI.getCurrent().catch(() => null),
      ])
      setBrand(brandResponse)
      setContents(contentsResponse.data.items)
      if (subResponse?.data?.subscription?.plan_code) {
        setUserPlan(subResponse.data.subscription.plan_code)
      }
      const generatingItem = contentsResponse.data.items.find((c) => c.status === 'generating')
      if (generatingItem && !pollRef.current) {
        setGenerating(true)
        setSelectedContent(generatingItem)
        startPolling(generatingItem.id)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    const wordCount = customWordCount ? parseInt(customWordCount, 10) : targetWordCount
    if (isNaN(wordCount) || wordCount < 500) {
      alert(t('content.wordCountError'))
      return
    }

    if (pollRef.current) clearInterval(pollRef.current)
    pollCountRef.current = 0

    setGenerating(true)
    try {
      localStorage.setItem('georank_engine', selectedEngine)
      const response = await contentAPI.generate({
        brand_id: parseInt(brandId),
        content_type: generateType,
        custom_instructions: customInstructions || undefined,
        language,
        target_word_count: wordCount,
        engine: selectedEngine,
      })

      const contentId = response.data.content_id
      setShowGenerateModal(false)
      setCustomInstructions('')
      setCustomWordCount('')

      const placeholder = {
        id: contentId,
        brand_id: parseInt(brandId),
        brand_name: brand?.name || '',
        content_type: generateType,
        title: t('content.statusGenerating'),
        status: 'generating',
        word_count: 0,
        engine: selectedEngine,
        target_word_count: wordCount,
      }
      setSelectedContent(placeholder)
      setContents((prev) => [placeholder, ...prev.filter((c) => c.id !== contentId)])

      startPolling(contentId)
    } catch (error) {
      console.error('Failed to generate content:', error)
      alert(t('content.generationError'))
      setGenerating(false)
    }
  }

  const handleSave = async (data) => {
    if (!selectedContent) return
    setEditorLoading(true)
    try {
      await contentAPI.update(selectedContent.id, data)
      await loadData()
    } catch (error) {
      console.error('Failed to save content:', error)
      alert(t('content.saveError'))
    } finally {
      setEditorLoading(false)
    }
  }

  const handleRegenerate = async () => {
    if (!selectedContent) return
    setEditorLoading(true)
    try {
      await contentAPI.regenerate(selectedContent.id, {
        modification_instructions: t('content.modificationInstructionsPlaceholder'),
      })
      await loadData()
    } catch (error) {
      console.error('Failed to regenerate content:', error)
      alert(t('content.regenerateError'))
    } finally {
      setEditorLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedContent) return
    setEditorLoading(true)
    try {
      await contentAPI.confirm(selectedContent.id)
      await loadData()
    } catch (error) {
      console.error('Failed to confirm content:', error)
      alert(t('content.confirmError'))
    } finally {
      setEditorLoading(false)
    }
  }

  const handlePublish = () => {
    setShowPublishModal(true)
  }

  const handlePublishConfirm = async (publishData) => {
    if (!selectedContent) return
    setEditorLoading(true)
    try {
      await contentAPI.publish(selectedContent.id, {
        target_platform: publishData.target_platform,
        platform_url: publishData.platform_url || undefined,
        publish_notes: publishData.publish_notes || undefined,
      })
      setShowPublishModal(false)
      await loadData()
    } catch (error) {
      console.error('Failed to publish content:', error)
      alert(t('content.publishError'))
    } finally {
      setEditorLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <FeatureGate feature="content_generation">
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('content.studio')}</h1>
            <p className="text-gray-600 mt-1">{brand?.name}</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors"
          >
            {t('content.generateNew')}
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          <div className="col-span-3 bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">{t('content.list')}</h2>
              <p className="text-sm text-gray-500">{t('content.count', { count: contents.length })}</p>
            </div>
            <div className="overflow-y-auto h-[calc(100%-60px)]">
              {contents.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {t('content.noContents')}
                </div>
              ) : (
                contents.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedContent(item)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedContent?.id === item.id ? 'bg-brand-50 border-l-4 border-l-brand-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[item.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_MAP[item.status] || item.status}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{item.content_type}</span>
                      <span className="mx-1">·</span>
                      <span>{item.word_count} {t('content.wordsUnit')}</span>
                      <span className="mx-1">·</span>
                      <span>{ENGINE_LABELS[item.engine] || 'MIMO'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="col-span-9 bg-white rounded-lg shadow overflow-hidden">
            {selectedContent ? (
              selectedContent.status === 'generating' ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mb-4"></div>
                  <p className="text-gray-600 text-lg">{t('content.generatingAI')}</p>
                  <p className="text-gray-400 text-sm mt-2">{t('content.generatingEstimate')}</p>
                </div>
              ) : selectedContent.status === 'failed' ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-danger text-5xl mb-4">✕</div>
                  <p className="text-gray-600 text-lg">{t('content.generationFailed')}</p>
                  <p className="text-gray-400 text-sm mt-2">{t('content.generationError')}</p>
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    className="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                  >
                    {t('content.retryGenerate')}
                  </button>
                </div>
              ) : (
                <ContentEditor
                  content={selectedContent}
                  onSave={handleSave}
                  onRegenerate={handleRegenerate}
                  onConfirm={handleConfirm}
                  onPublish={handlePublish}
                  loading={editorLoading}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">✍️</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('content.selectToEdit')}</h3>
                  <p className="text-gray-500">{t('content.selectToEditDesc')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">{t('content.generateNew')}</h2>
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('content.contentType')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {CONTENT_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setGenerateType(type.value)}
                        className={`p-3 rounded-lg border-2 text-left ${
                          generateType === type.value
                            ? 'border-brand-500 bg-brand-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{type.icon}</div>
                        <div className="text-sm font-medium text-gray-900">{type.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('content.outputLanguage')}
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setLanguage('zh')}
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium ${
                          language === 'zh'
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        中文
                      </button>
                      <button
                        onClick={() => setLanguage('en')}
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium ${
                          language === 'en'
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('content.aiModel')}
                    </label>
                    <select
                      value={selectedEngine}
                      onChange={(e) => setSelectedEngine(e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {availableModels.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label} — {m.desc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('content.targetWordCount')}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {WORD_COUNT_PRESETS.map((count) => (
                      <button
                        key={count}
                        onClick={() => {
                          setTargetWordCount(count)
                          setCustomWordCount('')
                        }}
                        className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium ${
                          targetWordCount === count && !customWordCount
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customWordCount}
                      onChange={(e) => setCustomWordCount(e.target.value)}
                      placeholder={t('content.customWordCount')}
                      min="500"
                      className="w-36 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-sm text-gray-500">{t('content.wordsUnit')}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('content.customInstructions')}
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder={t('content.customInstructionsPlaceholder')}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                  >
                    {generating ? t('content.generating') : t('content.startGeneration')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showPublishModal && (
          <PublishModal
            isOpen={showPublishModal}
            onClose={() => setShowPublishModal(false)}
            content={selectedContent}
            onPublish={handlePublishConfirm}
          />
        )}
      </div>
    </FeatureGate>
  )
}
