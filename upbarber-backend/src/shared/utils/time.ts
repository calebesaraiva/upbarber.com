export function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, mins + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function timeToMinutes(time: string) {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

function parseDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) throw new Error(`Invalid date string: ${date}`);
  return { year, month, day };
}

export function sameDateOnly(date: Date | string) {
  const parsed = typeof date === "string"
    ? (() => {
        const { year, month, day } = parseDateParts(date);
        return new Date(year, month - 1, day);
      })()
    : date;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function dateInputValue(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}
