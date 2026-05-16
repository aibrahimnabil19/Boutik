'use client'

import { CalendarDays, RotateCcw } from 'lucide-react'
import { defaultDateFilter } from '@/lib/core/dateFilters'
import { inputCls, selectCls } from '@/components/ui'

export default function DateFilter({ value, onChange, className = '' }) {
  const filter = value || defaultDateFilter()

  function update(patch) {
    onChange({ ...filter, ...patch })
  }

  function reset() {
    onChange(defaultDateFilter())
  }

  return (
    <div className={`flex flex-wrap items-end gap-2 ${className}`}>
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 mb-1">
          Période
        </label>
        <select
          value={filter.mode}
          onChange={(e) => update({ mode: e.target.value })}
          className={`${selectCls} min-w-[150px]`}
        >
          <option value="all">Toutes</option>
          <option value="today">Aujourd’hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Mois</option>
          <option value="year">Année</option>
          <option value="custom">Période personnalisée</option>
        </select>
      </div>

      {filter.mode === 'month' && (
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
            Mois
          </label>
          <input
            type="month"
            value={filter.month || ''}
            onChange={(e) => update({ month: e.target.value })}
            className={`${inputCls} min-w-[150px]`}
          />
        </div>
      )}

      {filter.mode === 'year' && (
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
            Année
          </label>
          <input
            type="number"
            value={filter.year || ''}
            onChange={(e) => update({ year: e.target.value })}
            className={`${inputCls} w-[120px]`}
            placeholder="2026"
          />
        </div>
      )}

      {filter.mode === 'custom' && (
        <>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Du
            </label>
            <input
              type="date"
              value={filter.start || ''}
              onChange={(e) => update({ start: e.target.value })}
              className={`${inputCls} min-w-[150px]`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
              Au
            </label>
            <input
              type="date"
              value={filter.end || ''}
              onChange={(e) => update({ end: e.target.value })}
              className={`${inputCls} min-w-[150px]`}
            />
          </div>
        </>
      )}

      <button
        type="button"
        onClick={reset}
        className="h-11 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 flex items-center gap-2 text-sm"
        title="Réinitialiser"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  )
}