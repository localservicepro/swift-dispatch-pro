/**
 * Phone number utilities for Australian phone number handling
 * Supports various Australian phone formats and normalization for search
 */

/**
 * Normalizes a phone number by removing all formatting and converting to consistent format
 * @param phoneNumber The phone number to normalize
 * @returns Normalized phone number string
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Handle Australian mobile numbers
  if (digitsOnly.startsWith('614') && digitsOnly.length === 12) {
    // Convert +614XXXXXXXX to 04XXXXXXXX
    return '0' + digitsOnly.substring(2);
  }
  
  if (digitsOnly.startsWith('61') && digitsOnly.length === 11) {
    // Convert 614XXXXXXXX to 04XXXXXXXX  
    return '0' + digitsOnly.substring(2);
  }
  
  // Return normalized digits (remove leading zeros for international format)
  return digitsOnly;
}

/**
 * Checks if a search term looks like a phone number
 * @param searchTerm The search term to check
 * @returns true if it looks like a phone number
 */
export function isPhoneNumber(searchTerm: string): boolean {
  if (!searchTerm) return false;
  
  // Remove all non-digit characters and check length
  const digitsOnly = searchTerm.replace(/\D/g, '');
  
  // Must have at least 6 digits to be considered a phone search
  if (digitsOnly.length < 6) return false;
  
  // Check for common Australian phone patterns
  const hasPhonePattern = /^(\+?61|0)[0-9]/.test(searchTerm.replace(/\s/g, ''));
  const hasMultipleDigits = digitsOnly.length >= 8;
  
  return hasPhonePattern || hasMultipleDigits;
}

/**
 * Enhanced phone number matching for search functionality
 * @param storedPhone The phone number stored in the database
 * @param searchTerm The search term entered by user
 * @returns true if the phone numbers match
 */
export function phoneSearchMatch(storedPhone: string | null, searchTerm: string): boolean {
  if (!storedPhone || !searchTerm) return false;
  
  const normalizedStored = normalizePhoneNumber(storedPhone);
  const normalizedSearch = normalizePhoneNumber(searchTerm);
  
  // Direct match
  if (normalizedStored === normalizedSearch) return true;
  
  // Partial match - search term is contained in stored number
  if (normalizedStored.includes(normalizedSearch)) return true;
  
  // Reverse partial match - stored number is contained in search term
  if (normalizedSearch.includes(normalizedStored)) return true;
  
  // Handle cases where one number has country code and other doesn't
  const storedWithoutCountry = normalizedStored.startsWith('61') ? '0' + normalizedStored.substring(2) : normalizedStored;
  const searchWithoutCountry = normalizedSearch.startsWith('61') ? '0' + normalizedSearch.substring(2) : normalizedSearch;
  
  if (storedWithoutCountry === searchWithoutCountry) return true;
  if (storedWithoutCountry.includes(searchWithoutCountry)) return true;
  if (searchWithoutCountry.includes(storedWithoutCountry)) return true;
  
  return false;
}

/**
 * Formats an Australian phone number for display
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number string
 */
export function formatAustralianPhone(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  const normalized = normalizePhoneNumber(phoneNumber);
  
  // Format mobile numbers (04XX XXX XXX)
  if (normalized.startsWith('04') && normalized.length === 10) {
    return `${normalized.substring(0, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7)}`;
  }
  
  // Format landline numbers (0X XXXX XXXX)
  if (normalized.startsWith('0') && normalized.length === 10) {
    return `${normalized.substring(0, 2)} ${normalized.substring(2, 6)} ${normalized.substring(6)}`;
  }
  
  // Return original if can't format
  return phoneNumber;
}

/**
 * Creates multiple phone number variations for comprehensive search matching
 * @param phoneNumber The phone number to create variations for
 * @returns Array of phone number variations
 */
export function getPhoneVariations(phoneNumber: string): string[] {
  if (!phoneNumber) return [];
  
  const normalized = normalizePhoneNumber(phoneNumber);
  const variations: string[] = [normalized];
  
  // Add formatted version
  const formatted = formatAustralianPhone(phoneNumber);
  if (formatted !== phoneNumber) {
    variations.push(formatted);
  }
  
  // Add international format if it's an Australian mobile
  if (normalized.startsWith('04') && normalized.length === 10) {
    variations.push('61' + normalized.substring(1)); // 614XXXXXXXX
    variations.push('+61 ' + normalized.substring(1)); // +61 4XXXXXXXX
  }
  
  // Add original format
  variations.push(phoneNumber);
  
  return [...new Set(variations)]; // Remove duplicates
}