'use client'

import { useState, useRef, useCallback } from 'react'
import { useI18n } from '../i18n/context'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ImageUploadDialog({ isOpen, onClose, onInsert }) {
  const { t } = useI18n()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [altText, setAltText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const reset = () => {
    setFile(null)
    setPreview(null)
    setAltText('')
    setProgress(0)
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const validateFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return t('imageUpload.unsupportedFormat')
    }
    if (f.size > MAX_SIZE) {
      return t('imageUpload.fileTooLarge')
    }
    return null
  }

  const processFile = (f) => {
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setError('')
    setFile(f)
    setAltText(f.name.replace(/\.[^.]+$/, ''))

    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(f)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }, [processFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) processFile(f)
        break
      }
    }
  }, [processFile])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/upload/image')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      }

      const result = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText)
            if (xhr.status >= 200 && xhr.status < 300 && data.success) {
              resolve(data.data)
            } else {
              reject(new Error(data.detail || data.error || t('imageUpload.uploadFailed')))
            }
          } catch {
            reject(new Error(t('imageUpload.uploadFailed')))
          }
        }
        xhr.onerror = () => reject(new Error(t('imageUpload.networkError')))
        xhr.send(formData)
      })

      onInsert({ url: result.url, alt: altText })
      handleClose()
    } catch (err) {
      setError(err.message || t('imageUpload.uploadFailedRetry'))
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
    e.target.value = ''
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full" onPaste={handlePaste}>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">{t('imageUpload.title')}</h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-4xl mb-3">📁</div>
              <p className="text-gray-700 font-medium">{t('imageUpload.dragHere')}</p>
              <p className="text-gray-500 text-sm mt-1">{t('imageUpload.orClick')}</p>
              <p className="text-gray-400 text-xs mt-3">{t('imageUpload.supportedFormats')}</p>
              <p className="text-gray-400 text-xs mt-1">{t('imageUpload.pasteHint')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div>
              <div className="relative mb-4">
                <img
                  src={preview}
                  alt={t('imageUpload.preview')}
                  className="w-full max-h-64 object-contain rounded-lg bg-gray-100"
                />
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-opacity-70"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('imageUpload.altText')}
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder={t('imageUpload.altTextPlaceholder')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{file.name}</span>
                <span>{(file.size / 1024).toFixed(0)} KB</span>
              </div>

              {uploading && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-brand-600 h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    {t('imageUpload.uploading', { progress })}
                  </p>
                </div>
              )}

              {error && (
                <p className="text-danger text-sm mb-4">{error}</p>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={reset}
                  disabled={uploading}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('imageUpload.reselect')}
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {t('imageUpload.insertImage')}
                </button>
              </div>
            </div>
          )}

          {error && file && (
            <p className="text-danger text-sm mt-3">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
