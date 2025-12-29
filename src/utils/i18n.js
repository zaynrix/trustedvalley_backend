const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const Backend = require('i18next-fs-backend');
const path = require('path');

i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    lng: 'en', // default language
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar', 'de'],
    preload: ['en', 'ar', 'de'],
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: path.join(__dirname, '../../locales/{{lng}}/{{ns}}.json'),
    },
    detection: {
      order: ['querystring', 'header', 'cookie'],
      caches: ['cookie'],
      lookupQuerystring: 'lang',
      lookupHeader: 'accept-language',
      lookupCookie: 'i18next',
    },
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

const middleware = i18nextMiddleware.handle(i18next);

// Helper function to get translation
function t(key, options = {}) {
  return i18next.t(key, options);
}

// Helper function to get translation from request
function translate(req, key, options = {}) {
  return req.t ? req.t(key, options) : i18next.t(key, options);
}

module.exports = {
  i18next,
  middleware,
  t,
  translate,
};

