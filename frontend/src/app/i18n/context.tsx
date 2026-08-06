'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import en from './en.json'
import zh from './zh.json'

const translations = { en, zh }

const I18nContext = createContext({} as any)

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState('en')

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const t = (key, vars) => {
    const keys = key.split('.')
    let value = translations[locale]
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        return key
      }
    }
    if (!value) return key
    if (!vars) return value
    return Object.entries(vars).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
      value
    )
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
