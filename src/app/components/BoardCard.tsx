import { MessageSquare, Heart, Share2, TrendingUp, Flag, ShieldAlert, Trash2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useState } from 'react';
import { reportsAPI, moderationAPI, postsAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface BoardCardProps {
  postId: string;
  postUsername?: string | null;
  postAnonId?: string;
  title: string;
  content: string;
  category: string;
  likes: number;
  comments: number;
  timestamp: string;
  trending?: boolean;
  isReported?: boolean;
  reportCount?: number;
  likedBy?: string[];
  onPostDeleted?: () => void;
}

const REPORT_REASONS = [
  'Spam or advertising',
  'Harassment or bullying',
  'Hate speech',
  'Misinformation',
  'Explicit or inappropriate content',
  'Illegal content',
  'Other',
];

export function BoardCard({
  postId,
  postUsername,
  postAnonId,
  title,
  content,
  category,
  likes: initialLikes,
  comments,
  timestamp,
  trending,
  isReported,
  reportCount,
  likedBy = [],
  onPostDeleted,
}: BoardCardProps) {
  const { user, anonId } = useAuth();
  const isMod = user?.isAdmin || user?.isModerator || user?.username === 'Abhignyan1103';

  // Is the current user the creator of this post?
  const isCreator = user
    ? user.username === postUsername
    : postAnonId && anonId === postAnonId;

  const canDelete = isCreator || isMod;

  const voterId = user?.username || anonId;
  const [liked, setLiked] = useState(() => likedBy.includes(voterId));
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [liking, setLiking] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);
    try {
      const res = await postsAPI.likePost(postId, voterId);
      setLikeCount(res.likes);
      setLiked(res.liked);
    } catch {
      setLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1);
    } finally {
      setLiking(false);
    }
  };

  const handleReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!selectedReason) return;
    setReporting(true);
    try {
      await reportsAPI.reportPost(postId, {
        reason: selectedReason,
        username: user?.username,
        anonId: anonId,
      });
      setReported(true);
      setReportOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit report');
    } finally {
      setReporting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(isMod && !isCreator ? 'Delete this post as moderator?' : 'Delete your post?')) return;
    setDeleting(true);
    try {
      if (isMod && !isCreator) {
        // Mod delete via moderation endpoint
        await moderationAPI.deletePost(postId, user!.username);
      } else if (user) {
        // Logged-in creator delete
        await postsAPI.deletePost(postId, user.username, false);
      } else {
        // Anonymous creator delete
        await postsAPI.deletePost(postId, anonId, true);
      }
      onPostDeleted?.();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50 backdrop-blur-sm bg-card/80 group relative">
        {isMod && isReported && (
          <div className="absolute top-3 right-3 z-10">
            <Badge variant="destructive" className="text-xs gap-1">
              <ShieldAlert className="w-3 h-3" />
              {reportCount || 1} report{(reportCount || 1) > 1 ? 's' : ''}
            </Badge>
          </div>
        )}

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10">
              {category}
            </Badge>
            {trending && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                <TrendingUp className="w-3 h-3 mr-1" />
                Trending
              </Badge>
            )}
          </div>
          <span className="text-muted-foreground text-sm ml-2 shrink-0">{timestamp}</span>
        </div>

        <h3 className="mb-3 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-muted-foreground mb-4 line-clamp-3">{content}</p>

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 transition-colors ${liked ? 'text-rose-500 hover:text-rose-600' : 'hover:text-rose-500'}`}
              onClick={handleLike}
              disabled={liking}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500' : ''}`} />
              <span>{likeCount}</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 hover:text-primary transition-colors">
              <MessageSquare className="w-4 h-4" />
              <span>{comments}</span>
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1 hover:text-primary transition-colors">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            {/* Only show report if user is not the creator */}
            {!isCreator && (
              !reported ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 hover:text-amber-500 transition-colors"
                  onClick={handleReport}
                  title="Report post"
                >
                  <Flag className="w-4 h-4" />
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground px-2">Reported</span>
              )
            )}

            {/* Delete button — visible to creator or mod */}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1 transition-colors ${isMod && !isCreator ? 'hover:text-orange-500' : 'hover:text-destructive'}`}
                onClick={handleDelete}
                disabled={deleting}
                title={isMod && !isCreator ? 'Moderator: Delete post' : 'Delete your post'}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-4 h-4 text-amber-500" />
              Report Post
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-muted-foreground mb-3">Select a reason for reporting:</p>
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                className={`w-full text-left px-4 py-2 rounded-lg border text-sm transition-colors ${
                  selectedReason === reason
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
                onClick={() => setSelectedReason(reason)}
              >
                {reason}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button
              onClick={submitReport}
              disabled={!selectedReason || reporting}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {reporting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
