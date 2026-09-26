// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

'use client'

import { useEditor, useNode, type EditorState } from '@craftjs/core'
import { Rnd } from 'react-rnd'
import { useCallback, useRef, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { clamp, type Block } from '@/lib/showcase-blocks'
import {
  adhere,
  adhereResize,
  alignResize,
  clampToLimits,
  createAdhesion,
  type Adhesion,
  type Rect,
  type ResizeDirection,
  type ResizeLimits,
  type SiblingRect,
} from '@/lib/showcase-snap'
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
  top: RESIZE_HANDLE_CLASS,
  right: RESIZE_HANDLE_CLASS,
  bottom: RESIZE_HANDLE_CLASS,
  left: RESIZE_HANDLE_CLASS,
  bottomRight: RESIZE_HANDLE_CLASS,
  bottomLeft: RESIZE_HANDLE_CLASS,
  topRight: RESIZE_HANDLE_CLASS,
  topLeft: RESIZE_HANDLE_CLASS,
}

interface Change {
  id: string
  block?: Partial<Block>
  parentGroupId?: string | null
}

/** Writes every change into one Craft state update, skipping fields that already match so an
 *  unmoved gesture leaves nothing to record. */
function applyChanges(changes: Change[]) {
  return (state: EditorState) => {
    for (const c of changes) {
      const node = state.nodes[c.id]
      if (!node) continue
      const props = node.data.props as { block: Block; parentGroupId: string | null }
      if (c.parentGroupId !== undefined && (props.parentGroupId ?? null) !== c.parentGroupId) {
        props.parentGroupId = c.parentGroupId
      }
      const patch = c.block
      if (!patch) continue
      const changed = (Object.keys(patch) as (keyof Block)[]).some((k) => props.block[k] !== patch[k])
      if (changed) props.block = { ...props.block, ...patch }
    }
  }
}

type Box = Pick<Block, 'x' | 'y' | 'w' | 'h'>

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

  const rndRef = useRef<Rnd>(null)
  // react-draggable only ever adds pointer deltas to its own state, so the
  // unsnapped pointer position is tracked here and the held position is pushed
  // back into Rnd with updatePosition.
  const drag = useRef<{
    raw: { x: number; y: number }
    held: { x: number; y: number }
    adhesion: Adhesion
    peers: SiblingRect[]
    children: Map<string, Box>
  } | null>(null)

  // Same idea for a resize: react-rnd derives size and position from the pointer alone, so the
  // held rectangle is pushed back into it from onResize.
  const resize = useRef<{
    start: Rect
    held: Rect
    adhesion: Adhesion
    peers: SiblingRect[]
    children: Map<string, Box>
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

  const isGroup = block.type === 'group'

  const childBoxes = useCallback((): Map<string, Box> => {
    const boxes = new Map<string, Box>()
    if (!isGroup) return boxes
    for (const s of siblings()) {
      if (s.parentGroupId === id) boxes.set(s.id, { x: s.block.x, y: s.block.y, w: s.block.w, h: s.block.h })
    }
    return boxes
  }, [id, isGroup, siblings])

  // A group gesture moves its children live without recording anything: the children are put
  // back to where they started and the whole result is then written as one recorded change, so
  // one undo restores the group and every child together.
  const showChildren = useCallback(
    (boxes: Map<string, Box>) => {
      if (boxes.size === 0) return
      actions.history.ignore().setState(applyChanges([...boxes].map(([cid, box]) => ({ id: cid, block: box }))))
    },
    [actions],
  )
  const commit = useCallback(
    (origin: Map<string, Box>, changes: Change[]) => {
      showChildren(origin)
      actions.setState(applyChanges(changes))
    },
    [actions, showChildren],
  )

  // A page-wide box, or a group child's own group: dragging (not resizing) is how a block
  // leaves a group, so this is the one place membership also means "never grow beyond it".
  const resizeLimits = (): ResizeLimits => {
    const parent = !isGroup && parentGroupId ? siblings().find((s) => s.id === parentGroupId)?.block : undefined
    return parent
      ? { x0: parent.x, y0: parent.y, x1: parent.x + parent.w, y1: parent.y + parent.h, minW: MIN_PCT, minH: MIN_PCT }
      : { x0: 0, y0: 0, x1: 100, y1: 100, minW: MIN_PCT, minH: MIN_PCT }
  }
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
  const visibility: React.CSSProperties = { opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }
  const activeEdgeStyles = {
    top: { ...edgeHitStyles.top, ...visibility },
    right: { ...edgeHitStyles.right, ...visibility },
    bottom: { ...edgeHitStyles.bottom, ...visibility },
    left: { ...edgeHitStyles.left, ...visibility },
  }

  return (
    <Rnd
      size={{ width: px.w, height: px.h }}
      ref={rndRef}
      position={{ x: px.x, y: px.y }}
      bounds="parent"
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        bottomRight: true,
        bottomLeft: true,
        topRight: true,
        topLeft: true,
      }}
      disableDragging={false}
      cancel={`.${RESIZE_HANDLE_CLASS}`}
      onDragStart={() => {
        actions.selectNode(id)
        drag.current = {
          raw: { x: block.x, y: block.y },
          held: { x: block.x, y: block.y },
          adhesion: createAdhesion(),
          peers: siblings()
            .filter((s) => s.id !== id && s.parentGroupId === parentGroupId)
            .map((s) => ({ id: s.id, x: s.block.x, y: s.block.y, w: s.block.w, h: s.block.h })),
          children: childBoxes(),
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
        showChildren(shiftedChildren(live.children, nx - block.x, ny - block.y))
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
        // A group never aligns to its own children, and a click that moved nothing stays put.
        const moved = rawX !== block.x || rawY !== block.y
        const others = siblings().filter((s) => s.id !== id && s.parentGroupId !== (isGroup ? id : undefined))
        const xCandidates = [0, 50, 100, ...others.flatMap((s) => [s.block.x, s.block.x + s.block.w / 2, s.block.x + s.block.w])]
        const yCandidates = [0, 50, 100, ...others.flatMap((s) => [s.block.y, s.block.y + s.block.h / 2, s.block.y + s.block.h])]
        const nx = moved ? clamp(snapAxis(rawX, block.w, xCandidates, pxToPct(SNAP_PX, frameW)), 0, 100 - block.w) : block.x
        const ny = moved ? clamp(snapAxis(rawY, block.h, yCandidates, pxToPct(SNAP_PX, frameH)), 0, 100 - block.h) : block.y

        const origin = live ? live.children : childBoxes()
        const changes: Change[] = [{ id, block: { x: nx, y: ny } }]

        if (isGroup) {
          for (const [cid, box] of shiftedChildren(origin, nx - block.x, ny - block.y)) changes.push({ id: cid, block: box })
        } else {
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
          changes[0].parentGroupId = target ? target.id : null
        }
        commit(origin, changes)
      }}
      onResizeStart={() => {
        const start = { x: block.x, y: block.y, w: block.w, h: block.h }
        resize.current = {
          start,
          held: start,
          adhesion: createAdhesion(),
          peers: siblings()
            .filter((s) => s.id !== id && s.parentGroupId === parentGroupId)
            .map((s) => ({ id: s.id, x: s.block.x, y: s.block.y, w: s.block.w, h: s.block.h })),
          children: childBoxes(),
        }
      }}
      onResize={(_e, dir, _ref, delta, position) => {
        const live = resize.current
        if (!live || frameW <= 0 || frameH <= 0) return
        const raw = {
          x: pxToPct(position.x, frameW),
          y: pxToPct(position.y, frameH),
          w: block.w + pxToPct(delta.width, frameW),
          h: block.h + pxToPct(delta.height, frameH),
        }
        const held = adhereResize(live.start, raw, dir as ResizeDirection, live.peers, { width: frameW, height: frameH }, live.adhesion, resizeLimits())
        live.held = held
        // re-resizable and react-rnd commit the pointer's raw size synchronously just before calling
        // this. A pointer-move update is scheduled in a later task, so without flushSync the raw
        // frame would be painted first and the held one would flicker in behind it.
        flushSync(() => {
          rndRef.current?.updateSize({ width: pctToPx(held.w, frameW), height: pctToPx(held.h, frameH) })
          rndRef.current?.updatePosition({ x: pctToPx(held.x, frameW), y: pctToPx(held.y, frameH) })
          showChildren(scaledChildren(live.children, block, held))
        })
      }}
      onResizeStop={(_e, dir, refEl, _delta, position) => {
        const live = resize.current
        resize.current = null
        const limits = resizeLimits()
        let next: Rect
        if (live) {
          // Same drop-time alignment as a drag, applied to the edge(s) that moved.
          const others = siblings().filter((s) => s.id !== id && s.parentGroupId !== (isGroup ? id : undefined))
          const xCandidates = [0, 50, 100, ...others.flatMap((s) => [s.block.x, s.block.x + s.block.w / 2, s.block.x + s.block.w])]
          const yCandidates = [0, 50, 100, ...others.flatMap((s) => [s.block.y, s.block.y + s.block.h / 2, s.block.y + s.block.h])]
          next = alignResize(live.held, dir as ResizeDirection, xCandidates, yCandidates, pxToPct(SNAP_PX, frameW), pxToPct(SNAP_PX, frameH), limits)
        } else {
          next = clampToLimits(
            {
              x: pxToPct(position.x, frameW),
              y: pxToPct(position.y, frameH),
              w: pxToPct(refEl.offsetWidth, frameW),
              h: pxToPct(refEl.offsetHeight, frameH),
            },
            limits,
          )
        }
        const origin = live ? live.children : childBoxes()
        const changes: Change[] = [{ id, block: next }]
        if (isGroup) {
          for (const [cid, box] of scaledChildren(origin, block, next)) changes.push({ id: cid, block: box })
        }
        commit(origin, changes)
        actions.selectNode(id)
      }}
      resizeHandleClasses={resizeHandleClasses}
      resizeHandleStyles={{
        ...activeEdgeStyles,
        bottomRight: activeHandleStyle,
        bottomLeft: activeHandleStyle,
        topRight: activeHandleStyle,
        topLeft: activeHandleStyle,
      }}
      resizeHandleComponent={{
        top: <EdgeGrip edge="top" />,
        right: <EdgeGrip edge="right" />,
        bottom: <EdgeGrip edge="bottom" />,
        left: <EdgeGrip edge="left" />,
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
          // unclipped outer content div — a group's own background/blur and a
          // button's own overflow clip inside it, or the shadow would be cut.
          boxShadow: isGroup || block.type === 'button' ? blockShadowCss(block) : undefined,
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
  zIndex: 21,
  touchAction: 'none',
}

// An edge handle is an invisible hit band that straddles the edge — a third outside the block,
// two thirds inside, because the page frame clips whatever sticks out — with a visible grip
// centred on it. `--sc-edge-hit` is 24px, and 44px on touch (globals.css). The band stops short
// of the corner handles (which reach 8px inside the block) so the two never overlap.
const EDGE_INSET = 8
const EDGE_MIN_LENGTH = 24
const outside = 'calc(var(--sc-edge-hit) / -3)'
const alongX = { left: '50%', width: `max(calc(100% - ${EDGE_INSET * 2}px), ${EDGE_MIN_LENGTH}px)`, transform: 'translateX(-50%)' }
const alongY = { top: '50%', height: `max(calc(100% - ${EDGE_INSET * 2}px), ${EDGE_MIN_LENGTH}px)`, transform: 'translateY(-50%)' }
const edgeHitStyles: Record<'top' | 'right' | 'bottom' | 'left', React.CSSProperties> = {
  top: { ...alongX, height: 'var(--sc-edge-hit)', top: outside, bottom: 'auto', cursor: 'ns-resize', zIndex: 20, touchAction: 'none' },
  bottom: { ...alongX, height: 'var(--sc-edge-hit)', bottom: outside, top: 'auto', cursor: 'ns-resize', zIndex: 20, touchAction: 'none' },
  left: { ...alongY, width: 'var(--sc-edge-hit)', left: outside, right: 'auto', cursor: 'ew-resize', zIndex: 20, touchAction: 'none' },
  right: { ...alongY, width: 'var(--sc-edge-hit)', right: outside, left: 'auto', cursor: 'ew-resize', zIndex: 20, touchAction: 'none' },
}

const GRIP_LONG = 28
const GRIP_SHORT = 8
// The grip sits on the block's edge, nudged 2px inward so it stays visible on the page border.
function EdgeGrip({ edge }: { edge: 'top' | 'right' | 'bottom' | 'left' }) {
  const horizontal = edge === 'top' || edge === 'bottom'
  const towardsEdge = edge === 'top' || edge === 'left'
  const across = towardsEdge
    ? `calc(var(--sc-edge-hit) / 3 - ${GRIP_SHORT / 2 - 2}px)`
    : `calc(var(--sc-edge-hit) * 2 / 3 - ${GRIP_SHORT / 2 + 2}px)`
  return (
    <span
      aria-hidden="true"
      style={{
        position: 'absolute',
        boxSizing: 'border-box',
        width: horizontal ? GRIP_LONG : GRIP_SHORT,
        height: horizontal ? GRIP_SHORT : GRIP_LONG,
        ...(horizontal
          ? { left: '50%', marginLeft: -GRIP_LONG / 2, top: across }
          : { top: '50%', marginTop: -GRIP_LONG / 2, left: across }),
        background: 'var(--sc-accent)',
        borderRadius: 4,
        border: '2px solid white',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
        pointerEvents: 'none',
      }}
    />
  )
}

function shiftedChildren(origin: Map<string, Box>, dx: number, dy: number): Map<string, Box> {
  return new Map([...origin].map(([cid, b]) => [cid, { ...b, x: clamp(b.x + dx, 0, 100), y: clamp(b.y + dy, 0, 100) }]))
}

/** Children scaled with their group's box, per axis: an edge resize only changes the axis it moved. */
function scaledChildren(origin: Map<string, Box>, from: Box, to: Box): Map<string, Box> {
  const sx = from.w ? to.w / from.w : 1
  const sy = from.h ? to.h / from.h : 1
  return new Map(
    [...origin].map(([cid, b]) => [
      cid,
      { x: to.x + (b.x - from.x) * sx, y: to.y + (b.y - from.y) * sy, w: b.w * sx, h: b.h * sy },
    ]),
  )
}
