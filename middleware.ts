import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl.clone()
  const host = hostname.split(':')[0]

  const isProd = host.endsWith('.vigorepro.com.br')
  const isDev = host.endsWith('.localhost')

  if (isProd) {
    const slug = host.replace('.vigorepro.com.br', '')
    if (slug && slug !== 'www' && slug !== 'app') {
      url.searchParams.set('slug', slug)
      return NextResponse.rewrite(url)
    }
  }

  if (isDev) {
    const slug = host.replace('.localhost', '')
    if (slug) {
      url.searchParams.set('slug', slug)
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
