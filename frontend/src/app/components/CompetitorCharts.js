'use client'

import { useI18n } from '../i18n/context'

export default function CompetitorCharts({ results }) {
  const { t } = useI18n()

  if (!results) return null

  const { brand_name, main_brand, competitors, gaps } = results

  return (
    <div className="space-y-6">
      {/* Overall Comparison */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">{t('competitor.overallComparison')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mention Rate */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('competitor.mentionRate')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{brand_name}</span>
                <span className="text-brand-600 font-bold">{main_brand.mention_rate}%</span>
              </div>
              {Object.entries(competitors).map(([id, comp]) => (
                <div key={id} className="flex justify-between items-center">
                  <span className="text-gray-600">{comp.name}</span>
                  <span className={`font-bold ${
                    gaps[id]?.mention_rate_gap > 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {comp.mention_rate}%
                    <span className="text-xs ml-1">
                      ({gaps[id]?.mention_rate_gap > 0 ? '+' : ''}{gaps[id]?.mention_rate_gap})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Average Score */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('competitor.averageScore')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{brand_name}</span>
                <span className="text-brand-600 font-bold">{main_brand.avg_score}</span>
              </div>
              {Object.entries(competitors).map(([id, comp]) => (
                <div key={id} className="flex justify-between items-center">
                  <span className="text-gray-600">{comp.name}</span>
                  <span className={`font-bold ${
                    gaps[id]?.score_gap > 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {comp.avg_score}
                    <span className="text-xs ml-1">
                      ({gaps[id]?.score_gap > 0 ? '+' : ''}{gaps[id]?.score_gap})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Average Position */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{t('competitor.averagePosition')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{brand_name}</span>
                <span className="text-brand-600 font-bold">
                  {main_brand.avg_position || '-'}
                </span>
              </div>
              {Object.entries(competitors).map(([id, comp]) => (
                <div key={id} className="flex justify-between items-center">
                  <span className="text-gray-600">{comp.name}</span>
                  <span className="font-bold">
                    {comp.avg_position || '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Engine Comparison */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">{t('competitor.engineComparison')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">{t('competitor.engine')}</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">{brand_name}</th>
                {Object.values(competitors).map((comp) => (
                  <th key={comp.name} className="text-center py-3 px-4 font-medium text-gray-700">
                    {comp.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(main_brand.engine_summary || {}).map((engine) => (
                <tr key={engine} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium capitalize">{engine}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-brand-600 font-bold">
                      {main_brand.engine_summary[engine]?.mention_rate || 0}%
                    </span>
                  </td>
                  {Object.values(competitors).map((comp) => (
                    <td key={comp.name} className="py-3 px-4 text-center">
                      <span className="font-bold">
                        {comp.engine_summary?.[engine]?.mention_rate || 0}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gap Analysis */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">{t('competitor.gapAnalysis')}</h2>
        <div className="space-y-4">
          {Object.entries(gaps).map(([compId, gap]) => {
            const comp = competitors[compId]
            if (!comp) return null
            return (
              <div key={compId} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">{brand_name} {t('competitor.vs')} {comp.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    gap.overall_status === 'leading' ? 'bg-success-light text-success-dark' :
                    gap.overall_status === 'lagging' ? 'bg-danger-light text-danger-dark' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {t(`competitor.${gap.overall_status}`)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('competitor.mentionRateGap')}</p>
                    <p className={`text-lg font-bold ${
                      gap.mention_rate_gap > 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {gap.mention_rate_gap > 0 ? '+' : ''}{gap.mention_rate_gap}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('competitor.scoreGap')}</p>
                    <p className={`text-lg font-bold ${
                      gap.score_gap > 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {gap.score_gap > 0 ? '+' : ''}{gap.score_gap}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('competitor.positionGap')}</p>
                    <p className="text-lg font-bold">
                      {gap.position_gap !== null ? (
                        <span className={gap.position_gap < 0 ? 'text-success' : 'text-danger'}>
                          {gap.position_gap > 0 ? '+' : ''}{gap.position_gap}
                        </span>
                      ) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Query Breakdown */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">{t('competitor.queryBreakdown')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">{t('competitor.query')}</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">{brand_name}</th>
                {Object.values(competitors).map((comp) => (
                  <th key={comp.name} className="text-center py-3 px-4 font-medium text-gray-700">
                    {comp.name}
                  </th>
                ))}
                <th className="text-center py-3 px-4 font-medium text-gray-700">{t('competitor.status')}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(main_brand.query_breakdown || {}).map(([query, data]) => (
                <tr key={query} className="border-b border-gray-100">
                  <td className="py-3 px-4 max-w-xs truncate" title={query}>{query}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-brand-600 font-bold">{data.mention_rate}%</span>
                  </td>
                  {Object.entries(competitors).map(([compId, comp]) => {
                    const compData = comp.query_breakdown?.[query]
                    const gap = gaps[compId]?.query_gaps?.[query]
                    return (
                      <td key={compId} className="py-3 px-4 text-center">
                        <span className={`font-bold ${
                          gap?.status === 'leading' ? 'text-success' :
                          gap?.status === 'lagging' ? 'text-danger' : 'text-gray-600'
                        }`}>
                          {compData?.mention_rate || 0}%
                        </span>
                      </td>
                    )
                  })}
                  <td className="py-3 px-4 text-center">
                    {Object.entries(competitors).map(([compId]) => {
                      const gap = gaps[compId]?.query_gaps?.[query]
                      if (!gap) return null
                      return (
                        <span key={compId} className={`inline-block px-2 py-1 rounded text-xs mr-1 ${
                          gap.status === 'leading' ? 'bg-success-light text-success-dark' :
                          gap.status === 'lagging' ? 'bg-danger-light text-danger-dark' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {t(`competitor.${gap.status}`)}
                        </span>
                      )
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
