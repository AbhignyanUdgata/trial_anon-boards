import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-d620122a`;

export interface User {
  id: string;
  username: string;
  anonId: string;
  isAdmin: boolean;
  isModerator: boolean;
  createdAt: number;
  postCount: number;
  replyCount: number;
  avatar: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  board: string;
  username: string | null;
  anonId: string;
  createdAt: number;
  likes: number;
  replyCount: number;
  views: number;
  isPinned: boolean;
}

export interface Reply {
  id: string;
  postId: string;
  parentReplyId: string | null;
  content: string;
  username: string | null;
  anonId: string;
  createdAt: number;
  level: number;
}

export interface Board {
  id: string;
  name: string;
  icon: string;
  description: string;
}

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API call failed');
  }

  return response.json();
}

// Auth API
export const authAPI = {
  register: (username: string, password: string) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getProfile: (username: string) =>
    apiCall(`/auth/profile/${username}`),
};

// Posts API
export const postsAPI = {
  getPosts: (params: { board?: string; sort?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.board) query.append('board', params.board);
    if (params.sort) query.append('sort', params.sort);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    return apiCall(`/posts?${query}`);
  },

  getPost: (id: string) =>
    apiCall(`/posts/${id}`),

  createPost: (data: { title: string; content: string; board: string; username?: string; anonId?: string }) =>
    apiCall('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  likePost: (id: string, voterId: string) =>
    apiCall(`/posts/${id}/like`, {
      method: 'POST',
      body: JSON.stringify({ voterId }),
    }),

  deletePost: (id: string, usernameOrAnonId: string, isAnon = false) =>
    apiCall(`/posts/${id}`, {
      method: 'DELETE',
      body: JSON.stringify(isAnon ? { anonId: usernameOrAnonId } : { username: usernameOrAnonId }),
    }),
};

// Replies API
export const repliesAPI = {
  getReplies: (postId: string) =>
    apiCall(`/posts/${postId}/replies`),

  createReply: (postId: string, data: { content: string; username?: string; anonId?: string; parentReplyId?: string }) =>
    apiCall(`/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteReply: (postId: string, replyId: string, username: string) =>
    apiCall(`/posts/${postId}/replies/${replyId}`, {
      method: 'DELETE',
      body: JSON.stringify({ username }),
    }),
};

// Boards API
export const boardsAPI = {
  getBoards: () =>
    apiCall('/boards'),

  initBoards: () =>
    apiCall('/boards/init', {
      method: 'POST',
    }),
};

// Reports API
export const reportsAPI = {
  reportPost: (postId: string, data: { reason: string; username?: string; anonId?: string }) =>
    apiCall(`/posts/${postId}/report`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Moderation API
export const moderationAPI = {
  getReports: (username: string, status = 'pending') =>
    apiCall(`/moderation/reports?username=${username}&status=${status}`),

  removePost: (postId: string, username: string) =>
    apiCall(`/moderation/posts/${postId}/remove`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  dismissReports: (postId: string, username: string) =>
    apiCall(`/moderation/posts/${postId}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  deletePost: (postId: string, username: string) =>
    apiCall(`/moderation/posts/${postId}`, {
      method: 'DELETE',
      body: JSON.stringify({ username }),
    }),
};
