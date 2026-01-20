'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { Bold, Italic, List, ListOrdered, Code, Undo, Redo, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (userId: string) => void;
  users: User[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  onMention,
  users,
  placeholder = 'Write something... Use @ to mention someone',
  disabled = false,
  className,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Create mention suggestion extension
  const MentionSuggestion = Mention.configure({
    HTMLAttributes: {
      class: 'mention',
    },
    suggestion: {
      items: ({ query }: { query: string }) => {
        setMentionQuery(query);
        const filtered = users.filter(user =>
          (user.full_name || user.email)
            .toLowerCase()
            .includes(query.toLowerCase())
        ).slice(0, 5);
        setFilteredUsers(filtered);
        return filtered;
      },
      render: () => {
        return {
          onStart: () => {
            setShowSuggestions(true);
            setSelectedIndex(0);
          },
          onUpdate: () => {
            setSelectedIndex(0);
          },
          onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
              setSelectedIndex(prev =>
                prev === 0 ? filteredUsers.length - 1 : prev - 1
              );
              return true;
            }
            if (event.key === 'ArrowDown') {
              setSelectedIndex(prev =>
                prev === filteredUsers.length - 1 ? 0 : prev + 1
              );
              return true;
            }
            if (event.key === 'Enter') {
              if (filteredUsers[selectedIndex]) {
                selectUser(filteredUsers[selectedIndex]);
              }
              return true;
            }
            if (event.key === 'Escape') {
              setShowSuggestions(false);
              return true;
            }
            return false;
          },
          onExit: () => {
            setShowSuggestions(false);
          },
        };
      },
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      MentionSuggestion,
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Sanitize the HTML before passing to parent
      onChange(sanitizeHtml(html));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[80px] p-3',
      },
    },
  });

  const selectUser = (user: User) => {
    if (!editor) return;

    // Insert the mention
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'mention',
        attrs: {
          id: user.id,
          label: user.full_name || user.email,
        },
      })
      .insertContent(' ')
      .run();

    setShowSuggestions(false);
    onMention?.(user.id);
  };

  // Update editor content when value changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-md border border-input bg-background',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-1 border-b px-2 py-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled}
            className={cn('h-8 w-8 p-0', editor.isActive('bold') && 'bg-muted')}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled}
            className={cn('h-8 w-8 p-0', editor.isActive('italic') && 'bg-muted')}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={disabled}
            className={cn('h-8 w-8 p-0', editor.isActive('code') && 'bg-muted')}
          >
            <Code className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={disabled}
            className={cn('h-8 w-8 p-0', editor.isActive('bulletList') && 'bg-muted')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={disabled}
            className={cn('h-8 w-8 p-0', editor.isActive('orderedList') && 'bg-muted')}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().insertContent('@').run()}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Mention someone"
          >
            <AtSign className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={disabled || !editor.can().undo()}
            className="h-8 w-8 p-0"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={disabled || !editor.can().redo()}
            className="h-8 w-8 p-0"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} />
      </div>

      {/* Mention Suggestions Dropdown */}
      {showSuggestions && filteredUsers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-64 rounded-md border bg-popover shadow-md"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm text-left',
                'hover:bg-accent',
                index === selectedIndex && 'bg-accent'
              )}
              onClick={() => selectUser(user)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {(user.full_name || user.email).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">
                  {user.full_name || 'Unknown'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// CSS for mentions (add to globals.css)
export const mentionStyles = `
.mention {
  background-color: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
  font-weight: 500;
}

.mention::before {
  content: '@';
}
`;
