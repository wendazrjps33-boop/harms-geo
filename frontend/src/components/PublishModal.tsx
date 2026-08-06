'use client'

import { useState } from 'react'
import { useI18n } from '@/app/i18n/context'

function getPlatforms(t) {
  return {
    zhihu: { label: t('publish.platformZhihu'), icon: '乎', type: 'domestic', color: 'blue' },
    xiaohongshu: { label: t('publish.platformXiaohongshu'), icon: '红', type: 'domestic', color: 'red' },
    wechat: { label: t('publish.platformWechat'), icon: '微', type: 'domestic', color: 'green' },
    medium: { label: 'Medium', icon: 'M', type: 'overseas', color: 'gray' },
    reddit: { label: 'Reddit', icon: 'R', type: 'overseas', color: 'orange' },
    website: { label: t('publish.platformWebsite'), icon: 'W', type: 'other', color: 'gray' },
    pr: { label: t('publish.platformPr'), icon: 'P', type: 'other', color: 'gray' },
    other: { label: t('publish.platformOther'), icon: '?', type: 'other', color: 'gray' },
  }
}

function getPlatformGuides(t) {
  return {
    zhihu: {
      steps: t('publish.zhihuSteps'),
      tips: t('publish.zhihuTips'),
    },
    xiaohongshu: {
      steps: t('publish.xiaohongshuSteps'),
      tips: t('publish.xiaohongshuTips'),
    },
    wechat: {
      steps: t('publish.wechatSteps'),
      tips: t('publish.wechatTips'),
    },
  }
}

const COLOR_MAP = {
  blue: 'border-brand-500 bg-brand-50 text-brand-700',
  red: 'border-danger bg-danger-light text-danger-dark',
  green: 'border-success bg-success-light text-success-dark',
  gray: 'border-gray-300 bg-gray-50 text-gray-700',
  orange: 'border-orange-500 bg-orange-50 text-orange-700',
}

const IDLE_COLOR_MAP = {
  blue: 'border-gray-200 hover:border-blue-300',
  red: 'border-gray-200 hover:border-red-300',
  green: 'border-gray-200 hover:border-green-300',
  gray: 'border-gray-200 hover:border-gray-300',
  orange: 'border-gray-200 hover:border-orange-300',
}

export default function PublishModal({ isOpen, onClose, content, onPublish }) {
  const { t } = useI18n()
  const [step, setStep] = useState('select')
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const [platformUrl, setPlatformUrl] = useState('')
  const [publishNotes, setPublishNotes] = useState('')
  const [copyStatus, setCopyStatus] = useState('idle')
  const [publishing, setPublishing] = useState(false)

  if (!isOpen) return null

  const PLATFORMS = getPlatforms(t)
  const PLATFORM_GUIDES = getPlatformGuides(t)

  const platform = selectedPlatform ? PLATFORMS[selectedPlatform] : null
  const guide = selectedPlatform ? PLATFORM_GUIDES[selectedPlatform] : null

  const handleCopyContent = async () => {
    try {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = content.body || ''
      const plainText = tempDiv.innerText || tempDiv.textContent || ''
      const plainClipboard = `${content.title || ''}\n\n${plainText}`
      const htmlClipboard = `<h1>${content.title || ''}</h1>\n${content.body || ''}`

      if (navigator.clipboard.write && typeof Blob !== 'undefined') {
        const htmlBlob = new Blob([htmlClipboard], { type: 'text/html' })
        const plainBlob = new Blob([plainClipboard], { type: 'text/plain' })
        const item = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': plainBlob,
        })
        await navigator.clipboard.write([item])
      } else {
        await navigator.clipboard.writeText(plainClipboard)
      }
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = `${content.title || ''}\n\n${content.body || ''}`
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2000)
    }
  }

  const handleConfirm = async () => {
    setPublishing(true)
    try {
      await onPublish({
        target_platform: selectedPlatform,
        platform_url: platformUrl || undefined,
        publish_notes: publishNotes || undefined,
      })
    } finally {
      setPublishing(false)
    }
  }

  const handleBack = () => {
    setStep('select')
    setSelectedPlatform(null)
    setPlatformUrl('')
    setPublishNotes('')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {step === 'select' ? (
          <>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{t('publish.title')}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PLATFORMS).map(([key, p]) => {
                  const isSelected = selectedPlatform === key
                  const isDisabled = p.type === 'overseas'
                  return (
                    <button
                      key={key}
                      onClick={() => !isDisabled && setSelectedPlatform(key)}
                      disabled={isDisabled}
                      className={`relative p-4 rounded-xl border-2 text-left transition-colors ${
                        isSelected
                          ? COLOR_MAP[p.color]
                          : isDisabled
                            ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            : IDLE_COLOR_MAP[p.color]
                      }`}
                    >
                      <div className="text-2xl mb-1">{p.icon}</div>
                      <div className="text-sm font-medium">{p.label}</div>
                      {isDisabled && (
                        <span className="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">
                          {t('publish.comingSoon')}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => selectedPlatform && setStep('guide')}
                disabled={!selectedPlatform}
                className={`px-6 py-2 rounded-lg text-sm font-medium ${
                  selectedPlatform
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {t('publish.next')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={handleBack} className="text-gray-400 hover:text-gray-600">
                    ←
                  </button>
                  <h2 className="text-xl font-bold text-gray-900">{t('publish.publishTo', { platform: platform?.label })}</h2>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {platform?.type === 'overseas' && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  {t('publish.autoPublishNotice')}
                </div>
              )}

              {platform?.type === 'domestic' && (
                <button
                  onClick={handleCopyContent}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-medium border-2 transition-colors ${
                    copyStatus === 'copied'
                      ? 'border-success bg-success-light text-success-dark'
                      : 'border-brand-500 bg-brand-50 text-brand-700 hover:bg-brand-100'
                  }`}
                >
                  {copyStatus === 'copied' ? t('publish.copiedToClipboard') : t('publish.copyTitleAndBody')}
                </button>
              )}

              {guide && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{t('publish.publishSteps')}</h4>
                  <ol className="space-y-1.5">
                    {guide.steps.map((s, i) => (
                      <li key={i} className="text-sm text-gray-600 flex gap-2">
                        <span className="text-gray-400 shrink-0">{i + 1}.</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  {guide.tips && (
                    <p className="mt-2 text-xs text-gray-500">{guide.tips}</p>
                  )}
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{t('publish.alreadyPublishedPasteLink')}</h4>
                <input
                  type="url"
                  value={platformUrl}
                  onChange={(e) => setPlatformUrl(e.target.value)}
                  placeholder={t('publish.pasteLinkPlaceholder')}
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={publishNotes}
                  onChange={(e) => setPublishNotes(e.target.value)}
                  placeholder={t('publish.notesPlaceholder')}
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <button
                  onClick={handleConfirm}
                  disabled={publishing}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {publishing ? t('publish.publishing') : t('publish.confirmPublish')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
