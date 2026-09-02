// ========================================
// VoteButton
// ========================================

export const voteButtonBaseClass =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60";

export const voteButtonUnvotedClass =
  "border-[var(--border)] bg-transparent text-[var(--text)] hover:not-disabled:border-[var(--accent)] hover:not-disabled:text-[var(--accent)]";

export const voteButtonVotedClass =
  "border-[var(--accent)] bg-[var(--accent)] text-black hover:not-disabled:bg-[var(--accent-hover)] hover:not-disabled:border-[var(--accent-hover)]";

export const voteButtonCountClass = "opacity-80";
