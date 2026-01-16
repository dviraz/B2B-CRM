'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_ACCEPT = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  'video/*': ['.mp4', '.webm', '.mov'],
  'application/pdf': ['.pdf'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

export function FileDropzone({
  onFilesSelected,
  isUploading = false,
  accept = DEFAULT_ACCEPT,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  className,
  disabled = false,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    disabled: disabled || isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
        'hover:border-primary/50 hover:bg-muted/50',
        isDragActive && 'border-primary bg-primary/10',
        isDragReject && 'border-destructive bg-destructive/10',
        (disabled || isUploading) && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center text-center">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {isDragActive
                ? 'Drop files here'
                : 'Drag & drop files here, or click to select'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each
            </p>
          </>
        )}
      </div>
    </div>
  );
}
