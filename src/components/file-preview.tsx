'use client';

import { X, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { FileUpload } from '@/types';

interface FilePreviewProps {
  file: FileUpload | null;
  onClose: () => void;
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  if (!file) return null;

  const isImage = file.file_type === 'image';
  const isPdf = file.mime_type === 'application/pdf';

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
          <DialogTitle className="truncate pr-4">{file.file_name}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a
                href={file.storage_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a
                href={file.storage_url}
                download={file.file_name}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </a>
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 bg-muted/20">
          {isImage && (
            <div className="flex items-center justify-center min-h-[400px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.storage_url}
                alt={file.file_name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}

          {isPdf && (
            <iframe
              src={file.storage_url}
              title={file.file_name}
              className="w-full h-[70vh] rounded-lg border"
            />
          )}

          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
              <p>Preview not available for this file type</p>
              <p className="text-sm mt-2">Click Open or Download to view the file</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
