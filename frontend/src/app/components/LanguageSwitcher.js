'use client'

import { useI18n } from '../i18n/context'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
      <button
        onClick={() => setLocale('en')}
        className={`px-3 py-1 text-sm rounded-md transition ${
          locale === 'en'
            ? 'bg-white text-brand-600 shadow-sm font-medium'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('zh')}
        className={`px-3 py-1 text-sm rounded-md transition ${
          locale === 'zh'
            ? 'bg-white text-brand-600 shadow-sm font-medium'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        中文
      </button>
    </div>
  )
}
