'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

/**
 * Dropdown with a search field inside the panel (filters in realtime).
 * Options: { value, label, hint, meta, metaTone, search }
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = '— Choisir —',
  searchPlaceholder = 'Rechercher…',
  emptyLabel = 'Aucun résultat',
  required = false,
  disabled = false,
  allowClear = true,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [dropUp, setDropUp] = useState(false)
  const wrapRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)

  const selected = useMemo(
    () => options.find(o => String(o.value) === String(value)) || null,
    [options, value]
  )

  const filtered = useMemo(() => {
    const q = normalize(query).trim()
    if (!q) return options

    const terms = q.split(/\s+/)
    return options.filter(o => {
      const haystack = normalize(o.search ?? `${o.label || ''} ${o.hint || ''}`)
      return terms.every(term => haystack.includes(term))
    })
  }, [options, query])

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return

    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  // Focus the search field and flip the panel when there is no room below
  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }

    const rect = wrapRef.current?.getBoundingClientRect()
    if (rect) setDropUp(window.innerHeight - rect.bottom < 280 && rect.top > 280)

    setHighlight(Math.max(0, options.findIndex(o => String(o.value) === String(value))))
    searchRef.current?.focus()
  }, [open, options, value])

  // Keep the highlighted row visible
  useEffect(() => {
    if (!open) return
    listRef.current?.children?.[highlight]?.scrollIntoView({ block: 'nearest' })
  }, [open, highlight])

  function select(option) {
    onChange(option ? option.value : '')
    setOpen(false)
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const option = filtered[highlight]
      if (option && !option.disabled) select(option)
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full h-10 pl-3 pr-9 flex items-center gap-2 text-left text-sm bg-white border
                   border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent
                   transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ '--tw-ring-color': 'var(--color-primary)33' }}
      >
        {selected ? (
          <>
            <span className="truncate text-gray-800">{selected.label}</span>
            {selected.hint && (
              <span className="text-xs text-gray-400 flex-none">({selected.hint})</span>
            )}
          </>
        ) : (
          <span className="text-gray-400 truncate">{placeholder}</span>
        )}

        <ChevronDown className="absolute right-3 w-4 h-4 text-gray-400 flex-none" />
      </button>

      {/* Keeps native form validation working for the custom control */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value || ''}
          onChange={() => {}}
          onFocus={() => setOpen(true)}
          className="absolute left-3 bottom-0 opacity-0 pointer-events-none"
          style={{ width: 1, height: 1 }}
        />
      )}

      {open && (
        <div
          className={`absolute z-30 w-full min-w-[240px] rounded-xl border border-gray-200 bg-white shadow-xl
                      ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value)
                  setHighlight(0)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-9 pr-8 text-sm bg-gray-50 border border-gray-200 rounded-lg
                           text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:border-transparent transition-all"
                style={{ '--tw-ring-color': 'var(--color-primary)33' }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setHighlight(0)
                    searchRef.current?.focus()
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div ref={listRef} className="max-h-60 overflow-y-auto py-1">
            {allowClear && !query && (
              <button
                type="button"
                onClick={() => select(null)}
                className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50"
              >
                {placeholder}
              </button>
            )}

            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">{emptyLabel}</p>
            ) : (
              filtered.map((option, index) => {
                const isSelected = String(option.value) === String(value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => select(option)}
                    onMouseEnter={() => setHighlight(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                                disabled:opacity-40 disabled:cursor-not-allowed
                                ${index === highlight ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate">{option.label}</p>
                      {option.hint && <p className="text-xs text-gray-400 truncate">{option.hint}</p>}
                    </div>

                    {option.meta && (
                      <span
                        className={`text-xs font-semibold flex-none ${
                          option.metaTone === 'danger' ? 'text-red-500' : 'text-gray-500'
                        }`}
                      >
                        {option.meta}
                      </span>
                    )}

                    {isSelected && <Check className="w-4 h-4 text-blue-600 flex-none" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
