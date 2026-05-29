export function localIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addIsoDays(isoDate, days) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const value = new Date(year, month - 1, day);
  value.setDate(value.getDate() + days);
  return localIsoDate(value);
}

export function addIsoBusinessDays(isoDate, days) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const value = new Date(year, month - 1, day);
  let remaining = days;

  while (remaining > 0) {
    value.setDate(value.getDate() + 1);
    const dayOfWeek = value.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) remaining -= 1;
  }

  return localIsoDate(value);
}
