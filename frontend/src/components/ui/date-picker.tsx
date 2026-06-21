'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type CalendarDay = {
  date: Date;
  key: string;
  inMonth: boolean;
};

export interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const monthFormatter = new Intl.DateTimeFormat('en', {
  month: 'long',
  year: 'numeric',
});

const displayFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = 'Pick date',
  disabled,
  className,
}: DatePickerProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);
  const selectedDate = React.useMemo(() => parseDateValue(value), [value]);
  const selectedTime = selectedDate?.getTime() ?? null;
  const today = React.useMemo(() => startOfDay(new Date()), []);
  const [open, setOpen] = React.useState(false);
  const [visibleMonth, setVisibleMonth] = React.useState(() => startOfMonth(selectedDate ?? today));
  const [calendarPosition, setCalendarPosition] = React.useState({
    left: 0,
    top: 0,
    width: 312,
  });

  React.useEffect(() => {
    if (!open) return;
    setVisibleMonth(startOfMonth(selectedDate ?? today));
  }, [open, selectedTime, selectedDate, today]);

  React.useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !calendarRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const updateCalendarPosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(312, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));

    setCalendarPosition({
      left,
      top: rect.bottom + 8,
      width,
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;

    updateCalendarPosition();
    window.addEventListener('resize', updateCalendarPosition);
    document.addEventListener('scroll', updateCalendarPosition, true);

    return () => {
      window.removeEventListener('resize', updateCalendarPosition);
      document.removeEventListener('scroll', updateCalendarPosition, true);
    };
  }, [open, updateCalendarPosition]);

  const days = React.useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const displayValue = selectedDate ? displayFormatter.format(selectedDate) : '';

  const commitDate = (date: Date) => {
    onChange(toDateValue(date));
    setVisibleMonth(startOfMonth(date));
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-foreground transition-all duration-200',
          'focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <span className={cn('truncate', !displayValue && 'text-muted-foreground')}>
          {displayValue || placeholder}
        </span>
        <CalendarBlank className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={calendarRef}
            role="dialog"
            aria-label="Choose date"
            style={{
              left: calendarPosition.left,
              top: calendarPosition.top,
              width: calendarPosition.width,
            }}
            className="animate-in fade-in-0 zoom-in-98 slide-in-from-top-1 fixed z-50 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{monthFormatter.format(visibleMonth)}</p>
              <div className="flex items-center gap-1">
                <CalendarNavButton
                  label="Previous month"
                  onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                >
                  <CaretLeft weight="bold" className="h-4 w-4" />
                </CalendarNavButton>
                <CalendarNavButton
                  label="Next month"
                  onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                >
                  <CaretRight weight="bold" className="h-4 w-4" />
                </CalendarNavButton>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {weekdays.map((weekday) => (
                <span key={weekday} className="py-1">
                  {weekday}
                </span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const selected = selectedDate ? isSameDay(day.date, selectedDate) : false;
                const currentDay = isSameDay(day.date, today);

                return (
                  <button
                    key={day.key}
                    type="button"
                    aria-label={displayFormatter.format(day.date)}
                    aria-pressed={selected}
                    title={displayFormatter.format(day.date)}
                    onClick={() => commitDate(day.date)}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-md text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary/20',
                      day.inMonth ? 'text-foreground' : 'text-muted-foreground/45',
                      currentDay && !selected && 'border border-primary/35 text-primary',
                      selected && 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                  >
                    {day.date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => commitDate(today)}
                className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                Today
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function CalendarNavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
    >
      {children}
    </button>
  );
}

function buildMonthGrid(monthDate: Date): CalendarDay[] {
  const month = startOfMonth(monthDate);
  const mondayOffset = (month.getDay() + 6) % 7;
  const firstVisibleDay = new Date(month.getFullYear(), month.getMonth(), 1 - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);

    return {
      date,
      key: toDateValue(date),
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

function parseDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return startOfDay(date);
}

function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
