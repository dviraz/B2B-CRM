'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FileUpload } from '@/types';

interface UseFileUploadOptions {
  requestId: string;
  onSuccess?: (file: FileUpload) => void;
  onError?: (error: string) => void;
}

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'text/plain', 'text/csv',
  'video/mp4', 'video/webm', 'video/quicktime',
  'audio/mpeg', 'audio/wav',
];

export function useFileUpload({ requestId, onSuccess, onError }: UseFileUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setIsUploading(true);
      setUploadProgress(0);

      const supabase = createClient();
      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of files) {
        try {
          // Validate file size
          if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File "${file.name}" exceeds 50MB limit`);
          }

          // Validate file type
          if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error(`File type "${file.type}" is not allowed`);
          }

          // Generate unique storage path
          const timestamp = Date.now();
          const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const storagePath = `${requestId}/${timestamp}-${sanitizedName}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('request-files')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            throw new Error(uploadError.message);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('request-files')
            .getPublicUrl(storagePath);

          // Register file in database via API
          const response = await fetch(`/api/requests/${requestId}/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              storage_path: storagePath,
              storage_url: urlData.publicUrl,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to register file');
          }

          const uploadedFile = await response.json();
          onSuccess?.(uploadedFile);

          completedFiles++;
          setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Upload failed';
          onError?.(message);
        }
      }

      setIsUploading(false);
      setUploadProgress(0);
    },
    [requestId, onSuccess, onError]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      const response = await fetch(`/api/requests/${requestId}/files?file_id=${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      return true;
    },
    [requestId]
  );

  return {
    uploadFiles,
    deleteFile,
    isUploading,
    uploadProgress,
  };
}
