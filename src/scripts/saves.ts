/**
 * Saved looks, stored in localStorage. No login, no database (spec 5e).
 * Saves are per-browser and are lost if the user clears their data.
 */

const KEY = 'fitinspo:saved:v1';

export function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    // Private mode, blocked storage, or corrupt value: behave as "nothing saved".
    return [];
  }
}

function writeSaved(slugs: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(slugs));
  } catch {
    /* Saving is a nicety; never let it break the page. */
  }
}

export function isSaved(slug: string): boolean {
  return readSaved().includes(slug);
}

export function toggleSaved(slug: string): boolean {
  const current = readSaved();
  const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
  writeSaved(next);
  return next.includes(slug);
}

function paintButton(button: HTMLElement, saved: boolean): void {
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', saved ? 'Remove this look from saved' : 'Save this look');
}

function paintCount(): void {
  const count = readSaved().length;
  for (const badge of document.querySelectorAll<HTMLElement>('[data-saved-count]')) {
    badge.dataset.count = String(count);
    badge.textContent = String(count);
  }
}

/** Wire every `[data-save]` heart on the page and keep the header count in sync. */
export function initSaves(): void {
  const saved = new Set(readSaved());

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-save]')) {
    if (!button.dataset.save) continue;
    paintButton(button, saved.has(button.dataset.save));
    button.addEventListener('click', (event) => {
      // Read the slug at click time: the swipe browser reuses one heart and
      // rewrites `data-save` as the card underneath changes.
      const slug = button.dataset.save;
      if (!slug) return;
      // Hearts sit on top of the tile link; don't follow it.
      event.preventDefault();
      event.stopPropagation();
      paintButton(button, toggleSaved(slug));
      paintCount();
      document.dispatchEvent(new CustomEvent('fitinspo:saveschange'));
    });
  }

  paintCount();
}
