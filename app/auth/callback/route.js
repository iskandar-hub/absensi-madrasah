import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Jika ada kode verifikasi dari Google, tukarkan dengan sesi login aktif
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Jika sukses login, lempar langsung ke halaman dashboard utama
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Jika gagal, kembalikan ke halaman login awal
  return NextResponse.redirect(`${origin}`)
}