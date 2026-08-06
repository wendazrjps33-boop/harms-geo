/**
 * 内容状态和类型工具函数
 */

import type { ContentStatus, ContentType } from '@/types/api';

type BadgeVariant = 'success' | 'info' | 'neutral' | 'warning' | 'danger';

/**
 * 获取内容状态对应的 Badge 变体
 */
export function contentStatusVariant(status: ContentStatus): BadgeVariant {
  switch (status) {
    case 'published':
      return 'success';
    case 'generating':
      return 'info';
    case 'draft':
      return 'neutral';
    case 'ready':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

/**
 * 获取内容状态的本地化标签
 */
export function contentStatusLabel(status: ContentStatus, t: (key: string) => string): string {
  const map: Record<ContentStatus, string> = {
    generating: t('content.statusGenerating'),
    draft: t('content.statusDraft'),
    ready: t('content.statusReady'),
    published: t('content.statusPublished'),
    failed: t('content.statusFailed'),
  };
  return map[status] || status;
}

/**
 * 获取内容类型的本地化标签
 */
export function contentTypeLabel(type: ContentType, t: (key: string) => string): string {
  const map: Record<ContentType, string> = {
    faq: t('content.typeFaq'),
    community_qa: t('content.typeCommunityQa'),
    article: t('content.typeArticle'),
    press_release: t('content.typePressRelease'),
  };
  return map[type] || type;
}
