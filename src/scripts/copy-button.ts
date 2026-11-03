/**
 * Copies the LinkedIn URL; when the clipboard is unavailable, selects the visible link so the visitor can copy it.
 * The new state is also written to a polite live region, so screen readers announce it.
 */
export function initCopyButton(
  copy: HTMLButtonElement,
  fallbackTarget: Element | null,
  status: HTMLElement | null = null,
): () => void {
  const label = copy.dataset['label'] ?? copy.textContent ?? '';
  const labelDone = copy.dataset['labelDone'] ?? label;
  let timer = 0;
  const onClick = () => {
    const done = () => {
      copy.dataset['state'] = 'copied';
      copy.textContent = labelDone;
      if (status) status.textContent = labelDone;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        delete copy.dataset['state'];
        copy.textContent = label;
        if (status) status.textContent = '';
      }, 1800);
    };
    const fail = () => {
      if (!fallbackTarget) return;
      const r = document.createRange();
      r.selectNodeContents(fallbackTarget);
      const s = getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
    };
    try {
      navigator.clipboard.writeText(copy.dataset['copy'] ?? '').then(done, fail);
    } catch {
      fail();
    }
  };
  copy.addEventListener('click', onClick);
  return () => {
    copy.removeEventListener('click', onClick);
    clearTimeout(timer);
  };
}
