'use client'

// Lets the user pick: orientation (paysage/portrait), and whether to include
// the shop's cachet/signature on the printed document.
// `value`/`onChange` follow the same controlled-component pattern as the rest
// of the app (see DocOptions usage in factures/proformas pages).

export function getDefaultDocumentOptions() {
  return {
    orientation: 'landscape', // 'landscape' (paysage) | 'portrait'
    includeCachet: true,
    includeSignature: true,
  }
}

export default function DocumentPrintOptions({ shop, value, onChange }) {
  const opts = { ...getDefaultDocumentOptions(), ...value }

  const hasCachet = !!(shop?.cachet_print_src || shop?.cachet_data_url || shop?.cachet_url)
  const hasSignature = !!(shop?.signature_print_src || shop?.signature_data_url || shop?.signature_url)

  function set(patch) {
    onChange({ ...opts, ...patch })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
          Orientation
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => set({ orientation: 'landscape' })}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              opts.orientation === 'landscape'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Paysage
          </button>
          <button
            type="button"
            onClick={() => set({ orientation: 'portrait' })}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              opts.orientation === 'portrait'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            Portrait
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Inclure le cachet
          {!hasCachet && <span className="text-xs text-gray-400 ml-1">(aucun cachet enregistré)</span>}
        </span>
        <input
          type="checkbox"
          checked={!!opts.includeCachet}
          disabled={!hasCachet}
          onChange={(e) => set({ includeCachet: e.target.checked })}
          className="w-4 h-4"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Inclure la signature
          {!hasSignature && <span className="text-xs text-gray-400 ml-1">(aucune signature enregistrée)</span>}
        </span>
        <input
          type="checkbox"
          checked={!!opts.includeSignature}
          disabled={!hasSignature}
          onChange={(e) => set({ includeSignature: e.target.checked })}
          className="w-4 h-4"
        />
      </div>
    </div>
  )
}