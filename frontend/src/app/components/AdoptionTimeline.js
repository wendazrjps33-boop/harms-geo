'use client'

import { useState, useEffect } from 'react'
import { contentAPI } from '../services/api'
import { useI18n } from '../i18n/context'

export default function AdoptionTimeline({ contentId }) {
  const { t, locale } = useI18n()
  const [adoption, setAdoption] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdoption()
  }, [contentId])

  const loadAdoption = async () => {
    try {
      const response = await contentAPI.getAdoption(contentId)
      setAdoption(response.data)
    } catch (error) {
      console.error('Failed to load adoption:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (!adoption) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('adoption.noData')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">{t('adoption.platformIndexing')}</div>
          <div className="text-3xl font-bold">
            {adoption.platform_indexing.is_indexed ? (
              <span className="text-success">{t('adoption.indexed')}</span>
            ) : (
              <span className="text-gray-400">{t('adoption.notIndexed')}</span>
            )}
          </div>
          {adoption.platform_indexing.search_rank && (
            <div className="text-sm text-gray-600 mt-1">
              {t('adoption.searchRank')}: #{adoption.platform_indexing.search_rank}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">{t('adoption.aiEngineCitations')}</div>
          <div className="text-3xl font-bold text-brand-600">
            {adoption.ai_citations.total_citations}
            <span className="text-lg text-gray-400 font-normal">/{adoption.ai_citations.engines.length}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {t('adoption.citingEngines')}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">{t('adoption.rankingChange')}</div>
          {adoption.ranking_delta.delta !== null ? (
            <>
              <div className={`text-3xl font-bold ${
                adoption.ranking_delta.delta > 0 ? 'text-success' : 'text-danger'
              }`}>
                {adoption.ranking_delta.delta > 0 ? '+' : ''}
                {adoption.ranking_delta.delta?.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {adoption.ranking_delta.delta_percent !== null && (
                  <span>{adoption.ranking_delta.delta_percent > 0 ? '+' : ''}{adoption.ranking_delta.delta_percent}%</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-3xl font-bold text-gray-400">--</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{t('adoption.aiCitationDetails')}</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('adoption.engine')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('adoption.citationStatus')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('adoption.position')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('adoption.accuracy')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('adoption.checkedAt')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {adoption.ai_citations.engines.map((engine) => (
              <tr key={engine.engine}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {engine.engine}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {engine.cited ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-light text-success-dark">
                      {t('adoption.cited')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-2 text-gray-700">
                      {t('adoption.notCited')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {engine.position ? `#${engine.position}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {engine.accuracy ? `${(engine.accuracy * 100).toFixed(1)}%` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {engine.checked_at ? new Date(engine.checked_at).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{t('adoption.detectionTimeline')}</h3>
        </div>
        <div className="p-6">
          <div className="relative flex items-center justify-between">
            {/* 连接线：使用相对定位的容器，连接线从第一个节点中心到最后一个节点中心 */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-300 z-0"></div>
            {adoption.timeline.map((node, index) => (
              <div key={node.days_after_publish} className="relative flex flex-col items-center z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  node.status === 'done'
                    ? node.is_adopted
                      ? 'bg-success text-white'
                      : 'bg-gray-400 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {node.status === 'done' ? (
                    node.is_adopted ? '✓' : '✗'
                  ) : (
                    <span className="text-xs">{node.days_after_publish}d</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {t('adoption.daysAfterPublish', { n: node.days_after_publish })}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {node.check_date}
                </div>
                {node.citation_count !== null && (
                  <div className="text-xs text-gray-600 mt-1">
                    {t('adoption.citations', { n: node.citation_count })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
