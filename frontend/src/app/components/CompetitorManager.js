'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/context'
import { brandAPI, competitorAPI } from '../services/api'

export default function CompetitorManager({ brandId, onUpdate }) {
  const [competitors, setCompetitors] = useState([])
  const [availableBrands, setAvailableBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [adding, setAdding] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    fetchData()
  }, [brandId])

  const fetchData = async () => {
    try {
      const [competitorsData, brandsData] = await Promise.all([
        competitorAPI.list(brandId),
        brandAPI.getAll()
      ])
      setCompetitors(competitorsData)
      // Filter out current brand and already added competitors
      const competitorIds = competitorsData.map(c => c.id)
      const available = brandsData.filter(b => b.id !== parseInt(brandId) && !competitorIds.includes(b.id))
      setAvailableBrands(available)
    } catch (error) {
      console.error('Error fetching competitors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCompetitor = async () => {
    if (!selectedBrandId) return
    setAdding(true)
    try {
      await competitorAPI.add(brandId, parseInt(selectedBrandId))
      setShowAddDialog(false)
      setSelectedBrandId('')
      fetchData()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error adding competitor:', error)
      alert(error.data?.detail || t('competitor.addFailed'))
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveCompetitor = async (competitorId) => {
    if (!confirm(t('competitor.confirmRemove'))) return
    try {
      await competitorAPI.remove(brandId, competitorId)
      fetchData()
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error removing competitor:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{t('competitor.title')}</h2>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 text-sm"
        >
          {t('competitor.addCompetitor')}
        </button>
      </div>

      {competitors.length === 0 ? (
        <p className="text-gray-500 text-center py-4">{t('competitor.noCompetitors')}</p>
      ) : (
        <div className="space-y-3">
          {competitors.map((competitor) => (
            <div
              key={competitor.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div>
                <h3 className="font-medium text-gray-900">{competitor.name}</h3>
                <p className="text-sm text-gray-500">{competitor.website}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">{t('competitor.visibilityScore')}</p>
                  <p className="font-semibold text-brand-600">{competitor.visibility_score}</p>
                </div>
                <button
                  onClick={() => handleRemoveCompetitor(competitor.id)}
                  className="text-danger hover:text-danger-dark px-3 py-1 border border-danger/30 rounded-lg text-sm"
                >
                  {t('competitor.removeCompetitor')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Competitor Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{t('competitor.selectCompetitors')}</h3>

            {availableBrands.length === 0 ? (
              <p className="text-gray-500 mb-4">{t('competitor.noAvailableBrands')}</p>
            ) : (
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="">{t('competitor.selectBrand')}</option>
                {availableBrands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name} ({brand.website})
                  </option>
                ))}
              </select>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddDialog(false)
                  setSelectedBrandId('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddCompetitor}
                disabled={!selectedBrandId || adding}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {adding ? t('common.adding') : t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
