// Shared UI primitives used across all pages.

import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 shadow-sm">
      {Icon && (
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
      <p className="font-display text-xl font-bold text-white">{value}</p>
      <p className="text-gray-300 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── SearchBar ────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Rechercher…' }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-4 text-sm bg-white border border-gray-200 rounded-xl text-gray-800
                   placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
        style={{ '--tw-ring-color': 'var(--color-primary)33' }}
      />
      {value && (
        <button onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxW = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-display font-bold text-lg text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── FormField ────────────────────────────────────────────────────────────────
export function FormField({ label, required, error, children, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint  && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// Standard input class for light-background forms (visible text)
export const inputCls = `w-full h-10 px-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl
  placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`

export const selectCls = `w-full h-10 px-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl
  focus:outline-none focus:ring-2 focus:border-transparent transition-all`

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, color = 'gray' }) {
  const colors = {
    gray:   'bg-gray-100 text-gray-600',
    green:  'bg-emerald-100 text-emerald-700',
    red:    'bg-red-100 text-red-700',
    amber:  'bg-amber-100 text-amber-700',
    blue:   'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-gray-400" />
        </div>
      )}
      <h3 className="font-semibold text-gray-700 mb-1">{title}</h3>
      {description && <p className="text-gray-400 text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Supprimer', danger = true }) {
  if (!open) return null
  return (
    <Modal open={open} onClose={onClose} title={title} maxW="max-w-sm">
      <p className="text-gray-600 text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose}
          className="h-9 px-4 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all">
          Annuler
        </button>
        <button onClick={() => { onConfirm(); onClose() }}
          className={`h-9 px-4 rounded-xl text-sm font-semibold text-white transition-all ${
            danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
          }`}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// ─── Btn ──────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, type = 'button', variant = 'primary', size = 'md', disabled, className = '', icon: Icon }) {
  const sizes    = { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4 text-sm', lg: 'h-11 px-6 text-base' }
  const variants = {
    primary:   'text-white font-semibold',
    secondary: 'bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50',
    danger:    'bg-red-500 hover:bg-red-600 text-white font-semibold',
    ghost:     'text-gray-500 hover:bg-gray-100 font-medium',
  }
  const isPrimary = variant === 'primary'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed
        ${sizes[size]} ${variants[variant]} ${isPrimary ? '' : ''} ${className}`}
      style={isPrimary ? { background: 'var(--color-primary)' } : {}}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
    </button>
  )
}