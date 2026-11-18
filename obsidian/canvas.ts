// The canvas of a map, as maps.html has it (renderer/viewer.ts): the drawing on a surface that is dragged to move it and
// zoomed (panzoom), with dots behind that follow it; and the mounting of the HTML of drawMap in an element of
// Obsidian: ids of SVG markers made unique (several maps are open at once), heads of boxes fitted, arrows between
// values drawn once the grid is laid out.

import Panzoom, { type PanzoomEventDetail, type PanzoomObject } from '@panzoom/panzoom';
import { drawArrows } from '../renderer/arrows.ts';

let uids = 0;
/** A suffix unique to one drawing in the window. */
export const uid = () => `m${(++uids).toString(36)}`;

/** The HTML of drawMap with its marker ids made unique to this drawing: `#arrow` would reach the marker of another
 *  map, maybe in a hidden tab, where it is not drawn. */
export const uniqueMarkers = (html: string, id: string) => html.replace(/ id="arrow"/g, ` id="arrow-${id}"`).replace(/url\(#arrow\)/g, `url(#arrow-${id})`);

/** Draws the arrows between the values of a grid (a service blueprint), with their marker unique to this drawing. */
export function arrowsOf(grid: HTMLElement, id: string) {
  drawArrows(grid);
  const svg = grid.querySelector(':scope > svg.arrows');
  if (!svg) return;
  svg.querySelector('marker#seq-head')?.setAttribute('id', `seq-head-${id}`);
  svg.querySelectorAll('[marker-end="url(#seq-head)"]').forEach((p) => p.setAttribute('marker-end', `url(#seq-head-${id})`));
}

/** The head of a box (`rect.node-head`) within the outline of its box, whatever the style of the type sets (as
 *  maps.html does once a map is drawn). */
export function fitHeads(page: HTMLElement) {
  for (const head of page.querySelectorAll<SVGRectElement>('rect.node-head')) {
    const box = head.parentElement!.querySelector('rect:not(.node-head)');
    if (!box) continue;
    const { strokeWidth, rx } = getComputedStyle(box);
    head.style.setProperty('--box-stroke', strokeWidth);
    head.style.setProperty('--box-radius', rx);
  }
}

/** Puts a drawing in an element: the HTML, its heads fitted, its arrows drawn now and when its size changes. Returns
 *  what stops watching it. */
export function mount(page: HTMLElement, html: string, id: string) {
  page.innerHTML = uniqueMarkers(html, id);
  fitHeads(page);
  const resized = new ResizeObserver((entries) => entries.forEach((e) => arrowsOf(e.target as HTMLElement, id)));
  page.querySelectorAll<HTMLElement>('.grid--arrows').forEach((grid) => resized.observe(grid));
  return () => resized.disconnect();
}

/** A tab of the views of a map: shows its view, hides the others. */
export function selectTab(root: HTMLElement, view: string | undefined) {
  const tab = view === undefined ? undefined : root.querySelector<HTMLElement>(`[data-view="${CSS.escape(view)}"]`);
  if (!tab) return false;
  root.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-selected', String(b === tab)));
  root.querySelectorAll<HTMLElement>('[data-view-panel]').forEach((panel) => (panel.hidden = panel.dataset.viewPanel !== tab.dataset.view));
  return true;
}

/** The canvas of the Map view: drag to move, a pinch or Ctrl + the wheel to zoom, the wheel to move or to zoom (a
 *  setting), the buttons − % + at the bottom right. A drag is not a click. */
export class PanCanvas {
  readonly panzoom: PanzoomObject;
  private dragged = false;
  private start?: PanzoomEventDetail;
  private touches = new Map<number, { x: number; y: number }>();
  private pinch?: { distance: number; scale: number; x: number; y: number };
  private cleanups: (() => void)[] = [];

  constructor(
    readonly canvas: HTMLElement,
    readonly page: HTMLElement,
    private options: { wheelZooms: () => boolean; onZoom?: (scale: number) => void },
  ) {
    this.panzoom = Panzoom(page, { canvas: true, origin: '0 0', minScale: 0.1, maxScale: 4, cursor: 'grab' });
    const on = <K extends keyof HTMLElementEventMap>(target: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions | boolean) => {
      target.addEventListener(type, fn as EventListener, opts);
      this.cleanups.push(() => target.removeEventListener(type, fn as EventListener, opts));
    };
    on(canvas, 'wheel', (e) => this.wheel(e), { passive: false });
    // Dots behind the map, as in FigJam: they move and grow with the canvas; zoomed out, one in two is left out.
    on(page, 'panzoomchange' as keyof HTMLElementEventMap, (e) => {
      const { x, y, scale } = (e as CustomEvent<PanzoomEventDetail>).detail;
      const base = parseFloat(getComputedStyle(canvas).getPropertyValue('--size-dot-gap')) || 20;
      let gap = base * scale;
      while (gap < base / 2) gap *= 2;
      canvas.style.backgroundSize = `${gap}px ${gap}px`;
      canvas.style.setProperty('--zoom', String(scale));
      canvas.style.backgroundPosition = `${x * scale}px ${y * scale}px`;
      this.options.onZoom?.(scale);
    });
    on(page, 'panzoomstart' as keyof HTMLElementEventMap, (e) => {
      this.start = (e as CustomEvent<PanzoomEventDetail>).detail;
      this.dragged = false;
      page.ownerDocument.getSelection()?.removeAllRanges();
    });
    on(page, 'panzoomend' as keyof HTMLElementEventMap, (e) => {
      const d = (e as CustomEvent<PanzoomEventDetail>).detail;
      if (this.start) this.dragged = Math.abs(d.x - this.start.x) + Math.abs(d.y - this.start.y) > 3 / d.scale;
    });
    on(canvas, 'click', (e) => this.dragged && (e.stopPropagation(), e.preventDefault(), (this.dragged = false)), true);
    // Text can be selected: a drag that starts on a letter selects; anywhere else, it moves the canvas.
    on(canvas, 'pointerdown', (e) => e.pointerType === 'mouse' && this.overText(e) && e.stopPropagation(), true);
    // A pinch on a touch screen, done here: panzoom's own zooms around the wrong point with an origin at 0 0.
    on(canvas, 'pointerdown', (e) => this.touchDown(e), true);
    const win = canvas.ownerDocument.defaultView ?? window;
    on(win, 'pointermove', (e) => this.touchMove(e as PointerEvent), true);
    on(win, 'pointerup', (e) => this.lift(e as PointerEvent), true);
    on(win, 'pointercancel', (e) => this.lift(e as PointerEvent), true);
  }

  destroy() {
    this.cleanups.forEach((c) => c());
    this.panzoom.destroy();
  }

  private wheel(e: WheelEvent) {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : 1; // lines, from some mice
    if (e.ctrlKey || e.metaKey || this.options.wheelZooms()) return this.zoomAt(this.panzoom.getScale() * Math.exp(-Math.max(-20, Math.min(20, e.deltaY * unit)) * 0.01), e);
    const scale = this.panzoom.getScale();
    this.panzoom.pan(-(e.deltaX * unit) / scale, -(e.deltaY * unit) / scale, { relative: true, animate: false });
  }

  /** Zooms keeping the point under the pointer in place. */
  zoomAt(toScale: number, e: { clientX: number; clientY: number }) {
    const scale = this.panzoom.getScale();
    const { x, y } = this.panzoom.getPan();
    const c = this.canvas.getBoundingClientRect();
    const px = e.clientX - c.left;
    const py = e.clientY - c.top;
    const to = this.panzoom.zoom(toScale, { animate: false }).scale;
    this.panzoom.pan(px / to - (px / scale - x), py / to - (py / scale - y), { animate: false });
  }

  /** A step of zoom from the middle of the canvas. */
  zoomBy(factor: number) {
    const c = this.canvas.getBoundingClientRect();
    this.zoomAt(this.panzoom.getScale() * factor, { clientX: c.left + c.width / 2, clientY: c.top + c.height / 2 });
  }

  /** The whole width of the map, from the top left corner: at its size, or smaller when it is wider than the canvas,
   *  down to half its size so that it can still be read. */
  home() {
    const width = this.canvas.clientWidth;
    const wide = this.page.scrollWidth + parseFloat(getComputedStyle(this.page).paddingLeft || '0');
    const scale = this.panzoom.zoom(Math.max(0.5, Math.min(1, width / (wide || 1))), { animate: false }).scale;
    this.panzoom.pan(0, 0, { animate: false });
    return scale;
  }

  /** Moves the canvas so that an element is in its middle, at the zoom it has. */
  center(el: Element) {
    const page = this.page.getBoundingClientRect();
    const drawn = page.width / (this.page.offsetWidth || 1);
    const r = el.getBoundingClientRect();
    const scale = this.panzoom.getScale();
    const x = this.canvas.clientWidth / 2 / scale - (r.left - page.left + r.width / 2) / drawn;
    const y = this.canvas.clientHeight / 2 / scale - (r.top - page.top + r.height / 2) / drawn;
    this.panzoom.pan(x, y, { animate: false });
  }

  /** Where the canvas is, to put it back after the map is drawn again. */
  place() {
    return { ...this.panzoom.getPan(), scale: this.panzoom.getScale() };
  }

  restore(place: { x: number; y: number; scale: number }) {
    this.panzoom.zoom(place.scale, { animate: false });
    this.panzoom.pan(place.x, place.y, { animate: false });
  }

  /** Whether the pointer is on the text of the map, not on the room around it. */
  private overText(e: MouseEvent) {
    if (!this.page.contains(e.target as Node)) return false;
    if ((e.target as Element).closest('svg text')) return true;
    const doc = this.page.ownerDocument as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node } | null };
    const at: { offsetNode?: Node; startContainer?: Node } | null | undefined = doc.caretPositionFromPoint?.(e.clientX, e.clientY) ?? doc.caretRangeFromPoint?.(e.clientX, e.clientY);
    const node = at?.offsetNode ?? at?.startContainer;
    if (node?.nodeType !== Node.TEXT_NODE || !node.textContent!.trim()) return false;
    const range = doc.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()].some((r) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - 3 && e.clientY <= r.bottom + 3);
  }

  private fingers() {
    const [a, b] = [...this.touches.values()];
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }

  private touchDown(e: PointerEvent) {
    if (e.pointerType !== 'touch') return;
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.touches.size !== 2) return;
    e.stopPropagation();
    const { distance, mx, my } = this.fingers();
    const scale = this.panzoom.getScale();
    const { x, y } = this.panzoom.getPan();
    const c = this.canvas.getBoundingClientRect();
    this.pinch = { distance, scale, x: (mx - c.left) / scale - x, y: (my - c.top) / scale - y };
  }

  private touchMove(e: PointerEvent) {
    if (!this.touches.has(e.pointerId)) return;
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!this.pinch) return;
    e.stopPropagation();
    if (this.touches.size < 2) return;
    const { distance, mx, my } = this.fingers();
    const c = this.canvas.getBoundingClientRect();
    const to = this.panzoom.zoom(this.pinch.scale * (distance / this.pinch.distance), { animate: false }).scale;
    this.panzoom.pan((mx - c.left) / to - this.pinch.x, (my - c.top) / to - this.pinch.y, { animate: false });
  }

  private lift(e: PointerEvent) {
    const first = this.touches.keys().next().value;
    if (!this.touches.delete(e.pointerId) || !this.pinch) return;
    if (e.pointerId !== first) e.stopPropagation();
    if (!this.touches.size) this.pinch = undefined;
  }
}
