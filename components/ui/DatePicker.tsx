"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import * as React from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";

import FormField from "@/components/ui/FormField";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string | Date | null;
  onChange?: (dateString: string, date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDateValue(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isValid(val) ? val : null;
  try {
    const parsed = parseISO(val);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function DatePicker({
  id,
  label,
  description,
  error,
  required,
  disabled,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Pick a date",
  className,
  size = "sm",
}: DatePickerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => parseDateValue(value), [value]);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    () => selectedDate || new Date()
  );

  // Sync current visible month if selected date changes
  const [prevSelectedDate, setPrevSelectedDate] = React.useState(selectedDate);
  if (selectedDate !== prevSelectedDate) {
    setPrevSelectedDate(selectedDate);
    if (selectedDate) {
      setCurrentMonth(selectedDate);
    }
  }

  // Close popover when clicking outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = React.useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  const handleSelectDay = (day: Date) => {
    if (disabled) return;
    const formatted = format(day, "yyyy-MM-dd");
    onChange?.(formatted, day);
    setIsOpen(false);
  };

  const handleTodayClick = () => {
    const today = new Date();
    const formatted = format(today, "yyyy-MM-dd");
    setCurrentMonth(today);
    onChange?.(formatted, today);
    setIsOpen(false);
  };

  const heightClass = {
    sm: "h-10 text-sm",
    md: "h-11 text-sm",
    lg: "h-12 text-base",
  }[size];

  return (
    <FormField
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
    >
      <div ref={containerRef} className={cn("relative w-full", className)}>
        {/* TRIGGER BUTTON */}
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "flex w-full items-center justify-between gap-2.5 rounded-xl border border-border bg-background px-3.5 text-left transition-all duration-150 select-none",
            heightClass,
            error && "border-destructive text-destructive",
            disabled && "cursor-not-allowed opacity-50",
            !disabled && "hover:border-foreground/40",
            isOpen && "border-foreground"
          )}
          style={{ outline: "none", boxShadow: "none" }}
        >
          <div className="flex items-center gap-2.5 min-w-0 truncate">
            <FiCalendar className="shrink-0 text-muted-foreground" size={15} />
            <span
              className={cn("truncate", !selectedDate && "text-muted-foreground")}
            >
              {selectedDate ? format(selectedDate, "dd MMM yyyy") : placeholder}
            </span>
          </div>
        </button>

        {/* POPOVER CALENDAR */}
        {isOpen && (
          <div
            className="absolute top-full left-0 z-50 mt-1.5 w-72 rounded-xl border border-border bg-background p-3.5 select-none"
            style={{ outline: "none", boxShadow: "none" }}
          >
            {/* MONTH HEADER & NAV */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  style={{ outline: "none", boxShadow: "none" }}
                  title="Previous month"
                >
                  <FiChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  style={{ outline: "none", boxShadow: "none" }}
                  title="Next month"
                >
                  <FiChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* WEEKDAYS ROW */}
            <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center">
              {WEEKDAY_NAMES.map((name) => (
                <div
                  key={name}
                  className="text-[11px] font-medium text-muted-foreground"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* DAYS GRID */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);
                const isBeforeMin = minDate && day < minDate;
                const isAfterMax = maxDate && day > maxDate;
                const isDayDisabled = Boolean(isBeforeMin || isAfterMax);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={isDayDisabled}
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-colors",
                      !isCurrentMonth && "text-muted-foreground/40",
                      isCurrentMonth && !isSelected && "text-foreground hover:bg-muted",
                      isCurrentDay && !isSelected && "border border-foreground/30 font-semibold",
                      isSelected && "bg-foreground text-background font-semibold hover:bg-foreground/90",
                      isDayDisabled && "cursor-not-allowed opacity-30 hover:bg-transparent"
                    )}
                    style={{ outline: "none", boxShadow: "none" }}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {/* QUICK ACTIONS FOOTER */}
            <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleTodayClick}
                className="text-primary hover:underline font-medium"
                style={{ outline: "none" }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
                style={{ outline: "none" }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </FormField>
  );
}
