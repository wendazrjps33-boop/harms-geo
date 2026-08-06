'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { useI18n } from '@/app/i18n/context';
import { brandAPI, contentAPI } from '@/services/api';
import { contentStatusVariant, contentStatusLabel, contentTypeLabel } from '@/lib/status';
import { getEngineOptions } from '@/lib/constants';
import type { Brand, ContentListItem, ContentType } from '@/types/api';

interface DashboardStats {
  totalBrands: number;
  totalContents: number;
  publishedContents: number;
  averageScore: number;
}

interface CreateForm {
  brand_id: string;
  content_type: ContentType;
  target_word_count: number;
  engine: string;
  custom_instructions: string;
}

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentContents, setRecentContents] = useState<ContentListItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [error, setError] = useState('');

  // Create content modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    brand_id: '',
    content_type: 'faq',
    target_word_count: 1000,
    engine: 'mimo',
    custom_instructions: '',
  });
  const [creating, setCreating] = useState(false);

  const CONTENT_TYPES = [
    { value: 'faq', label: t('content.typeFaq') },
    { value: 'community_qa', label: t('content.typeCommunityQa') },
    { value: 'article', label: t('content.typeArticle') },
    { value: 'press_release', label: t('content.typePressRelease') },
  ];

  const ENGINES = getEngineOptions(t);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [brandsRes, contentRes] = await Promise.all([
        brandAPI.getAll(),
        contentAPI.list({ limit: 5 }),
      ]);

      const brandsData = brandsRes.data || [];
      const contentsData = contentRes.data || [];

      setBrands(brandsData);
      setRecentContents(contentsData);
      setStats({
        totalBrands: brandsData.length,
        totalContents: contentsData.length,
        publishedContents: contentsData.filter((c) => c.status === 'published').length,
        averageScore:
          contentsData.length > 0
            ? Math.round(
                contentsData.reduce((sum, c) => sum + (c.quality_score || 0), 0) /
                  contentsData.length
              )
            : 0,
      });
    } catch {
      setError(t('dashboard.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.brand_id) return;

    setCreating(true);
    try {
      const response = await contentAPI.generate({
        brand_id: parseInt(createForm.brand_id),
        content_type: createForm.content_type,
        target_word_count: createForm.target_word_count,
        engine: createForm.engine,
        custom_instructions: createForm.custom_instructions || undefined,
      });
      setShowCreateModal(false);
      router.push(`/content/${response.data.content_id}`);
    } catch {
      setError(t('content.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title={t('dashboard.title')} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton count={4} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            {t('content.createContent')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark">
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="text-sm text-gray-500">{t('dashboard.totalBrands')}</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalBrands ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">{t('dashboard.totalContents')}</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalContents ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">{t('dashboard.publishedContents')}</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats?.publishedContents ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-gray-500">{t('dashboard.averageScore')}</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{stats?.averageScore ?? 0}</div>
        </Card>
      </div>

      {/* Recent Contents */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentContents')}</h2>
        {recentContents.length === 0 ? (
          <EmptyState
            icon="📝"
            title={t('content.emptyTitle')}
            description={t('content.emptyDescription')}
            action={
              <Button onClick={() => setShowCreateModal(true)}>
                {t('content.createContent')}
              </Button>
            }
          />
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      {t('content.title')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      {t('content.brand')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                      {t('content.type')}
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                      {t('content.status')}
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                      {t('content.score')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentContents.map((content) => (
                    <tr
                      key={content.id}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/content/${content.id}`)}
                    >
                      <td className="py-3 px-4 text-sm text-gray-900">{content.title}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{content.brand_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {contentTypeLabel(content.content_type, t)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={contentStatusVariant(content.status)}>
                          {contentStatusLabel(content.status, t)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right">
                        {content.quality_score ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card hover onClick={() => setShowCreateModal(true)}>
            <div className="text-center py-4">
              <div className="text-3xl mb-2">✍️</div>
              <div className="text-sm font-medium text-gray-900">{t('content.createContent')}</div>
            </div>
          </Card>
          <Card hover onClick={() => router.push('/analytics')}>
            <div className="text-center py-4">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-sm font-medium text-gray-900">{t('dashboard.viewAnalytics')}</div>
            </div>
          </Card>
          <Card hover onClick={() => router.push('/brands')}>
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🏢</div>
              <div className="text-sm font-medium text-gray-900">{t('dashboard.manageBrands')}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Create Content Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('content.createContent')}
      >
        <div className="space-y-4">
          <Select
            label={t('content.selectBrand')}
            value={createForm.brand_id}
            onChange={(e) => setCreateForm({ ...createForm, brand_id: e.target.value })}
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
            placeholder={t('content.selectBrandPlaceholder')}
          />
          <Select
            label={t('content.selectType')}
            value={createForm.content_type}
            onChange={(e) =>
              setCreateForm({ ...createForm, content_type: e.target.value as ContentType })
            }
            options={CONTENT_TYPES}
          />
          <Input
            label={t('content.targetWordCount')}
            type="number"
            value={createForm.target_word_count}
            onChange={(e) =>
              setCreateForm({ ...createForm, target_word_count: parseInt(e.target.value) || 1000 })
            }
            min={500}
          />
          <Select
            label={t('content.selectEngine')}
            value={createForm.engine}
            onChange={(e) => setCreateForm({ ...createForm, engine: e.target.value })}
            options={ENGINES}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              {t('content.startGenerate')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
