/**
 * Date and time formatting utilities
 */

/**
 * Format a date as a localized string
 * @param date - Date to format
 * @param locale - Locale string (default: 'es-CL')
 * @returns Formatted date string
 */
export function formatDate(date: Date, locale = "es-CL"): string {
    return date.toLocaleDateString(locale);
}

/**
 * Format a time as a localized string
 * @param date - Date to format
 * @param locale - Locale string (default: 'es-CL')
 * @returns Formatted time string (HH:MM)
 */
export function formatTime(date: Date, locale = "es-CL"): string {
    return date.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Format a date and time as a localized string
 * @param date - Date to format
 * @param locale - Locale string (default: 'es-CL')
 * @returns Formatted date and time string
 */
export function formatDateTime(date: Date, locale = "es-CL"): string {
    return date.toLocaleString(locale, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Format a date for input[type="date"] (YYYY-MM-DD)
 * @param date - Date to format
 * @returns ISO date string (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Get relative time description (e.g., "hace 2 horas")
 * @param date - Date to compare
 * @param now - Current date (default: new Date())
 * @returns Relative time string
 */
export function getRelativeTime(date: Date, now = new Date()): string {
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "hace unos segundos";
    if (diffMin < 60) return `hace ${diffMin} minuto${diffMin > 1 ? "s" : ""}`;
    if (diffHour < 24) return `hace ${diffHour} hora${diffHour > 1 ? "s" : ""}`;
    if (diffDay < 7) return `hace ${diffDay} día${diffDay > 1 ? "s" : ""}`;

    return formatDate(date);
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date): boolean {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
}

/**
 * Check if a date is within a range
 * @param date - Date to check
 * @param start - Start of range (inclusive)
 * @param end - End of range (inclusive)
 * @returns True if date is within range
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
}
