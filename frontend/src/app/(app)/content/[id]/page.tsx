'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import ContentEditor from '@/components/ContentEditor';
import AdoptionTimeline from '@/components/AdoptionTimeline';
import { useI18n } from '@/app/i18n/context';
import { contentAPI } from '@/services/api';
import { contentStatusVariant, contentStatusLabel } from '@/lib/status';
import type { ContentDetail } from '@/types/api';

export default function ContentDetailPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const contentId = parseInt(params.id as string);

  const [content, setContent] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'adoption'>('editor');

  useEffect(() => {
    if (contentId) {
      loadContent();
    }
  }, [contentId]);

  const loadContent = async () => {
    try {
      const response = await contentAPI.getById(contentId);
      setContent(response.data);
    } catch {
      setError(t('content.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: { title: string; body: string; tags: string[] }) => {
    setSaving(true);
    try {
      await contentAPI.update(contentId, data);
      await loadContent();
    } catch {
      setError(t('content.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setSaving(true);
    try {
      await contentAPI.regenerate(contentId, {
        modification_instructions: t('content.regenerateDefault'),
      });
      await loadContent();
    } catch {
      setError(t('content.regenerateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await contentAPI.confirm(contentId);
      await loadContent();
    } catch {
      setError(t('content.confirmFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      await contentAPI.publish(contentId, {});
      await loadContent();
    } catch {
      setError(t('content.publishFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title={t('content.detailTitle')} />
        <Skeleton count={3} />
      </div>
    );
  }

  if (!content) {
    return (
      <div>
        <PageHeader title={t('content.detailTitle')} />
        <div className="text-center py-12 text-gray-500">
          {t('content.notFound')}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button
            onClick={() => router.push('/content')}
            className="hover:text-gray-700 transition-colors"
          >
            {t('content.title')}
          </button>
          <span>/</span>
          <span className="text-gray-900">{content.title}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {content.title}
            </h1>
            <Badge variant={contentStatusVariant(content.status)}>
              {contentStatusLabel(content.status, t)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const text = content.body || '';
                navigator.clipboard.writeText(text);
              }}
            >
              {t('content.copyMarkdown')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const html = content.body || '';
                navigator.clipboard.writeText(html);
              }}
            >
              {t('content.copyHtml')}
            </Button>
          </div>
        </div>
      </div>

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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'editor'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('editor')}
        >
          {t('content.tabEditor')}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'adoption'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('adoption')}
        >
          {t('content.tabAdoption')}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'editor' && (
        <ContentEditor
          content={content}
          onSave={handleSave}
          onRegenerate={handleRegenerate}
          onConfirm={handleConfirm}
          onPublish={handlePublish}
          loading={saving}
        />
      )}

      {activeTab === 'adoption' && (
        <AdoptionTimeline contentId={contentId} />
      )}
    </div>
  );
}
