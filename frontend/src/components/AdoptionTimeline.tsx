'use client';

import { useState, useEffect } from 'react';
import { contentAPI } from '@/services/api';
import { useI18n } from '@/app/i18n/context';
import type { AdoptionData } from '@/types/api';

interface AdoptionTimelineProps {
  contentId: number;
}

export default function AdoptionTimeline({ contentId }: AdoptionTimelineProps) {
  const { t, locale } = useI18n();
  const [adoption, setAdoption] = useState<AdoptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdoption();
  }, [contentId]);

  const loadAdoption = async () => {
    try {
      const response = await contentAPI.getAdoption(contentId);
      setAdoption(response.data);
    } catch (error) {
      console.error('Failed to load adoption:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!adoption) {
    return (
      <div className="text-center py-12 text-gray-500">{t('adoption.noData')}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">{t('adoption.platformIndexing')}</div>
          <div className="text-3xl font-bold">
            {adoption.platform_indexing.length > 0 ? (
              <span className="text-success">✓</span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">{t('adoption.aiCitations')}</div>
          <div className="text-3xl font-bold">
            {adoption.ai_citations.length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-500 mb-1">{t('adoption.rankingChange')}</div>
          <div className="text-3xl font-bold">
            {adoption.ranking_delta ? (
              <span
                className={
                  adoption.ranking_delta.is_adopted ? 'text-success' : 'text-danger'
                }
              >
                {adoption.ranking_delta.is_adopted ? '+' : ''}
                {adoption.ranking_delta.score_delta?.toFixed(1) ?? '—'}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        </div>
      </div>

      {/* AI 引擎引用详情 */}
      {adoption.ai_citations.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('adoption.aiCitationDetails')}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" aria-label={t('adoption.aiCitationDetails')}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('adoption.engine')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('adoption.citationStatus')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('adoption.position')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('adoption.accuracy')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('adoption.checkedAt')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {adoption.ai_citations.map((check) => (
                  <tr key={check.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {check.detail?.engine as string}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          check.is_adopted
                            ? 'bg-success-light text-success-dark'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {check.is_adopted
                          ? t('adoption.cited')
                          : t('adoption.notCited')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-center">
                      {check.citation_position ?? '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-center">
                      {check.citation_accuracy
                        ? `${(check.citation_accuracy * 100).toFixed(0)}%`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 text-right">
                      {new Date(check.check_date).toLocaleDateString(
                        locale === 'zh' ? 'zh-CN' : 'en-US'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 检测时间线 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('adoption.detectionTimeline')}
          </h3>
        </div>
        <div className="p-6">
          <div className="relative flex items-center justify-between">
            {/* 连接线 */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-300 z-0"></div>
            {adoption.timeline.map((node) => (
              <div
                key={node.days_after_publish}
                className="relative flex flex-col items-center z-10"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    node.status === 'done'
                      ? node.is_adopted
                        ? 'bg-success text-white'
                        : 'bg-gray-400 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {node.status === 'done' ? (
                    node.is_adopted ? (
                      '✓'
                    ) : (
                      '✗'
                    )
                  ) : (
                    <span className="text-xs">{node.days_after_publish}d</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {t('adoption.daysAfterPublish', {
                    n: node.days_after_publish,
                  })}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {node.check_date
                    ? new Date(node.check_date).toLocaleDateString(
                        locale === 'zh' ? 'zh-CN' : 'en-US'
                      )
                    : '—'}
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
  );
}
