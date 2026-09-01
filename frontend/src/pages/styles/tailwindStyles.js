export const authPageClass =
  "min-h-screen flex items-center justify-center bg-[var(--bg)] p-6";

export const authCardClass =
  "w-full max-w-[400px] bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg overflow-hidden";

export const authNavClass =
  "flex border-b border-[var(--border)]";

export const authTabClass =
  "flex-1 py-4 text-center text-base font-medium no-underline transition-colors border-b-2";

export const authTabActiveClass =
  "text-[var(--accent)] border-[var(--accent)]";

export const authTabInactiveClass =
  "text-[var(--text-muted)] border-transparent hover:text-[var(--text-strong)] hover:bg-[var(--bg-raised)]";

export const authCardBodyClass = "px-7 py-8";

export const authTitleClass =
  "m-0 mb-1 text-[22px] font-semibold text-[var(--text-strong)]";

export const authSubtitleClass =
  "mt-0 mb-6 text-sm text-[var(--text-muted)]";

export const authFormClass = "flex flex-col gap-4";

export const authFieldClass =
  "flex flex-col gap-1.5 text-[13px] text-[var(--text)]";

export const authInputClass =
  "text-sm px-3 py-2.5 border border-[var(--border)] rounded-md text-[var(--text-strong)] bg-[var(--bg)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent)]";

export const authErrorClass =
  "m-0 text-[13px] text-[var(--danger)]";

export const authSuccessClass =
  "mt-0 mb-5 text-[13px] text-[var(--success)] bg-[var(--bg-raised)] border border-[var(--success)] rounded-md px-2.5 py-2";

export const authSubmitClass =
  "mt-1 py-2.5 text-sm font-semibold text-white bg-[var(--accent)] border-0 rounded-md cursor-pointer hover:not-disabled:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed";
