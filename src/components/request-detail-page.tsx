'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  Paperclip,
  Send,
  User,
  Video,
  History,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SLAIndicator } from '@/components/sla-indicator';
import { FileDropzone } from '@/components/file-dropzone';
import { FileList } from '@/components/file-list';
import { ActivityTimeline } from '@/components/activity-timeline';
import { TeamMemberSelector } from '@/components/team-member-selector';
import { MentionInput } from '@/components/mention-input';
import { MarkdownRenderer } from '@/components/rich-text-editor';
import { NoCommentsEmptyState, NoFilesEmptyState } from '@/components/empty-state';
import { useShortcut } from '@/components/keyboard-shortcuts';
import { useCommentsRealtime } from '@/hooks/use-realtime';
import type { Request, Comment, Activity, FileUpload } from '@/types';

interface RequestDetailPageProps {
  request: Request;
  comments: Comment[];
  activities: Activity[];
  files: FileUpload[];
  isAdmin: boolean;
  currentUserId: string;
  teamMembers: { id: string; email: string; full_name: string | null; avatar_url: string | null }[];
}

const STATUS_CONFIG = {
  queue: { label: 'Queue', color: 'bg-slate-500' },
  active: { label: 'In Progress', color: 'bg-blue-500' },
  review: { label: 'Review', color: 'bg-yellow-500' },
  done: { label: 'Complete', color: 'bg-green-500' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-slate-500' },
  normal: { label: 'Normal', color: 'text-blue-500' },
  high: { label: 'High', color: 'text-red-500' },
};

export function RequestDetailPage({
  request,
  comments: initialComments,
  activities,
  files: initialFiles,
  isAdmin,
  currentUserId,
  teamMembers,
}: RequestDetailPageProps) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [files, setFiles] = useState<FileUpload[]>(initialFiles);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  // Keyboard shortcut to go back
  useShortcut({ key: 'Escape', description: 'Go back' }, () => router.back());

  // Real-time comments
  useCommentsRealtime(request.id, {
    onInsert: (comment) => {
      setComments(prev => [...prev, comment as Comment]);
    },
  });

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      // Extract mentions from the comment
      const mentionRegex = /data-mention-id="([^"]+)"/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(newComment)) !== null) {
        mentions.push(match[1]);
      }

      const response = await fetch(`/api/requests/${request.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          is_internal: isInternal,
          mentions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add comment');
      }

      const comment = await response.json();
      setComments(prev => [...prev, comment]);
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveRequest = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/requests/${request.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      toast.success('Request status updated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status');
    }
  };

  const handleAssign = async (userId: string) => {
    try {
      const response = await fetch(`/api/requests/${request.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign request');
      }

      toast.success('Request assigned');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign');
    }
  };

  const handleFileUpload = useCallback(async (fileData: {
    file_name: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
    storage_url: string;
  }) => {
    const response = await fetch(`/api/requests/${request.id}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to upload file');
    }

    const file = await response.json();
    setFiles(prev => [file, ...prev]);
    return file;
  }, [request.id]);

  const statusConfig = STATUS_CONFIG[request.status];
  const priorityConfig = PRIORITY_CONFIG[request.priority];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                <span className={`text-sm font-medium ${priorityConfig.color}`}>
                  {priorityConfig.label} Priority
                </span>
                {request.sla_status && <SLAIndicator status={request.sla_status} />}
              </div>
              <h1 className="text-xl font-semibold truncate">{request.title}</h1>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                {request.status === 'queue' && (
                  <Button onClick={() => handleMoveRequest('active')}>
                    Start Working
                  </Button>
                )}
                {request.status === 'active' && (
                  <Button onClick={() => handleMoveRequest('review')}>
                    Mark for Review
                  </Button>
                )}
                {request.status === 'review' && (
                  <Button onClick={() => handleMoveRequest('done')}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                )}
              </div>
            )}
            {!isAdmin && request.status === 'review' && (
              <Button onClick={() => handleMoveRequest('done')}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {request.description ? (
                  <MarkdownRenderer content={request.description} />
                ) : (
                  <p className="text-muted-foreground italic">No description provided</p>
                )}
              </CardContent>
            </Card>

            {/* Tabs: Comments, Files, Activity */}
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-0">
                  <TabsList>
                    <TabsTrigger value="comments" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comments ({comments.length})
                    </TabsTrigger>
                    <TabsTrigger value="files" className="gap-2">
                      <Paperclip className="h-4 w-4" />
                      Files ({files.length})
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="gap-2">
                      <History className="h-4 w-4" />
                      Activity
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="pt-4">
                  {/* Comments Tab */}
                  <TabsContent value="comments" className="m-0">
                    <ScrollArea className="h-[400px] pr-4">
                      {comments.length === 0 ? (
                        <NoCommentsEmptyState />
                      ) : (
                        <div className="space-y-4">
                          {comments.map((comment) => (
                            <div
                              key={comment.id}
                              className={`flex gap-3 ${comment.is_internal ? 'bg-yellow-50 dark:bg-yellow-950/20 -mx-2 px-2 py-2 rounded-lg' : ''}`}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.user?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {(comment.user?.full_name || comment.user?.email || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">
                                    {comment.user?.full_name || comment.user?.email}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                                  </span>
                                  {comment.is_internal && (
                                    <Badge variant="outline" className="text-xs">Internal</Badge>
                                  )}
                                </div>
                                <MarkdownRenderer content={comment.content} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    <Separator className="my-4" />

                    {/* Comment Input */}
                    <div className="space-y-3">
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <Switch
                            id="internal"
                            checked={isInternal}
                            onCheckedChange={setIsInternal}
                          />
                          <Label htmlFor="internal" className="text-sm">
                            Internal note (not visible to client)
                          </Label>
                        </div>
                      )}
                      <MentionInput
                        value={newComment}
                        onChange={setNewComment}
                        users={teamMembers}
                        placeholder="Add a comment... Use @ to mention someone"
                        disabled={isSubmitting}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSubmitComment}
                          disabled={!newComment.trim() || isSubmitting}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          {isSubmitting ? 'Sending...' : 'Send'}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Files Tab */}
                  <TabsContent value="files" className="m-0">
                    <div className="space-y-4">
                      <FileDropzone
                        requestId={request.id}
                        onUpload={handleFileUpload}
                      />
                      {files.length === 0 ? (
                        <NoFilesEmptyState />
                      ) : (
                        <FileList
                          files={files}
                          onDelete={(fileId) => {
                            setFiles(prev => prev.filter(f => f.id !== fileId));
                          }}
                          canDelete={isAdmin}
                        />
                      )}
                    </div>
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="m-0">
                    <ScrollArea className="h-[400px] pr-4">
                      <ActivityTimeline activities={activities} />
                    </ScrollArea>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Company */}
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Company</span>
                  <span className="ml-auto font-medium">{request.company?.name}</span>
                </div>

                {/* Assignee */}
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Assignee</span>
                  <div className="ml-auto">
                    {isAdmin ? (
                      <TeamMemberSelector
                        teamMembers={teamMembers}
                        selectedId={request.assigned_to || undefined}
                        onSelect={handleAssign}
                      />
                    ) : request.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={request.assignee.avatar_url || undefined} />
                          <AvatarFallback>
                            {(request.assignee.full_name || request.assignee.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {request.assignee.full_name || request.assignee.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Due Date</span>
                  <span className="ml-auto font-medium">
                    {request.due_date
                      ? format(new Date(request.due_date), 'MMM d, yyyy')
                      : 'Not set'}
                  </span>
                </div>

                {/* Created */}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="ml-auto text-sm">
                    {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>

                {request.completed_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="ml-auto text-sm">
                      {format(new Date(request.completed_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Links Card */}
            {(request.assets_link || request.video_brief) && (
              <Card>
                <CardHeader>
                  <CardTitle>Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {request.assets_link && (
                    <a
                      href={request.assets_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Assets Link
                    </a>
                  )}
                  {request.video_brief && (
                    <a
                      href={request.video_brief}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Video className="h-4 w-4" />
                      Video Brief
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* SLA Info Card */}
            {request.sla_hours && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    SLA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Target: {request.sla_hours} hours
                    </span>
                    {request.sla_status && <SLAIndicator status={request.sla_status} showLabel />}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
