import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()

  let role: 'admin' | 'marcom' | 'infographiste' | null = null

  if (password === process.env.ADMIN_PASSWORD) {
    role = 'admin'
  } else if (password === process.env.MARCOM_PASSWORD) {
    role = 'marcom'
  } else if (password === process.env.INFOGRAPHISTE_PASSWORD) {
    role = 'infographiste'
  }

  if (!role) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true, role })
  response.cookies.set('diop_role', role, {
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    httpOnly: false,
    sameSite: 'lax',
  })

  return response
}