import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Trash2, CheckCircle, XCircle, RefreshCw, AlertTriangle, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { moderationAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface ReportEntry {
  id: string;
  reason: string;
  reportedBy: string;
  createdAt: number;
  status: string;
}

interface ReportGroup {
  postId: string;
  postTitle: string;
  postContent: string;
  postAnonId: string;
  isHidden: boolean;
  reportCount: number;
  reports: ReportEntry[];
  latestReportAt: number;
  status: string;
}

interface ModeratorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPostRemoved: () => void;
}

const AUTO_HIDE_THRESHOLD = 50;

export function ModeratorPanel({ isOpen, onClose, onPostRemoved }: ModeratorPanelProps) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ReportGroup[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!user?.username) return;
    setLoading(true);
    try {
      const res = await moderationAPI.getReports(user.username, statusFilter);
      setGroups(res.reports || []);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  }, [user?.username, statusFilter]);

  useEffect(() => {
    if (isOpen) loadReports();
  }, [isOpen, loadReports]);

  const handleRemove = async (postId: string) => {
    if (!user?.username || !confirm('Permanently delete this post?')) return;
    setActioning(postId);
    try {
      await moderationAPI.removePost(postId, user.username);
      setGroups(g => g.filter(x => x.postId !== postId));
      onPostRemoved();
    } catch (err) {
      console.error('Remove failed', err);
    } finally {
      setActioning(null);
    }
  };

  const handleDismiss = async (postId: string) => {
    if (!user?.username) return;
    setActioning(postId);
    try {
      await moderationAPI.dismissReports(postId, user.username);
      setGroups(g => g.filter(x => x.postId !== postId));
      onPostRemoved(); // reload feed to show post again if it was hidden
    } catch (err) {
      console.error('Dismiss failed', err);
    } finally {
      setActioning(null);
    }
  };

  const timeAgo = (ts: number) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const pendingCount = groups.filter(g => g.status === 'pending').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Moderator Panel
            <Badge variant="secondary" className="ml-1">🛡️ {user?.username}</Badge>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-auto">{pendingCount} pending</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0 bg-muted/30">
          <Button size="sm" variant={statusFilter === 'pending' ? 'default' : 'outline'} onClick={() => setStatusFilter('pending')}>
            Pending
          </Button>
          <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>
            All
          </Button>
          <Button size="sm" variant="ghost" onClick={loadReports} disabled={loading} className="ml-auto gap-1">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Reports list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading reports...
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <CheckCircle className="w-10 h-10 text-green-500" />
              <p className="font-medium">No {statusFilter === 'pending' ? 'pending ' : ''}reports</p>
              <p className="text-sm">Everything looks clean ✓</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.postId} className="border border-border/60 rounded-xl bg-card/50 overflow-hidden">
                {/* Post header */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{group.postTitle}</p>
                        {group.isHidden && (
                          <Badge variant="outline" className="text-xs gap-1 border-orange-400 text-orange-500">
                            <EyeOff className="w-3 h-3" /> Auto-hidden
                          </Badge>
                        )}
                        {group.reportCount >= AUTO_HIDE_THRESHOLD && !group.isHidden && (
                          <Badge variant="outline" className="text-xs text-amber-500 border-amber-400">
                            ≥{AUTO_HIDE_THRESHOLD} reports
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {group.postAnonId} · last reported {timeAgo(group.latestReportAt)}
                      </p>
                    </div>
                    <Badge variant="destructive" className="shrink-0 text-xs">
                      {group.reportCount} report{group.reportCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Post content preview */}
                  <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-muted-foreground line-clamp-2 border border-border/30">
                    {group.postContent || 'Content unavailable'}
                  </div>

                  {/* Expand/collapse individual reports */}
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setExpanded(expanded === group.postId ? null : group.postId)}
                  >
                    {expanded === group.postId ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expanded === group.postId ? 'Hide' : 'Show'} {group.reports.length} report reason{group.reports.length !== 1 ? 's' : ''}
                  </button>
                </div>

                {/* Individual report reasons (expandable) */}
                {expanded === group.postId && (
                  <div className="border-t border-border/40 bg-muted/20 px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
                    {group.reports.map((r, i) => (
                      <div key={r.id || i} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-amber-700 dark:text-amber-400 font-medium">{r.reason}</span>
                          <span className="text-muted-foreground ml-2">· by {r.reportedBy} · {timeAgo(r.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {group.status === 'pending' && (
                  <div className="flex gap-2 px-4 py-3 border-t border-border/40 bg-background/40">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5 flex-1"
                      onClick={() => handleRemove(group.postId)}
                      disabled={actioning === group.postId}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Post
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 flex-1 hover:text-green-600 hover:border-green-500"
                      onClick={() => handleDismiss(group.postId)}
                      disabled={actioning === group.postId}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Dismiss & Restore
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
