import { NextResponse } from 'next/server';

export function middleware(req) {
  const pass = process.env.DASHBOARD_PASSWORD;
  if (!pass) return new NextResponse('DASHBOARD_PASSWORD is not set', { status: 500 });
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    const [, p] = atob(auth.slice(6)).split(/:(.*)/s);
    if (p === pass) return NextResponse.next();
  }
  return new NextResponse('Sign in to view mail analytics', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Mail analytics"' },
  });
}
