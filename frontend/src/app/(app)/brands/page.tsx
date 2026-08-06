'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Drawer from '@/components/ui/Drawer';
import { useI18n } from '@/app/i18n/context';
import { brandAPI, brandProfileAPI } from '@/services/api';
import type { Brand, BrandCreate, BrandProfile } from '@/types/api';

export default function BrandsPage() {
  const { t } = useI18n();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<BrandCreate>({
    name: '',
    website: '',
    industry: '',
  });
  const [creating, setCreating] = useState(false);

  // Edit drawer
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [editForm, setEditForm] = useState<Partial<Brand>>({});
  const [brandProfile, setBrandProfile] = useState<Partial<BrandProfile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      const response = await brandAPI.getAll();
      setBrands(response.data || []);
    } catch {
      setError(t('brands.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.name) return;

    setCreating(true);
    try {
      await brandAPI.create(createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', website: '', industry: '' });
      await loadBrands();
    } catch {
      setError(t('brands.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (brand: Brand) => {
    setEditingBrand(brand);
    setEditForm({ name: brand.name, website: brand.website, industry: brand.industry });

    try {
      const response = await brandProfileAPI.get(brand.id);
      setBrandProfile(response.data || {});
    } catch {
      setBrandProfile({});
    }
  };

  const handleSave = async () => {
    if (!editingBrand) return;

    setSaving(true);
    try {
      await brandAPI.update(editingBrand.id, editForm);
      if (brandProfile.description || brandProfile.core_products) {
        await brandProfileAPI.update(editingBrand.id, brandProfile);
      }
      setEditingBrand(null);
      await loadBrands();
    } catch {
      setError(t('brands.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (brandId: number) => {
    if (!window.confirm(t('brands.deleteConfirm'))) return;

    try {
      await brandAPI.delete(brandId);
      await loadBrands();
    } catch {
      setError(t('brands.deleteFailed'));
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title={t('brands.title')} />
        <Skeleton count={3} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('brands.title')}
        description={t('brands.description')}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            {t('brands.createBrand')}
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

      {brands.length === 0 ? (
        <EmptyState
          icon="🏢"
          title={t('brands.emptyTitle')}
          description={t('brands.emptyDescription')}
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              {t('brands.createFirst')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <Card key={brand.id} hover onClick={() => handleEdit(brand)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{brand.name}</h3>
                  {brand.website && (
                    <p className="text-sm text-gray-500 mt-1">{brand.website}</p>
                  )}
                  {brand.industry && (
                    <p className="text-xs text-gray-400 mt-1">{brand.industry}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(brand.id);
                  }}
                  className="text-gray-400 hover:text-danger transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('brands.createTitle')}
      >
        <div className="space-y-4">
          <Input
            label={t('brands.nameLabel')}
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            placeholder={t('brands.namePlaceholder')}
            required
          />
          <Input
            label={t('brands.websiteLabel')}
            value={createForm.website || ''}
            onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
            placeholder={t('brands.websitePlaceholder')}
          />
          <Input
            label={t('brands.industryLabel')}
            value={createForm.industry || ''}
            onChange={(e) => setCreateForm({ ...createForm, industry: e.target.value })}
            placeholder={t('brands.industryPlaceholder')}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              {t('brands.create')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Drawer */}
      <Drawer
        isOpen={!!editingBrand}
        onClose={() => setEditingBrand(null)}
        title={t('brands.editTitle')}
        loading={saving ? t('common.saving') : false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingBrand(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {editingBrand && (
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">
                {t('brands.basicInfo')}
              </h4>
              <div className="space-y-3">
                <Input
                  label={t('brands.nameLabel')}
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
                <Input
                  label={t('brands.websiteLabel')}
                  value={editForm.website || ''}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                />
                <Input
                  label={t('brands.industryLabel')}
                  value={editForm.industry || ''}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Brand Profile */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">
                {t('brands.brandProfile')}
              </h4>
              <div className="space-y-3">
                <Textarea
                  label={t('brands.descriptionLabel')}
                  value={brandProfile.description || ''}
                  onChange={(e) =>
                    setBrandProfile({ ...brandProfile, description: e.target.value })
                  }
                  rows={3}
                />
                <Textarea
                  label={t('brands.coreProductsLabel')}
                  value={brandProfile.core_products || ''}
                  onChange={(e) =>
                    setBrandProfile({ ...brandProfile, core_products: e.target.value })
                  }
                  rows={2}
                />
                <Textarea
                  label={t('brands.targetAudienceLabel')}
                  value={brandProfile.target_audience || ''}
                  onChange={(e) =>
                    setBrandProfile({ ...brandProfile, target_audience: e.target.value })
                  }
                  rows={2}
                />
                <Textarea
                  label={t('brands.keySellingPointsLabel')}
                  value={brandProfile.key_selling_points || ''}
                  onChange={(e) =>
                    setBrandProfile({
                      ...brandProfile,
                      key_selling_points: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
