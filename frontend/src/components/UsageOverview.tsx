'use client';

import { useState, useEffect } from 'react';
import { usageAPI } from '@/services/api';
import { useI18n } from '@/app/i18n/context';
import type { UsageCurrent } from '@/types/api';

interface DimensionConfig {
  name: string;
  used: number;
  limit: number;
  icon: string;
  color: string;
}

export default function UsageOverview() {
  const { t } = useI18n();
  const [usage, setUsage] = useState<UsageCurrent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const response = await usageAPI.getCurrent();
      setUsage(response.data);
    } catch (error) {
      console.error('Failed to load usage:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={`skeleton-${i}`} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!usage) return null;

  const dimensions: DimensionConfig[] = [
    {
      name: t('usage.brands'),
      used: usage.dimensions.brand.used,
      limit: usage.dimensions.brand.limit,
      icon: '🏢',
      color: 'blue',
    },
    {
      name: t('usage.queries'),
      used: usage.dimensions.query.used,
      limit: usage.dimensions.query.limit,
      icon: '🔍',
      color: 'green',
    },
    {
      name: t('usage.contentGeneration'),
      used: usage.dimensions.content.used,
      limit: usage.dimensions.content.limit,
      icon: '✍️',
      color: 'purple',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {dimensions.map((dim) => {
        const isUnlimited = dim.limit === -1;
        const percentage = dim.limit > 0 ? Math.min(100, (dim.used / dim.limit) * 100) : 0;
        const isNearLimit = percentage >= 80;
        const isAtLimit = percentage >= 100;

        return (
          <div key={dim.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{dim.name}</span>
              <span className="text-2xl">{dim.icon}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {dim.used}
              <span className="text-lg text-gray-400 font-normal">
                {isUnlimited ? ' / ∞' : `/${dim.limit}`}
              </span>
            </div>
            {!isUnlimited && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isAtLimit ? 'bg-danger' : isNearLimit ? 'bg-warning' : 'bg-brand-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              {isUnlimited
                ? t('usage.unlimited')
                : isAtLimit
                  ? t('usage.atLimit')
                  : t('usage.remaining', { n: dim.limit - dim.used })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
