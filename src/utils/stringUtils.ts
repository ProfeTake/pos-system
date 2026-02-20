/**
 * String manipulation utilities
 */

/**
 * Capitalize first letter of a string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 * @param str - String to convert
 * @returns Title case string
 */
export function toTitleCase(str: string): string {
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => capitalize(word))
        .join(" ");
}

/**
 * Truncate string to specified length with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated string
 */
export function truncate(
    str: string,
    maxLength: number,
    suffix = "..."
): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Remove accents from string
 * @param str - String to normalize
 * @returns String without accents
 */
export function removeAccents(str: string): string {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalize string for search/comparison
 * @param str - String to normalize
 * @returns Normalized string (lowercase, no accents, trimmed)
 */
export function normalizeForSearch(str: string): string {
    return removeAccents(str.toLowerCase().trim());
}

/**
 * Check if string contains substring (case-insensitive, accent-insensitive)
 * @param str - String to search in
 * @param search - Substring to search for
 * @returns True if substring is found
 */
export function containsIgnoreCase(str: string, search: string): boolean {
    return normalizeForSearch(str).includes(normalizeForSearch(search));
}

/**
 * Generate a random alphanumeric string
 * @param length - Length of string to generate
 * @returns Random string
 */
export function generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Pluralize a word based on count
 * @param count - Number to check
 * @param singular - Singular form
 * @param plural - Plural form (optional, defaults to singular + 's')
 * @returns Pluralized string
 */
export function pluralize(
    count: number,
    singular: string,
    plural?: string
): string {
    return count === 1 ? singular : plural || `${singular}s`;
}

/**
 * Format RUT with standard formatting (XX.XXX.XXX-X)
 * @param rut - RUT string (with or without formatting)
 * @returns Formatted RUT
 */
export function formatRUT(rut: string): string {
    // Remove existing formatting
    const cleaned = rut.replace(/[.-]/g, "");

    if (cleaned.length < 2) return rut;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);

    // Add thousands separators
    const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${formatted}-${dv}`;
}

/**
 * Format phone number with standard formatting
 * @param phone - Phone string (with or without formatting)
 * @returns Formatted phone
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/[\s()-]/g, "");

    if (cleaned.length === 9 && cleaned.startsWith("9")) {
        // Mobile: +56 9 XXXX XXXX
        return `+56 9 ${cleaned.slice(1, 5)} ${cleaned.slice(5)}`;
    } else if (cleaned.length === 8) {
        // Landline: (XX) XXXX XXXX
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
    }

    return phone;
}

/**
 * Slugify a string (convert to URL-friendly format)
 * @param str - String to slugify
 * @returns Slugified string
 */
export function slugify(str: string): string {
    return removeAccents(str)
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
