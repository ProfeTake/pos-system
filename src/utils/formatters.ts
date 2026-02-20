/**
 * Number and currency formatting utilities
 */

/**
 * Format a number as Chilean currency (CLP)
 * @param amount - Amount to format
 * @param locale - Locale string (default: 'es-CL')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, locale = "es-CL"): string {
    return Math.round(amount).toLocaleString(locale);
}

/**
 * Format a percentage value
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 0): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * Parse numeric input from string, handling commas and invalid input
 * @param input - String input to parse
 * @returns Parsed number or 0 if invalid
 */
export function parseNumericInput(input: string): number {
    const cleaned = input.replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a number with thousands separators
 * @param value - Number to format
 * @param locale - Locale string (default: 'es-CL')
 * @returns Formatted number string
 */
export function formatNumber(value: number, locale = "es-CL"): string {
    return value.toLocaleString(locale);
}

/**
 * Round to specified decimal places
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 */
export function roundTo(value: number, decimals = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Clamp a number between min and max values
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
