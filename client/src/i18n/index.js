import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { setDefaultOptions } from 'date-fns';
import { de as germanDateLocale } from 'date-fns/locale';
import en from './en.json';
import de from './de.json';

const savedLang = localStorage.getItem('blunder_lang') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

const updateDateLocale = (language) => {
  setDefaultOptions({ locale: language?.startsWith('de') ? germanDateLocale : undefined });
};

updateDateLocale(savedLang);
i18n.on('languageChanged', updateDateLocale);

export default i18n;
