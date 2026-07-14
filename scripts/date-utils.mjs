// Service dates use the fixed +05:30 Asia/Kolkata business zone.
export const SERVICE_TIME_ZONE = "Asia/Kolkata";
export const SERVICE_OFFSET_MINUTES = 330;

const MINUTE_MS = 60 * 1000;

function instantOf(value) {
  const instant = value instanceof Date ? value.getTime() : Date.parse(value);
  if (Number.isNaN(instant)) throw new Error("value must be a valid date");
  return instant;
}

function serviceParts(value) {
  const instant = instantOf(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SERVICE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(instant));
  const output = Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value: part }) => [type, part]));
  return {
    year: Number(output.year),
    month: Number(output.month),
    day: Number(output.day),
    hour: Number(output.hour),
    minute: Number(output.minute),
    second: Number(output.second)
  };
}

function padded(value, size = 2) {
  return String(value).padStart(size, "0");
}

function formatOffsetTimestamp(instant, offsetMinutes) {
  const local = new Date(instant + offsetMinutes * MINUTE_MS);
  const offset = offsetMinutes === 0
    ? "Z"
    : `${offsetMinutes < 0 ? "-" : "+"}${padded(Math.floor(Math.abs(offsetMinutes) / 60))}:${padded(Math.abs(offsetMinutes) % 60)}`;
  return `${local.getUTCFullYear()}-${padded(local.getUTCMonth() + 1)}-${padded(local.getUTCDate())}T${padded(local.getUTCHours())}:${padded(local.getUTCMinutes())}:${padded(local.getUTCSeconds())}.${padded(local.getUTCMilliseconds(), 3)}${offset}`;
}

function outputOffsetMinutes(timestamp) {
  const zone = timestampZone(timestamp);
  return zone ? zoneOffsetMinutes(zone) : SERVICE_OFFSET_MINUTES;
}

/** Return the current instant rendered in the service timezone. */
export function serviceNowTimestamp(date = new Date()) {
  return formatOffsetTimestamp(instantOf(date), SERVICE_OFFSET_MINUTES);
}

/** Return the service-timezone calendar date (not the host machine's date). */
export function localIsoDate(date = new Date()) {
  const value = serviceParts(date);
  return `${value.year}-${padded(value.month)}-${padded(value.day)}`;
}

export function isIsoCalendarDate(value) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day >= 1 && day <= daysInMonth;
}

// These return the actual instants at the service-timezone boundaries.
export function localStartOfIsoDate(isoDate) {
  if (!isIsoCalendarDate(isoDate)) throw new Error("date must be a real YYYY-MM-DD calendar date");
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) - SERVICE_OFFSET_MINUTES * MINUTE_MS;
}

export function localEndOfIsoDate(isoDate) {
  if (!isIsoCalendarDate(isoDate)) throw new Error("date must be a real YYYY-MM-DD calendar date");
  return localStartOfIsoDate(addIsoDays(isoDate, 1)) - 1;
}

export function timestampIsOnOrBeforeLocalDate(timestamp, isoDate) {
  const instant = Date.parse(timestamp);
  return !Number.isNaN(instant) && instant <= localEndOfIsoDate(isoDate);
}

export function addIsoDays(isoDate, days) {
  if (!isIsoCalendarDate(isoDate)) throw new Error("date must be a real YYYY-MM-DD calendar date");
  if (!Number.isInteger(days)) throw new Error("days must be an integer");
  const [year, month, day] = isoDate.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return `${value.getUTCFullYear()}-${padded(value.getUTCMonth() + 1)}-${padded(value.getUTCDate())}`;
}

export function addIsoBusinessDays(isoDate, days) {
  if (!isIsoCalendarDate(isoDate)) throw new Error("date must be a real YYYY-MM-DD calendar date");
  if (!Number.isInteger(days) || days < 0) throw new Error("business days must be a non-negative integer");
  const [year, month, day] = isoDate.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  let remaining = days;
  while (remaining > 0) {
    value.setUTCDate(value.getUTCDate() + 1);
    const dayOfWeek = value.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) remaining -= 1;
  }
  return `${value.getUTCFullYear()}-${padded(value.getUTCMonth() + 1)}-${padded(value.getUTCDate())}`;
}

export function addBusinessDaysToTimestamp(timestamp, days) {
  const instant = Date.parse(timestamp);
  const zone = timestampZone(timestamp);
  if (Number.isNaN(instant) || !zone) throw new Error("timestamp must be a valid offset date-time");
  if (!Number.isInteger(days) || days < 0) throw new Error("business days must be a non-negative integer");

  // Do weekday arithmetic on the service calendar, retaining the input offset.
  const value = new Date(instant + SERVICE_OFFSET_MINUTES * MINUTE_MS);
  let remaining = days;
  while (remaining > 0) {
    value.setUTCDate(value.getUTCDate() + 1);
    const dayOfWeek = value.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) remaining -= 1;
  }
  const target = value.getTime() - SERVICE_OFFSET_MINUTES * MINUTE_MS;
  return formatOffsetTimestamp(target, outputOffsetMinutes(timestamp));
}

function timestampZone(timestamp) {
  return typeof timestamp === "string" ? /(Z|([+-])(\d{2}):(\d{2}))$/.exec(timestamp) : null;
}

function zoneOffsetMinutes(zone) {
  return zone[1] === "Z" ? 0 : (zone[2] === "+" ? 1 : -1) * (Number(zone[3]) * 60 + Number(zone[4]));
}

export function businessMillisecondsBetween(startTimestamp, endTimestamp) {
  const start = Date.parse(startTimestamp);
  const end = Date.parse(endTimestamp);
  if (Number.isNaN(start) || Number.isNaN(end) || !timestampZone(startTimestamp) || !timestampZone(endTimestamp)) {
    throw new Error("timestamps must be valid offset date-times");
  }
  if (end < start) throw new Error("end timestamp must not precede start timestamp");

  let cursor = start + SERVICE_OFFSET_MINUTES * MINUTE_MS;
  const endInServiceZone = end + SERVICE_OFFSET_MINUTES * MINUTE_MS;
  let total = 0;
  while (cursor < endInServiceZone) {
    const value = new Date(cursor);
    const nextMidnight = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + 1);
    const segmentEnd = Math.min(nextMidnight, endInServiceZone);
    const dayOfWeek = value.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) total += segmentEnd - cursor;
    cursor = segmentEnd;
  }
  return total;
}

export function addBusinessMillisecondsToTimestamp(timestamp, milliseconds) {
  const instant = Date.parse(timestamp);
  const zone = timestampZone(timestamp);
  if (Number.isNaN(instant) || !zone) throw new Error("timestamp must be a valid offset date-time");
  if (!Number.isInteger(milliseconds) || milliseconds < 0) throw new Error("business milliseconds must be a non-negative integer");

  let cursor = instant + SERVICE_OFFSET_MINUTES * MINUTE_MS;
  let remaining = milliseconds;
  while (remaining > 0) {
    const value = new Date(cursor);
    const nextMidnight = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + 1);
    const dayOfWeek = value.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      cursor = nextMidnight;
      continue;
    }
    const available = nextMidnight - cursor;
    const consumed = Math.min(available, remaining);
    cursor += consumed;
    remaining -= consumed;
  }
  return formatOffsetTimestamp(cursor - SERVICE_OFFSET_MINUTES * MINUTE_MS, outputOffsetMinutes(timestamp));
}
