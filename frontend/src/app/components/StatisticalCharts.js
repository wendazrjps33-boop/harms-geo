'use client'

import { Bar, Radar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { useI18n } from '../i18n/context'
import { ENGINE_COLORS, engineColorWithAlpha } from '../lib/constants'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

export function MentionRateChart({ engineSummary }) {
  const { t } = useI18n()
  if (!engineSummary || Object.keys(engineSummary).length === 0) return null

  const engines = Object.keys(engineSummary)
  const mentionRates = engines.map(e => engineSummary[e].mention_rate)
  const avgScores = engines.map(e => engineSummary[e].avg_score)

  const data = {
    labels: engines.map(e => e.charAt(0).toUpperCase() + e.slice(1)),
    datasets: [
      {
        label: t('charts.mentionRatePercent'),
        data: mentionRates,
        backgroundColor: engines.map(e => engineColorWithAlpha(ENGINE_COLORS[e] || '#9ca3af', 0.6).bg),
        borderColor: engines.map(e => ENGINE_COLORS[e] || '#9ca3af'),
        borderWidth: 1,
      },
      {
        label: t('charts.avgScore'),
        data: avgScores,
        backgroundColor: engines.map(e => engineColorWithAlpha(ENGINE_COLORS[e] || '#9ca3af', 0.3).bg),
        borderColor: engines.map(e => ENGINE_COLORS[e] || '#9ca3af'),
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('charts.enginePerformance'),
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  }

  return <Bar data={data} options={options} />
}

export function EngineConsistencyChart({ engineSummary }) {
  const { t } = useI18n()
  if (!engineSummary || Object.keys(engineSummary).length === 0) return null

  const engines = Object.keys(engineSummary)
  const mentionRates = engines.map(e => engineSummary[e].mention_rate)
  const avgScores = engines.map(e => engineSummary[e].avg_score)

  const data = {
    labels: engines.map(e => e.charAt(0).toUpperCase() + e.slice(1)),
    datasets: [
      {
        label: t('charts.mentionRate'),
        data: mentionRates,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgb(99, 102, 241)',
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(99, 102, 241)',
      },
      {
        label: t('charts.avgScore'),
        data: avgScores,
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: 'rgb(16, 185, 129)',
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(16, 185, 129)',
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t('charts.engineConsistency'),
      },
    },
    scales: {
      r: {
        angleLines: {
          display: false,
        },
        suggestedMin: 0,
        suggestedMax: 100,
      },
    },
  }

  return <Radar data={data} options={options} />
}

export function QueryHeatmap({ results }) {
  const { t } = useI18n()
  if (!results || results.length === 0) return null

  const queryMap = {}
  results.forEach(r => {
    if (!queryMap[r.query]) queryMap[r.query] = {}
    queryMap[r.query][r.engine] = r.mention_rate
  })

  const queries = Object.keys(queryMap)
  const engines = [...new Set(results.map(r => r.engine))]

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-500">{t('content.type')}</th>
            {engines.map(engine => (
              <th key={engine} className="px-3 py-2 text-center font-medium text-gray-500">
                {engine.charAt(0).toUpperCase() + engine.slice(1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {queries.map(query => (
            <tr key={query} className="border-t border-gray-100">
              <td className="px-3 py-2 text-gray-900 max-w-xs truncate" title={query}>
                {query.length > 30 ? query.substring(0, 30) + '...' : query}
              </td>
              {engines.map(engine => {
                const rate = queryMap[query][engine]
                const bgColor = rate === undefined
                  ? 'bg-gray-50'
                  : rate >= 80
                    ? 'bg-success-light text-success-dark'
                    : rate >= 50
                      ? 'bg-amber-100 text-amber-800'
                      : rate > 0
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-danger-light text-danger-dark'
                return (
                  <td key={engine} className={`px-3 py-2 text-center ${bgColor}`}>
                    {rate !== undefined ? `${rate}%` : '-'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
