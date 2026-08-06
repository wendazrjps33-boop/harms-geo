export function contentStatusVariant(status) {
  switch (status) {
    case 'published': return 'success'
    case 'generating': return 'info'
    case 'draft': return 'neutral'
    case 'ready': return 'warning'
    case 'failed': return 'danger'
    default: return 'neutral'
  }
}

export function contentStatusLabel(status, t) {
  const map = {
    generating: t('content.statusGenerating'),
    draft: t('content.statusDraft'),
    ready: t('content.statusReady'),
    published: t('content.statusPublished'),
    failed: t('content.statusFailed'),
  }
  return map[status] || status
}

export function contentTypeLabel(type, t) {
  const map = {
    faq: t('content.typeFaq'),
    community_qa: t('content.typeCommunityQa'),
    article: t('content.typeArticle'),
    press_release: t('content.typePressRelease'),
  }
  return map[type] || type
}
