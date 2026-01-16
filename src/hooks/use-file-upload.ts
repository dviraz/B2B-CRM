'use client';

import { useState, useCallback } from 'react';
import type { FileUpload } from '@/types';

interface UseFileUploadOptions {
  requestId: string;
  onSuccess?: (file: FileUpload) => void;
  onError?: (error: string) => void;
}

export function useFileUpload({ requestId, onSuccess, onError }: UseFileUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setIsUploading(true);
      setUploadProgress(0);

      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);

          const response = await fetch(`/api/requests/${requestId}/files`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
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
