import { createContext, useContext, useState, useEffect, createElement, useCallback } from 'react'
import ru from './ru.js'
import en from './en.js'

const DICTIONARIES = { ru, en }

const LangContext = createContext({
  lang: 'ru',
  setLang: () => {},
})

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('math_lang')
    if (saved === 'en' || saved === 'ru') return saved
    const browser = navigator.language?.slice(0, 2)
    return browser === 'ru' ? 'ru' : 'en'
  })

  useEffect(() => {
    localStorage.setItem('math_lang', lang)
    document.documentElement.lang = lang
  }, [lang])

  return createElement(LangContext.Provider, { value: { lang, setLang } }, children)
}

export function useLang() {
  return useContext(LangContext)
}

export function useT() {
  const { lang } = useLang()
  return useCallback((key) => {
    const dict = DICTIONARIES[lang] ?? ru
    const v = dict[key]
    return v !== undefined ? v : key
  }, [lang])
}
