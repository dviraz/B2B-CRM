'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Building2, LayoutDashboard, Users, Settings, BarChart3, FileText, Zap, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from '@/components/notification-center';
import { cn } from '@/lib/utils';
import type { Company, UserRole } from '@/types';

interface DashboardNavProps {
  user: {
    email: string;
    fullName: string;
    role: UserRole;
  };
  company: Company | null;
}

export function DashboardNav({ user, company }: DashboardNavProps) {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user.role === 'admin';

  // Prevent hydration mismatch with Radix UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="border-b glass-nav sticky top-0 z-40" role="banner">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="font-bold text-xl text-gradient-primary hover:opacity-80 transition-opacity"
            aria-label="AgencyOS Home"
          >
            AgencyOS
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'relative transition-all',
                  pathname === '/dashboard' && 'bg-primary/10 text-primary'
                )}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
                {pathname === '/dashboard' && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-primary rounded-full glow-primary" />
                )}
              </Button>
            </Link>

            {isAdmin && (
              <>
                <Link href="/dashboard/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'relative transition-all',
                      pathname === '/dashboard/admin' && 'bg-primary/10 text-primary'
                    )}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    All Clients
                    {pathname === '/dashboard/admin' && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-primary rounded-full glow-primary" />
                    )}
                  </Button>
                </Link>
                <Link href="/dashboard/admin/analytics">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'relative transition-all',
                      pathname === '/dashboard/admin/analytics' && 'bg-primary/10 text-primary'
                    )}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                    {pathname === '/dashboard/admin/analytics' && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-primary rounded-full glow-primary" />
                    )}
                  </Button>
                </Link>
                <Link href="/dashboard/admin/templates">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'relative transition-all',
                      pathname === '/dashboard/admin/templates' && 'bg-primary/10 text-primary'
                    )}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Templates
                    {pathname === '/dashboard/admin/templates' && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-primary rounded-full glow-primary" />
                    )}
                  </Button>
                </Link>
                <Link href="/dashboard/admin/workflows">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'relative transition-all',
                      pathname === '/dashboard/admin/workflows' && 'bg-primary/10 text-primary'
                    )}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Workflows
                    {pathname === '/dashboard/admin/workflows' && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-primary rounded-full glow-primary" />
                    )}
                  </Button>
                </Link>
                <Link href="/dashboard/admin/audit">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'relative transition-all',
                      pathname === '/dashboard/admin/audit' && 'bg-primary/10 text-primary'
                    )}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Audit
                    {pathname === '/dashboard/admin/audit' && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-primary rounded-full glow-primary" />
                    )}
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {company && (
            <div className="hidden sm:flex items-center gap-2 text-sm mr-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-medium">{company.name}</span>
              <Badge
                variant={company.status === 'active' ? 'success' : 'secondary'}
                className="text-xs"
              >
                {company.plan_tier}
              </Badge>
            </div>
          )}

          <NotificationCenter />

          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 hover:bg-muted">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/10 hover:ring-primary/30 transition-all">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-primary font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block font-medium">
                    {user.fullName || user.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.fullName || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/admin">
                      <Users className="h-4 w-4 mr-2" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" className="gap-2">
              <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block font-medium">
                {user.fullName || user.email}
              </span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
