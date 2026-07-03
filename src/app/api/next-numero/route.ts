import { NextResponse } from 'next/server'
import { getNextNumeroPromo } from '@/lib/numero-promo'

export async function GET() {
  try {
    const numero = await getNextNumeroPromo(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    return NextResponse.json({ numero })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la generation du numero' }, { status: 500 })
  }
}
