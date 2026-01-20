'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Building2, LayoutDashboard, Users, Settings, BarChart3, FileText, Zap, Shield, Menu, X } from 'lucide-react';
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
import { ThemeToggle } from '@/components/theme-toggle';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user.role === 'admin';

  // Prevent hydration mismatch with Radix UI
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-xl">
            AgencyOS
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  pathname === '/dashboard' && 'bg-muted'
                )}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>

            {isAdmin && (
              <>
                <Link href="/dashboard/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      pathname === '/dashboard/admin' && 'bg-muted'
                    )}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    All Clients
                  </Button>
                </Link>
                <Link href="/dashboard/admin/analytics">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      pathname === '/dashboard/admin/analytics' && 'bg-muted'
                    )}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </Link>
                <Link href="/dashboard/admin/templates">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      pathname === '/dashboard/admin/templates' && 'bg-muted'
                    )}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </Link>
                <Link href="/dashboard/admin/workflows">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      pathname === '/dashboard/admin/workflows' && 'bg-muted'
                    )}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Workflows
                  </Button>
                </Link>
                <Link href="/dashboard/admin/audit">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      pathname === '/dashboard/admin/audit' && 'bg-muted'
                    )}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Audit
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {company && (
            <div className="hidden sm:flex items-center gap-2 text-sm mr-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{company.name}</span>
              <Badge
                variant={company.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {company.plan_tier}
              </Badge>
            </div>
          )}

          <ThemeToggle />
          <NotificationCenter />

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block">
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
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline-block">
                {user.fullName || user.email}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-card">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start',
                  pathname === '/dashboard' && 'bg-muted'
                )}
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>

            {isAdmin && (
              <>
                <Link href="/dashboard/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'w-full justify-start',
                      pathname === '/dashboard/admin' && 'bg-muted'
                    )}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    All Clients
                  </Button>
                </Link>
                <Link href="/dashboard/admin/analytics" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'w-full justify-start',
                      pathname === '/dashboard/admin/analytics' && 'bg-muted'
                    )}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Button>
                </Link>
                <Link href="/dashboard/admin/templates" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'w-full justify-start',
                      pathname === '/dashboard/admin/templates' && 'bg-muted'
                    )}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </Link>
                <Link href="/dashboard/admin/workflows" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'w-full justify-start',
                      pathname === '/dashboard/admin/workflows' && 'bg-muted'
                    )}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Workflows
                  </Button>
                </Link>
                <Link href="/dashboard/admin/audit" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'w-full justify-start',
                      pathname === '/dashboard/admin/audit' && 'bg-muted'
                    )}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Audit
                  </Button>
                </Link>
              </>
            )}

            <Link href="/dashboard/settings" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start',
                  pathname === '/dashboard/settings' && 'bg-muted'
                )}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
