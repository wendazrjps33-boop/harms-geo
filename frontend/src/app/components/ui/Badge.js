import { cn } from '../../lib/cn'

const variants = {
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  danger: 'bg-danger-light text-danger-dark',
  info: 'bg-brand-50 text-brand-700',
  neutral: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-50 text-purple-700',
}

export default function Badge({ children, variant = 'neutral', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
