// ========================================
// MapView (Google Maps JS boundary)
// ========================================

export const mapViewClass =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] overflow-hidden";

export const mapViewCanvasClass =
  "relative w-full aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center bg-[repeating-linear-gradient(45deg,var(--bg-raised)_0,var(--bg-raised)_1px,transparent_1px,transparent_14px)]";

export const mapViewSurfaceClass =
  "relative w-full aspect-[4/3] sm:aspect-[16/9]";

export const mapViewMapClass = "absolute inset-0 w-full h-full";

export const mapViewOverlayClass =
  "absolute inset-0 flex items-center justify-center bg-[var(--bg-panel)]";

export const mapViewPlaceholderLabelClass =
  "px-3 py-1.5 text-xs font-medium text-center text-[var(--text-muted)] bg-[var(--bg-panel)] border border-[var(--border)] rounded-md";

export const mapViewPinClass =
  "absolute w-2.5 h-2.5 rounded-full bg-[var(--text-muted)]";

export const mapViewLoadingClass =
  "w-full py-16 text-center text-sm text-[var(--text-muted)]";

export const mapViewStateWrapClass = "p-4";
