import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  format,
} from 'date-fns'
import { fr } from 'date-fns/locale'

function safeDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function defaultDateFilter() {
  return {
    mode: 'month', // all | today | week | month | year | custom
    month: format(new Date(), 'yyyy-MM'),
    year: String(new Date().getFullYear()),
    start: '',
    end: '',
  }
}

export function getDateRange(filter = defaultDateFilter()) {
  const now = new Date()

  if (filter.mode === 'all') {
    return { start: null, end: null }
  }

  if (filter.mode === 'today') {
    return { start: startOfDay(now), end: endOfDay(now) }
  }

  if (filter.mode === 'week') {
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    }
  }

  if (filter.mode === 'month') {
    const base = filter.month ? parseISO(`${filter.month}-01`) : now
    return { start: startOfMonth(base), end: endOfMonth(base) }
  }

  if (filter.mode === 'year') {
    const year = Number(filter.year || now.getFullYear())
    const base = new Date(year, 0, 1)
    return { start: startOfYear(base), end: endOfYear(base) }
  }

  if (filter.mode === 'custom') {
    return {
      start: filter.start ? startOfDay(new Date(filter.start)) : null,
      end: filter.end ? endOfDay(new Date(filter.end)) : null,
    }
  }

  return { start: null, end: null }
}

export function isDateInFilter(dateValue, filter) {
  const d = safeDate(dateValue)
  if (!d) return false

  const { start, end } = getDateRange(filter)

  if (!start && !end) return true
  if (start && !end) return d >= start
  if (!start && end) return d <= end

  return isWithinInterval(d, { start, end })
}

export function describeDateFilter(filter) {
  const { start, end } = getDateRange(filter)

  if (!start && !end) return 'Toutes les périodes'

  if (filter.mode === 'today') return "Aujourd'hui"
  if (filter.mode === 'week') return 'Cette semaine'

  if (filter.mode === 'month') {
    return format(start, 'MMMM yyyy', { locale: fr })
  }

  if (filter.mode === 'year') {
    return String(filter.year || new Date().getFullYear())
  }

  if (filter.mode === 'custom') {
    const a = start ? format(start, 'dd/MM/yyyy', { locale: fr }) : 'début'
    const b = end ? format(end, 'dd/MM/yyyy', { locale: fr }) : 'fin'
    return `${a} - ${b}`
  }

  return 'Période'
}

export function filterRowsByDate(rows, filter, key = 'date') {
  return (rows || []).filter(row => isDateInFilter(row[key], filter))
}