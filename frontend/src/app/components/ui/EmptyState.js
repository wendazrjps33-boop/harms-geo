import { cn } from '../../lib/cn'

export default function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      {icon && (
        <div className="text-4xl mb-4 text-gray-300">{icon}</div>
      )}
      <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 text-center max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
