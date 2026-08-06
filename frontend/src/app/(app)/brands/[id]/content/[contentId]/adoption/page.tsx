'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { contentAPI } from '@/services/api'
import AdoptionTimeline from '@/components/AdoptionTimeline'
import FeatureGate from '@/components/FeatureGate'
import { useI18n } from '../../../../../../i18n/context'

export default function AdoptionPage() {
  const { id: brandId, contentId } = useParams()
  const { t } = useI18n()
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContent()
  }, [contentId])

  const loadContent = async () => {
    try {
      const response = await contentAPI.getById(contentId)
      setContent(response.data)
    } catch (error) {
      console.error('Failed to load content:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  if (!content) {
    return (
      <div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">&#10060;</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('content.notFound')}</h2>
          <p className="text-gray-600">{t('content.notFoundDesc')}</p>
        </div>
      </div>
    )
  }

  return (
    <FeatureGate feature="adoption_tracking">
      <div>
        <div className="mb-8">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <a href={`/brands/${brandId}/content`} className="hover:text-brand-600">
              {t('content.title')}
            </a>
            <span className="mx-2">/</span>
            <span>{content.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t('adoption.title')}</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">{t('content.type')}</div>
              <div className="text-lg font-semibold">{content.content_type}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{t('content.status')}</div>
              <div className="text-lg font-semibold">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  content.status === 'draft' ? 'bg-amber-100 text-amber-800' :
                  content.status === 'ready' ? 'bg-brand-100 text-brand-800' :
                  'bg-success-light text-success-dark'
                }`}>
                  {content.status === 'draft' ? t('content.draft') : content.status === 'ready' ? t('content.ready') : t('content.published')}
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{t('adoption.platform')}</div>
              <div className="text-lg font-semibold">{content.target_platform || '--'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">{t('adoption.publishedAt')}</div>
              <div className="text-lg font-semibold">
                {content.published_at
                  ? new Date(content.published_at).toLocaleDateString('zh-CN')
                  : '--'}
              </div>
            </div>
          </div>
        </div>

        {content.status === 'published' ? (
          <AdoptionTimeline contentId={contentId} />
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">&#128228;</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('adoption.notPublished')}</h3>
            <p className="text-gray-600 mb-6">
              {t('adoption.notPublishedDesc')}
            </p>
            <a
              href={`/brands/${brandId}/content`}
              className="inline-flex items-center px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
            >
              {t('content.backToStudio')}
            </a>
          </div>
        )}
      </div>
    </FeatureGate>
  )
}
