'use client'

import { cn } from '../../lib/cn'

export default function Textarea({
  label,
  error,
  className,
  containerClassName,
  ...props
}) {
  return (
    <div className={containerClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors',
          error && 'border-danger focus:ring-danger/20 focus:border-danger',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-danger">{error}</p>
      )}
    </div>
  )
}
