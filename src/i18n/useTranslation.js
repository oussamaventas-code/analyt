import { useSyncExternalStore } from 'react';
import { translations, DEFAULT_LANG } from './translations';

const STORAGE_KEY = 'metashop_lang';
const listeners = new Set();

let currentLang = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || DEFAULT_LANG;

export function setLang(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  currentLang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  listeners.forEach(fn => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot() {
  return currentLang;
}

function resolve(obj, path) {
  return path.split('.').reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

export function useTranslation() {
  const lang = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_LANG);

  const t = (key, fallback) => {
    const value = resolve(translations[lang], key);
    if (value !== undefined) return value;
    const enValue = resolve(translations.en, key);
    return enValue !== undefined ? enValue : (fallback || key);
  };

  return { t, lang, setLang };
}
