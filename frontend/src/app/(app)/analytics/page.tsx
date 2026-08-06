'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useI18n } from '@/app/i18n/context';
import { brandAPI, analysisAPI, competitorAPI } from '@/services/api';
import type { Brand, AnalysisRun } from '@/types/api';

type TabType = 'visibility' | 'competitor' | 'compare';

export default function AnalyticsPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('visibility');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [runs, setRuns] = useState<AnalysisRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      loadRuns();
    }
  }, [selectedBrand]);

  const loadBrands = async () => {
    try {
      const response = await brandAPI.getAll();
      const brandsData = response.data || [];
      setBrands(brandsData);
      if (brandsData.length > 0) {
        setSelectedBrand(String(brandsData[0].id));
      }
    } catch {
      setError(t('analytics.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadRuns = async () => {
    if (!selectedBrand) return;
    try {
      const response = await analysisAPI.getRuns(parseInt(selectedBrand));
      setRuns(response.data || []);
    } catch {
      setError(t('analytics.loadRunsFailed'));
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedBrand) return;
    try {
      await analysisAPI.startRun(parseInt(selectedBrand), {});
      await loadRuns();
    } catch {
      setError(t('analytics.startFailed'));
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'visibility', label: t('analytics.tabVisibility') },
    { key: 'competitor', label: t('analytics.tabCompetitor') },
    { key: 'compare', label: t('analytics.tabCompare') },
  ];

  if (loading) {
    return (
      <div>
        <PageHeader title={t('analytics.title')} />
        <Skeleton count={3} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('analytics.title')}
        description={t('analytics.description')}
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button
            onClick={() => setError('')}
            className="text-danger-dark/60 hover:text-danger-dark"
          >
            ✕
          </button>
        </div>
      )}

      {/* Brand Selector */}
      <div className="mb-6">
        <Select
          label={t('analytics.selectBrand')}
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          options={brands.map((b) => ({ value: b.id, label: b.name }))}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'visibility' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('analytics.analysisRuns')}
            </h3>
            <Button onClick={handleStartAnalysis}>
              {t('analytics.startAnalysis')}
            </Button>
          </div>

          {runs.length === 0 ? (
            <EmptyState
              icon="📊"
              title={t('analytics.noRuns')}
              description={t('analytics.noRunsDescription')}
              action={
                <Button onClick={handleStartAnalysis}>
                  {t('analytics.startAnalysis')}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {runs.map((run) => (
                <Card key={run.id} hover>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t('analytics.run')} #{run.id}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(run.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        run.status === 'completed'
                          ? 'success'
                          : run.status === 'running'
                            ? 'info'
                            : 'neutral'
                      }
                    >
                      {run.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {t('analytics.samples')}: {run.sample_count}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'competitor' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('analytics.competitorAnalysis')}
          </h3>
          <EmptyState
            icon="🏆"
            title={t('analytics.competitorEmpty')}
            description={t('analytics.competitorEmptyDescription')}
          />
        </div>
      )}

      {activeTab === 'compare' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('analytics.brandCompare')}
          </h3>
          <EmptyState
            icon="📈"
            title={t('analytics.compareEmpty')}
            description={t('analytics.compareEmptyDescription')}
          />
        </div>
      )}
    </div>
  );
}
