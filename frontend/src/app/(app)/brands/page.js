'use client'

import { useState, useEffect } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Drawer from '../../components/ui/Drawer'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import EmptyState from '../../components/ui/EmptyState'
import { useI18n } from '../../i18n/context'
import { brandAPI, brandProfileAPI } from '../../services/api'


export default function BrandsPage() {
  const { t } = useI18n()
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create brand modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', website: '' })
  const [creating, setCreating] = useState(false)

  // Edit brand drawer
  const [editingBrand, setEditingBrand] = useState(null)
  const [editForm, setEditForm] = useState({
    name: '',
    website: '',
    brand_description: '',
    core_products: '',
    target_audience: '',
    key_selling_points: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchBrands()
  }, [])

  const fetchBrands = async () => {
    try {
      const data = await brandAPI.getAll()
      setBrands(Array.isArray(data) ? data : data.data || [])
    } catch {
      setError(t('brands.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBrand = async () => {
    if (!createForm.name.trim()) return
    setCreating(true)
    try {
      await brandAPI.create(createForm)
      setShowCreateModal(false)
      setCreateForm({ name: '', website: '' })
      fetchBrands()
    } catch (error) {
      setError(error.data?.detail || t('brands.addFailed'))
    } finally {
      setCreating(false)
    }
  }

  const handleEditBrand = async (brand) => {
    setEditingBrand(brand)
    setEditForm({
      name: brand.name || '',
      website: brand.website || '',
      brand_description: '',
      core_products: '',
      target_audience: '',
      key_selling_points: '',
    })
    // Fetch profile data
    try {
      const profileRes = await brandProfileAPI.get(brand.id)
      if (profileRes.data) {
        setEditForm(prev => ({
          ...prev,
          brand_description: profileRes.data.brand_description || '',
          core_products: profileRes.data.core_products || '',
          target_audience: profileRes.data.target_audience || '',
          key_selling_points: profileRes.data.key_selling_points || '',
        }))
      }
    } catch {
      // Profile may not exist yet — non-critical
    }
  }

  const handleSaveBrand = async () => {
    if (!editForm.name.trim()) return
    setSaving(true)
    try {
      const [brandResult, profileResult] = await Promise.allSettled([
        brandAPI.update(editingBrand.id, {
          name: editForm.name,
          website: editForm.website,
        }),
        brandProfileAPI.update(editingBrand.id, {
          brand_description: editForm.brand_description,
          core_products: editForm.core_products,
          target_audience: editForm.target_audience,
          key_selling_points: editForm.key_selling_points,
        }),
      ])
      if (brandResult.status === 'rejected' && brandResult.reason) {
        throw brandResult.reason
      }
      if (profileResult.status === 'rejected' && profileResult.reason) {
        setError(t('brands.updateFailed') + ' (profile)')
      }
      setEditingBrand(null)
      fetchBrands()
    } catch (error) {
      setError(error.data?.detail || t('brands.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBrand = async (id) => {
    if (!window.confirm(t('brands.deleteConfirm'))) return
    try {
      await brandAPI.delete(id)
      fetchBrands()
    } catch (error) {
      setError(error.data?.detail || t('brands.deleteFailed'))
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('brands.title')} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse space-y-3">
                <div className="h-5 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('brands.title')}
        description={t('brands.description')}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            {t('brands.addBrand')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {brands.length === 0 ? (
        <EmptyState
          icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          title={t('brands.noBrands')}
          description={t('brands.noBrandsDesc')}
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              {t('brands.addFirstBrand')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Card key={brand.id} hover onClick={() => handleEditBrand(brand)}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{brand.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 truncate">{brand.website}</p>
                  {brand.description && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{brand.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteBrand(brand.id)
                  }}
                  className="text-gray-400 hover:text-danger transition-colors p-1 -mr-1"
                  title={t('common.delete')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="bg-gray-100 rounded-full h-1.5 flex-1">
                  <div
                    className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${brand.visibility_score || 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{brand.visibility_score || 0}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Brand Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('brands.addNewBrand')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateBrand} loading={creating} disabled={!createForm.name.trim()}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('brands.brandName')}
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            placeholder={t('brands.brandNamePlaceholder')}
          />
          <Input
            label={t('brands.website')}
            type="url"
            value={createForm.website}
            onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
            placeholder="https://example.com"
          />
        </div>
      </Modal>

      {/* Edit Brand Drawer */}
      <Drawer
        isOpen={!!editingBrand}
        onClose={() => setEditingBrand(null)}
        title={t('brands.editBrand')}
        loading={saving}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingBrand(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveBrand} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Group 1: Basic Info */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{t('brands.basicInfo')}</p>
            <div className="space-y-4">
              <Input
                label={t('brands.brandName')}
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
              <Input
                label={t('brands.website')}
                type="url"
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
              />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Group 2: Brand Profile */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">{t('brands.brandProfile')}</p>
            <div className="space-y-4">
              <Textarea
                label={t('brands.brandDescription')}
                rows={3}
                value={editForm.brand_description}
                onChange={(e) => setEditForm({ ...editForm, brand_description: e.target.value })}
                placeholder={t('brands.brandDescriptionPlaceholder')}
              />
              <Input
                label={t('brands.coreProducts')}
                value={editForm.core_products}
                onChange={(e) => setEditForm({ ...editForm, core_products: e.target.value })}
                placeholder={t('brands.coreProductsPlaceholder')}
              />
              <Input
                label={t('brands.targetAudience')}
                value={editForm.target_audience}
                onChange={(e) => setEditForm({ ...editForm, target_audience: e.target.value })}
                placeholder={t('brands.targetAudiencePlaceholder')}
              />
              <Input
                label={t('brands.keySellingPoints')}
                value={editForm.key_selling_points}
                onChange={(e) => setEditForm({ ...editForm, key_selling_points: e.target.value })}
                placeholder={t('brands.keySellingPointsPlaceholder')}
              />
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
