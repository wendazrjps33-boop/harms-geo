'use client'

import Link from 'next/link'
import { useI18n } from './i18n/context'
import LanguageSwitcher from './components/LanguageSwitcher'

export default function Home() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {t('landing.title')}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            {t('landing.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/login"
              className="bg-brand-600 text-white px-8 py-3 rounded-lg hover:bg-brand-700 transition"
            >
              {t('landing.signIn')}
            </Link>
            <Link
              href="/register"
              className="bg-white text-brand-600 px-8 py-3 rounded-lg hover:bg-gray-50 transition"
            >
              {t('landing.signUp')}
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">{t('landing.feature1Title')}</h3>
            <p className="text-gray-600">{t('landing.feature1Desc')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">{t('landing.feature2Title')}</h3>
            <p className="text-gray-600">{t('landing.feature2Desc')}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">{t('landing.feature3Title')}</h3>
            <p className="text-gray-600">{t('landing.feature3Desc')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
