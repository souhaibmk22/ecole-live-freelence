import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ROLE_HOME, type Role } from '../types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';
  const isPlatformRoute =
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/prof') ||
    pathname.startsWith('/etudiant') ||
    pathname.startsWith('/parent');

  // 1. Redirection si non connecté sur une route plateforme
  if (!user && isPlatformRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // 2. Si connecté, récupération du rôle
  if (user) {
    let role: Role = 'etudiant';
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('MIDDLEWARE PROFILE FETCH ERROR:', error);
    } else if (profile && profile.role) {
      role = profile.role as Role;
      console.log('MIDDLEWARE FOUND ROLE:', role, 'FOR USER:', user.email);
    }

    const homeUrl = ROLE_HOME[role] || '/etudiant';

    // Si sur /login alors qu'on est déjà connecté -> redirection vers son espace
    if (isLoginPage) {
      const url = request.nextUrl.clone();
      url.pathname = homeUrl;
      return NextResponse.redirect(url);
    }

    // Contrôle d'accès strict par préfixe d'URL
    if (pathname.startsWith('/super-admin') && role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = homeUrl;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = homeUrl;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/prof') && role !== 'prof' && role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = homeUrl;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/etudiant') && role !== 'etudiant' && role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = homeUrl;
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/parent') && role !== 'parent' && role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = homeUrl;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
