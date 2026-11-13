import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  if (code) {
    return NextResponse.redirect(`${requestUrl.origin}/recuperar/nueva?code=${code}`)
  }

  return NextResponse.redirect(`${requestUrl.origin}/recuperar/nueva`)
}