import { CATEGORIES } from '../lib/categories'
import type { CategoryId } from '../lib/types'

interface Props {
  value: CategoryId
  onChange: (id: CategoryId) => void
  guessed?: boolean
}

export function CategoryPicker({ value, onChange, guessed }: Props) {
  return (
    <div className="chips" role="radiogroup" aria-label="Category">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={value === c.id}
          className={`chip${value === c.id ? ' chip-on' : ''}${value === c.id && guessed ? ' chip-guessed' : ''}`}
          style={{ ['--chip' as string]: c.color }}
          onClick={() => onChange(c.id)}
        >
          <span aria-hidden="true">{c.emoji}</span> {c.label}
        </button>
      ))}
    </div>
  )
}
