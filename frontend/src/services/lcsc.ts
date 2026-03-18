/**
 * LCSC barcode / QR-code scan data parser.
 *
 * LCSC reels use several formats:
 *   1. Plain part number  → "C12345"
 *   2. Comma-delimited    → "C12345,100,LCSC,..." (part, qty, …)
 *   3. Key:value payloads → "{pbn:PICK...,pc:C2913206,pm:...,qty:3,...}" (QR payloads from LCSC/WMSC)
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
export function parseScanData( rawScan: string ): ParsedScan {
    const trimmed = rawScan.trim()

    const pcRegex = /["']?pc["']?\s*:\s*["']?([^,"'}\s]+)["']?/i
    const qtyRegex = /["']?qty["']?\s*:\s*["']?(\d+)["']?/i

    const pcMatch = trimmed.match(pcRegex)
    if (pcMatch && pcMatch[1]) {
        const partNumber = formatPartNumber(pcMatch[1].trim())
        const qtyMatch = trimmed.match(qtyRegex)
        const quantity = qtyMatch && qtyMatch[1] ? parseInt(qtyMatch[1], 10) : undefined
        return {partNumber, quantity}
    }

    if (trimmed.includes(',')) {
        const parts = trimmed.split(',')
        const partNumber = formatPartNumber(parts[0].trim())

        let quantity: number | undefined
        if (parts.length > 1) {
            const parsed = parseInt(parts[1].trim(), 10)
            if (!isNaN(parsed) && parsed > 0) {
                quantity = parsed
            }
        }
        return {partNumber, quantity}
    }

    return {partNumber: formatPartNumber(trimmed)}
}

/**
 * Normalise a raw token to a valid LCSC part number ("C" + digits).
 * If the token already starts with "C" (case-insensitive) followed by digits,
 * upper-case it; otherwise try to extract a "C<digits>" substring; otherwise
 * return the original cleaned token so the API can attempt to resolve it.
 */
export function formatPartNumber( raw: string ): string {
    const cleaned = raw.trim()
    if (/^[Cc]\d+$/.test(cleaned)) {
        return cleaned.toUpperCase()
    }
    const match = cleaned.match(/[Cc](\d+)/)
    if (match) {
        return `C${match[1]}`
    }
    return cleaned
}
