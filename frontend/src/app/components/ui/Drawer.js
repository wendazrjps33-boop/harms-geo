'use client'

import { useEffect, useState, useRef } from 'react'
import { cn } from '../../lib/cn'

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  footer,
  side = 'right',
  width = '30rem',
  loading = false,
}) {
  const [mounted, setMounted] = useState(false)
  const rafId = useRef(null)
  const closingRef = useRef(false)
  const drawerRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
      if (isOpen) {
        previousFocusRef.current?.focus()
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusable = drawerRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // ARCH-8: cancel pending rAF on cleanup
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      closingRef.current = false
      rafId.current = requestAnimationFrame(() => {
        setMounted(true)
        rafId.current = null
      })
    } else {
      closingRef.current = true
      setMounted(false)
    }
  }, [isOpen])

  const slideFrom = side === 'right' ? '100%' : '-100%'
  const translateX = mounted
    ? 'translateX(0)'
    : `translateX(${slideFrom})`

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ pointerEvents: isOpen || mounted ? 'auto' : 'none' }}
    >
      {/* Overlay — QA-9: no pointer events during close */}
      <div
        className={cn(
          'fixed inset-0 bg-black/40 transition-opacity duration-200',
          mounted ? 'opacity-100' : 'opacity-0'
        )}
        style={{ pointerEvents: closingRef.current ? 'none' : 'auto' }}
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'fixed top-0 bottom-0 bg-white shadow-modal flex flex-col transition-transform duration-200 ease-out',
          side === 'right' ? 'right-0' : 'left-0'
        )}
        style={{ width, transform: translateX }}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            {loading
              ? <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg opacity-75 cursor-not-allowed" disabled>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {loading}
                </button>
              : footer
            }
          </div>
        )}
      </div>
    </div>
  )
}
