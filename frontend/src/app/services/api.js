import { getToken, removeToken } from './auth'

let csrfToken = null
let csrfTokenExpiry = 0
let redirecting = false

async function getCsrfToken() {
  if (csrfToken && Date.now() < csrfTokenExpiry) return csrfToken

  try {
    const response = await fetch('/api/public/csrf-token', {
      method: 'GET',
      credentials: 'include',
    })
    const data = await response.json()
    csrfToken = data.csrf_token
    csrfTokenExpiry = Date.now() + 55 * 60 * 1000
    return csrfToken
  } catch (error) {
    csrfToken = null
    return null
  }
}

function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

async function request(url, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const method = options.method?.toUpperCase() || 'GET'
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrf = getCookie('csrf_token') || await getCsrfToken()
    if (csrf) {
      headers['X-CSRF-Token'] = csrf
    }
  }

  const response = await fetch(url, { ...options, headers, credentials: 'include' })

  if (response.status === 401) {
    removeToken()
    if (typeof window !== 'undefined' && !redirecting) {
      redirecting = true
      setTimeout(() => { redirecting = false }, 5000)
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const error = new Error('Request failed')
    error.status = response.status
    try {
      error.data = await response.json()
    } catch {}
    throw error
  }

  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return response
  return response.json()
}

export const authAPI = {
  login: (credentials) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  profile: () => request('/api/auth/profile'),
}

export const brandAPI = {
  getAll: () => request('/api/brands'),
  getById: (id) => request(`/api/brands/${id}`),
  create: (data) =>
    request('/api/brands', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) =>
    request(`/api/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/api/brands/${id}`, { method: 'DELETE' }),
  analytics: (id) => request(`/api/brands/${id}/analytics`),
  competitors: (id) => request(`/api/brands/${id}/competitors`),
}

export const competitorAPI = {
  add: (brandId, competitorId) =>
    request(`/api/brands/${brandId}/competitors`, {
      method: 'POST',
      body: JSON.stringify({ competitor_id: competitorId })
    }),
  remove: (brandId, competitorId) =>
    request(`/api/brands/${brandId}/competitors/${competitorId}`, { method: 'DELETE' }),
  list: (brandId) => request(`/api/brands/${brandId}/competitors`),
  startComparison: (brandId, data) =>
    request(`/api/competitor-analysis/brand/${brandId}/compare`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getResults: (brandId) =>
    request(`/api/competitor-analysis/brand/${brandId}/results`),
  getHistory: (brandId) =>
    request(`/api/competitor-analysis/brand/${brandId}/history`),
}

export const reportAPI = {
  check: (data) =>
    request('/api/reports/check', { method: 'POST', body: JSON.stringify(data) }),
  checkAll: (brandId) =>
    request(`/api/reports/brand/${brandId}/check-all`, { method: 'POST' }),
  getByBrand: (brandId) => request(`/api/reports/brand/${brandId}`),
  getLatest: (brandId) => request(`/api/reports/brand/${brandId}/latest`),
  export: async (brandId, format = 'csv', lang = 'en') => {
    const token = getToken()
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const csrf = getCookie('csrf_token') || await getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf

    const response = await fetch(`/api/reports/brand/${brandId}/export?format=${format}&lang=${lang}`, {
      headers,
      credentials: 'include',
    })

    if (response.status === 401) {
      removeToken()
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }
    if (!response.ok) throw new Error('Export failed')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const disposition = response.headers.get('Content-Disposition') || ''
    const rfc5987 = disposition.match(/filename\*=UTF-8''(.+)/)
    const simple = disposition.match(/filename="(.+)"/)
    const filename = rfc5987 ? decodeURIComponent(rfc5987[1]) : simple?.[1] || `report.${format}`
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export const analysisAPI = {
  startRun: (brandId, data) =>
    request(`/api/analysis/brand/${brandId}/run`, { method: 'POST', body: JSON.stringify(data) }),
  getRuns: (brandId, fetchOptions) => request(`/api/analysis/brand/${brandId}/runs`, fetchOptions),
  getRunDetail: (runId) => request(`/api/analysis/runs/${runId}`),
  getRunSummary: (runId) => request(`/api/analysis/runs/${runId}/summary`),
  compareRuns: (brandId, runIds) =>
    request(`/api/analysis/brand/${brandId}/compare?run_ids=${runIds.join(',')}`),
  exportAnalysis: async (brandId, runId, format = 'csv', lang = 'en') => {
    const token = getToken()
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const csrf = getCookie('csrf_token') || await getCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf

    const response = await fetch(`/api/analysis/brand/${brandId}/runs/${runId}/export?format=${format}&lang=${lang}`, {
      headers,
      credentials: 'include',
    })

    if (response.status === 401) {
      removeToken()
      window.location.href = '/login'
      throw new Error('Unauthorized')
    }
    if (!response.ok) throw new Error('Export failed')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const disposition = response.headers.get('Content-Disposition') || ''
    const rfc5987 = disposition.match(/filename\*=UTF-8''(.+)/)
    const simple = disposition.match(/filename="(.+)"/)
    const filename = rfc5987 ? decodeURIComponent(rfc5987[1]) : simple?.[1] || `analysis.${format}`
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

export const subscriptionAPI = {
  getPlans: () => request('/api/subscription/plans'),
  getCurrent: () => request('/api/subscription/current'),
  createCheckout: (data) =>
    request('/api/subscription/checkout', { method: 'POST', body: JSON.stringify(data) }),
  cancel: () => request('/api/subscription/cancel', { method: 'POST' }),
  reactivate: () => request('/api/subscription/reactivate', { method: 'POST' }),
  changePlan: (data) =>
    request('/api/subscription/change-plan', { method: 'POST', body: JSON.stringify(data) }),
}

export const usageAPI = {
  getCurrent: () => request('/api/usage/current'),
  getHistory: (dimension, months) => {
    const params = new URLSearchParams()
    if (dimension) params.append('dimension', dimension)
    if (months) params.append('months', months)
    return request(`/api/usage/history?${params.toString()}`)
  },
}

export const contentAPI = {
  generate: (data) =>
    request('/api/content/generate', { method: 'POST', body: JSON.stringify(data) }),
  list: (params, fetchOptions) => {
    const searchParams = new URLSearchParams()
    if (params?.brand_id) searchParams.append('brand_id', params.brand_id)
    if (params?.content_type) searchParams.append('content_type', params.content_type)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.cursor) searchParams.append('cursor', params.cursor)
    if (params?.limit) searchParams.append('limit', params.limit)
    return request(`/api/content?${searchParams.toString()}`, fetchOptions)
  },
  getStats: (brandId) => {
    const params = brandId ? `?brand_id=${brandId}` : ''
    return request(`/api/content/stats${params}`)
  },
  getById: (id, fetchOptions) => request(`/api/content/${id}`, fetchOptions),
  update: (id, data) =>
    request(`/api/content/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  regenerate: (id, data) =>
    request(`/api/content/${id}/regenerate`, { method: 'POST', body: JSON.stringify(data) }),
  confirm: (id) => request(`/api/content/${id}/confirm`, { method: 'POST' }),
  publish: (id, data) =>
    request(`/api/content/${id}/publish`, { method: 'POST', body: JSON.stringify(data) }),
  getAdoption: (id) => request(`/api/content/${id}/adoption`),
}

export const brandProfileAPI = {
  get: (brandId) => request(`/api/brands/${brandId}/profile`),
  update: (brandId, data) =>
    request(`/api/brands/${brandId}/profile`, { method: 'PUT', body: JSON.stringify(data) }),
}

export const crawlerAPI = {
  analyze: (data) =>
    request('/api/crawler/analyze', { method: 'POST', body: JSON.stringify(data) }),
}

export const teamAPI = {
  getMembers: () => request('/api/team/members'),
  invite: (data) =>
    request('/api/team/invite', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (memberId, data) =>
    request(`/api/team/${memberId}/role`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (memberId) =>
    request(`/api/team/${memberId}`, { method: 'DELETE' }),
}

export const billingAPI = {
  getHistory: () => request('/api/billing/history'),
  getInvoice: (invoiceId) => request(`/api/billing/invoices/${invoiceId}`),
  downloadInvoice: (invoiceId) => request(`/api/billing/invoices/${invoiceId}/download`),
}

export const apiKeyAPI = {
  list: () => request('/api/api-keys'),
  create: (data) =>
    request('/api/api-keys', { method: 'POST', body: JSON.stringify(data) }),
  revoke: (keyId) =>
    request(`/api/api-keys/${keyId}`, { method: 'DELETE' }),
  rotate: (keyId) =>
    request(`/api/api-keys/${keyId}/rotate`, { method: 'POST' }),
}
