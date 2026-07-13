'use client'

import { useState, useEffect, useCallback } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { addDays, isBefore, isAfter, startOfDay, format, eachDayOfInterval, parseISO } from 'date-fns'
import { Loader2, AlertCircle } from 'lucide-react'
import 'react-day-picker/dist/style.css'

interface DateRangePickerProps {
  roomId?: number | string
  onRangeChange?: (range: { checkIn: string; checkOut: string } | null) => void
  initialCheckIn?: string
  initialCheckOut?: string
  minNights?: number
  className?: string
}

export default function DateRangePicker({
  roomId,
  onRangeChange,
  initialCheckIn,
  initialCheckOut,
  minNights = 1,
  className = '',
}: DateRangePickerProps) {
  const [range, setRange] = useState<DateRange | undefined>(() => {
    if (initialCheckIn && initialCheckOut) {
      return {
        from: parseISO(initialCheckIn),
        to: parseISO(initialCheckOut),
      }
    }
    return undefined
  })

  const [bookedDates, setBookedDates] = useState<Date[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = startOfDay(new Date())

  // Fetch booked dates for this room
  useEffect(() => {
    if (!roomId) return

    const fetchAvailability = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/rooms/availability?roomId=${roomId}`)
        if (!res.ok) throw new Error('Failed to load availability')
        const data = await res.json()
        const dates: Date[] = (data.bookedDates ?? []).map((d: string) => parseISO(d))
        setBookedDates(dates)
      } catch {
        setError('Could not load availability. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [roomId])

  // Notify parent when range changes
  const handleSelect = useCallback(
    (selected: DateRange | undefined) => {
      setRange(selected)

      if (selected?.from && selected?.to) {
        onRangeChange?.({
          checkIn: format(selected.from, 'yyyy-MM-dd'),
          checkOut: format(selected.to, 'yyyy-MM-dd'),
        })
      } else {
        onRangeChange?.(null)
      }
    },
    [onRangeChange]
  )

  // Build disabled days: past days + already-booked days
  const disabledDays = [
    { before: today },
    ...bookedDates,
  ]

  // Warn if selected range overlaps booked dates
  const hasConflict =
    range?.from && range?.to
      ? eachDayOfInterval({ start: range.from, end: range.to }).some((d) =>
          bookedDates.some((bd) => bd.toDateString() === d.toDateString())
        )
      : false

  // Enforce minimum nights
  const minCheckOut = range?.from ? addDays(range.from, minNights) : undefined

  return (
    <div className={`date-range-picker ${className}`}>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Checking availability…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 mb-3">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {hasConflict && (
        <div className="flex items-center gap-2 text-sm text-amber-600 mb-3">
          <AlertCircle className="w-4 h-4" />
          <span>Your selected dates include unavailable nights. Please adjust your selection.</span>
        </div>
      )}

      <DayPicker
        mode="range"
        selected={range}
        onSelect={handleSelect}
        disabled={disabledDays}
        fromDate={today}
        toDate={addDays(today, 365)}
        numberOfMonths={2}
        modifiersClassNames={{
          selected: 'rdp-day_selected',
          range_start: 'rdp-day_range_start',
          range_end: 'rdp-day_range_end',
          range_middle: 'rdp-day_range_middle',
          disabled: 'rdp-day_disabled',
        }}
        footer={
          range?.from && range?.to ? (
            <p className="text-sm text-gray-600 mt-2 text-center">
              {format(range.from, 'MMM d, yyyy')} → {format(range.to, 'MMM d, yyyy')}
              {' · '}
              {Math.round(
                (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)
              )}{' '}
              night(s)
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-2 text-center">
              Select check-in and check-out dates
            </p>
          )
        }
      />

      <style jsx global>{`
        .rdp {
          --rdp-accent-color: #0ea5e9;
          --rdp-background-color: #e0f2fe;
          margin: 0;
        }
        .rdp-day_selected,
        .rdp-day_range_start,
        .rdp-day_range_end {
          background-color: var(--rdp-accent-color) !important;
          color: white !important;
        }
        .rdp-day_range_middle {
          background-color: var(--rdp-background-color) !important;
          color: #0369a1 !important;
        }
        .rdp-day_disabled {
          opacity: 0.3;
          text-decoration: line-through;
        }
      `}</style>
    </div>
  )
}

export type { DateRange }
