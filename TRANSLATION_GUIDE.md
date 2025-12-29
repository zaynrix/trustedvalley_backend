# 🌍 Translation Guide

This API supports internationalization (i18n) for **English**, **Arabic**, and **German**.

## 📋 Supported Languages

- **English (en)** - Default
- **Arabic (ar)** - العربية
- **German (de)** - Deutsch

## 🔧 How It Works

The API uses `i18next` and `i18next-http-middleware` to detect the user's preferred language and return translated messages.

## 🌐 Language Detection

The API detects the language preference in the following order:

1. **Query Parameter** - `?lang=en` or `?lang=ar` or `?lang=de`
2. **HTTP Header** - `Accept-Language: ar,en;q=0.9`
3. **Cookie** - `i18next=de`

### Examples

**Using Query Parameter:**
```bash
curl "http://localhost:3000/api/auth/login?lang=ar" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

**Using HTTP Header:**
```bash
curl "http://localhost:3000/api/auth/login" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Accept-Language: ar" \
  -d '{"email":"user@example.com","password":"password"}'
```

**Using Cookie:**
```bash
curl "http://localhost:3000/api/auth/login" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: i18next=de" \
  -d '{"email":"user@example.com","password":"password"}'
```

## 📝 Translated Messages

### Error Messages

All error responses are automatically translated:

**English:**
```json
{
  "error": "email-already-in-use",
  "message": "Email is already registered"
}
```

**Arabic:**
```json
{
  "error": "email-already-in-use",
  "message": "البريد الإلكتروني مسجل بالفعل"
}
```

**German:**
```json
{
  "error": "email-already-in-use",
  "message": "E-Mail ist bereits registriert"
}
```

### Success Messages

Success messages are also translated:

**English:**
```json
{
  "message": "Password reset successfully"
}
```

**Arabic:**
```json
{
  "message": "تم إعادة تعيين كلمة المرور بنجاح"
}
```

**German:**
```json
{
  "message": "Passwort erfolgreich zurückgesetzt"
}
```

## 📂 Translation Files

Translation files are located in:
- `locales/en/translation.json` - English
- `locales/ar/translation.json` - Arabic
- `locales/de/translation.json` - German

## 🔨 Adding New Translations

To add a new translatable message:

1. **Add the key to all translation files:**

`locales/en/translation.json`:
```json
{
  "messages": {
    "new-message": "New message in English"
  }
}
```

`locales/ar/translation.json`:
```json
{
  "messages": {
    "new-message": "رسالة جديدة بالعربية"
  }
}
```

`locales/de/translation.json`:
```json
{
  "messages": {
    "new-message": "Neue Nachricht auf Deutsch"
  }
}
```

2. **Use it in your controller:**
```javascript
const { translate } = require('../../utils/i18n');

res.json({ message: translate(req, 'messages.new-message') });
```

## 🎯 Translation Keys

### Error Keys
- `errors.email-already-in-use`
- `errors.weak-password`
- `errors.invalid-email`
- `errors.user-not-found`
- `errors.wrong-password`
- `errors.email-required`
- `errors.password-required`
- `errors.fullname-required`
- `errors.fields-required`
- `errors.not-authenticated`
- `errors.forbidden`
- `errors.something-went-wrong`
- `errors.postgres-required`

### Message Keys
- `messages.password-reset-success`
- `messages.password-changed-success`
- `messages.user-created-success`
- `messages.user-deleted-success`
- `messages.welcome-admin`
- `messages.guest-access-ok`
- `messages.temp-password-sent`
- `messages.reset-email-sent`

### Validation Keys
- `validation.current-password-required`
- `validation.email-newpassword-required`

## 🧪 Testing Translations

Test different languages:

```bash
# English (default)
curl "http://localhost:3000/api/auth/login?lang=en" \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'

# Arabic
curl "http://localhost:3000/api/auth/login?lang=ar" \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'

# German
curl "http://localhost:3000/api/auth/login?lang=de" \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
```

## 📚 API Response Format

All API responses maintain the same structure regardless of language:

```json
{
  "error": "error-code",
  "message": "Translated message based on language preference"
}
```

The `error` field always contains the English error code for programmatic handling, while the `message` field contains the translated human-readable message.

## 🔄 Default Behavior

If no language preference is specified, the API defaults to **English**.

If a translation key is missing for a language, it falls back to **English**.

