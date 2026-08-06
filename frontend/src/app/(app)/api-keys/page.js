'use client'

import { useState, useEffect } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { useI18n } from '../../i18n/context'
import { apiKeyAPI } from '../../services/api'


export default function ApiKeysPage() {
  const { t, locale } = useI18n()
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', expires_days: 90 })
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [newKey, setNewKey] = useState(null) // 新创建的 key，只显示一次
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    try {
      const response = await apiKeyAPI.list()
      setKeys(response.data.keys || [])
    } catch {
      setError(t('apiKeys.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.name) return

    setCreating(true)
    try {
      const response = await apiKeyAPI.create(createForm)
      setNewKey(response.data)
      setCopied(false)
      setShowCreateModal(false)
      setCreateForm({ name: '', expires_days: 90 })
      await loadKeys()
    } catch (err) {
      setError(err.data?.detail || t('apiKeys.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (keyId) => {
    if (!window.confirm(t('apiKeys.revokeConfirm'))) return

    setActionLoading(keyId)
    try {
      await apiKeyAPI.revoke(keyId)
      await loadKeys()
    } catch {
      setError(t('apiKeys.revokeFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleRotate = async (keyId) => {
    if (!window.confirm(t('apiKeys.rotateConfirm'))) return

    setActionLoading(keyId)
    try {
      const response = await apiKeyAPI.rotate(keyId)
      setNewKey(response.data)
      setCopied(false)
      await loadKeys()
    } catch {
      setError(t('apiKeys.rotateFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '--'
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('apiKeys.title')} />
        <Skeleton count={3} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('apiKeys.title')}
        description={t('apiKeys.description')}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            {t('apiKeys.createKey')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark">✕</button>
        </div>
      )}

      {/* New Key Alert */}
      {newKey && (
        <Card className="mb-6 border-success bg-success-light">
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-success-dark">{t('apiKeys.keyCreated')}</p>
                <p className="text-sm text-success-dark/80 mt-1">{t('apiKeys.keyCreatedWarning')}</p>
              </div>
              <button onClick={() => setNewKey(null)} className="text-success-dark/60 hover:text-success-dark">✕</button>
            </div>
            <div className="mt-3 p-3 bg-white rounded-lg border border-success/30 font-mono text-sm break-all">
              {newKey.key}
            </div>
            <div className="mt-3">
              <Button
                variant="success"
                size="sm"
                onClick={() => copyToClipboard(newKey.key)}
              >
                {copied ? t('apiKeys.copied') : t('apiKeys.copyKey')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {keys.length === 0 ? (
        <EmptyState
          icon="🔑"
          title={t('apiKeys.emptyTitle')}
          description={t('apiKeys.emptyDescription')}
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              {t('apiKeys.createFirst')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {keys.map((key) => (
            <Card key={key.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <Badge variant={key.is_active && !isExpired(key.expires_at) ? 'success' : 'danger'}>
                      {key.is_active && !isExpired(key.expires_at) ? t('apiKeys.active') : t('apiKeys.revoked')}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{key.key_prefix}</span>
                    </p>
                    <p>{t('apiKeys.created')}: {formatDate(key.created_at)}</p>
                    <p>{t('apiKeys.expires')}: {formatDate(key.expires_at)}</p>
                    {key.last_used_at && (
                      <p>{t('apiKeys.lastUsed')}: {formatDate(key.last_used_at)}</p>
                    )}
                  </div>
                </div>

                {key.is_active && !isExpired(key.expires_at) && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRotate(key.id)}
                      loading={actionLoading === key.id}
                    >
                      {t('apiKeys.rotate')}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRevoke(key.id)}
                      loading={actionLoading === key.id}
                    >
                      {t('apiKeys.revoke')}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('apiKeys.createTitle')}
      >
        <div className="space-y-4">
          <Input
            label={t('apiKeys.nameLabel')}
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            placeholder={t('apiKeys.namePlaceholder')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('apiKeys.expiresLabel')}
            </label>
            <select
              value={createForm.expires_days}
              onChange={(e) => setCreateForm({ ...createForm, expires_days: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value={30}>30 {t('apiKeys.days')}</option>
              <option value={60}>60 {t('apiKeys.days')}</option>
              <option value={90}>90 {t('apiKeys.days')}</option>
              <option value={180}>180 {t('apiKeys.days')}</option>
              <option value={365}>365 {t('apiKeys.days')}</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              {t('apiKeys.create')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
