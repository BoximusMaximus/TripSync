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
  "mt-1 py-2.5 text-sm font-semibold text-black bg-[var(--accent)] border-0 rounded-md cursor-pointer hover:not-disabled:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed";
//! ========================================
//! 404 Page
//! ========================================

export const notFoundDiv =
  "min-h-[70vh] flex flex-col items-center justify-center px-6 text-center";

export const authFooterLinkClass =
  "text-[#0f7173] font-medium no-underline hover:underline";

export const notFoundImage =
  "w-64 max-w-full my-6";

//! GroupPage styling
export const groupsPageClass = "px-8 py-6";

export const groupsHeaderClass = "flex items-center justify-between";

export const groupsTitleClass = "m-0 text-[28px] font-bold text-[#1a1a1a]";

export const groupsSubtitleClass = "mt-2 mb-6 text-[13px] text-gray-500";

export const groupsNewButtonClass =
  "px-4 py-2 text-sm font-semibold text-white bg-[#1a1a1a] rounded-md cursor-pointer hover:bg-black";

export const groupsGridClass =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

export const groupsStatusClass = "text-sm text-gray-500";

export const groupsErrorClass = "text-sm text-red-600";

// Group Form styling
export const groupFormClass =
  "mb-6 flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-4";

export const groupFormFieldClass =
  "flex flex-col gap-1.5 text-[13px] text-gray-700";

export const groupFormInputClass =
  "text-sm px-2.5 py-[9px] border border-gray-300 rounded-md text-[#1a1a1a] bg-white focus:outline-none focus:border-[#0f7173] focus:ring-[3px] focus:ring-[#0f7173]/15";

export const groupFormSubmitClass =
  "px-4 py-2 text-sm font-semibold text-white bg-[#0f7173] rounded-md cursor-pointer hover:bg-[#0c5c5e] disabled:bg-gray-400 disabled:cursor-not-allowed";

export const groupFormCancelClass =
  "px-4 py-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900";

  // Group Join styling
export const groupJoinButtonClass =
  "px-3 py-1 text-sm border border-gray-400 rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

export const groupLeaveButtonClass =
  "px-3 py-1 text-sm border border-gray-400 rounded-md text-gray-600 cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";
export const groupMembersWrapClass =
  "mt-3 border-t border-gray-200 pt-3";

export const groupMembersTitleClass =
  "mb-2 text-[12px] font-semibold uppercase tracking-wide text-gray-500";

export const groupMemberRowClass =
  "flex items-center justify-between gap-2 py-1 text-[13px]";

export const groupMemberNameClass = "text-gray-800";

export const groupMemberLeaderTagClass =
  "ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600";

export const groupMemberActionsClass = "flex items-center gap-2";

export const groupAccessToggleClass =
  "rounded border border-gray-300 px-1.5 py-0.5 text-[11px] cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

export const groupAccessToggleOnClass =
  "rounded border border-[#0f7173] bg-[#e6f5f5] px-1.5 py-0.5 text-[11px] text-[#0c5c5e] cursor-pointer hover:bg-[#d4eded] disabled:opacity-50 disabled:cursor-not-allowed";

export const groupRemoveMemberClass =
  "text-[11px] text-red-600 cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed";

export const groupMembersStatusClass = "py-1 text-[13px] text-gray-500";

// Trip Card styling
export const tripCardClass =
  "rounded-lg border border-gray-300 bg-white p-4";

export const tripNameClass = "m-0 font-bold text-[#1a1a1a]";

export const tripLocationClass = "mt-1 mb-3 text-sm text-gray-500";

export const tripGroupTagClass =
  "ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600";

export const tripActionsClass = "flex items-center justify-between";

export const tripVoteButtonClass =
  "flex items-center gap-1.5 rounded-full border border-gray-400 px-3 py-1 text-sm cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

export const tripVoteButtonOnClass =
  "flex items-center gap-1.5 rounded-full border border-[#0f7173] bg-[#e6f5f5] px-3 py-1 text-sm text-[#0c5c5e] cursor-pointer hover:bg-[#d4eded] disabled:opacity-50 disabled:cursor-not-allowed";

export const tripDetailsLinkClass =
  "text-sm text-gray-600 no-underline hover:text-gray-900 hover:underline";

  // Trips Page styling
export const tripsPageClass = "px-8 py-6";

export const tripsHeaderClass = "flex items-center justify-between";

export const tripsTitleClass = "m-0 text-[28px] font-bold text-[#1a1a1a]";

export const tripsSubtitleClass = "mt-2 mb-6 text-[13px] text-gray-500";

export const tripsNewButtonClass =
  "px-4 py-2 text-sm font-semibold text-white bg-[#1a1a1a] rounded-md cursor-pointer hover:bg-black";

export const tripsGridClass =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

export const tripsStatusClass = "text-sm text-gray-500";

export const tripsErrorClass = "text-sm text-red-600";

export const tripsFooterNoteClass = "mt-6 text-[13px] text-gray-400";

// Trip Form styling
export const tripFormClass =
  "mb-6 rounded-lg border border-gray-200 bg-white p-4";

export const tripFormRowClass = "flex flex-wrap items-end gap-3";

export const tripFormFieldClass =
  "flex flex-col gap-1.5 text-[13px] text-gray-700";

export const tripFormInputClass =
  "text-sm px-2.5 py-[9px] border border-gray-300 rounded-md text-[#1a1a1a] bg-white focus:outline-none focus:border-[#0f7173] focus:ring-[3px] focus:ring-[#0f7173]/15";

export const tripFormSelectClass =
  "text-sm px-2.5 py-[9px] border border-gray-300 rounded-md text-[#1a1a1a] bg-white cursor-pointer focus:outline-none focus:border-[#0f7173] focus:ring-[3px] focus:ring-[#0f7173]/15";

export const tripFormSubmitClass =
  "px-4 py-2 text-sm font-semibold text-white bg-[#0f7173] rounded-md cursor-pointer hover:bg-[#0c5c5e] disabled:bg-gray-400 disabled:cursor-not-allowed";

export const tripFormCancelClass =
  "px-4 py-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900";

// Trip Detail styling
export const tripDetailPageClass = "px-8 py-6";

export const tripDetailHeaderClass =
  "flex items-start justify-between gap-4";

export const tripDetailTitleClass =
  "m-0 text-[28px] font-bold text-[#1a1a1a]";

export const tripDetailLocationClass = "mt-1 text-sm text-gray-500";

export const tripDetailActionsClass = "flex items-center gap-2";

export const tripDetailEditButtonClass =
  "px-4 py-2 text-sm border border-gray-400 rounded-md bg-white cursor-pointer hover:bg-gray-50";

export const tripDetailAddButtonClass =
  "px-4 py-2 text-sm font-semibold text-white bg-[#1a1a1a] rounded-md cursor-pointer hover:bg-black";

export const tripDetailColumnsClass =
  "mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]";

export const tripDetailLeftClass = "flex flex-col gap-3";

export const tripDetailRightClass = "flex flex-col gap-2";

export const tripDetailMapSlotClass =
  "flex h-[440px] items-center justify-center rounded border border-gray-300 bg-gray-50 text-sm text-gray-400";

export const tripDetailMapNoteClass = "text-[13px] text-gray-400";

export const tripDetailStatusClass = "text-sm text-gray-500";

export const tripDetailErrorClass = "text-sm text-red-600";

// Activity Card styling
export const activityCardClass =
  "rounded-lg border border-gray-300 bg-white p-4";

export const activityNameClass = "m-0 font-bold text-[#1a1a1a]";

export const activityDescriptionClass = "mt-1 text-sm text-gray-600";

export const activityAddressClass = "mt-1 text-[13px] text-gray-500";

export const activityCostClass =
  "mt-2 text-sm font-semibold text-[#1a1a1a]";

export const activityActionsClass =
  "mt-3 flex items-center justify-between";

export const activityVoteButtonClass =
  "flex items-center gap-1.5 rounded-full border border-gray-400 px-3 py-1 text-sm cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

export const activityVoteButtonOnClass =
  "flex items-center gap-1.5 rounded-full border border-[#0f7173] bg-[#e6f5f5] px-3 py-1 text-sm text-[#0c5c5e] cursor-pointer hover:bg-[#d4eded] disabled:opacity-50 disabled:cursor-not-allowed";

export const activityLinkActionsClass = "flex items-center gap-3";

export const activityEditClass =
  "text-[13px] text-gray-600 cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed";

export const activityDeleteClass =
  "text-[13px] text-red-600 cursor-pointer hover:underline disabled:opacity-50 disabled:cursor-not-allowed";
export const notFoundHeader =
  "m-0 text-8xl font-bold text-[var(--accent)]";

export const notFoundDescription =
  "mt-4 mb-0 text-2xl font-semibold text-[var(--text-strong)]";

export const notFoundParagraph =
  "mt-3 mb-8 max-w-md text-sm text-[var(--text-muted)]";

export const notFoundLink =
  "px-5 py-2.5 rounded-md text-sm font-semibold !text-black bg-[var(--accent)] transition-colors duration-200 hover:bg-[var(--accent-hover)] hover:!text-black";
