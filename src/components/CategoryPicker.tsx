import { CATEGORIES } from '../lib/categories'
import type { CategoryId } from '../lib/types'
import { useI18n } from '../i18n'

interface Props {
  value: CategoryId
  onChange: (id: CategoryId) => void
  guessed?: boolean
}

export function CategoryPicker({ value, onChange, guessed }: Props) {
  const { t, category } = useI18n()
  return (
    <div className="chips" role="radiogroup" aria-label={t('category')}>
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
          <span aria-hidden="true">{c.emoji}</span> {category(c.id)}
        </button>
      ))}
    </div>
  )
}
