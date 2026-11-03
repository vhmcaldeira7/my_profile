# 2. Route-based i18n

- Status: accepted
- Date: 2026-11-02

## Context

The prototype held PT in the DOM and swapped in EN or ES at runtime from a dictionary, remembering the choice in `localStorage`. That leaves crawlers and link previews with Portuguese only. A shared link can't carry a language, and nothing shows in the language without JavaScript.

## Decision

Make each language a real route, rendered at build time: PT at `/`, EN at `/en/`, ES at `/es/`.

- The copy lives in `src/i18n/{pt,en,es}.json`. PT is the reference dictionary.
- `useTranslations(locale)` returns `t(key)`, typed to PT's string keys. A typo is a compile error.
- A unit test fails when EN or ES is missing a PT key or has an extra one.
- Each page sets `<html lang>`, a canonical URL and `hreflang` alternates, including `x-default`. The nav switcher is three links with `aria-current="page"` on the current language.
- Runtime-drawn labels reach the scripts through `data-*` attributes rendered from the route's dictionary.
- The runtime DOM swapping and the `localStorage` memory are removed.

## Consequences

- Every language is indexable, shareable and complete without JavaScript.
- Switching language is a page load. The prototype rebuilt the scroll layout in place, and the reader's scroll position is not carried over.
- Dictionaries hold plain text only. Markup that wrapped untranslated names, such as company suffixes and a line break, moved into the templates.
