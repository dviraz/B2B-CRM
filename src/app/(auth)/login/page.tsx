'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    setMessage('Check your email for the login link!');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">AgencyOS</CardTitle>
          <CardDescription>
            {isMagicLink
              ? 'Enter your email to receive a magic link'
              : 'Sign in to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isMagicLink ? handleMagicLink : handlePasswordLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {!isMagicLink && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {message && (
                <p className="text-sm text-green-600">{message}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? 'Loading...'
                  : isMagicLink
                  ? 'Send Magic Link'
                  : 'Sign In'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsMagicLink(!isMagicLink);
                  setError('');
                  setMessage('');
                }}
              >
                {isMagicLink
                  ? 'Sign in with password instead'
                  : 'Sign in with magic link'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
