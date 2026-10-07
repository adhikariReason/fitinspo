/**
 * Two-way swipe browser (spec 5c), ported from the pointer-event implementation
 * in mockup/Swipe.dc.html.
 *
 *   horizontal drag = previous / next look inside the category
 *   vertical drag   = previous / next category
 *
 * The card follows the finger, tilts with horizontal movement and glides aside
 * past the threshold. Nothing is destroyed, so swiping back brings the previous
 * look in again.
 */

import { isSaved } from './saves';

export interface SwipeLook {
  slug: string;
  title: string;
  note: string;
  count: number;
  bg: string;
  ink: string;
  image: string;
  alt: string;
  url: string;
}

export interface SwipeCategory {
  slug: string;
  label: string;
  looks: SwipeLook[];
}

/** Drag distance, in px, past which the card leaves. */
const THRESHOLD = 90;
/** Movement, in px, before the gesture commits to one axis. */
const AXIS_LOCK = 8;
const LEAVE_MS_X = 240;
const LEAVE_MS_Y = 260;

type Axis = 'x' | 'y' | null;

interface Leave {
  x: number;
  y: number;
  rot: number;
}

export function initSwipe(categories: SwipeCategory[], startCategory?: string): void {
  const cats = categories.filter((c) => c.looks.length > 0);
  const root = document.querySelector<HTMLElement>('[data-swipe]');
  if (!root || cats.length === 0) return;

  const el = {
    card: root.querySelector<HTMLElement>('[data-card]')!,
    photo: root.querySelector<HTMLElement>('[data-photo]')!,
    img: root.querySelector<HTMLImageElement>('[data-img]')!,
    note: root.querySelector<HTMLElement>('[data-note]')!,
    title: root.querySelector<HTMLElement>('[data-title]')!,
    count: root.querySelector<HTMLElement>('[data-count]')!,
    shop: root.querySelector<HTMLAnchorElement>('[data-shop]')!,
    save: root.querySelector<HTMLButtonElement>('[data-card-save]')!,
    peek: root.querySelector<HTMLElement>('[data-peek]')!,
    peekNote: root.querySelector<HTMLElement>('[data-peek-note]')!,
    catName: root.querySelector<HTMLElement>('[data-cat-name]')!,
    position: root.querySelector<HTMLElement>('[data-position]')!,
    dots: root.querySelector<HTMLElement>('[data-dots]')!,
    catDots: root.querySelector<HTMLElement>('[data-cat-dots]')!,
    hint: root.querySelector<HTMLElement>('[data-hint]')!,
    live: root.querySelector<HTMLElement>('[data-live]')!,
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const initial = Math.max(0, cats.findIndex((c) => c.slug === startCategory));
  let ci = initial;
  /** Remembered position within each category, so going back up returns you there. */
  const idx = cats.map(() => 0);
  let dx = 0;
  let dy = 0;
  let dragging = false;
  let leave: Leave | null = null;
  let noAnim = false;
  let moved = false;
  let axis: Axis = null;
  let start: { x: number; y: number; id: number } | null = null;

  function current(): SwipeLook {
    return cats[ci]!.looks[idx[ci]!]!;
  }

  /** The look that peeks from behind: next in this category, else next category. */
  function peekLook(): SwipeLook | null {
    const cat = cats[ci]!;
    return cat.looks[idx[ci]! + 1] ?? cats[ci + 1]?.looks[idx[ci + 1]!] ?? null;
  }

  function go(onAxis: 'x' | 'y', dir: 1 | -1): void {
    if (leave) return;

    if (onAxis === 'x') {
      const next = idx[ci]! + dir;
      if (next < 0 || next >= cats[ci]!.looks.length) {
        snapBack();
        return;
      }
      leave = { x: -dir * 470, y: 0, rot: -dir * 16 };
      dragging = false;
      render();
      after(reduceMotion ? 0 : LEAVE_MS_X, () => {
        idx[ci] = next;
        settle();
      });
    } else {
      const nextCat = ci + dir;
      if (nextCat < 0 || nextCat >= cats.length) {
        snapBack();
        return;
      }
      leave = { x: 0, y: -dir * 900, rot: 0 };
      dragging = false;
      render();
      after(reduceMotion ? 0 : LEAVE_MS_Y, () => {
        ci = nextCat;
        settle();
      });
    }
  }

  function settle(): void {
    leave = null;
    dx = 0;
    dy = 0;
    moved = true;
    // Jump the card back to centre without animating, then re-enable transitions.
    noAnim = true;
    render();
    after(40, () => {
      noAnim = false;
      render();
      el.live.textContent = `${cats[ci]!.label}: ${current().title}, ${idx[ci]! + 1} of ${cats[ci]!.looks.length}`;
    });
  }

  function snapBack(): void {
    dx = 0;
    dy = 0;
    dragging = false;
    render();
  }

  function after(ms: number, fn: () => void): void {
    if (ms <= 0) fn();
    else window.setTimeout(fn, ms);
  }

  function render(): void {
    const cat = cats[ci]!;
    const look = current();
    const li = idx[ci]!;

    let x = dx;
    let y = dy;
    let rot = dx / 18;
    if (axis === 'y') {
      x = 0;
      rot = 0;
    }
    if (axis === 'x') {
      y = dy * 0.12;
    }
    if (leave) {
      x = leave.x;
      y = leave.y;
      rot = leave.rot;
    }

    el.card.style.transition =
      dragging || noAnim || reduceMotion ? 'none' : 'transform 260ms cubic-bezier(.2,.8,.2,1)';
    el.card.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;

    el.photo.style.background = look.bg;
    if (el.img.getAttribute('src') !== look.image) {
      el.img.src = look.image;
      el.img.alt = look.alt;
    }
    el.note.textContent = look.note;
    el.note.style.color = look.ink;
    el.title.textContent = look.title;
    el.count.textContent = `${look.count} pieces to shop`;
    el.shop.href = look.url;
    el.shop.setAttribute('aria-label', `Shop ${look.title}`);

    // The heart belongs to whichever look is on top.
    el.save.dataset.save = look.slug;
    const saved = isSaved(look.slug);
    el.save.setAttribute('aria-pressed', String(saved));
    el.save.setAttribute('aria-label', saved ? 'Remove this look from saved' : 'Save this look');

    const peek = peekLook();
    el.peek.hidden = peek === null;
    if (peek) {
      el.peek.style.background = peek.bg;
      el.peekNote.textContent = peek.note;
      el.peekNote.style.color = peek.ink;
    }

    el.catName.textContent = cat.label;
    el.position.textContent = `${li + 1} of ${cat.looks.length}`;
    el.hint.textContent = moved
      ? 'Swipe for more'
      : 'Swipe sideways for looks, up or down for categories';

    el.dots.replaceChildren(
      ...cat.looks.map((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'sw-dot';
        if (i === li) dot.classList.add('sw-dot--on');
        return dot;
      }),
    );
    el.catDots.replaceChildren(
      ...cats.map((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'sw-vdot';
        if (i === ci) dot.classList.add('sw-vdot--on');
        return dot;
      }),
    );
  }

  // --- pointer gestures ---------------------------------------------------

  el.card.addEventListener('pointerdown', (event) => {
    if (leave) return;
    // Let the heart and the shop button behave like controls, not drag handles.
    if ((event.target as HTMLElement).closest('a, button')) return;
    start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    axis = null;
  });

  el.card.addEventListener('pointermove', (event) => {
    if (!start) return;
    const mx = event.clientX - start.x;
    const my = event.clientY - start.y;
    if (!axis) {
      if (Math.abs(mx) < AXIS_LOCK && Math.abs(my) < AXIS_LOCK) return;
      axis = Math.abs(mx) >= Math.abs(my) ? 'x' : 'y';
      try {
        el.card.setPointerCapture(start.id);
      } catch {
        /* Capture is a nicety; the gesture still works without it. */
      }
    }
    dragging = true;
    dx = mx;
    dy = my;
    render();
  });

  function end(): void {
    if (!start) return;
    const onAxis = axis;
    const mx = dx;
    const my = dy;
    start = null;
    if (onAxis === 'x' && Math.abs(mx) > THRESHOLD) go('x', mx < 0 ? 1 : -1);
    else if (onAxis === 'y' && Math.abs(my) > THRESHOLD) go('y', my < 0 ? 1 : -1);
    else snapBack();
    window.setTimeout(() => {
      if (!start) axis = null;
    }, 300);
  }

  el.card.addEventListener('pointerup', end);
  el.card.addEventListener('pointercancel', end);

  // --- buttons and keyboard ------------------------------------------------

  root.querySelector('[data-prev-look]')?.addEventListener('click', () => go('x', -1));
  root.querySelector('[data-next-look]')?.addEventListener('click', () => go('x', 1));
  root.querySelector('[data-prev-cat]')?.addEventListener('click', () => go('y', -1));
  root.querySelector('[data-next-cat]')?.addEventListener('click', () => go('y', 1));

  document.addEventListener('keydown', (event) => {
    const map: Record<string, () => void> = {
      ArrowLeft: () => go('x', -1),
      ArrowRight: () => go('x', 1),
      ArrowUp: () => go('y', -1),
      ArrowDown: () => go('y', 1),
    };
    const handler = map[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  });

  // Saves live in localStorage; re-read on change so the heart stays correct.
  document.addEventListener('fitinspo:saveschange', render);

  render();
}
