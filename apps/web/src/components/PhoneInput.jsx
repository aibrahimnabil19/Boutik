'use client'

import React from 'react'

function formatPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  return digits.match(/.{1,2}/g)?.join(' ') || ''
}

export default function PhoneInput({
  value,
  onChange,
  onBlur,
  placeholder = '99 12 34 56',
  required,
  className,
  disabled,
}) {
  const [display, setDisplay] = React.useState(() => formatPhone(value))

  React.useEffect(() => {
    setDisplay(formatPhone(value))
  }, [value])

  function handleChange(e) {
    const formatted = formatPhone(e.target.value)
    setDisplay(formatted)
    onChange(formatted)
  }

  return (
    <input
      type="tel"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
      maxLength={11}
    />
  )
}