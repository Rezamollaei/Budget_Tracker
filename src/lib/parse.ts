import { parseAmount } from './money'

export interface ParsedEntry {
  amount: number | null
  description: string
  /** 0 = today, -1 = yesterday */
  dayOffset: number
}

const AMOUNT_TOKEN = /^[$€£¥₹﷼]?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?|\.\d+)[$€£¥₹﷼]?$/

/**
 * Parse one-line entries such as "coffee 4.50", "12 lunch with Sam" or
 * "taxi 18 yesterday". The last number-only word is the amount.
 */
export function parseEntry(text: string): ParsedEntry {
  let dayOffset = 0
  const words = text.trim().split(/\s+/).filter(Boolean)
  const rest: string[] = []
  let amount: number | null = null
  let amountIndex = -1

  words.forEach((word, i) => {
    if (AMOUNT_TOKEN.test(word) && parseAmount(word) !== null) amountIndex = i
  })

  words.forEach((word, i) => {
    const lower = word.toLowerCase()
    if (i === amountIndex) {
      amount = parseAmount(word)
    } else if (lower === 'yesterday') {
      dayOffset = -1
    } else if (lower === 'today') {
      dayOffset = 0
    } else {
      rest.push(word)
    }
  })

  const description = rest.join(' ')
  return {
    amount,
    description: description ? description.charAt(0).toUpperCase() + description.slice(1) : '',
    dayOffset,
  }
}
