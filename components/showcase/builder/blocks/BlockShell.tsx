// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEditor, useNode } from '@craftjs/core'
import { Rnd } from 'react-rnd'
import { useCallback, useRef, type ReactNode } from 'react'
import { clamp, type Block } from '@/lib/showcase-blocks'
import { adhere, createAdhesion, type Adhesion, type SiblingRect } from '@/lib/showcase-snap'
import { blockBackgroundCss, blockRadiusCss, blockShadowCss, fluidPx } from '@/lib/showcase-theme'
import { useFrameSize, pctToPx, pxToPct } from '../../frame-size'

/**
 * The drag/resize/selection wrapper every block shares. Position is stored as a
 * percentage of the page frame (resolution-independent); react-rnd works in
 * pixels, so this converts on the way in and out. A group is an ordinary block
 * here — dragging or resizing it carries its children (matched by
 * `parentGroupId`) along, and dropping a leaf block re-parents it by which
 * group box now contains its centre.
 */

const MIN_PCT = 4

// Drop-time alignment: a nudge onto the page edges/centre or another block's
// edge/centre when released close to one. Separate from the live sibling
// adhesion in lib/showcase-snap.ts, which holds edges flush while dragging.
const SNAP_PX = 6

/** Shift `pos` by the smallest delta that lines up its start, centre, or end
 *  with the nearest candidate within `thresholdPct` — or return `pos`
 *  unchanged if nothing is close enough. */
function snapAxis(pos: number, size: number, candidates: number[], thresholdPct: number): number {
  let bestDelta = 0
  let bestDist = thresholdPct
  for (const c of candidates) {
    for (const d of [c - pos, c - (pos + size / 2), c - (pos + size)]) {
      if (Math.abs(d) < bestDist) {
        bestDist = Math.abs(d)
        bestDelta = d
      }
    }
  }
  return pos + bestDelta
}

// react-rnd wraps react-draggable around re-resizable. Without this, a mousedown
// on a resize handle also starts a drag, and the drag wins — so the block never
// resizes. Giving the handles a class and passing it as react-draggable's
// `cancel` selector makes the drag layer ignore mousedowns that begin on a
// handle.
const RESIZE_HANDLE_CLASS = 'sc-resize-handle'
const resizeHandleClasses = {
  bottomRight: RESIZE_HANDLE_CLASS,
  bottomLeft: RESIZE_HANDLE_CLASS,
  topRight: RESIZE_HANDLE_CLASS,
  topLeft: RESIZE_HANDLE_CLASS,
}

interface NodeCollected {
  block: Block
  parentGroupId: string | null
}

export function BlockShell({
  children,
  contentClassName,
  contentStyle,
}: {
  children: ReactNode
  contentClassName?: string
  contentStyle?: React.CSSProperties
}) {
  const { width: frameW, height: frameH } = useFrameSize()

  const {
    id,
    block,
    parentGroupId,
    connectors: { connect },
  } = useNode((node) => ({
    block: node.data.props.block as Block,
    parentGroupId: (node.data.props.parentGroupId ?? null) as string | null,
  }))

  const { actions, query, isActive } = useEditor((state) => ({
    isActive: state.events.selected.has(id),
  }))

  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const rndRef = useRef<Rnd>(null)
  // react-draggable only ever adds pointer deltas to its own state, so the
  // unsnapped pointer position is tracked here and the held position is pushed
  // back into Rnd with updatePosition.
  const drag = useRef<{
    raw: { x: number; y: number }
    held: { x: number; y: number }
    adhesion: Adhesion
    peers: SiblingRect[]
  } | null>(null)

  const siblings = useCallback((): { id: string; block: Block; parentGroupId: string | null }[] => {
    const root = query.node('ROOT').get()
    return root.data.nodes.map((childId) => {
      const props = query.node(childId).get().data.props
      return {
        id: childId,
        block: props.block as Block,
        parentGroupId: (props.parentGroupId ?? null) as string | null,
      }
    })
  }, [query])

  const patchNode = useCallback(
    (nodeId: string, patch: Partial<Block>) => {
      actions.setProp(nodeId, (props: NodeCollected) => {
        props.block = { ...props.block, ...patch }
      })
    },
    [actions],
  )

  const isGroup = block.type === 'group'
  const px = {
    x: pctToPx(block.x, frameW),
    y: pctToPx(block.y, frameH),
    w: pctToPx(block.w, frameW),
    h: pctToPx(block.h, frameH),
  }

  // Handles are always mounted (so the mousedown that starts a resize is never
  // racing an unmount when Craft briefly deselects the block) but only shown and
  // hit-tested while this block is selected.
  const activeHandleStyle: React.CSSProperties = {
    ...handleStyle,
    opacity: isActive ? 1 : 0,
    pointerEvents: isActive ? 'auto' : 'none',
  }

  return (
    <Rnd
      size={{ width: px.w, height: px.h }}
      ref={rndRef}
      position={{ x: px.x, y: px.y }}
      bounds="parent"
      enableResizing={{ bottomRight: true, bottomLeft: true, topRight: true, topLeft: true }}
      disableDragging={false}
      cancel={`.${RESIZE_HANDLE_CLASS}`}
      onDragStart={() => {
        actions.selectNode(id)
        dragStart.current = { x: block.x, y: block.y }
        drag.current = {
          raw: { x: block.x, y: block.y },
          held: { x: block.x, y: block.y },
          adhesion: createAdhesion(),
          peers: siblings()
            .filter((s) => s.id !== id && s.parentGroupId === parentGroupId)
            .map((s) => ({ id: s.id, x: s.block.x, y: s.block.y, w: s.block.w, h: s.block.h })),
        }
      }}
      onDrag={(_e, d) => {
        const live = drag.current
        if (!live || frameW <= 0 || frameH <= 0) return
        live.raw = {
          x: clamp(live.raw.x + pxToPct(d.deltaX, frameW), 0, 100 - block.w),
          y: clamp(live.raw.y + pxToPct(d.deltaY, frameH), 0, 100 - block.h),
        }
        const held = adhere(live.raw, block, live.peers, { width: frameW, height: frameH }, live.adhesion)
        const nx = clamp(held.x, 0, 100 - block.w)
        const ny = clamp(held.y, 0, 100 - block.h)
        live.held = { x: nx, y: ny }
        const heldPx = { x: pctToPx(nx, frameW), y: pctToPx(ny, frameH) }
        // react-draggable sets its own state right after onDrag returns; a microtask lands first
        // in React's flush, so the held position wins over the raw pointer position.
        queueMicrotask(() => rndRef.current?.updatePosition(heldPx))
        if (!isGroup || !dragStart.current) return
        const dx = nx - dragStart.current.x
        const dy = ny - dragStart.current.y
        for (const sib of siblings()) {
          if (sib.parentGroupId !== id) continue
          patchNode(sib.id, {
            x: clamp(sib.block.x + dx, 0, 100),
            y: clamp(sib.block.y + dy, 0, 100),
          })
        }
        // Re-anchor so the next onDrag delta is relative to the new position.
        dragStart.current = { x: nx, y: ny }
      }}
      onDragStop={(_e, d) => {
        const live = drag.current
        drag.current = null
        const rawX = live ? live.held.x : clamp(pxToPct(d.x, frameW), 0, 100 - block.w)
        const rawY = live ? live.held.y : clamp(pxToPct(d.y, frameH), 0, 100 - block.h)

        // Snap to the page edges/centre and to other blocks' edges/centres —
        // whichever of this block's own start/centre/end is closest, within
        // a few px. This only nudges the final drop position; it never
        // blocks the drag itself, so dragging over another block still works.
        const others = siblings().filter((s) => s.id !== id)
        const xCandidates = [0, 50, 100, ...others.flatMap((s) => [s.block.x, s.block.x + s.block.w / 2, s.block.x + s.block.w])]
        const yCandidates = [0, 50, 100, ...others.flatMap((s) => [s.block.y, s.block.y + s.block.h / 2, s.block.y + s.block.h])]
        const nx = clamp(snapAxis(rawX, block.w, xCandidates, pxToPct(SNAP_PX, frameW)), 0, 100 - block.w)
        const ny = clamp(snapAxis(rawY, block.h, yCandidates, pxToPct(SNAP_PX, frameH)), 0, 100 - block.h)

        if (isGroup) {
          const snapDx = nx - rawX
          const snapDy = ny - rawY
          if (snapDx !== 0 || snapDy !== 0) {
            for (const sib of siblings()) {
              if (sib.parentGroupId !== id) continue
              patchNode(sib.id, {
                x: clamp(sib.block.x + snapDx, 0, 100),
                y: clamp(sib.block.y + snapDy, 0, 100),
              })
            }
          }
        }

        patchNode(id, { x: nx, y: ny })
        dragStart.current = null

        if (isGroup) return
        // Re-parent a leaf block into whichever group box now holds its centre —
        // but never into a group less than half this block's own area. Without
        // that guard, a full-bleed Cover photo (the largest thing on the page,
        // and behind everything) gets scooped up by any small overlay group its
        // centre happens to drift into, and "Arrange children" then resizes the
        // photo itself to fit the stack.
        const cx = nx + block.w / 2
        const cy = ny + block.h / 2
        const ownArea = block.w * block.h
        const target = siblings().find((s) => {
          if (s.block.type !== 'group' || s.id === id) return false
          const b = s.block
          if (b.w * b.h * 2 < ownArea) return false
          return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h
        })
        const nextParent = target ? target.id : null
        if (nextParent !== parentGroupId) {
          actions.setProp(id, (props: NodeCollected) => {
            props.parentGroupId = nextParent
          })
        }
      }}
      onResizeStop={(_e, _dir, refEl, _delta, position) => {
        let nextW = clamp(pxToPct(refEl.offsetWidth, frameW), MIN_PCT, 100)
        let nextH = clamp(pxToPct(refEl.offsetHeight, frameH), MIN_PCT, 100)
        let nextX = clamp(pxToPct(position.x, frameW), 0, 100 - nextW)
        let nextY = clamp(pxToPct(position.y, frameH), 0, 100 - nextH)

        // A group's child can be resized, but never past the group's own box —
        // dragging (not resizing) is how a block leaves a group, so this is the
        // one place membership doesn't also mean "free to grow beyond it".
        if (!isGroup && parentGroupId) {
          const parent = siblings().find((s) => s.id === parentGroupId)?.block
          if (parent) {
            nextW = Math.min(nextW, parent.w)
            nextH = Math.min(nextH, parent.h)
            nextX = clamp(nextX, parent.x, parent.x + parent.w - nextW)
            nextY = clamp(nextY, parent.y, parent.y + parent.h - nextH)
          }
        }

        if (isGroup) {
          const sx = block.w ? nextW / block.w : 1
          const sy = block.h ? nextH / block.h : 1
          for (const sib of siblings()) {
            if (sib.parentGroupId !== id) continue
            patchNode(sib.id, {
              x: nextX + (sib.block.x - block.x) * sx,
              y: nextY + (sib.block.y - block.y) * sy,
              w: sib.block.w * sx,
              h: sib.block.h * sy,
            })
          }
        }
        patchNode(id, { x: nextX, y: nextY, w: nextW, h: nextH })
        actions.selectNode(id)
      }}
      resizeHandleClasses={resizeHandleClasses}
      resizeHandleStyles={{
        bottomRight: activeHandleStyle,
        bottomLeft: activeHandleStyle,
        topRight: activeHandleStyle,
        topLeft: activeHandleStyle,
      }}
    >
      <div
        ref={(dom) => {
          if (dom) connect(dom)
        }}
        role="button"
        tabIndex={0}
        onMouseDown={() => actions.selectNode(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            actions.selectNode(id)
          }
        }}
        className={contentClassName}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          cursor: 'move',
          outline: isActive ? '2px solid var(--sc-accent)' : '1px dashed transparent',
          outlineOffset: '-1px',
          borderRadius: blockRadiusCss(block.radius),
          // A shadow renders outside the box, so it lives here, on the
          // unclipped outer content div — the group's own background/blur
          // clip on the inner div below instead, or the shadow would be cut
          // off with them.
          boxShadow: isGroup ? blockShadowCss(block) : undefined,
          ...contentStyle,
        }}
      >
        {isGroup && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              overflow: 'hidden',
              background: blockBackgroundCss(block),
              backdropFilter: block.blur ? `blur(${fluidPx(block.blur)})` : undefined,
            }}
          />
        )}
        {children}
      </div>
    </Rnd>
  )
}

const handleStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  background: 'var(--sc-accent)',
  borderRadius: 4,
  border: '2px solid white',
  boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
  // Sit above neighbouring blocks so a handle at a shared edge stays grabbable.
  zIndex: 20,
}
