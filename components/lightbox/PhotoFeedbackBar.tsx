// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import type { PhotoReaction } from '@/components/gallery/ImageTile'

interface PhotoFeedbackBarProps {
  reaction: PhotoReaction
  controlsVisible: boolean
  onLike: () => void
  onDislike: () => void
  onComment: () => void
  onReset: () => void
}

export default function PhotoFeedbackBar({
  reaction,
  controlsVisible,
  onLike,
  onDislike,
  onComment,
  onReset,
}: PhotoFeedbackBarProps) {
  const locked = reaction !== null
  const visible = controlsVisible

  return (
    <div
      role="group"
      aria-label="React to this photo"
      aria-hidden={!visible}
      className={`absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="flex items-center gap-1 rounded-full bg-black/50 p-1">
        <TooltipButton
          onClick={onLike}
          disabled={locked}
          pressed={reaction === 'LIKE'}
          visible={visible}
          label={
            reaction === 'LIKE'
              ? 'Liked'
              : locked
                ? 'Like (unavailable — you already reacted to this photo)'
                : 'Like this photo'
          }
          className={feedbackBtn(reaction === 'LIKE', 'green')}
        >
          <LikeIcon />
        </TooltipButton>
        <TooltipButton
          onClick={onDislike}
          disabled={locked}
          pressed={reaction === 'DISLIKE'}
          visible={visible}
          label={
            reaction === 'DISLIKE'
              ? 'Disliked'
              : locked
                ? 'Dislike (unavailable — you already reacted to this photo)'
                : 'Dislike this photo'
          }
          className={feedbackBtn(reaction === 'DISLIKE', 'red')}
        >
          <DislikeIcon />
        </TooltipButton>
        <TooltipButton
          onClick={onComment}
          disabled={locked}
          pressed={reaction === 'COMMENT'}
          visible={visible}
          label={
            reaction === 'COMMENT'
              ? 'Commented'
              : locked
                ? 'Comment (unavailable — you already reacted to this photo)'
                : 'Comment on this photo'
          }
          className={feedbackBtn(reaction === 'COMMENT', 'yellow')}
        >
          <CommentIcon />
        </TooltipButton>
        {locked && (
          <TooltipButton onClick={onReset} visible={visible} label="Undo your reaction" className={resetBtn}>
            <ResetIcon />
          </TooltipButton>
        )}
      </div>
    </div>
  )
}

interface TooltipButtonProps {
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
  visible: boolean
  label: string
  className: string
  children: React.ReactNode
}

// The tooltip's own wrapper (not the disabled button) carries the hover
// listener, so it still shows an explanation even once a button locks. It
// only appears after a deliberate pause (delay-[1200ms]) so it doesn't
// flicker in on every incidental mouse pass — aria-label already gives
// screen readers the same text immediately, with no dependency on hover.
function TooltipButton({
  onClick,
  disabled,
  pressed,
  visible,
  label,
  className,
  children,
}: TooltipButtonProps) {
  return (
    <span className="group relative inline-flex">
      <button
        onClick={onClick}
        disabled={disabled}
        aria-pressed={pressed}
        aria-label={label}
        tabIndex={visible ? 0 : -1}
        className={className}
      >
        {children}
      </button>
      <span
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity delay-[1200ms] duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-focus-visible:delay-0"
      >
        {label}
      </span>
    </span>
  )
}

function feedbackBtn(active: boolean, accent: 'green' | 'red' | 'yellow') {
  const accentClass = {
    green: 'text-green-400 bg-green-500/15',
    red: 'text-red-400 bg-red-500/15',
    yellow: 'text-yellow-400 bg-yellow-500/15',
  }[accent]
  return `flex h-11 w-11 items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:opacity-30 ${
    active ? accentClass : 'text-white/70 hover:bg-white/10 hover:text-white'
  }`
}

const resetBtn =
  'flex h-11 w-11 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50'

function LikeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  )
}

function DislikeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4l12 12M16 4L4 16" />
    </svg>
  )
}

function CommentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="2.5" width="12" height="15" rx="1.5" />
      <path d="M7 7h6M7 10h6M7 13h3" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4v5h5" />
      <path d="M4.6 13a6.5 6.5 0 1 0 1-8.4L4 9" />
    </svg>
  )
}
