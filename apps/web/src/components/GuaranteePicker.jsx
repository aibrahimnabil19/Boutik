'use client'

import { useMemo } from 'react'
import { GUARANTEE_OPTIONS } from '@/lib/core/guarantees'

export default function GuaranteePicker({ value, onChange }) {
  const selectedKey = value?.key || 'one_year_installation'

  const selected = useMemo(() => {
    return GUARANTEE_OPTIONS.find(g => g.key === selectedKey) || GUARANTEE_OPTIONS[0]
  }, [selectedKey])

  function changeKey(key) {
    const next = GUARANTEE_OPTIONS.find(g => g.key === key) || GUARANTEE_OPTIONS[0]
    onChange({
      key: next.key,
      text: next.text,
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Garantie
      </p>

      <select
        value={selectedKey}
        onChange={(e) => changeKey(e.target.value)}
        className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm"
      >
        {GUARANTEE_OPTIONS.map(option => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>

      <textarea
        value={value?.text ?? selected.text}
        onChange={(e) => onChange({ key: selectedKey, text: e.target.value })}
        rows={4}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
        placeholder="Texte de garantie à afficher sur la facture/proforma"
      />
    </div>
  )
}