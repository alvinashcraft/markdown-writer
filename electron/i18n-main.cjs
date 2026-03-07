const i18next = require('i18next');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'es'],
  initImmediate: false,
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  interpolation: { escapeValue: false },
});

module.exports = i18next;
