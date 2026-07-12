import { useMemo } from 'react'
import type { AppLanguage } from '@shared/types'
import { useAppStore } from '@/stores/appStore'
import { fa, type Dictionary } from './fa'
import { en } from './en'

const dictionaries: Record<AppLanguage, Dictionary> = { fa, en }

export function getDictionary(lang: AppLanguage): Dictionary {
  return dictionaries[lang] ?? fa
}

export function applyDocumentDirection(lang: AppLanguage): void {
  const rtl = lang === 'fa'
  document.documentElement.lang = lang
  document.documentElement.dir = rtl ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('data-lang', lang)
  document.body.classList.toggle('rtl', rtl)
  document.body.classList.toggle('ltr', !rtl)
}

export function useI18n(): {
  t: Dictionary
  lang: AppLanguage
  isRtl: boolean
} {
  const lang = useAppStore((s) => s.settings.language)
  const t = useMemo(() => getDictionary(lang), [lang])
  return { t, lang, isRtl: lang === 'fa' }
}

export { fa, en }
