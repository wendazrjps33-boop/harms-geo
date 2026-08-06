'use client'

import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useI18n } from '../i18n/context'
import { ENGINE_COLOR_LIST } from '../lib/constants'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function EngineCompareChart({ reports }) {
  const { t } = useI18n()

  if (!reports || reports.length === 0) {
    return <p className="text-gray-500 text-sm">{t('common.noData')}</p>
  }

  const engineMap = {}
  for (const r of reports) {
    if (!engineMap[r.engine]) engineMap[r.engine] = []
    engineMap[r.engine].push(r.visibility_score)
  }

  const engines = Object.keys(engineMap)
  const avgScores = engines.map(engine => {
    const scores = engineMap[engine]
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
  })

  const data = {
    labels: engines,
    datasets: [
      {
        label: t('charts.avgVisibilityScore'),
        data: avgScores,
        backgroundColor: engines.map((_, i) => ENGINE_COLOR_LIST[i % ENGINE_COLOR_LIST.length]),
        borderRadius: 6,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: t('charts.engineComparison') },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: t('charts.avgScore') },
      },
    },
  }

  return (
    <div className="h-64">
      <Bar data={data} options={options} />
    </div>
  )
}
