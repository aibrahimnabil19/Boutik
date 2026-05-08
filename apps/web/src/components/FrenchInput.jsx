'use client'

import React from 'react'

export default function FrenchInput({
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  className,
  disabled,
}) {
  const toDisplay = (v) => {
    if (v === '' || v === null || v === undefined) return ''
    const [int, dec] = String(v).split('.')
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
    return dec !== undefined ? `${formatted},${dec}` : formatted
  }

  const [display, setDisplay] = React.useState(() => toDisplay(value))
  const prevRef = React.useRef(value)

  React.useEffect(() => {
    if (value !== prevRef.current) {
      prevRef.current = value
      setDisplay(toDisplay(value))
    }
  }, [value])

  const handleChange = (e) => {
    const raw = e.target.value
    const noSpace = raw.replace(/[\s\u00a0]/g, '')
    const commaIdx = noSpace.indexOf(',')

    let intPart
    let decPart

    if (commaIdx >= 0) {
      intPart = noSpace.slice(0, commaIdx).replace(/\D/g, '')
      decPart = noSpace.slice(commaIdx + 1).replace(/\D/g, '')
    } else {
      intPart = noSpace.replace(/\D/g, '')
      decPart = null
    }

    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
    const newDisplay = decPart !== null ? `${formattedInt},${decPart}` : formattedInt

    setDisplay(newDisplay)

    const numericStr = decPart !== null ? `${intPart}.${decPart}` : intPart
    prevRef.current = numericStr
    onChange(numericStr)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
    />
  )
}