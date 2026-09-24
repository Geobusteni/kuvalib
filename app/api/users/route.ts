// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Alexandru Negoita

import { requireAdmin } from '@/lib/auth'
import { createUser, listUsers, toPublicUser } from '@/lib/users'
import type { Role } from '@/lib/users'

const ROLES: Role[] = ['ADMIN', 'USER', 'GUEST']

export async function GET() {
  await requireAdmin()
  const users = await listUsers()
  return Response.json(users.map(toPublicUser))
}

export async function POST(request: Request) {
  await requireAdmin()

  const body = await request.json().catch(() => null)
  if (!body?.email || !ROLES.includes(body.role)) {
    return Response.json({ error: 'email_and_role_required' }, { status: 400 })
  }

  const role = body.role as Role
  if (role !== 'GUEST') {
    if (!body.username) {
      return Response.json({ error: 'username_required' }, { status: 400 })
    }
    if (!body.password || String(body.password).length < 8) {
      return Response.json({ error: 'password_too_short' }, { status: 400 })
    }
  }

  try {
    const user = await createUser({
      email: body.email,
      username: body.username ?? null,
      password: body.password ?? null,
      name: body.name ?? null,
      role,
    })
    return Response.json(toPublicUser(user), { status: 201 })
  } catch {
    return Response.json({ error: 'user_exists' }, { status: 409 })
  }
}
