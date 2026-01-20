'use client';

import { useEffect, useCallback, createContext, useContext, useState, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  scope?: string;
}

interface KeyboardShortcutsContextType {
  registerShortcut: (shortcut: Shortcut) => void;
  unregisterShortcut: (key: string) => void;
  showHelp: () => void;
  hideHelp: () => void;
  isHelpOpen: boolean;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType>({
  registerShortcut: () => {},
  unregisterShortcut: () => {},
  showHelp: () => {},
  hideHelp: () => {},
  isHelpOpen: false,
});

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Map<string, Shortcut>>(new Map());
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const getShortcutId = useCallback((shortcut: Shortcut) => {
    const parts = [];
    if (shortcut.ctrlKey || shortcut.metaKey) parts.push('mod');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.altKey) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }, []);

  const registerShortcut = useCallback((shortcut: Shortcut) => {
    const id = getShortcutId(shortcut);
    setShortcuts(prev => new Map(prev).set(id, shortcut));
  }, [getShortcutId]);

  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts(prev => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const showHelp = useCallback(() => setIsHelpOpen(true), []);
  const hideHelp = useCallback(() => setIsHelpOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow escape to work in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      // Build the shortcut ID from the event
      const parts = [];
      if (event.ctrlKey || event.metaKey) parts.push('mod');
      if (event.shiftKey) parts.push('shift');
      if (event.altKey) parts.push('alt');
      parts.push(event.key.toLowerCase());
      const id = parts.join('+');

      const shortcut = shortcuts.get(id);
      if (shortcut) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  // Register default shortcuts
  useEffect(() => {
    // Help shortcut
    registerShortcut({
      key: '?',
      shiftKey: true,
      description: 'Show keyboard shortcuts',
      action: showHelp,
      scope: 'Global',
    });

    // Escape to close help
    registerShortcut({
      key: 'Escape',
      description: 'Close dialog',
      action: hideHelp,
      scope: 'Global',
    });

    return () => {
      unregisterShortcut('shift+?');
      unregisterShortcut('escape');
    };
  }, [registerShortcut, unregisterShortcut, showHelp, hideHelp]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{ registerShortcut, unregisterShortcut, showHelp, hideHelp, isHelpOpen }}
    >
      {children}
      <KeyboardShortcutsHelp
        isOpen={isHelpOpen}
        onClose={hideHelp}
        shortcuts={Array.from(shortcuts.values())}
      />
    </KeyboardShortcutsContext.Provider>
  );
}

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext);
}

/**
 * Hook to register a keyboard shortcut
 */
export function useShortcut(shortcut: Omit<Shortcut, 'action'>, action: () => void) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    const fullShortcut = { ...shortcut, action };
    registerShortcut(fullShortcut);

    const parts = [];
    if (shortcut.ctrlKey || shortcut.metaKey) parts.push('mod');
    if (shortcut.shiftKey) parts.push('shift');
    if (shortcut.altKey) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());
    const id = parts.join('+');

    return () => unregisterShortcut(id);
  }, [shortcut, action, registerShortcut, unregisterShortcut]);
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

function KeyboardShortcutsHelp({ isOpen, onClose, shortcuts }: KeyboardShortcutsHelpProps) {
  // Group shortcuts by scope
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const scope = shortcut.scope || 'General';
    if (!acc[scope]) acc[scope] = [];
    acc[scope].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  const formatKey = (shortcut: Shortcut) => {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const parts = [];

    if (shortcut.ctrlKey || shortcut.metaKey) {
      parts.push(isMac ? 'Cmd' : 'Ctrl');
    }
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push(isMac ? 'Option' : 'Alt');

    // Format the key nicely
    let key = shortcut.key;
    if (key === ' ') key = 'Space';
    if (key.length === 1) key = key.toUpperCase();
    parts.push(key);

    return parts.join(' + ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {Object.entries(groupedShortcuts).map(([scope, scopeShortcuts]) => (
            <div key={scope}>
              <h4 className="mb-2 text-sm font-medium text-muted-foreground">{scope}</h4>
              <div className="space-y-2">
                {scopeShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs bg-muted rounded border">
                      {formatKey(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded border text-xs">Shift + ?</kbd> to show this help
        </p>
      </DialogContent>
    </Dialog>
  );
}
