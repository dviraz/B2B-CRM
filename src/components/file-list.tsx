'use client';

import { useState } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Archive,
  File,
  Download,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { FileUpload, FileType } from '@/types';

interface FileListProps {
  files: FileUpload[];
  onDelete?: (fileId: string) => Promise<void>;
  onPreview?: (file: FileUpload) => void;
  canDelete?: boolean;
  className?: string;
}

const iconMap: Record<FileType, React.ReactNode> = {
  image: <ImageIcon className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  archive: <Archive className="h-4 w-4" />,
  other: <File className="h-4 w-4" />,
};

const colorMap: Record<FileType, string> = {
  image: 'bg-green-100 text-green-600',
  video: 'bg-purple-100 text-purple-600',
  document: 'bg-blue-100 text-blue-600',
  archive: 'bg-yellow-100 text-yellow-600',
  other: 'bg-slate-100 text-slate-600',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({
  files,
  onDelete,
  onPreview,
  canDelete = false,
  className,
}: FileListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No files attached
      </p>
    );
  }

  const handleDelete = async (fileId: string) => {
    if (!onDelete) return;
    setDeletingId(fileId);
    try {
      await onDelete(fileId);
    } finally {
      setDeletingId(null);
    }
  };

  const isPreviewable = (file: FileUpload) => {
    return file.file_type === 'image' || file.file_type === 'document';
  };

  return (
    <div className={cn('space-y-2', className)}>
      {files.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          {/* File Type Icon */}
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
              colorMap[file.file_type]
            )}
          >
            {iconMap[file.file_type]}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.file_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.file_size)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(file.created_at), {
                  addSuffix: true,
                })}
              </span>
              {file.uploader && (
                <span className="text-xs text-muted-foreground">
                  by {file.uploader.full_name || file.uploader.email}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isPreviewable(file) && onPreview && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onPreview(file)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <a
                href={file.storage_url}
                download={file.file_name}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
              </a>
            </Button>
            {canDelete && onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={deletingId === file.id}
                  >
                    {deletingId === file.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete file?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{file.file_name}&quot;? This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(file.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
