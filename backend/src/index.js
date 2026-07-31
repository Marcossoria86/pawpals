require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const db = require('./db');
const { signToken, requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 4000;
// CLIENT_ORIGIN puede tener varios orígenes separados por coma (ej. la web
// en Render + la app nativa). Además de lo que esté configurado, siempre
// permitimos los orígenes típicos de la app empaquetada con Capacitor
// (iOS/Android): ahí el navegador interno no manda el dominio real, sino
// uno de estos esquemas fijos.
const CAPACITOR_ORIGINS = ['capacitor://localhost', 'http://localhost', 'https://localhost'];
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .concat(CAPACITOR_ORIGINS);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.m4v'];

function makeStorage() {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allExt = [...IMAGE_EXT, ...VIDEO_EXT];
      const safeExt = allExt.includes(ext) ? ext : (file.mimetype.startsWith('video/') ? '.mp4' : '.jpg');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    }
  });
}

// Traduce los errores de multer (vienen en inglés, ej. "File too large") a
// mensajes claros en español, con el límite real de cada tipo de subida.
function uploadErrorMessage(err, maxMb) {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return `El archivo pesa demasiado (máximo ${maxMb} MB). Probá con uno más liviano o de menor calidad.`;
  }
  return (err && err.message) || 'No se pudo subir el archivo';
}

// Fotos de publicaciones y de perfil: solo imágenes, 8 MB.
const IMAGE_MAX_MB = 8;
const upload = multer({
  storage: makeStorage(),
  limits: { fileSize: IMAGE_MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se permiten imágenes'));
    cb(null, true);
  }
});

// Historias: foto o video corto, 30 MB.
const STORY_MAX_MB = 30;
const uploadStory = multer({
  storage: makeStorage(),
  limits: { fileSize: STORY_MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Solo se permiten fotos o videos'));
    }
    cb(null, true);
  }
});

// Reels: video real, 75 MB (sin transcodificar — el navegador reproduce el
// archivo tal cual se subió, por eso conviene pedir clips ya livianos).
const REEL_MAX_MB = 75;
const uploadReel = multer({
  storage: makeStorage(),
  limits: { fileSize: REEL_MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) return cb(new Error('Solo se permiten videos'));
    cb(null, true);
  }
});

app.use(express.json());
app.use(cors({
  origin: (origin, cb) => {
    // Pedidos sin "origin" (ej. apps nativas en algunos casos, o curl) los
    // dejamos pasar; si viene un origin, tiene que estar en la lista.
    if (!origin || CLIENT_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('No permitido por CORS'));
  },
  credentials: true
}));
app.use('/uploads', express.static(UPLOADS_DIR));

function haversineKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined)) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPetByOwner(ownerId) {
  return db.prepare('SELECT * FROM pets WHERE owner_id = ?').get(ownerId);
}

function absoluteUploadUrl(req, imagePath) {
  if (!imagePath) return null;
  return `${req.protocol}://${req.get('host')}/uploads/${imagePath}`;
}

// Crea una notificación, salvo que el destinatario sea la propia persona que
// disparó la acción (nadie necesita que le avisen que le dio like a lo suyo).
function notify(recipientUserId, actorUserId, actorPetId, type, { postId = null, playdateId = null } = {}) {
  if (!recipientUserId || recipientUserId === actorUserId) return;
  db.prepare(
    `INSERT INTO notifications (recipient_user_id, actor_pet_id, type, post_id, playdate_id)
     VALUES (?, ?, ?, ?, ?)`
  ).run(recipientUserId, actorPetId, type, postId, playdateId);
}

function ownerIdOfPet(petId) {
  const row = db.prepare('SELECT owner_id FROM pets WHERE id = ?').get(petId);
  return row ? row.owner_id : null;
}

// ---------- AUTH ----------

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, petName, petSpecies, petBreed, petAge, petBio, lat, lng } = req.body;
  if (!name || !email || !password || !petName || !petSpecies || !petBreed) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Ese correo ya está registrado' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const userInfo = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, passwordHash);

  const colorPalette = ['#f2e3da', '#e1ede8'];
  const color = colorPalette[userInfo.lastInsertRowid % 2];

  db.prepare(
    `INSERT INTO pets (owner_id, name, species, breed, age, bio, color, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userInfo.lastInsertRowid,
    petName,
    petSpecies,
    petBreed,
    petAge || null,
    petBio || '',
    color,
    lat ?? 19.4326,
    lng ?? -99.1332
  );

  const token = signToken(userInfo.lastInsertRowid);
  res.json({ ok: true, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  const token = signToken(user.id);
  res.json({ ok: true, token });
});

app.post('/api/auth/logout', (req, res) => {
  // Con autenticación por Bearer token no hay nada que borrar del lado del
  // servidor — el frontend simplemente descarta el token que tenía guardado.
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.userId);
  const pet = getPetByOwner(req.userId);
  if (!user || !pet) return res.status(404).json({ error: 'No encontrado' });

  const postsCount = db.prepare('SELECT COUNT(*) AS c FROM posts WHERE pet_id = ?').get(pet.id).c;
  const playdatesCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM playdates
       WHERE (requester_pet_id = ? OR target_pet_id = ?) AND status = 'accepted'`
    )
    .get(pet.id, pet.id).c;
  const friendsCount = db
    .prepare(
      `SELECT COUNT(DISTINCT owner_id) AS c FROM pets WHERE owner_id != ?`
    )
    .get(req.userId).c;

  res.json({
    user,
    pet: { ...pet, photo_url: absoluteUploadUrl(req, pet.photo_path) },
    stats: { posts: postsCount, playdates: playdatesCount, friends: friendsCount }
  });
});

app.patch('/api/pets/me/photo', requireAuth, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: uploadErrorMessage(err, IMAGE_MAX_MB) });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  db.prepare('UPDATE pets SET photo_path = ? WHERE id = ?').run(req.file.filename, pet.id);

  res.json({ photo_url: absoluteUploadUrl(req, req.file.filename) });
});

app.get('/api/pets/:id', requireAuth, (req, res) => {
  const petId = Number(req.params.id);
  const pet = db
    .prepare(
      `SELECT pets.*, users.name AS owner_name
       FROM pets JOIN users ON users.id = pets.owner_id
       WHERE pets.id = ?`
    )
    .get(petId);
  if (!pet) return res.status(404).json({ error: 'Mascota no encontrada' });

  const postsCount = db.prepare('SELECT COUNT(*) AS c FROM posts WHERE pet_id = ?').get(pet.id).c;

  const myPet = getPetByOwner(req.userId);
  let distanceKm = null;
  let playdateStatus = null;
  if (myPet && myPet.id !== pet.id) {
    distanceKm = haversineKm(myPet.lat, myPet.lng, pet.lat, pet.lng);
    const sent = db
      .prepare('SELECT status FROM playdates WHERE requester_pet_id = ? AND target_pet_id = ?')
      .get(myPet.id, pet.id);
    playdateStatus = sent ? sent.status : null;
  }

  res.json({
    pet: { ...pet, photo_url: absoluteUploadUrl(req, pet.photo_path) },
    owner_name: pet.owner_name,
    is_me: !!myPet && myPet.id === pet.id,
    distance_km: distanceKm,
    playdate_status: playdateStatus,
    stats: { posts: postsCount }
  });
});

// ---------- FEED ----------

app.get('/api/feed', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT posts.id, posts.caption, posts.media, posts.image_path, posts.comments_disabled, posts.created_at,
              posts.shared_post_id,
              pets.id AS pet_id, pets.owner_id, pets.name AS pet_name, pets.species, pets.breed, pets.color, pets.photo_path,
              (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comments_count,
              EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me,
              orig.caption AS shared_caption, orig.image_path AS shared_image_path,
              origpet.name AS shared_pet_name, origpet.species AS shared_species, origpet.color AS shared_color
       FROM posts
       JOIN pets ON pets.id = posts.pet_id
       LEFT JOIN posts orig ON orig.id = posts.shared_post_id
       LEFT JOIN pets origpet ON origpet.id = orig.pet_id
       WHERE posts.post_type = 'post'
       ORDER BY posts.created_at DESC, posts.id DESC`
    )
    .all(req.userId);

  res.json(
    rows.map((r) => ({
      ...r,
      liked_by_me: !!r.liked_by_me,
      comments_disabled: !!r.comments_disabled,
      is_mine: r.owner_id === req.userId,
      image_url: absoluteUploadUrl(req, r.image_path),
      pet_photo_url: absoluteUploadUrl(req, r.photo_path),
      shared_image_url: absoluteUploadUrl(req, r.shared_image_path)
    }))
  );
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const post = db
    .prepare('SELECT posts.id, pets.owner_id FROM posts JOIN pets ON pets.id = posts.pet_id WHERE posts.id = ?')
    .get(postId);
  if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });
  if (post.owner_id !== req.userId) return res.status(403).json({ error: 'No puedes eliminar una publicación que no es tuya' });

  db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
  res.json({ ok: true });
});

app.post('/api/posts/:id/toggle-comments', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const post = db
    .prepare('SELECT posts.id, posts.comments_disabled, pets.owner_id FROM posts JOIN pets ON pets.id = posts.pet_id WHERE posts.id = ?')
    .get(postId);
  if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });
  if (post.owner_id !== req.userId) return res.status(403).json({ error: 'No puedes modificar una publicación que no es tuya' });

  const newValue = post.comments_disabled ? 0 : 1;
  db.prepare('UPDATE posts SET comments_disabled = ? WHERE id = ?').run(newValue, postId);
  res.json({ comments_disabled: !!newValue });
});

app.post('/api/posts', requireAuth, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: uploadErrorMessage(err, IMAGE_MAX_MB) });
    next();
  });
}, (req, res) => {
  const { caption } = req.body;
  if (!caption || !caption.trim()) return res.status(400).json({ error: 'La publicación no puede estar vacía' });
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const imagePath = req.file ? req.file.filename : null;

  const info = db
    .prepare('INSERT INTO posts (pet_id, caption, media, image_path) VALUES (?, ?, ?, ?)')
    .run(pet.id, caption.trim().slice(0, 280), '📸', imagePath);

  res.json({ id: info.lastInsertRowid, image_url: absoluteUploadUrl(req, imagePath) });
});

app.get('/api/posts/:id/comments', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });

  const rows = db
    .prepare(
      `SELECT comments.id, comments.body, comments.created_at,
              pets.id AS pet_id, pets.name AS pet_name, pets.species, pets.color, pets.photo_path
       FROM comments
       JOIN pets ON pets.id = comments.pet_id
       WHERE comments.post_id = ?
       ORDER BY comments.created_at ASC, comments.id ASC`
    )
    .all(postId);

  res.json(rows.map((r) => ({ ...r, photo_url: absoluteUploadUrl(req, r.photo_path) })));
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const { body } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'El comentario no puede estar vacío' });

  const post = db
    .prepare('SELECT posts.id, posts.comments_disabled, pets.owner_id FROM posts JOIN pets ON pets.id = posts.pet_id WHERE posts.id = ?')
    .get(postId);
  if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });
  if (post.comments_disabled) return res.status(403).json({ error: 'Los comentarios están desactivados para esta publicación' });

  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const info = db
    .prepare('INSERT INTO comments (post_id, pet_id, body) VALUES (?, ?, ?)')
    .run(postId, pet.id, body.trim().slice(0, 280));

  notify(post.owner_id, req.userId, pet.id, 'comment', { postId });

  const comment = db
    .prepare(
      `SELECT comments.id, comments.body, comments.created_at,
              pets.id AS pet_id, pets.name AS pet_name, pets.species, pets.color, pets.photo_path
       FROM comments JOIN pets ON pets.id = comments.pet_id
       WHERE comments.id = ?`
    )
    .get(info.lastInsertRowid);

  res.json({ ...comment, photo_url: absoluteUploadUrl(req, comment.photo_path) });
});

app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const post = db
    .prepare('SELECT posts.id, pets.id AS pet_id, pets.owner_id FROM posts JOIN pets ON pets.id = posts.pet_id WHERE posts.id = ?')
    .get(postId);
  if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });

  const existingLike = db
    .prepare('SELECT id FROM likes WHERE post_id = ? AND user_id = ?')
    .get(postId, req.userId);

  if (existingLike) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existingLike.id);
    res.json({ liked: false });
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, req.userId);
    const myPet = getPetByOwner(req.userId);
    notify(post.owner_id, req.userId, myPet ? myPet.id : null, 'like', { postId });
    res.json({ liked: true });
  }
});

// ---------- NEARBY / PLAYDATES ----------

app.get('/api/nearby', requireAuth, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const others = db.prepare('SELECT pets.*, users.name AS owner_name FROM pets JOIN users ON users.id = pets.owner_id WHERE pets.owner_id != ?').all(req.userId);

  const sentRequests = db
    .prepare('SELECT target_pet_id, status FROM playdates WHERE requester_pet_id = ?')
    .all(myPet.id);
  const sentMap = Object.fromEntries(sentRequests.map((r) => [r.target_pet_id, r.status]));

  const result = others
    .map((p) => ({
      id: p.id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      color: p.color,
      photo_url: absoluteUploadUrl(req, p.photo_path),
      owner_name: p.owner_name,
      distance_km: haversineKm(myPet.lat, myPet.lng, p.lat, p.lng),
      status: sentMap[p.id] || null
    }))
    .sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));

  res.json(result);
});

app.post('/api/playdates', requireAuth, (req, res) => {
  const { targetPetId } = req.body;
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.status(404).json({ error: 'No tienes una mascota registrada' });
  if (!targetPetId || Number(targetPetId) === myPet.id) {
    return res.status(400).json({ error: 'Mascota objetivo inválida' });
  }

  let created = false;
  let playdateId = null;
  try {
    const info = db.prepare(
      'INSERT INTO playdates (requester_pet_id, target_pet_id, status) VALUES (?, ?, ?)'
    ).run(myPet.id, targetPetId, 'pending');
    created = true;
    playdateId = info.lastInsertRowid;
  } catch (e) {
    // UNIQUE constraint -> ya existía la solicitud, no es un error fatal
  }

  if (created) {
    notify(ownerIdOfPet(targetPetId), req.userId, myPet.id, 'playdate_request', { playdateId });
  }

  res.json({ ok: true });
});

app.get('/api/playdates/incoming', requireAuth, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const rows = db
    .prepare(
      `SELECT playdates.id, playdates.status, playdates.created_at,
              pets.id AS pet_id, pets.name AS pet_name, pets.species, pets.color, pets.photo_path, pets.breed,
              users.name AS owner_name
       FROM playdates
       JOIN pets ON pets.id = playdates.requester_pet_id
       JOIN users ON users.id = pets.owner_id
       WHERE playdates.target_pet_id = ?
       ORDER BY playdates.created_at DESC`
    )
    .all(myPet.id);

  res.json(rows.map((r) => ({ ...r, photo_url: absoluteUploadUrl(req, r.photo_path) })));
});

app.get('/api/playdates/sent', requireAuth, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const rows = db
    .prepare(
      `SELECT playdates.id, playdates.status, playdates.created_at,
              pets.id AS pet_id, pets.name AS pet_name, pets.species, pets.color, pets.photo_path, pets.breed,
              users.name AS owner_name
       FROM playdates
       JOIN pets ON pets.id = playdates.target_pet_id
       JOIN users ON users.id = pets.owner_id
       WHERE playdates.requester_pet_id = ?
       ORDER BY playdates.created_at DESC`
    )
    .all(myPet.id);

  res.json(rows.map((r) => ({ ...r, photo_url: absoluteUploadUrl(req, r.photo_path) })));
});

app.patch('/api/playdates/:id', requireAuth, (req, res) => {
  const playdateId = Number(req.params.id);
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  const playdate = db.prepare('SELECT * FROM playdates WHERE id = ?').get(playdateId);
  if (!playdate) return res.status(404).json({ error: 'Solicitud no encontrada' });

  const myPet = getPetByOwner(req.userId);
  if (!myPet || playdate.target_pet_id !== myPet.id) {
    return res.status(403).json({ error: 'No puedes responder esta solicitud' });
  }

  db.prepare('UPDATE playdates SET status = ? WHERE id = ?').run(status, playdateId);

  const requesterOwnerId = ownerIdOfPet(playdate.requester_pet_id);
  notify(requesterOwnerId, req.userId, myPet.id, status === 'accepted' ? 'playdate_accepted' : 'playdate_declined', { playdateId });

  res.json({ ok: true, status });
});

// ---------- HISTORIAS ----------

app.post('/api/stories', requireAuth, (req, res, next) => {
  uploadStory.single('media')(req, res, (err) => {
    if (err) return res.status(400).json({ error: uploadErrorMessage(err, STORY_MAX_MB) });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna foto o video' });
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
  const info = db
    .prepare('INSERT INTO stories (pet_id, media_path, media_type) VALUES (?, ?, ?)')
    .run(pet.id, req.file.filename, mediaType);

  res.json({ id: info.lastInsertRowid, media_url: absoluteUploadUrl(req, req.file.filename), media_type: mediaType });
});

app.get('/api/stories', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT stories.id, stories.media_path, stories.media_type, stories.created_at,
              pets.id AS pet_id, pets.name AS pet_name, pets.species, pets.color, pets.photo_path, pets.owner_id
       FROM stories
       JOIN pets ON pets.id = stories.pet_id
       WHERE stories.created_at > datetime('now', '-1 day')
       ORDER BY stories.created_at ASC`
    )
    .all();

  const byPet = new Map();
  rows.forEach((r) => {
    if (!byPet.has(r.pet_id)) {
      byPet.set(r.pet_id, {
        pet_id: r.pet_id,
        pet_name: r.pet_name,
        species: r.species,
        color: r.color,
        photo_url: absoluteUploadUrl(req, r.photo_path),
        is_mine: r.owner_id === req.userId,
        stories: []
      });
    }
    byPet.get(r.pet_id).stories.push({
      id: r.id,
      media_url: absoluteUploadUrl(req, r.media_path),
      media_type: r.media_type,
      created_at: r.created_at
    });
  });

  // La propia mascota siempre primero (para agregar/ver la tuya de un vistazo).
  const groups = Array.from(byPet.values()).sort((a, b) => (b.is_mine ? 1 : 0) - (a.is_mine ? 1 : 0));
  res.json(groups);
});

// ---------- REELS ----------

app.post('/api/reels', requireAuth, (req, res, next) => {
  uploadReel.single('video')(req, res, (err) => {
    if (err) return res.status(400).json({ error: uploadErrorMessage(err, REEL_MAX_MB) });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún video' });
  const { caption } = req.body;
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const info = db
    .prepare("INSERT INTO posts (pet_id, caption, video_path, post_type) VALUES (?, ?, ?, 'reel')")
    .run(pet.id, (caption || '').trim().slice(0, 280), req.file.filename);

  res.json({ id: info.lastInsertRowid, video_url: absoluteUploadUrl(req, req.file.filename) });
});

app.get('/api/reels', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT posts.id, posts.caption, posts.video_path, posts.created_at,
              pets.id AS pet_id, pets.owner_id, pets.name AS pet_name, pets.species, pets.breed, pets.color, pets.photo_path,
              (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comments_count,
              EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me
       FROM posts
       JOIN pets ON pets.id = posts.pet_id
       WHERE posts.post_type = 'reel'
       ORDER BY posts.created_at DESC, posts.id DESC`
    )
    .all(req.userId);

  res.json(
    rows.map((r) => ({
      ...r,
      liked_by_me: !!r.liked_by_me,
      is_mine: r.owner_id === req.userId,
      video_url: absoluteUploadUrl(req, r.video_path),
      pet_photo_url: absoluteUploadUrl(req, r.photo_path)
    }))
  );
});

// ---------- NOTIFICACIONES ----------

app.get('/api/notifications', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT notifications.id, notifications.type, notifications.is_read, notifications.created_at,
              notifications.post_id, notifications.playdate_id, notifications.actor_pet_id,
              pets.name AS actor_pet_name, pets.species AS actor_species, pets.color AS actor_color, pets.photo_path AS actor_photo_path,
              posts.caption AS post_caption
       FROM notifications
       LEFT JOIN pets ON pets.id = notifications.actor_pet_id
       LEFT JOIN posts ON posts.id = notifications.post_id
       WHERE notifications.recipient_user_id = ?
       ORDER BY notifications.created_at DESC, notifications.id DESC
       LIMIT 100`
    )
    .all(req.userId);

  res.json(
    rows.map((r) => ({
      ...r,
      is_read: !!r.is_read,
      actor_photo_url: absoluteUploadUrl(req, r.actor_photo_path)
    }))
  );
});

app.post('/api/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ? AND is_read = 0').run(req.userId);
  res.json({ ok: true });
});

// ---------- COMPARTIR ----------

app.post('/api/posts/:id/share', requireAuth, (req, res) => {
  const originalId = Number(req.params.id);
  const { caption } = req.body;

  const original = db
    .prepare('SELECT posts.*, pets.owner_id FROM posts JOIN pets ON pets.id = posts.pet_id WHERE posts.id = ?')
    .get(originalId);
  if (!original) return res.status(404).json({ error: 'Publicación no encontrada' });

  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  // Si comparto algo que ya era, a su vez, un compartido, cito la publicación
  // original de la cadena en vez de anidar compartidos dentro de compartidos.
  const rootId = original.shared_post_id || original.id;

  const info = db
    .prepare("INSERT INTO posts (pet_id, caption, media, shared_post_id, post_type) VALUES (?, ?, '📸', ?, 'post')")
    .run(myPet.id, (caption || '').trim().slice(0, 280), rootId);

  notify(original.owner_id, req.userId, myPet.id, 'share', { postId: rootId });

  res.json({ id: info.lastInsertRowid });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`PawPals API escuchando en http://localhost:${PORT}`);
});
