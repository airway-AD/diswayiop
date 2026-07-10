'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Role = 'admin' | 'marcom' | 'infographiste'

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 180}`
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`
}

function AdminNav({ onLogout }: { onLogout: () => void }) {
  const [copie, setCopie] = useState(false)

  const copierLien = async () => {
    const url = `${window.location.origin}/promo/nouvelle`
    try {
      await navigator.clipboard.writeText(url)
      setCopie(true)
      setTimeout(() => setCopie(false), 2000)
    } catch {
      // ignore, presse-papier indisponible
    }
  }

  const lienClass =
    'rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#0067B8]'

  return (
    <nav className="sticky top-0 z-40 flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white px-4 py-2">
      <Link href="/dashboard" className={lienClass}>
        Dashboard
      </Link>
      <Link href="/infographiste" className={lienClass}>
        Infographiste
      </Link>
      <Link href="/ventes/upload" className={lienClass}>
        Import ventes
      </Link>
      <Link href="/admin/config" className={lienClass}>
        Config
      </Link>
      <button
        onClick={copierLien}
        className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#0057A8] outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-[#0067B8]"
      >
        {copie ? 'Lien copie' : 'Copier le lien formulaire CDP'}
      </button>
      <button
        onClick={onLogout}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#0067B8]"
      >
        Se deconnecter
      </button>
    </nav>
  )
}

export default function RequireRole({
  roles,
  children,
}: {
  roles: Role[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [nom, setNom] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setRole(getCookie('diop_role'))
    setNom(getCookie('diop_nom'))
    setChecked(true)
  }, [])

  const deconnecter = () => {
    clearCookie('diop_role')
    clearCookie('diop_nom')
    router.push('/login')
  }

  const autorise = role === 'admin' || (role !== null && roles.includes(role as Role))

  useEffect(() => {
    if (checked && !autorise) {
      router.push('/login')
    }
  }, [checked, autorise, router])

  if (!checked || !autorise) return null

  if (role === 'infographiste' && !nom) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6F8] px-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">DIOP</p>
          <h1 className="mb-6 mt-1 text-xl font-bold text-gray-900">Tu es qui ?</h1>
          <div className="flex flex-col gap-2">
            {['Jamal', 'Zineb'].map((n) => (
              <button
                key={n}
                onClick={() => {
                  setCookie('diop_nom', n)
                  setNom(n)
                }}
                className="rounded-full border border-gray-200 py-3 text-sm font-semibold text-gray-700 outline-none hover:border-[#0057A8] hover:text-[#0057A8] focus-visible:ring-2 focus-visible:ring-[#0067B8]"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (role === 'admin') {
    return (
      <div>
        <AdminNav onLogout={deconnecter} />
        {children}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={deconnecter}
        className="fixed right-4 top-4 z-50 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[#0067B8]"
      >
        Se deconnecter{nom ? ` (${nom})` : ''}
      </button>
      {children}
    </div>
  )
}