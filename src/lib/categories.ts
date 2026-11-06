import type { Category, CategoryId, Expense } from './types'

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food & drink', emoji: '🍔', color: '#f97316' },
  { id: 'groceries', label: 'Groceries', emoji: '🛒', color: '#22c55e' },
  { id: 'transport', label: 'Transport', emoji: '🚌', color: '#3b82f6' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#ec4899' },
  { id: 'bills', label: 'Bills', emoji: '💡', color: '#eab308' },
  { id: 'home', label: 'Home', emoji: '🏠', color: '#8b5cf6' },
  { id: 'health', label: 'Health', emoji: '💊', color: '#14b8a6' },
  { id: 'fun', label: 'Fun', emoji: '🎬', color: '#ef4444' },
  { id: 'travel', label: 'Travel', emoji: '✈️', color: '#06b6d4' },
  { id: 'other', label: 'Other', emoji: '📦', color: '#94a3b8' },
]

const BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]))

export function getCategory(id: CategoryId): Category {
  return BY_ID.get(id) ?? BY_ID.get('other')!
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && BY_ID.has(value as CategoryId)
}

const KEYWORDS: Record<Exclude<CategoryId, 'other'>, string[]> = {
  food: ['caffè', 'caffe', 'pranzo', 'cena', 'colazione', 'aperitivo', 'gelato', 'cornetto', 'ristorante', 'pizzeria', 'panino', 'birra', 'coffee', 'cafe', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'restaurant', 'snack', 'tea', 'sandwich', 'takeaway', 'kebab', 'sushi', 'bar', 'beer', 'drink', 'starbucks', 'mcdonalds', 'food'],
  groceries: ['spesa', 'supermercato', 'mercato', 'pane', 'latte', 'frutta', 'verdura', 'conad', 'coop', 'esselunga', 'carrefour', 'eurospin', 'grocery', 'groceries', 'supermarket', 'market', 'bread', 'milk', 'eggs', 'fruit', 'vegetables', 'aldi', 'lidl', 'walmart', 'costco', 'tesco'],
  transport: ['benzina', 'treno', 'autobus', 'biglietto', 'parcheggio', 'pedaggio', 'trenitalia', 'italo', 'atm', 'uber', 'taxi', 'bus', 'metro', 'train', 'subway', 'fuel', 'gas', 'petrol', 'parking', 'snapp', 'lyft', 'bolt', 'ticket', 'toll'],
  shopping: ['vestiti', 'scarpe', 'regalo', 'libro', 'libri', 'negozio', 'clothes', 'shoes', 'amazon', 'shirt', 'gift', 'electronics', 'book', 'books', 'shop', 'store'],
  bills: ['affitto', 'bolletta', 'bollette', 'luce', 'acqua', 'telefono', 'abbonamento', 'assicurazione', 'tasse', 'rent', 'electricity', 'water', 'internet', 'phone', 'mobile', 'insurance', 'subscription', 'netflix', 'spotify', 'bill', 'tax'],
  home: ['mobili', 'pulizie', 'riparazione', 'cucina', 'furniture', 'ikea', 'cleaning', 'repair', 'kitchen', 'decor', 'tools'],
  health: ['farmacia', 'medico', 'medicine', 'dentista', 'palestra', 'ospedale', 'pharmacy', 'doctor', 'medicine', 'dentist', 'gym', 'hospital', 'vitamins'],
  fun: ['concerto', 'gioco', 'giochi', 'festa', 'museo', 'cinema', 'movie', 'concert', 'game', 'games', 'party', 'museum', 'bowling'],
  travel: ['albergo', 'volo', 'viaggio', 'vacanza', 'vacanze', 'hotel', 'flight', 'airbnb', 'hostel', 'trip', 'vacation', 'holiday'],
}

const KEYWORD_INDEX = new Map<string, CategoryId>()
for (const [category, words] of Object.entries(KEYWORDS)) {
  for (const word of words) KEYWORD_INDEX.set(word, category as CategoryId)
}

export function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Guess a category for a description: your own history wins over built-in
 * keywords, so the app learns how you categorise things.
 */
export function guessCategory(description: string, history: Expense[]): CategoryId | null {
  const needle = normalizeText(description)
  if (!needle) return null

  let latest: Expense | null = null
  for (const e of history) {
    if (normalizeText(e.description) === needle && (!latest || e.createdAt > latest.createdAt)) latest = e
  }
  if (latest) return latest.category

  for (const word of needle.split(/[^\p{L}\p{N}]+/u)) {
    const hit = KEYWORD_INDEX.get(word) ?? KEYWORD_INDEX.get(word.replace(/s$/, ''))
    if (hit) return hit
  }
  return null
}
