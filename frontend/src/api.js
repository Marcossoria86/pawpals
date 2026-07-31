const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const res = await fetch(API_BASE + path, {
    credentials: 'include',
    // Si el body es FormData (subida de archivos), dejamos que el navegador
    // ponga su propio Content-Type con el boundary correcto.
    headers: isFormData ? { ...(options.headers || {}) } : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const message = (data && data.error) || `Error ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/me'),
  feed: () => request('/api/feed'),
  createPost: ({ caption, photoFile }) => {
    const form = new FormData();
    form.append('caption', caption);
    if (photoFile) form.append('photo', photoFile);
    return request('/api/posts', { method: 'POST', body: form });
  },
  toggleLike: (postId) => request(`/api/posts/${postId}/like`, { method: 'POST' }),
  deletePost: (postId) => request(`/api/posts/${postId}`, { method: 'DELETE' }),
  toggleComments: (postId) => request(`/api/posts/${postId}/toggle-comments`, { method: 'POST' }),
  comments: (postId) => request(`/api/posts/${postId}/comments`),
  addComment: (postId, body) => request(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  nearby: () => request('/api/nearby'),
  requestPlaydate: (targetPetId) => request('/api/playdates', { method: 'POST', body: JSON.stringify({ targetPetId }) }),
  pet: (petId) => request(`/api/pets/${petId}`),
  uploadPetPhoto: (photoFile) => {
    const form = new FormData();
    form.append('photo', photoFile);
    return request('/api/pets/me/photo', { method: 'PATCH', body: form });
  },
  sharePost: (postId, caption) => request(`/api/posts/${postId}/share`, { method: 'POST', body: JSON.stringify({ caption }) }),

  stories: () => request('/api/stories'),
  createStory: (mediaFile) => {
    const form = new FormData();
    form.append('media', mediaFile);
    return request('/api/stories', { method: 'POST', body: form });
  },

  reels: () => request('/api/reels'),
  createReel: ({ caption, videoFile }) => {
    const form = new FormData();
    form.append('caption', caption || '');
    form.append('video', videoFile);
    return request('/api/reels', { method: 'POST', body: form });
  },

  playdatesIncoming: () => request('/api/playdates/incoming'),
  playdatesSent: () => request('/api/playdates/sent'),
  respondPlaydate: (id, status) => request(`/api/playdates/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  notifications: () => request('/api/notifications'),
  markNotificationsRead: () => request('/api/notifications/read', { method: 'POST' })
};
