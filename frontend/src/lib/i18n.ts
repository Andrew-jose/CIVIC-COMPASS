/**
 * CIVIC COMPASS — i18n Configuration (8 Languages)
 * Uses react-i18next for multilingual support.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import zh from '../locales/zh.json';
import hi from '../locales/hi.json';
import ar from '../locales/ar.json';
import pt from '../locales/pt.json';
import vi from '../locales/vi.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  zh: { translation: zh },
  hi: { translation: hi },
  ar: { translation: ar },
  pt: { translation: pt },
  vi: { translation: vi },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
