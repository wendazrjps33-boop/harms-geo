'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { useI18n } from '../../../i18n/context'
import { brandAPI, competitorAPI } from '@/services/api'

export default function CompetitorsPage() {
  const { t } = useI18n()
  const router = useRouter()

  const [brands, setBrands] = useState([])
  const [selectedBrand, setSelectedBrand] = useState('')
  const [competitors, setCompetitors] = useState([])
  const [availableBrands, setAvailableBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add competitor modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchBrands()
  }, [])

  useEffect(() => {
    if (selectedBrand) {
      fetchCompetitors()
    }
  }, [selectedBrand])

  const fetchBrands = async () => {
    try {
      const data = await brandAPI.getAll()
      const brandList = Array.isArray(data) ? data : data.data || []
      setBrands(brandList)
      if (brandList.length > 0) {
        setSelectedBrand(String(brandList[0].id))
      }
    } catch {
      setError(t('brands.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchCompetitors = async () => {
    try {
      const [compRes, allBrandsRes] = await Promise.all([
        competitorAPI.list(selectedBrand),
        brandAPI.getAll(),
      ])
      const compList = Array.isArray(compRes) ? compRes : compRes.data || []
      const allBrands = Array.isArray(allBrandsRes) ? allBrandsRes : allBrandsRes.data || []
      setCompetitors(compList)
      const compIds = compList.map(c => c.id)
      setAvailableBrands(allBrands.filter(b => b.id !== parseInt(selectedBrand) && !compIds.includes(b.id)))
    } catch {
      setError(t('analytics.loadFailed'))
    }
  }

  const handleAddCompetitor = async () => {
    if (!selectedCompetitorId) return
    setAdding(true)
    try {
      await competitorAPI.add(selectedBrand, parseInt(selectedCompetitorId))
      setShowAddModal(false)
      setSelectedCompetitorId('')
      fetchCompetitors()
    } catch (err) {
      setError(err?.data?.detail || t('competitor.addFailed'))
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveCompetitor = async (competitorId) => {
    if (!window.confirm(t('competitor.confirmRemove'))) return
    try {
      await competitorAPI.remove(selectedBrand, competitorId)
      fetchCompetitors()
    } catch {
      setError(t('competitor.removeFailed'))
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('competitor.title')} />
        <Skeleton count={3} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('competitor.title')}
        description={t('competitor.description')}
        actions={
          <Button onClick={() => { setSelectedCompetitorId(''); setShowAddModal(true) }} disabled={!selectedBrand}>
            {t('competitor.addCompetitor')}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark" aria-label="Dismiss error">✕</button>
        </div>
      )}

      {/* Brand Selector */}
      <div className="mb-6">
        <Select
          aria-label={t('analytics.selectBrand')}
          options={brands.map(b => ({ value: String(b.id), label: b.name }))}
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          containerClassName="w-60"
        />
      </div>

      {/* Competitor List */}
      {competitors.length === 0 ? (
        <EmptyState
          icon={<svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
          title={t('competitor.noCompetitors')}
          description={t('competitor.noCompetitorsDesc')}
          action={
            <Button onClick={() => { setSelectedCompetitorId(''); setShowAddModal(true) }}>{t('competitor.addFirstCompetitor')}</Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map((comp) => (
            <Card key={comp.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{comp.name}</p>
                  <p className="text-xs text-gray-500">{comp.website}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="bg-gray-100 rounded-full h-1.5 flex-1 w-24">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full"
                        style={{ width: `${comp.visibility_score || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{comp.visibility_score || 0}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => router.push(`/brands/${comp.id}`)}>
                    {t('common.view')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleRemoveCompetitor(comp.id)}>
                    {t('competitor.removeCompetitor')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Competitor Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setSelectedCompetitorId(''); setShowAddModal(false) }}
        title={t('competitor.addCompetitor')}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setSelectedCompetitorId(''); setShowAddModal(false) }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddCompetitor} loading={adding} disabled={!selectedCompetitorId || adding}>
              {t('common.add')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {availableBrands.length === 0 ? (
            <p className="text-sm text-gray-500">{t('competitor.noAvailableBrands')}</p>
          ) : (
            <Select
              label={t('competitor.selectBrand')}
              options={[
                { value: '', label: t('competitor.selectBrand') },
                ...availableBrands.map(b => ({ value: String(b.id), label: `${b.name} (${b.website || '-'})` }))
              ]}
              value={selectedCompetitorId}
              onChange={(e) => setSelectedCompetitorId(e.target.value)}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
