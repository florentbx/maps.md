// The arrows of a sequence between its values (`- text → [[#Element#Value]]`, a service blueprint; `li[data-to]` to
// `li[data-v]`), drawn by the page over the grid once it is laid out, since they depend on where the values end up, and
// again when its size changes (a tab shown, the page resized). Imported by viewer.ts, which calls `watchArrows` once;
// the Obsidian plugin (obsidian/) calls `drawArrows` itself, on the grids of its own views.
// A target below or above: down or up, across just before the target, then into it; on the same row: straight across.
// Two arrows that would run on the same line in opposite directions (up and down a column, or between two values that
// point to each other) run side by side, apart. The values hide the lines under them.
function drawArrows(grid: HTMLElement) {
  grid.querySelector(':scope > svg.arrows')?.remove();
  if (!grid.offsetWidth) return;
  const box = grid.getBoundingClientRect();
  const k = box.width / grid.offsetWidth || 1; // the zoom of the canvas
  const at = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { l: (r.left - box.left) / k + grid.scrollLeft, t: (r.top - box.top) / k + grid.scrollTop, w: r.width / k, h: r.height / k };
  };
  // A path knows the values it joins, and is in a chain followed when both are (`in-chain`, set by the page).
  const end = (li: HTMLElement, d: string) => ({ d, from: li.dataset.v, to: li.dataset.to, chain: li.classList.contains('in-chain') && grid.querySelector(`li[data-v="${li.dataset.to}"]`)?.classList.contains('in-chain') });
  const arrows = [...grid.querySelectorAll<HTMLElement>('li[data-to]')].flatMap((li) => {
    const target = grid.querySelector<HTMLElement>(`li[data-v="${li.dataset.to}"]`);
    return target ? [{ li, target, a: at(li), b: at(target) }] : [];
  });
  // The run of an arrow down or up its column: its x and its two ends, top first, or nothing.
  const run = ({ a, b }: (typeof arrows)[number]) => (Math.abs(a.l + a.w / 2 - (b.l + b.w / 2)) < 1 && (b.t >= a.t + a.h || b.t + b.h <= a.t) ? { x: a.l + a.w / 2, down: b.t > a.t, top: Math.min(a.t, b.t), bottom: Math.max(a.t + a.h, b.t + b.h) } : undefined);
  const runs = arrows.map(run);
  const paths = arrows.flatMap(({ li, target, a, b }, i) => {
    const m = runs[i];
    const facing = target.dataset.to === li.dataset.v || (m && runs.some((n) => n && n.down !== m.down && Math.abs(n.x - m.x) < 1 && n.top < m.bottom && m.top < n.bottom));
    const o = facing ? 6 : 0; // the offset of each of two arrows that would share a line
    const [ax, bx] = [a.l + a.w / 2, b.l + b.w / 2];
    // To another element (another column): out by the side, a turn in the space just before the target, in by its
    // side.
    if (li.closest('td')!.cellIndex !== target.closest('td')!.cellIndex && (b.l >= a.l + a.w || b.l + b.w <= a.l)) {
      const right = b.l >= a.l + a.w;
      const [x1, x2] = right ? [a.l + a.w, b.l] : [a.l, b.l + b.w];
      const y1 = a.t + a.h / 2 + (right ? -o : o);
      if (y1 > b.t + 4 && y1 < b.t + b.h - 4) return [end(li, `M${x1} ${y1} H${x2}`)];
      const y2 = b.t + b.h / 2 + (right ? -o : o);
      const xm = right ? x2 - Math.min(12, (x2 - x1) / 2) : x2 + Math.min(12, (x1 - x2) / 2);
      return [end(li, `M${x1} ${y1} H${xm} V${y2} H${x2}`)];
    }
    if (b.t >= a.t + a.h || b.t + b.h <= a.t) {
      const down = b.t >= a.t + a.h;
      const [y1, y2] = down ? [a.t + a.h, b.t] : [a.t, b.t + b.h];
      const gap = Math.min(10, Math.abs(y2 - y1) / 2);
      const ym = down ? y2 - gap : y2 + gap;
      const s = down ? -o : o;
      return [end(li, `M${ax + s} ${y1} V${ym} H${bx + s} V${y2}`)];
    }
    const right = b.l >= a.l + a.w;
    const y = a.t + a.h / 2 + (right ? -o : o);
    return [end(li, `M${right ? a.l + a.w : a.l} ${y} H${right ? b.l : b.l + b.w}`)];
  });
  if (!paths.length) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'arrows');
  svg.setAttribute('width', String(grid.scrollWidth));
  svg.setAttribute('height', String(grid.scrollHeight));
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs><marker id="seq-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>${paths.map((p) => `<path d="${p.d}" data-from="${p.from}" data-to="${p.to}"${p.chain ? ' class="in-chain"' : ''} marker-end="url(#seq-head)"/>`).join('')}`;
  grid.append(svg);
}
/** Draws the arrows of every grid with arrows under `root`, as it is laid out, and again when its size changes: the
 *  grids added later too. */
function watchArrows(root: Element = document.documentElement) {
  const resized = new ResizeObserver((entries) => entries.forEach((e) => drawArrows(e.target as HTMLElement)));
  const watched = new WeakSet<Element>();
  const watch = () =>
    root.querySelectorAll<HTMLElement>('.grid--arrows').forEach((grid) => {
      if (watched.has(grid)) return;
      watched.add(grid);
      resized.observe(grid);
    });
  new MutationObserver(watch).observe(root, { childList: true, subtree: true });
  watch();
}
export { drawArrows, watchArrows };
