'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Send, Lock, Calendar, UserPlus, MessageSquare, History, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SLAIndicator } from '@/components/sla-indicator';
import { RichTextEditor, MarkdownRenderer } from '@/components/rich-text-editor';
import { TeamMemberSelector } from '@/components/team-member-selector';
import { SingleAssigneeAvatar } from '@/components/assignment-avatars';
import { ActivityTimeline } from '@/components/activity-timeline';
import { FileSection } from '@/components/file-section';
import type { Request, Comment, Priority } from '@/types';

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
}

interface RequestDetailDialogProps {
  request: Request | null;
  onClose: () => void;
  isAdmin: boolean;
  onRequestUpdate?: (request: Request) => void;
}

const priorityColors: Record<Priority, string> = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  queue: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
};

export function RequestDetailDialog({
  request,
  onClose,
  isAdmin,
  onRequestUpdate,
}: RequestDetailDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isLoading, setIsLoading] = useState(!!request);
  const [isSending, setIsSending] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [currentAssignee, setCurrentAssignee] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch team members for assignment selector
  useEffect(() => {
    if (isAdmin) {
      fetch('/api/team-members')
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setTeamMembers(data))
        .catch(() => {});
    }
  }, [isAdmin]);

  // Update current assignee when request changes
  useEffect(() => {
    setCurrentAssignee(request?.assigned_to || null);
  }, [request?.assigned_to]);

  useEffect(() => {
    if (!request) {
      setComments([]);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    fetch(`/api/requests/${request.id}/comments`, { signal: controller.signal })
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        return [];
      })
      .then((data) => {
        if (isMounted) {
          setComments(data);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (isMounted && error.name !== 'AbortError') {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [request]);

  const handleAssignmentChange = async (userId: string | null) => {
    if (!request) return;
    setIsAssigning(true);

    try {
      const response = await fetch(`/api/requests/${request.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        setCurrentAssignee(userId);
        onRequestUpdate?.(updatedRequest);
      }
    } catch {
      // Revert on error
      setCurrentAssignee(request.assigned_to || null);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleSendComment = async () => {
    if (!request || !newComment || newComment === '<p></p>') return;
    setIsSending(true);

    const response = await fetch(`/api/requests/${request.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newComment,
        is_internal: isAdmin ? isInternal : false,
      }),
    });

    if (response.ok) {
      const comment = await response.json();
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    }
    setIsSending(false);
  };

  if (!request) return null;

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="pr-8">{request.title}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge className={statusColors[request.status]}>
              {request.status}
            </Badge>
            <Badge variant="outline" className={priorityColors[request.priority]}>
              {request.priority}
            </Badge>
            {request.due_date && (
              <SLAIndicator
                dueDate={request.due_date}
                slaStatus={request.sla_status}
                completedAt={request.completed_at}
                showDetails
              />
            )}
          </div>
          {request.due_date && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Due: {format(new Date(request.due_date), 'PPP')}</span>
            </div>
          )}

          {/* Assignment Section */}
          <div className="flex items-center gap-3 mt-3">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            {isAdmin ? (
              <TeamMemberSelector
                teamMembers={teamMembers}
                selectedId={currentAssignee}
                onSelect={handleAssignmentChange}
                disabled={isAssigning}
                className="w-48"
              />
            ) : request.assignee ? (
              <SingleAssigneeAvatar
                assignee={request.assignee}
                size="md"
                showName
              />
            ) : (
              <span className="text-sm text-muted-foreground">Unassigned</span>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4">
            {/* Description */}
            {request.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-2">
              {request.assets_link && (
                <a
                  href={request.assets_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Assets
                  </Button>
                </a>
              )}
              {request.video_brief && (
                <a
                  href={request.video_brief}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Video Brief
                  </Button>
                </a>
              )}
            </div>

            <Separator />

            {/* Comments and Activity Tabs */}
            <Tabs defaultValue="comments" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="comments" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({comments.length})
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-2">
                  <History className="h-4 w-4" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-2">
                  <Paperclip className="h-4 w-4" />
                  Files
                </TabsTrigger>
              </TabsList>

              <TabsContent value="comments" className="mt-4">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet</p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div
                        key={comment.id}
                        className={`flex gap-3 ${
                          comment.is_internal ? 'bg-yellow-50 p-2 rounded-lg' : ''
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {comment.user?.full_name?.[0] ||
                              comment.user?.email?.[0] ||
                              '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {comment.user?.full_name || comment.user?.email}
                            </span>
                            {comment.is_internal && (
                              <Badge variant="outline" className="text-xs">
                                <Lock className="h-3 w-3 mr-1" />
                                Internal
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <MarkdownRenderer
                            content={comment.content}
                            className="text-sm mt-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <ActivityTimeline requestId={request.id} />
              </TabsContent>

              <TabsContent value="files" className="mt-4">
                <FileSection requestId={request.id} isAdmin={isAdmin} />
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Comment Input */}
        <div className="border-t pt-4 mt-4">
          <RichTextEditor
            value={newComment}
            onChange={setNewComment}
            placeholder="Add a comment..."
          />
          <div className="flex items-center justify-between mt-2">
            {isAdmin && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded"
                />
                <Lock className="h-3 w-3" />
                Internal note (only visible to team)
              </label>
            )}
            {!isAdmin && <div />}
            <Button
              onClick={handleSendComment}
              disabled={!newComment || newComment === '<p></p>' || isSending}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
