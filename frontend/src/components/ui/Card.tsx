'use client';

import { cn } from '@/lib/cn';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: boolean;
}

export default function Card({
  children,
  className,
  hover = false,
  padding = true,
  onClick,
  ...props
}: CardProps) {
  const isInteractive = hover || onClick;

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
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}

interface CardSubComponentProps {
  children: ReactNode;
  className?: string;
}

Card.Header = function CardHeader({ children, className }: CardSubComponentProps) {
  return (
    <div className={cn('flex items-center justify-between pb-3 border-b border-gray-100', className)}>
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className }: CardSubComponentProps) {
  return (
    <h3 className={cn('text-sm font-semibold text-gray-900', className)}>
      {children}
    </h3>
  );
};

Card.Content = function CardContent({ children, className }: CardSubComponentProps) {
  return (
    <div className={cn('pt-3', className)}>
      {children}
    </div>
  );
};
