export const CLUB_LOCALE = "es-ES";
export const CLUB_TIMEZONE = "Europe/Madrid";

export type DateInput = Date | string | number;

export function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function getClubDateTimeFormatter(options: Intl.DateTimeFormatOptions = {}): Intl.DateTimeFormat {
  const finalOptions: Intl.DateTimeFormatOptions = {
    ...options,
  };
  if (!finalOptions.timeZone) {
    finalOptions.timeZone = CLUB_TIMEZONE;
  }
  return new Intl.DateTimeFormat(CLUB_LOCALE, finalOptions);
}

export function formatClubDateTime(value: DateInput, options: Intl.DateTimeFormatOptions = {}): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return getClubDateTimeFormatter(options).format(date);
}
