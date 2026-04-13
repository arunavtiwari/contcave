const bookingDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const TIME_12H_PATTERN = /^\s*(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)\s*$/i;
const TIME_24H_PATTERN = /^\s*([0-1]?\d|2[0-3]):([0-5][0-9])\s*$/;

function toMinutes(timeValue: string): number {
  const twelveHourMatch = timeValue.match(TIME_12H_PATTERN);
  if (twelveHourMatch) {
    let hours = Number(twelveHourMatch[1]);
    const minutes = Number(twelveHourMatch[2]);
    const period = twelveHourMatch[3].toUpperCase();

    if (period === "PM" && hours < 12) {
      hours += 12;
    }

    if (period === "AM" && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  }

  const twentyFourHourMatch = timeValue.match(TIME_24H_PATTERN);
  if (twentyFourHourMatch) {
    return Number(twentyFourHourMatch[1]) * 60 + Number(twentyFourHourMatch[2]);
  }

  return Number.NaN;
}

export function isSupportedTimeValue(timeValue: string) {
  return TIME_12H_PATTERN.test(timeValue) || TIME_24H_PATTERN.test(timeValue);
}

export function formatDisplayTime(timeValue: string) {
  if (!timeValue || !isSupportedTimeValue(timeValue)) {
    return timeValue;
  }

  const totalMinutes = toMinutes(timeValue);
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) {
    return timeValue;
  }

  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function calculateDurationInHours(startTimeValue: string, endTimeValue: string) {
  if (!startTimeValue || !endTimeValue) {
    return 0;
  }

  if (!isSupportedTimeValue(startTimeValue) || !isSupportedTimeValue(endTimeValue)) {
    return 0;
  }

  const diff = toMinutes(endTimeValue) - toMinutes(startTimeValue);
  return diff > 0 ? diff / 60 : 0;
}

export function formatBookingDateValue(dateValue: string | undefined) {
  if (!dateValue) {
    return "—";
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return bookingDateFormatter.format(parsedDate);
}
