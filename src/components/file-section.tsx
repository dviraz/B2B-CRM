'use client';

import { useState, useEffect } from 'react';
import { Paperclip, Loader2 } from 'lucide-react';
import { FileDropzone } from '@/components/file-dropzone';
import { FileList } from '@/components/file-list';
import { FilePreview } from '@/components/file-preview';
import { useFileUpload } from '@/hooks/use-file-upload';
import { toast } from 'sonner';
import type { FileUpload } from '@/types';

interface FileSectionProps {
  requestId: string;
  isAdmin: boolean;
}

export function FileSection({ requestId, isAdmin }: FileSectionProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [previewFile, setPreviewFile] = useState<FileUpload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { uploadFiles, deleteFile, isUploading } = useFileUpload({
    requestId,
    onSuccess: (file) => {
      setFiles((prev) => [file, ...prev]);
      toast.success(`Uploaded ${file.file_name}`);
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/requests/${requestId}/files`);
        if (response.ok) {
          const data = await response.json();
          setFiles(data);
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [requestId]);

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success('File deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed';
      toast.error(message);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <FileDropzone
        onFilesSelected={uploadFiles}
        isUploading={isUploading}
        disabled={false}
      />

      {/* File List */}
      {files.length > 0 && (
        <div>
          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attached Files ({files.length})
          </h5>
          <FileList
            files={files}
            onDelete={isAdmin ? handleDelete : undefined}
            onPreview={setPreviewFile}
            canDelete={isAdmin}
          />
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
