'use client'

import FrenchInput from '@/components/FrenchInput'
import { inputCls } from '@/components/ui'
import { formatFCFA } from '@/lib/core/calculations'

export const PAYMENT_METHODS = [
  { key: 'cash', label: 'Espèces / Cash' },
  { key: 'bank', label: 'Banque' },
  { key: 'nita', label: 'Nita' },
  { key: 'amana', label: 'Amana' },
]

export function sumPaymentBreakdown(rows = []) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
}

export function cleanPaymentBreakdown(rows = []) {
  return rows
    .map(row => ({
      method: row.method,
      label: row.label,
      amount: Number(row.amount || 0),
    }))
    .filter(row => row.method && row.amount > 0)
}

export default function PaymentBreakdownInput({ value = [], onChange, total = 0 }) {
  const selectedMethods = value.map(row => row.method)
  const paidTotal = sumPaymentBreakdown(value)
  const remaining = Number(total || 0) - paidTotal

  function toggleMethod(method, checked) {
    const config = PAYMENT_METHODS.find(m => m.key === method)

    if (!config) return

    if (checked) {
      if (selectedMethods.includes(method)) return

      onChange([
        ...value,
        {
          method: config.key,
          label: config.label,
          amount: '',
        },
      ])
      return
    }

    onChange(value.filter(row => row.method !== method))
  }

  function updateAmount(method, amount) {
    onChange(
      value.map(row =>
        row.method === method
          ? { ...row, amount }
          : row
      )
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Répartition du paiement</p>
        <p className="text-xs text-gray-400">
          Sélectionnez un ou plusieurs moyens de paiement.
        </p>
      </div>

      <div className="grid sm:grid-cols-4 gap-2">
        {PAYMENT_METHODS.map(method => (
          <label
            key={method.key}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer ${
              selectedMethods.includes(method.key)
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedMethods.includes(method.key)}
              onChange={(e) => toggleMethod(method.key, e.target.checked)}
            />
            {method.label}
          </label>
        ))}
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map(row => (
            <div key={row.method} className="grid grid-cols-[1fr_170px] gap-2 items-center">
              <div className="text-sm font-medium text-gray-700">
                {row.label}
              </div>

              <FrenchInput
                value={row.amount}
                onChange={(amount) => updateAmount(row.method, amount)}
                placeholder="Montant"
                className={inputCls}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between text-xs border-t border-gray-200 pt-3">
        <span className="text-gray-500">Total attendu : {formatFCFA(total)}</span>
        <span className={remaining === 0 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
          Reste : {formatFCFA(Math.max(0, remaining))}
        </span>
      </div>
    </div>
  )
}