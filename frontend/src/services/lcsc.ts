/**
 * LCSC barcode / QR-code scan data parser.
 *
 * LCSC reels use two common formats:
 *   1. Plain part number  → "C12345"
 *   2. Comma-delimited    → "C12345,100,LCSC,..." (part, qty, …)
 *
 * Some scanners prepend/append whitespace – always trim first.
 */

export interface ParsedScan {
  partNumber: string;
  quantity?: number;
}

/**
 * Parse raw scan data from a barcode scanner into a structured object.
 */
export function parseScanData(rawScan: string): ParsedScan {
  const trimmed = rawScan.trim();

  if (trimmed.includes(",")) {
    const parts = trimmed.split(",");
    const partNumber = formatPartNumber(parts[0].trim());

    let quantity: number | undefined;
    if (parts.length > 1) {
      const parsed = parseInt(parts[1].trim(), 10);
      if (!isNaN(parsed) && parsed > 0) {
        quantity = parsed;
      }
    }
    return { partNumber, quantity };
  }

  return { partNumber: formatPartNumber(trimmed) };
}

/**
 * Normalise a raw token to a valid LCSC part number ("C" + digits).
 * If the token already starts with "C" (case-insensitive) followed by digits,
 * upper-case it; otherwise return it as-is so the API can handle it.
 */
export function formatPartNumber(raw: string): string {
  const cleaned = raw.trim();
  // Already looks like a valid LCSC part number
  if (/^[Cc]\d+$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }
  // Try extracting "C<digits>" from within a longer string (e.g. QR payload)
  const match = cleaned.match(/[Cc](\d+)/);
  if (match) {
    return `C${match[1]}`;
  }
  return cleaned;
}
