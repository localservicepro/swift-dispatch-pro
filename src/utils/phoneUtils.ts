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
  
  // Must have at least 3 digits to be considered a phone search
  if (digitsOnly.length < 3) return false;
  
  // Check for Australian phone patterns (mobile and landline)
  const australianMobilePattern = /^(\+?614|04|4)/.test(searchTerm.replace(/\s/g, ''));
  const australianLandlinePattern = /^(\+?61[2378]|0[2378])/.test(searchTerm.replace(/\s/g, ''));
  const internationalPattern = /^(\+?61)/.test(searchTerm.replace(/\s/g, ''));
  
  // Consider it a phone number if it matches Australian patterns or has many digits
  return australianMobilePattern || australianLandlinePattern || internationalPattern || digitsOnly.length >= 6;
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
  
  // Partial match — allow startsWith (progressive typing) and endsWith (last-digits lookup)
  // Require at least 4 digits for partial matching to avoid overly broad results
  if (normalizedSearch.length >= 4 && (
    normalizedStored.startsWith(normalizedSearch) || normalizedStored.endsWith(normalizedSearch)
  )) return true;
  
  // Handle cases where one number has country code and other doesn't
  const storedWithoutCountry = normalizedStored.startsWith('61') ? '0' + normalizedStored.substring(2) : normalizedStored;
  const searchWithoutCountry = normalizedSearch.startsWith('61') ? '0' + normalizedSearch.substring(2) : normalizedSearch;
  
  if (storedWithoutCountry === searchWithoutCountry) return true;
  if (searchWithoutCountry.length >= 4 && (
    storedWithoutCountry.startsWith(searchWithoutCountry) || storedWithoutCountry.endsWith(searchWithoutCountry)
  )) return true;
  
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

/**
 * Build search variants for a user-typed phone query so it matches
 * stored phones regardless of formatting (spaces, country code, etc.).
 *
 * Returns substrings safe to drop into Postgres ILIKE patterns
 * (no commas or wildcards). Caller is responsible for wrapping in `%...%`.
 */
export function getPhoneSearchVariants(input: string): string[] {
  if (!input) return [];

  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 0) return [trimmed];

  const set = new Set<string>();
  set.add(trimmed);
  set.add(digits);

  // Convert international 61 prefix to local 0 prefix and vice versa
  let local = digits;
  if (digits.startsWith("61") && digits.length >= 11) {
    local = "0" + digits.substring(2);
  }
  set.add(local);

  let intl = digits;
  if (digits.startsWith("0") && digits.length === 10) {
    intl = "61" + digits.substring(1);
  }
  set.add(intl);

  // Spaced AU formats — only when we have a complete 10-digit local number
  if (local.length === 10 && local.startsWith("0")) {
    if (local.startsWith("04")) {
      // Mobile: 04XX XXX XXX
      set.add(`${local.substring(0, 4)} ${local.substring(4, 7)} ${local.substring(7)}`);
    } else {
      // Landline: 0X XXXX XXXX
      set.add(`${local.substring(0, 2)} ${local.substring(2, 6)} ${local.substring(6)}`);
    }
  }

  // Spaced international (+61 4XX XXX XXX)
  if (intl.length === 11 && intl.startsWith("61")) {
    const rest = intl.substring(2); // 9 digits
    if (rest.startsWith("4")) {
      set.add(`+61 ${rest.substring(0, 3)} ${rest.substring(3, 6)} ${rest.substring(6)}`);
      set.add(`+61 ${rest}`);
    } else {
      set.add(`+61 ${rest.substring(0, 1)} ${rest.substring(1, 5)} ${rest.substring(5)}`);
    }
  }

  // Strip any values containing commas or % (defensive — should never happen)
  return [...set].filter(v => v && !v.includes(",") && !v.includes("%"));
}