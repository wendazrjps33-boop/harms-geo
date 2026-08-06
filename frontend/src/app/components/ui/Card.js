import { cn } from '../../lib/cn'

export default function Card({ children, className, hover = false, padding = true, onClick, ...props }) {
  const isInteractive = hover || onClick
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-card',
        hover && 'transition-all duration-200 hover:border-gray-300 hover:shadow-card-hover cursor-pointer',
        padding && 'p-5',
        className
      )}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(e) } } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className }) {
  return (
    <div className={cn('flex items-center justify-between pb-3 border-b border-gray-100', className)}>
      {children}
    </div>
  )
}

Card.Title = function CardTitle({ children, className }) {
  return (
    <h3 className={cn('text-sm font-semibold text-gray-900', className)}>
      {children}
    </h3>
  )
}

Card.Content = function CardContent({ children, className }) {
  return (
    <div className={cn('pt-3', className)}>
      {children}
    </div>
  )
}
