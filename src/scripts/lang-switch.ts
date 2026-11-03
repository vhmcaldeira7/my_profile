/**
 * Progressive enhancement for the language switcher. The links already work on their own;
 * this keeps the reader's section (the hash) across languages, since every route shares the same section ids,
 * and sends the prototype's legacy `?lang=en|es` links on the PT route to the matching route.
 */
const links = () => [...document.querySelectorAll<HTMLAnchorElement>('.lang a[data-locale]')];

/** Returns true when the page is being replaced by a redirect. */
export function redirectLegacyLang(): boolean {
  const wanted = new URLSearchParams(location.search).get('lang');
  const current = document.querySelector<HTMLAnchorElement>('.lang a[aria-current="page"]')?.dataset['locale'];
  if (current !== 'pt' || (wanted !== 'en' && wanted !== 'es')) return false;
  const target = links().find((a) => a.dataset['locale'] === wanted);
  if (!target) return false;
  location.replace(new URL(target.getAttribute('href') ?? '', location.href).pathname + location.hash);
  return true;
}

export function initLangSwitch(): () => void {
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('.lang a[data-locale]');
    if (!a || !location.hash) return;
    a.href = new URL(a.getAttribute('href') ?? '', location.href).pathname + location.hash;
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
