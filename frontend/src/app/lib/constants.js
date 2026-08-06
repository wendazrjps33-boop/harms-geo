// Engine definitions — single source of truth for engine keys, labels, and colors.

export const ENGINE_VALUES = ['mimo', 'openai', 'claude', 'gemini', 'deepseek', 'qianwen']

// i18n label keys — use with t(ENGINE_I18N_KEYS[engineKey])
export const ENGINE_I18N_KEYS = {
  mimo: 'common.engineMimo',
  openai: 'common.engineOpenAI',
  claude: 'common.engineClaude',
  gemini: 'common.engineGemini',
  deepseek: 'common.engineDeepSeek',
  qianwen: 'common.engineQianwen',
}

// Chart colors — hex format, keyed by engine value
export const ENGINE_COLORS = {
  openai: '#10b981',
  claude: '#8b5cf6',
  gemini: '#f59e0b',
  deepseek: '#3b82f6',
  qianwen: '#ef4444',
  mimo: '#ec4899',
}

// Flat array of colors in canonical engine order (for bar charts)
export const ENGINE_COLOR_LIST = ENGINE_VALUES.map((v) => ENGINE_COLORS[v])

// Helper: get { border, bg } with custom alpha from a hex color
export function engineColorWithAlpha(hex, alpha = 0.1) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { border: hex, bg: `rgba(${r},${g},${b},${alpha})` }
}

// Dropdown options — call as getEngineOptions(t) inside a component
export function getEngineOptions(t) {
  return ENGINE_VALUES.map((v) => ({
    value: v,
    label: t(ENGINE_I18N_KEYS[v]),
  }))
}
