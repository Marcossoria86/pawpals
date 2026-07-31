const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const TOKEN_KEY = 'pawpals_token';

// Guardamos la sesión como un token (no como cookie): cuando el frontend y
// el backend viven en subdominios distintos (como en Render), los
// navegadores bloquean las cookies "entre sitios" aunque estén bien
// configuradas, y el login termina fallando en silencio. Un token guardado
// acá y mandado a mano en cada pedido no tiene ese problema.
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const token = getToken();
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(API_BASE + path, {
    // Si el body es FormData (subida de archivos), dejamos que el navegador
    // ponga su propio Content-Type con el boundary correcto.
    headers: isFormData
      ? { ...authHeader, ...(options.headers || {}) }
      : { 'Content-Type': 'application/json', ...authHeader, ...(options.headers || {}) },
    ...options
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    if (res.status === 401) clearToken();
    const message = (data && data.error) || `Error ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  register: async (payload) => {
    const data = await request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    setToken(data.token);
    return data;
  },
  login: async (payload) => {
    const data = await request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    setToken(data.token);
    return data;
  },
  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      clearToken();
    }
  },
  me: () => request('/api/me'),
  updateMyLocation: ({ lat, lng }) => request('/api/pets/me/location', { method: 'PATCH', body: JSON.stringify({ lat, lng }) }),
  updateLocationPrivacy: (shareLocation) => request('/api/pets/me/privacy', { method: 'PATCH', body: JSON.stringify({ shareLocation }) }),
  deleteAccount: (password) => request('/api/me', { method: 'DELETE', body: JSON.stringify({ password }) }),
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
  updatePetProfile: (payload) => request('/api/pets/me/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  uploadPetPhoto: (photoFile) => {
    const form = new FormData();
    form.append('photo', photoFile);
    return request('/api/pets/me/photo', { method: 'PATCH', body: form });
  },
  sharePost: (postId, caption) => request(`/api/posts/${postId}/share`, { method: 'POST', body: JSON.stringify({ caption }) }),

  toggleFollow: (petId) => request(`/api/pets/${petId}/follow`, { method: 'POST' }),
  petFollowers: (petId) => request(`/api/pets/${petId}/followers`),
  petFollowing: (petId) => request(`/api/pets/${petId}/following`),

  stories: () => request('/api/stories'),
  createStory: (mediaFile, { overlays, musicFile, muteOriginal } = {}) => {
    const form = new FormData();
    form.append('media', mediaFile);
    if (overlays && overlays.length) form.append('overlays', JSON.stringify(overlays));
    if (musicFile) form.append('music', musicFile);
    if (muteOriginal) form.append('mute_original', '1');
    return request('/api/stories', { method: 'POST', body: form });
  },

  reels: () => request('/api/reels'),
  createReel: ({ caption, videoFile, overlays }) => {
    const form = new FormData();
    form.append('caption', caption || '');
    form.append('video', videoFile);
    if (overlays && overlays.length) form.append('overlays', JSON.stringify(overlays));
    return request('/api/reels', { method: 'POST', body: form });
  },

  playdatesIncoming: () => request('/api/playdates/incoming'),
  playdatesSent: () => request('/api/playdates/sent'),
  respondPlaydate: (id, status) => request(`/api/playdates/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  notifications: () => request('/api/notifications'),
  markNotificationsRead: () => request('/api/notifications/read', { method: 'POST' }),

  conversations: () => request('/api/conversations'),
  unreadMessagesCount: () => request('/api/conversations/unread-count'),
  conversationMessages: (petId) => request(`/api/conversations/${petId}/messages`),
  sendMessage: (petId, body) => request(`/api/conversations/${petId}/messages`, { method: 'POST', body: JSON.stringify({ body }) })
};
