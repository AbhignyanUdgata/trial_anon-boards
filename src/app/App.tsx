import { Shield, LogIn, LogOut, User, Menu, ShieldAlert } from 'lucide-react';
import { Button } from './components/ui/button';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthModals } from './components/AuthModals';
import { CreatePostDialog } from './components/CreatePostDialog';
import { Sidebar } from './components/Sidebar';
import { BoardCard } from './components/BoardCard';
import { ThreadModal } from './components/ThreadModal';
import { ModeratorPanel } from './components/ModeratorPanel';
import { Post, Board, postsAPI, boardsAPI } from './utils/api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { projectId, publicAnonKey } from '/utils/supabase/info';

function AppContent() {
  const { user, anonId, isAuthenticated, logout, refreshProfile } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState('all');
  const [sortBy, setSortBy] = useState('new');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [postCounts, setPostCounts] = useState<Record<string, number>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modPanelOpen, setModPanelOpen] = useState(false);

  const isMod = !!(user?.isAdmin || user?.isModerator || user?.username === 'Abhignyan1103');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { initializeApp(); }, []);
  useEffect(() => { loadPosts(); }, [activeBoard, sortBy]);

  const initializeApp = async () => {
    try {
      const boardsRes = await boardsAPI.getBoards();
      if (boardsRes.boards && boardsRes.boards.length > 0) {
        setBoards(boardsRes.boards);
      }
      await loadPosts();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await postsAPI.getPosts({
        board: activeBoard === 'all' ? undefined : activeBoard,
        sort: sortBy,
      });
      setPosts(response.posts);

      const counts: Record<string, number> = {};
      const allPostsRes = await postsAPI.getPosts({});
      allPostsRes.posts.forEach((post: Post) => {
        counts[post.board] = (counts[post.board] || 0) + 1;
      });
      setPostCounts(counts);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className={`sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-transform duration-300 ${isScrolled ? '-translate-y-full' : 'translate-y-0'}`}>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              <img
                src="/src/imports/anon_boards_logo.svg"
                alt="Anon Boards Logo"
                className="w-12 h-12 rounded-xl shadow-lg"
              />
              <div className={`overflow-hidden transition-all duration-300 ${isScrolled ? 'max-w-0 opacity-0' : 'max-w-md opacity-100'}`}>
                <h1 className="tracking-wider font-bold whitespace-nowrap" style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.3rem', letterSpacing: '0.1em' }}>
                  ANON BOARDS
                </h1>
                <p className="text-xs text-muted-foreground whitespace-nowrap tracking-wide" style={{ fontFamily: 'Space Grotesk, sans-serif', letterSpacing: '0.08em' }}>
                  TALK HERE INCOGNITO
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="hidden sm:inline">{user?.anonId || anonId}</span>
              </div>

              {/* Mod Panel Button — only visible to mods */}
              {isMod && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  onClick={() => setModPanelOpen(true)}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span className="hidden sm:inline">Mod Panel</span>
                </Button>
              )}

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <User className="w-4 h-4" />
                      <span className="hidden sm:inline">{user?.username}</span>
                      {isMod && <Shield className="w-3 h-3 text-amber-500" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled>
                      <User className="w-4 h-4 mr-2" />
                      {user?.username}
                      {isMod && <span className="ml-2 text-xs text-amber-500">🛡️ Mod</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                      Posts: {user?.postCount} | Replies: {user?.replyCount}
                    </DropdownMenuItem>
                    {isMod && (
                      <DropdownMenuItem onClick={() => setModPanelOpen(true)}>
                        <ShieldAlert className="w-4 h-4 mr-2 text-amber-500" />
                        Moderator Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setIsLoginOpen(true)} className="gap-2">
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              )}

              <CreatePostDialog boards={boards} onPostCreated={() => { loadPosts(); refreshProfile(); }} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'fixed inset-0 z-40 lg:relative lg:z-0' : 'hidden lg:block'}`}>
          {sidebarOpen && (
            <div
              className="absolute inset-0 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          <div className={`relative ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} transition-transform`}>
            <Sidebar
              boards={boards}
              activeBoard={activeBoard}
              onBoardChange={(boardId) => {
                setActiveBoard(boardId);
                setSidebarOpen(false);
              }}
              postCounts={postCounts}
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  {activeBoard === 'all' ? 'All Boards' : boards.find(b => b.id === activeBoard)?.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                </p>
              </div>

              <div className="flex gap-2 mb-6">
                {['new', 'hot', 'top'].map(s => (
                  <Button
                    key={s}
                    variant={sortBy === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Button>
                ))}
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No posts yet. Be the first to share!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {posts.map((post) => (
                    <div key={post.id} onClick={() => setSelectedPostId(post.id)} className="cursor-pointer">
                      <BoardCard
                        postId={post.id}
                        postUsername={post.username}
                        postAnonId={post.anonId}
                        title={post.title}
                        content={post.content}
                        category={boards.find(b => b.id === post.board)?.name || post.board}
                        likes={post.likes}
                        comments={post.replyCount}
                        timestamp={timeAgo(post.createdAt)}
                        trending={sortBy === 'hot' && post.likes > 100}
                        isReported={!!(post as any).isReported}
                        reportCount={(post as any).reportCount || 0}
                        likedBy={(post as any).likedBy || []}
                        onPostDeleted={loadPosts}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Thread Modal */}
      <ThreadModal
        postId={selectedPostId}
        isOpen={!!selectedPostId}
        onClose={() => setSelectedPostId(null)}
        onReplyCreated={refreshProfile}
      />

      {/* Moderator Panel */}
      <ModeratorPanel
        isOpen={modPanelOpen}
        onClose={() => setModPanelOpen(false)}
        onPostRemoved={loadPosts}
      />

      {/* Auth Modals */}
      <AuthModals
        isLoginOpen={isLoginOpen}
        isRegisterOpen={isRegisterOpen}
        onLoginOpenChange={setIsLoginOpen}
        onRegisterOpenChange={setIsRegisterOpen}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
