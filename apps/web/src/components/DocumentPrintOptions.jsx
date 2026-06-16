'use client'

export function getDefaultDocumentOptions() {
  return {
    includeCachet: false,
    includeSignature: false,
    orientation: 'landscape',
  }
}

export default function DocumentPrintOptions({ shop, value, onChange }) {
  const options = value || getDefaultDocumentOptions(shop)

  function update(key, checked) {
    onChange({ ...options, [key]: checked })
  }

  function updateValue(key, value) {
    onChange({ ...options, [key]: value })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Options du document
      </p>

      <label className={`flex items-center gap-2 text-sm ${!shop?.cachet_url ? 'text-gray-400' : 'text-gray-700'}`}>
        <input
          type="checkbox"
          checked={!!options.includeCachet}
          disabled={!shop?.cachet_url}
          onChange={(e) => update('includeCachet', e.target.checked)}
        />
        Inclure le cachet
        {!shop?.cachet_url && <span className="text-xs text-gray-400">(non configuré)</span>}
      </label>

      <label className={`flex items-center gap-2 text-sm ${!shop?.signature_url ? 'text-gray-400' : 'text-gray-700'}`}>
        <input
          type="checkbox"
          checked={!!options.includeSignature}
          disabled={!shop?.signature_url}
          onChange={(e) => update('includeSignature', e.target.checked)}
        />
        Inclure la signature
        {!shop?.signature_url && <span className="text-xs text-gray-400">(non configurée)</span>}
      </label>

      <label className="block text-sm text-gray-700">
        <span className="block mb-1">Orientation</span>
        <select
          value={options.orientation || 'landscape'}
          onChange={(e) => updateValue('orientation', e.target.value)}
          className="w-full h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="landscape">Paysage</option>
          <option value="portrait">Portrait</option>
        </select>
      </label>
    </div>
  )
}