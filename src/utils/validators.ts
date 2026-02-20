/**
 * Validation utilities
 */

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate Chilean RUT (Rol Único Tributario)
 * @param rut - RUT string to validate (with or without formatting)
 * @returns True if valid RUT
 */
export function isValidRUT(rut: string): boolean {
    // Remove formatting
    const cleaned = rut.replace(/[.-]/g, "");

    if (cleaned.length < 2) return false;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1).toUpperCase();

    // Calculate verification digit
    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDV = 11 - (sum % 11);
    const calculatedDV = expectedDV === 11 ? "0" : expectedDV === 10 ? "K" : String(expectedDV);

    return dv === calculatedDV;
}

/**
 * Validate phone number (Chilean format)
 * @param phone - Phone string to validate
 * @returns True if valid phone format
 */
export function isValidPhone(phone: string): boolean {
    // Remove formatting
    const cleaned = phone.replace(/[\s()-]/g, "");

    // Chilean phone: 9 digits starting with 9 (mobile) or 8 digits (landline)
    return /^9\d{8}$/.test(cleaned) || /^\d{8}$/.test(cleaned);
}

/**
 * Validate barcode format (EAN-8, EAN-13, UPC-A)
 * @param barcode - Barcode string to validate
 * @returns True if valid barcode format
 */
export function isValidBarcode(barcode: string): boolean {
    const cleaned = barcode.trim();

    // Check length (8, 12, or 13 digits)
    if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(cleaned)) {
        return false;
    }

    // Validate checksum for EAN-13
    if (cleaned.length === 13) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(cleaned[i]);
            sum += i % 2 === 0 ? digit : digit * 3;
        }
        const checksum = (10 - (sum % 10)) % 10;
        return checksum === parseInt(cleaned[12]);
    }

    return true; // For other lengths, just check format
}

/**
 * Validate positive number
 * @param value - Value to validate
 * @returns True if positive number
 */
export function isPositiveNumber(value: number): boolean {
    return typeof value === "number" && !isNaN(value) && value > 0;
}

/**
 * Validate non-negative number
 * @param value - Value to validate
 * @returns True if non-negative number
 */
export function isNonNegativeNumber(value: number): boolean {
    return typeof value === "number" && !isNaN(value) && value >= 0;
}

/**
 * Validate string is not empty
 * @param value - String to validate
 * @returns True if non-empty string
 */
export function isNonEmptyString(value: string): boolean {
    return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate number is within range
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}
