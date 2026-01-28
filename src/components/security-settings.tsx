'use client';

import { useState } from 'react';
import { Shield, Loader2, Eye, EyeOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /[0-9]/.test(p) },
];

export function SecuritySettings() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;
  const allRequirementsMet = passwordRequirements.every((req) => req.test(newPassword));
  const canSubmit = passwordsMatch && allRequirementsMet;

  const handleChangePassword = async () => {
    if (!canSubmit) return;

    setIsChanging(true);
    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        toast.success('Password changed successfully');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to change password');
      }
    } catch {
      toast.error('Failed to change password');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security
        </CardTitle>
        <CardDescription>
          Manage your password and security settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Change Password Section */}
        <div>
          <h4 className="text-sm font-medium mb-4">Change Password</h4>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            {newPassword.length > 0 && (
              <div className="space-y-2 p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium text-muted-foreground">
                  Password requirements:
                </p>
                <ul className="space-y-1">
                  {passwordRequirements.map((req, index) => {
                    const met = req.test(newPassword);
                    return (
                      <li
                        key={index}
                        className={`text-xs flex items-center gap-2 ${
                          met ? 'text-green-600' : 'text-muted-foreground'
                        }`}
                      >
                        {met ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        {req.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm_password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={isChanging || !canSubmit}
              className="w-full sm:w-auto"
            >
              {isChanging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </div>
        </div>

        {/* Additional Security Info */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Security Tips</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Use a unique password that you don&apos;t use elsewhere</li>
            <li>• Consider using a password manager</li>
            <li>• Never share your password with anyone</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
