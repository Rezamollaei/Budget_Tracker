import { createContext, Fragment, useContext, type ReactNode } from 'react'
import { localeFor, translate, translatePlural, type Lang, type MessageKey, type PluralKey, type Vars } from './lib/i18n'
import type { AssetKind, CategoryId } from './lib/types'

export interface I18n {
  lang: Lang
  locale: string
  t: (key: MessageKey, vars?: Vars) => string
  tn: (key: PluralKey, n: number, vars?: Vars) => string
  /** Like t, but placeholders can be React elements, e.g. a bold amount. */
  rich: (text: string, vars: Record<string, ReactNode>) => ReactNode
  category: (id: CategoryId) => string
  assetKind: (id: AssetKind) => string
}

export function makeI18n(lang: Lang): I18n {
  return {
    lang,
    locale: localeFor(lang),
    t: (key, vars) => translate(lang, key, vars),
    tn: (key, n, vars) => translatePlural(lang, key, n, vars),
    rich: (text, vars) =>
      text.split(/(\{\w+\})/).map((part, i) => {
        const m = /^\{(\w+)\}$/.exec(part)
        return <Fragment key={i}>{m && m[1] in vars ? vars[m[1]] : part}</Fragment>
      }),
    category: (id) => translate(lang, `cat.${id}` as MessageKey),
    assetKind: (id) => translate(lang, `asset.${id}` as MessageKey),
  }
}

const I18nContext = createContext<I18n>(makeI18n('en'))

export const I18nProvider = I18nContext.Provider

export function useI18n(): I18n {
  return useContext(I18nContext)
}
