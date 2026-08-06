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
import { contentAPI, brandAPI } from '@/services/api';
import { contentStatusVariant, contentStatusLabel, contentTypeLabel } from '@/lib/status';
import { getEngineOptions } from '@/lib/constants';
import type { Brand, ContentListItem, ContentType } from '@/types/api';

interface ContentFilters {
  brand_id: string;
  content_type: string;
  status: string;
}

interface CreateForm {
  brand_id: string;
  content_type: ContentType;
  target_word_count: number;
  engine: string;
}

export default function ContentPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [contents, setContents] = useState<ContentListItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<ContentFilters>({
    brand_id: '',
    content_type: '',
    status: '',
  });

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    brand_id: '',
    content_type: 'article',
    target_word_count: 1000,
    engine: 'mimo',
  });
  const [creating, setCreating] = useState(false);

  const CONTENT_TYPES = [
    { value: '', label: t('content.allTypes') },
    { value: 'faq', label: t('content.typeFaq') },
    { value: 'community_qa', label: t('content.typeCommunityQa') },
    { value: 'article', label: t('content.typeArticle') },
    { value: 'press_release', label: t('content.typePressRelease') },
  ];

  const STATUS_OPTIONS = [
    { value: '', label: t('content.allStatuses') },
    { value: 'generating', label: t('content.statusGenerating') },
    { value: 'draft', label: t('content.statusDraft') },
    { value: 'ready', label: t('content.statusReady') },
    { value: 'published', label: t('content.statusPublished') },
    { value: 'failed', label: t('content.statusFailed') },
  ];

  const ENGINES = getEngineOptions(t);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadContents();
  }, [filters]);

  const loadData = async () => {
    try {
      const [brandsRes, contentRes] = await Promise.all([
        brandAPI.getAll(),
        contentAPI.list({}),
      ]);
      setBrands(brandsRes.data || []);
      setContents(contentRes.data || []);
    } catch {
      setError(t('content.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadContents = async () => {
    try {
      const params: Record<string, string> = {};
      if (filters.brand_id) params.brand_id = filters.brand_id;
      if (filters.content_type) params.content_type = filters.content_type;
      if (filters.status) params.status = filters.status;

      const response = await contentAPI.list(params);
      setContents(response.data || []);
    } catch {
      setError(t('content.loadFailed'));
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
        <PageHeader title={t('content.title')} />
        <Skeleton count={5} />
      </div>
    );
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
          <button
            onClick={() => setError('')}
            className="text-danger-dark/60 hover:text-danger-dark"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select
          value={filters.brand_id}
          onChange={(e) => setFilters({ ...filters, brand_id: e.target.value })}
          options={[
            { value: '', label: t('content.allBrands') },
            ...brands.map((b) => ({ value: b.id, label: b.name })),
          ]}
          className="w-48"
        />
        <Select
          value={filters.content_type}
          onChange={(e) => setFilters({ ...filters, content_type: e.target.value })}
          options={CONTENT_TYPES}
          className="w-48"
        />
        <Select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          options={STATUS_OPTIONS}
          className="w-48"
        />
      </div>

      {/* Content List */}
      {contents.length === 0 ? (
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
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('content.words')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {contents.map((content) => (
                  <tr
                    key={content.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/content/${content.id}`)}
                  >
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {content.title}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {content.brand_name}
                    </td>
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
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">
                      {content.word_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('content.createContent')}
      >
        <div className="space-y-4">
          <Select
            label={t('content.selectBrand')}
            value={createForm.brand_id}
            onChange={(e) =>
              setCreateForm({ ...createForm, brand_id: e.target.value })
            }
            options={brands.map((b) => ({ value: b.id, label: b.name }))}
          />
          <Select
            label={t('content.selectType')}
            value={createForm.content_type}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                content_type: e.target.value as ContentType,
              })
            }
            options={CONTENT_TYPES.filter((o) => o.value)}
          />
          <Input
            label={t('content.targetWordCount')}
            type="number"
            value={createForm.target_word_count}
            onChange={(e) =>
              setCreateForm({
                ...createForm,
                target_word_count: parseInt(e.target.value) || 1000,
              })
            }
            min={500}
          />
          <Select
            label={t('content.selectEngine')}
            value={createForm.engine}
            onChange={(e) =>
              setCreateForm({ ...createForm, engine: e.target.value })
            }
            options={ENGINES}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
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
