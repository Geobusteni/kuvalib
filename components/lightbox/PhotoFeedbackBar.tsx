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
}

export default function PhotoFeedbackBar({
  reaction,
  controlsVisible,
  onLike,
  onDislike,
  onComment,
}: PhotoFeedbackBarProps) {
  const locked = reaction !== null
  const visible = controlsVisible

  return (
    <div
      role="group"
      aria-label="React to this photo"
      aria-hidden={!visible}
      className={`absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2 transition-opacity duration-200 [.reduce-motion_&]:transition-none ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="flex items-center gap-1 rounded-full bg-black/50 p-1">
        <button
          onClick={onLike}
          disabled={locked}
          aria-pressed={reaction === 'LIKE'}
          aria-label={
            reaction === 'LIKE'
              ? 'Liked'
              : locked
                ? 'Like (unavailable — you already reacted to this photo)'
                : 'Like this photo'
          }
          tabIndex={visible ? 0 : -1}
          className={feedbackBtn(reaction === 'LIKE', 'green')}
        >
          <LikeIcon />
        </button>
        <button
          onClick={onDislike}
          disabled={locked}
          aria-pressed={reaction === 'DISLIKE'}
          aria-label={
            reaction === 'DISLIKE'
              ? 'Disliked'
              : locked
                ? 'Dislike (unavailable — you already reacted to this photo)'
                : 'Dislike this photo'
          }
          tabIndex={visible ? 0 : -1}
          className={feedbackBtn(reaction === 'DISLIKE', 'red')}
        >
          <DislikeIcon />
        </button>
        <button
          onClick={onComment}
          disabled={locked}
          aria-pressed={reaction === 'COMMENT'}
          aria-label={
            reaction === 'COMMENT'
              ? 'Commented'
              : locked
                ? 'Comment (unavailable — you already reacted to this photo)'
                : 'Comment on this photo'
          }
          tabIndex={visible ? 0 : -1}
          className={feedbackBtn(reaction === 'COMMENT', 'yellow')}
        >
          <CommentIcon />
        </button>
      </div>
    </div>
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
