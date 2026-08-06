'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { useI18n } from '../i18n/context'
import { ENGINE_COLORS, engineColorWithAlpha } from '../lib/constants'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function VisibilityChart({ reports }) {
  const { t } = useI18n()

  if (!reports || reports.length === 0) {
    return <p className="text-gray-500 text-sm">{t('common.noData')}</p>
  }

  const sorted = [...reports].sort((a, b) => new Date(a.checked_at) - new Date(b.checked_at))

  const engines = [...new Set(sorted.map(r => r.engine))]

  const labels = sorted
    .filter(r => r.engine === engines[0])
    .map(r => {
      const d = new Date(r.checked_at)
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    })

  const datasets = engines.map(engine => {
    const engineReports = sorted.filter(r => r.engine === engine)
    const color = engineColorWithAlpha(ENGINE_COLORS[engine] || '#6366f1', 0.1)
    return {
      label: engine,
      data: engineReports.map(r => r.visibility_score),
      borderColor: color.border,
      backgroundColor: color.bg,
      tension: 0.3,
      fill: true,
    }
  })

  const data = { labels, datasets }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: t('charts.visibilityTrend') },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: t('charts.score') },
      },
      x: {
        title: { display: true, text: t('charts.date') },
      },
    },
  }

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  )
}
