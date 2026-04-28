import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Post, Reply, postsAPI, repliesAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Heart, X, Send, Trash2 } from 'lucide-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface ThreadModalProps {
  postId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReplyCreated?: () => void;
}

export function ThreadModal({ postId, isOpen, onClose, onReplyCreated }: ThreadModalProps) {
  const { user, anonId } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (postId && isOpen) {
      loadThread();
    }
  }, [postId, isOpen]);

  const loadThread = async () => {
    if (!postId) return;

    try {
      const [postRes, repliesRes] = await Promise.all([
        postsAPI.getPost(postId),
        repliesAPI.getReplies(postId),
      ]);

      setPost(postRes.post);
      setReplies(repliesRes.replies);
    } catch (error) {
      console.error('Failed to load thread:', error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !postId) return;

    setLoading(true);
    try {
      await repliesAPI.createReply(postId, {
        content: replyText,
        username: user?.username,
        anonId: user?.anonId || anonId,
        parentReplyId: replyingTo,
      });

      setReplyText('');
      setReplyingTo(null);
      await loadThread();
      onReplyCreated?.();
    } catch (error) {
      console.error('Failed to post reply:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!postId) return;

    try {
      await postsAPI.likePost(postId);
      await loadThread();
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!postId || !user) return;

    try {
      await repliesAPI.deleteReply(postId, replyId, user.username);
      await loadThread();
    } catch (error) {
      console.error('Failed to delete reply:', error);
    }
  };

  const organizeReplies = (replies: Reply[]) => {
    const replyMap = new Map<string, Reply[]>();
    const topLevel: Reply[] = [];

    replies.forEach(reply => {
      if (reply.parentReplyId) {
        if (!replyMap.has(reply.parentReplyId)) {
          replyMap.set(reply.parentReplyId, []);
        }
        replyMap.get(reply.parentReplyId)!.push(reply);
      } else {
        topLevel.push(reply);
      }
    });

    return { topLevel, replyMap };
  };

  const renderReply = (reply: Reply, level: number = 0) => {
    const { replyMap } = organizeReplies(replies);
    const childReplies = replyMap.get(reply.id) || [];
    const canDelete = user && (reply.username === user.username || user.isAdmin || user.isModerator);

    return (
      <div key={reply.id} className={`${level > 0 ? 'ml-8 pl-4 border-l-2 border-primary/20' : ''} mb-4`}>
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary">{reply.anonId}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(reply.createdAt).toLocaleDateString()}
              </span>
            </div>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteReply(reply.id)}
                className="h-6 w-6 p-0 hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>

          <p className="text-sm mb-3 whitespace-pre-wrap">{reply.content}</p>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReplyingTo(reply.id)}
            className="text-xs gap-1 h-7 px-2"
          >
            <MessageSquare className="w-3 h-3" />
            Reply
          </Button>
        </div>

        {childReplies.map(child => renderReply(child, level + 1))}
      </div>
    );
  };

  if (!post) return null;

  const { topLevel } = organizeReplies(replies);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <VisuallyHidden.Root>
          <DialogTitle>{post?.title}</DialogTitle>
          <DialogDescription>Thread discussion for {post?.title}</DialogDescription>
        </VisuallyHidden.Root>
        <div className="space-y-6">
          {/* Original Post */}
          <div className="bg-gradient-to-br from-primary/5 to-transparent border-l-4 border-primary p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">{user?.avatar || '👤'}</span>
                <div>
                  <p className="font-medium text-sm text-primary">{post.anonId}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <h2 className="text-2xl font-bold mb-3">{post.title}</h2>
            <p className="text-sm whitespace-pre-wrap mb-4">{post.content}</p>

            <div className="flex items-center gap-4 pt-4 border-t border-border/50">
              <Button variant="ghost" size="sm" onClick={handleLike} className="gap-2">
                <Heart className="w-4 h-4" />
                <span>{post.likes}</span>
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span>{post.replyCount} replies</span>
              </div>
            </div>
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Replies ({replies.length})
              </h3>
              {topLevel.map(reply => renderReply(reply))}
            </div>
          )}

          {/* Reply Form */}
          <form onSubmit={handleReply} className="space-y-4 border-t border-border/50 pt-6">
            {replyingTo && (
              <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg">
                <span className="text-xs text-muted-foreground">Replying to a comment</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                  className="h-6 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}

            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Share your thoughts..."
              className="min-h-[100px]"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Posting as <span className="text-primary font-medium">{user?.anonId || anonId}</span></span>
              </div>

              <Button type="submit" disabled={loading || !replyText.trim()} className="gap-2">
                <Send className="w-4 h-4" />
                {loading ? 'Posting...' : 'Post Reply'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
