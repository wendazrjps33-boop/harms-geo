'use client'

import { useState } from 'react'
import { useI18n } from '../i18n/context'

export default function ScoringRules() {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()

  return (
    <div className="bg-white rounded-xl shadow p-6 mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900">{t('scoring.title')}</h2>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm text-gray-700">
          <p>{t('scoring.desc')}</p>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900 mb-1">{t('scoring.mentionedLabel')}</p>
            <p className="text-success-dark mb-1">{t('scoring.mentionedYes')}</p>
            <p className="text-danger">{t('scoring.mentionedNo')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-brand-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-0.5 rounded">60%</span>
                <span className="font-medium text-gray-900">{t('scoring.positionTitle')}</span>
              </div>
              <p className="text-gray-600 mb-3">{t('scoring.positionDesc')}</p>
              <div className="flex gap-1 items-end">
                {[100, 82, 67, 55, 45, 37, 30, 25, 20, 17].map((v, i) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div className="w-full bg-brand-400 rounded-t" style={{ height: `${v * 0.6}px` }}></div>
                    <span className="text-[10px] text-gray-500 mt-1">{i + 1}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-center">{t('scoring.positionAxis')}</p>
            </div>
            <div className="border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded">40%</span>
                <span className="font-medium text-gray-900">{t('scoring.wordCountTitle')}</span>
              </div>
              <p className="text-gray-600 mb-3">{t('scoring.wordCountDesc')}</p>
              <div className="flex gap-1 items-end">
                {[
                  { words: 50, score: 10 },
                  { words: 100, score: 20 },
                  { words: 200, score: 40 },
                  { words: 300, score: 60 },
                  { words: 400, score: 80 },
                  { words: 500, score: 100 },
                ].map((v, i) => (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div className="w-full bg-emerald-400 rounded-t" style={{ height: `${v.score * 0.6}px` }}></div>
                    <span className="text-[10px] text-gray-500 mt-1">{v.words}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1 text-center">{t('scoring.wordCountAxis')}</p>
            </div>
          </div>

          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
            <p className="font-medium text-brand-900 mb-1">{t('scoring.formulaTitle')}</p>
            <p className="font-mono text-brand-800 text-base">{t('scoring.formula')}</p>
            <p className="text-brand-700 mt-1">{t('scoring.cap')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
