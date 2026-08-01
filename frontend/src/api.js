export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
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
  requestPasswordReset: (email) => request('/api/auth/request-reset', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token, newPassword) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),
  me: () => request('/api/me'),
  changePassword: (currentPassword, newPassword) => request('/api/me/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) }),
  changeEmail: (newEmail, currentPassword) => request('/api/me/email', { method: 'PATCH', body: JSON.stringify({ newEmail, currentPassword }) }),
  updateMyLocation: ({ lat, lng }) => request('/api/pets/me/location', { method: 'PATCH', body: JSON.stringify({ lat, lng }) }),
  updateLocationPrivacy: (shareLocation) => request('/api/pets/me/privacy', { method: 'PATCH', body: JSON.stringify({ shareLocation }) }),
  deleteAccount: (password) => request('/api/me', { method: 'DELETE', body: JSON.stringify({ password }) }),
  feed: () => request('/api/feed'),
  createPost: ({ caption, photoFile, taggedPetIds }) => {
    const form = new FormData();
    form.append('caption', caption);
    if (photoFile) form.append('photo', photoFile);
    if (taggedPetIds && taggedPetIds.length) form.append('tagged_pet_ids', JSON.stringify(taggedPetIds));
    return request('/api/posts', { method: 'POST', body: form });
  },
  searchPets: (q) => request(`/api/pets/search?q=${encodeURIComponent(q)}`),
  toggleLike: (postId) => request(`/api/posts/${postId}/like`, { method: 'POST' }),
  deletePost: (postId) => request(`/api/posts/${postId}`, { method: 'DELETE' }),
  toggleComments: (postId) => request(`/api/posts/${postId}/toggle-comments`, { method: 'POST' }),
  comments: (postId) => request(`/api/posts/${postId}/comments`),
  addComment: (postId, body, taggedPetIds) => request(`/api/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body, taggedPetIds: taggedPetIds || [] }) }),
  editComment: (commentId, body) => request(`/api/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ body }) }),
  deleteComment: (commentId) => request(`/api/comments/${commentId}`, { method: 'DELETE' }),
  nearby: () => request('/api/nearby'),
  requestPlaydate: (targetPetId) => request('/api/playdates', { method: 'POST', body: JSON.stringify({ targetPetId }) }),
  pet: (petId) => request(`/api/pets/${petId}`),
  petPosts: (petId) => request(`/api/pets/${petId}/posts`),
  updatePetProfile: (payload) => request('/api/pets/me/profile', { method: 'PATCH', body: JSON.stringify(payload) }),
  uploadPetPhoto: (photoFile) => {
    const form = new FormData();
    form.append('photo', photoFile);
    return request('/api/pets/me/photo', { method: 'PATCH', body: form });
  },
  uploadPetCover: (photoFile) => {
    const form = new FormData();
    form.append('photo', photoFile);
    return request('/api/pets/me/cover', { method: 'PATCH', body: form });
  },
  updatePetAvatar: ({ bg, accessory }) => request('/api/pets/me/avatar', { method: 'PATCH', body: JSON.stringify({ bg, accessory }) }),
  sharePost: (postId, caption) => request(`/api/posts/${postId}/share`, { method: 'POST', body: JSON.stringify({ caption }) }),

  toggleFollow: (petId) => request(`/api/pets/${petId}/follow`, { method: 'POST' }),
  petFollowers: (petId) => request(`/api/pets/${petId}/followers`),
  petFollowing: (petId) => request(`/api/pets/${petId}/following`),

  toggleBlock: (petId) => request(`/api/pets/${petId}/block`, { method: 'POST' }),
  blockedPets: () => request('/api/pets/blocked/mine'),
  submitReport: ({ targetType, targetId, reason, details }) =>
    request('/api/reports', { method: 'POST', body: JSON.stringify({ targetType, targetId, reason, details }) }),

  stories: () => request('/api/stories'),
  createStory: (mediaFile, { overlays, musicFile, muteOriginal, taggedPetIds } = {}) => {
    const form = new FormData();
    form.append('media', mediaFile);
    if (overlays && overlays.length) form.append('overlays', JSON.stringify(overlays));
    if (musicFile) form.append('music', musicFile);
    if (muteOriginal) form.append('mute_original', '1');
    if (taggedPetIds && taggedPetIds.length) form.append('tagged_pet_ids', JSON.stringify(taggedPetIds));
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
  sendMessage: (petId, body) => request(`/api/conversations/${petId}/messages`, { method: 'POST', body: JSON.stringify({ body }) }),

  // Pantalla de reportes: no usa la sesión normal de un usuario, sino una
  // clave secreta separada (ver ADMIN_KEY en el backend) que viaja en la
  // URL — por eso estas dos funciones no dependen del token guardado.
  adminReports: (key) => request(`/api/admin/reports?key=${encodeURIComponent(key)}`),
  adminSetReportStatus: (key, id, status) =>
    request(`/api/admin/reports/${id}?key=${encodeURIComponent(key)}`, { method: 'PATCH', body: JSON.stringify({ status }) })
};
