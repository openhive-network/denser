/** `date` as a short local time of day (hours and minutes) in `language`. */
export function formatTime(date: Date, language?: string): string {
  return date.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
}
