'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { brandAPI, brandProfileAPI, crawlerAPI } from '@/services/api'
import { useI18n } from '../../../../i18n/context'

const INDUSTRY_OPTIONS = [
  { value: '科技', i18nKey: 'brandEdit.industryTech' },
  { value: '电商', i18nKey: 'brandEdit.industryEcommerce' },
  { value: '金融', i18nKey: 'brandEdit.industryFinance' },
  { value: '教育', i18nKey: 'brandEdit.industryEducation' },
  { value: '医疗', i18nKey: 'brandEdit.industryHealthcare' },
  { value: '制造', i18nKey: 'brandEdit.industryManufacturing' },
  { value: '其他', i18nKey: 'brandEdit.industryOther' },
]

export default function EditBrandPage() {
  const [activeTab, setActiveTab] = useState('basic')
  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [description, setDescription] = useState('')
  const [queries, setQueries] = useState('')
  const [brandDescription, setBrandDescription] = useState('')
  const [coreProducts, setCoreProducts] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [keySellingPoints, setKeySellingPoints] = useState('')
  const [industry, setIndustry] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [crawling, setCrawling] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const brandId = params.id
  const { t } = useI18n()

  useEffect(() => {
    fetchBrand()
    fetchBrandProfile()
  }, [brandId])

  const fetchBrand = async () => {
    try {
      const data = await brandAPI.getById(brandId)
      setName(data.name)
      setWebsite(data.website)
      setDescription(data.description || '')
      setQueries((data.queries || []).join(', '))
    } catch (error) {
      router.push('/brands')
    } finally {
      setLoading(false)
    }
  }

  const fetchBrandProfile = async () => {
    try {
      const response = await brandProfileAPI.get(brandId)
      if (response.data) {
        setBrandDescription(response.data.brand_description || '')
        setCoreProducts(response.data.core_products || '')
        setTargetAudience(response.data.target_audience || '')
        setKeySellingPoints(response.data.key_selling_points || '')
        setIndustry(response.data.industry || '')
      }
    } catch (error) {
      console.error('Failed to fetch brand profile:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      await brandAPI.update(brandId, {
        name,
        website,
        description: description || null,
        queries: queries.split(',').map(q => q.trim()).filter(Boolean),
      })
      router.push(`/brands/${brandId}`)
    } catch (err) {
      setError(err.data?.detail || t('brandEdit.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      await brandProfileAPI.update(brandId, {
        brand_description: brandDescription,
        core_products: coreProducts,
        target_audience: targetAudience,
        key_selling_points: keySellingPoints || undefined,
        industry: industry || undefined,
      })
      alert(t('brandEdit.profileSaved'))
    } catch (err) {
      setError(err.data?.detail || t('brandEdit.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleCrawlWebsite = async () => {
    setCrawling(true)
    try {
      const response = await crawlerAPI.analyze({
        brand_id: parseInt(brandId),
        url: website,
      })
      if (response.data.brand_info) {
        const info = response.data.brand_info
        if (info.description && !brandDescription) {
          setBrandDescription(info.description)
        }
      }
      alert(t('brandEdit.crawlSuccess'))
      await fetchBrandProfile()
    } catch (err) {
      console.error('Failed to crawl website:', err)
      alert(t('brandEdit.crawlFailed') + (err.data?.detail?.message || err.message))
    } finally {
      setCrawling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.push(`/brands/${brandId}`)} className="text-brand-600 hover:text-brand-800 text-sm font-medium">
          ← {t('common.back')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'basic'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('brandEdit.basicInfo')}
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'profile'
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('brandEdit.brandProfile')}
            </button>
          </nav>
        </div>

        {error && (
          <div className="bg-danger-light border border-danger/40 text-danger-dark px-4 py-3 mx-6 mt-4 rounded">
            {error}
          </div>
        )}

        {activeTab === 'basic' && (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('brandEdit.title')}</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('brands.brandName')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('brands.website')}</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('brands.descriptionLabel')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('brands.queries')}</label>
                <input
                  type="text"
                  value={queries}
                  onChange={(e) => setQueries(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                  placeholder={t('brands.queriesPlaceholder')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? t('brandEdit.saving') : t('brandEdit.saveChanges')}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/brands/${brandId}`)}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{t('brandEdit.brandProfile')}</h1>
              <button
                onClick={handleCrawlWebsite}
                disabled={crawling}
                className="px-4 py-2 border border-brand-300 text-brand-600 rounded-lg hover:bg-brand-50 disabled:opacity-50"
              >
                {crawling ? t('brandEdit.crawling') : t('brandEdit.crawlWebsite')}
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('brandEdit.brandDescription')} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={brandDescription}
                  onChange={(e) => setBrandDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                  rows="3"
                  maxLength={500}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{brandDescription.length}{t('brandEdit.charCount', { max: 500 })}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('brandEdit.coreProducts')} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={coreProducts}
                  onChange={(e) => setCoreProducts(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                  rows="2"
                  maxLength={300}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{coreProducts.length}{t('brandEdit.charCount', { max: 300 })}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('brandEdit.targetAudience')} <span className="text-danger">*</span>
                </label>
                <textarea
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                  rows="2"
                  maxLength={200}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">{targetAudience.length}{t('brandEdit.charCount', { max: 200 })}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('brandEdit.keySellingPoints')}</label>
                <textarea
                  value={keySellingPoints}
                  onChange={(e) => setKeySellingPoints(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                  rows="2"
                  maxLength={300}
                />
                <p className="text-xs text-gray-500 mt-1">{keySellingPoints.length}{t('brandEdit.charCount', { max: 300 })}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('brandEdit.industry')}</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">{t('brandEdit.selectIndustry')}</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.i18nKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? t('brandEdit.saving') : t('brandEdit.saveProfile')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
