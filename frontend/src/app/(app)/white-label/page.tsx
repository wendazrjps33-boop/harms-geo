'use client'

import { useState, useEffect, useRef } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Skeleton from '@/components/ui/Skeleton'
import { useI18n } from '../../i18n/context'
import { brandAPI } from '@/services/api'


export default function WhiteLabelPage() {
  const { t } = useI18n()
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [logoInfo, setLogoInfo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // 加载品牌列表
      const brandsRes = await brandAPI.getAll()
      setBrands(brandsRes.data || [])

      // 加载 Logo 信息
      const logoRes = await fetch('/api/white-label/logo', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      if (logoRes.ok) {
        const logoData = await logoRes.json()
        setLogoInfo(logoData.data)
      }
    } catch {
      setError(t('whiteLabel.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // 验证文件类型
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setError(t('whiteLabel.invalidFileType'))
      return
    }

    // 验证文件大小
    if (file.size > 2 * 1024 * 1024) {
      setError(t('whiteLabel.fileTooLarge'))
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/white-label/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Upload failed')
      }

      const data = await response.json()
      setLogoInfo({ has_logo: true, url: data.data.url })
    } catch (err) {
      setError(err.message || t('whiteLabel.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteLogo = async () => {
    if (!window.confirm(t('whiteLabel.deleteConfirm'))) return

    try {
      const response = await fetch('/api/white-label/logo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (response.ok) {
        setLogoInfo({ has_logo: false, url: null })
      }
    } catch {
      setError(t('whiteLabel.deleteFailed'))
    }
  }

  const handleGenerateReport = async (brandId, brandName) => {
    setGenerating(brandId)
    try {
      const response = await fetch(`/api/white-label/report/${brandId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Generation failed')
      }

      // 下载 PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `brand_report_${brandName}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err.message || t('whiteLabel.generateFailed'))
    } finally {
      setGenerating(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('whiteLabel.title')} />
        <Skeleton count={3} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('whiteLabel.title')}
        description={t('whiteLabel.description')}
      />

      {error && (
        <div className="mb-4 p-3 bg-danger-light border border-danger/20 text-danger-dark text-sm rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError('')} className="text-danger-dark/60 hover:text-danger-dark">✕</button>
        </div>
      )}

      {/* Logo 上传区域 */}
      <Card className="mb-6">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('whiteLabel.logoSection')}</h3>

          <div className="flex items-start gap-6">
            {/* Logo 预览 */}
            <div className="w-32 h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
              {logoInfo?.has_logo ? (
                <img
                  src={logoInfo.url}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs">{t('whiteLabel.noLogo')}</p>
                </div>
              )}
            </div>

            {/* 上传控件 */}
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-4">
                {t('whiteLabel.logoDescription')}
              </p>
              <ul className="text-sm text-gray-500 mb-4 space-y-1">
                <li>• {t('whiteLabel.logoFormats')}</li>
                <li>• {t('whiteLabel.logoMaxSize')}</li>
                <li>• {t('whiteLabel.logoRecommend')}</li>
              </ul>

              <div className="flex gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept=".png,.jpg,.jpeg,.svg"
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploading}
                >
                  {logoInfo?.has_logo ? t('whiteLabel.replaceLogo') : t('whiteLabel.uploadLogo')}
                </Button>
                {logoInfo?.has_logo && (
                  <Button
                    variant="danger"
                    onClick={handleDeleteLogo}
                  >
                    {t('whiteLabel.deleteLogo')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 报告生成区域 */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('whiteLabel.reportSection')}</h3>

          {brands.length === 0 ? (
            <p className="text-gray-500">{t('whiteLabel.noBrands')}</p>
          ) : (
            <div className="space-y-4">
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{brand.name}</p>
                    <p className="text-sm text-gray-500">{brand.website || t('whiteLabel.noWebsite')}</p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => handleGenerateReport(brand.id, brand.name)}
                    loading={generating === brand.id}
                  >
                    {t('whiteLabel.generateReport')}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {logoInfo?.has_logo && (
            <div className="mt-4 p-3 bg-success-light border border-success/20 rounded-lg">
              <p className="text-sm text-success-dark">
                ✓ {t('whiteLabel.logoActive')}
              </p>
            </div>
          )}

          {!logoInfo?.has_logo && (
            <div className="mt-4 p-3 bg-warning-light border border-warning/20 rounded-lg">
              <p className="text-sm text-warning-dark">
                ⚠ {t('whiteLabel.logoInactive')}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
