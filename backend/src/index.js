require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const { signToken, requireAuth } = require('./auth');
const { sendPasswordResetEmail } = require('./email');

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

// URL pública de la web (pawpals-web en Render) usada para armar el enlace
// que se manda por mail al recuperar la contraseña. Si no se define
// APP_URL como variable de entorno, usamos el primer CLIENT_ORIGIN real
// (el que no es de Capacitor) — en producción hay que configurar APP_URL
// explícitamente en Render apuntando a la URL pública de pawpals-web.
const APP_URL = process.env.APP_URL || (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const VIDEO_EXT = ['.mp4', '.mov', '.webm', '.m4v'];
const AUDIO_EXT = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.oga'];

function makeStorage() {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const allExt = [...IMAGE_EXT, ...VIDEO_EXT, ...AUDIO_EXT];
      const safeExt = allExt.includes(ext)
        ? ext
        : file.mimetype.startsWith('video/') ? '.mp4' : file.mimetype.startsWith('audio/') ? '.mp3' : '.jpg';
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

// Historias: foto o video corto, 30 MB, más opcionalmente un audio propio
// (campo "music") de hasta 30 MB también — multer no distingue el límite de
// tamaño por campo cuando se usan varios en el mismo pedido, así que
// validamos el tamaño del audio a mano más abajo con un límite más chico.
const STORY_MAX_MB = 30;
const STORY_MUSIC_MAX_MB = 15;
const uploadStory = multer({
  storage: makeStorage(),
  limits: { fileSize: STORY_MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'music') {
      if (!file.mimetype.startsWith('audio/')) return cb(new Error('El archivo de música tiene que ser un audio'));
      return cb(null, true);
    }
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      return cb(new Error('Solo se permiten fotos o videos'));
    }
    cb(null, true);
  }
});

// Reels: video real, 75 MB (sin transcodificar — el navegador reproduce el
// archivo tal cual se subió, por eso conviene pedir clips ya livianos).

// Valida y devuelve una lista de overlays (texto/stickers) lista para
// guardar como JSON: nunca confiamos en lo que manda el cliente sin
// revisarlo (podría no ser un array, tener campos gigantes, etc).
function sanitizeOverlays(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, 25).map((o, i) => ({
    id: Number.isFinite(o.id) ? o.id : i + 1,
    type: o.type === 'sticker' ? 'sticker' : 'text',
    content: String(o.content || '').slice(0, 60),
    xPct: Math.max(0, Math.min(100, Number(o.xPct) || 50)),
    yPct: Math.max(0, Math.min(100, Number(o.yPct) || 50)),
    scale: Math.max(0.4, Math.min(3, Number(o.scale) || 1)),
    rotation: Number.isFinite(Number(o.rotation)) ? Math.max(-180, Math.min(180, Number(o.rotation))) : 0,
    color: typeof o.color === 'string' ? o.color.slice(0, 20) : undefined
  })).filter((o) => o.content);
}

const REEL_MAX_MB = 75;
const uploadReel = multer({
  storage: makeStorage(),
  limits: { fileSize: REEL_MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) return cb(new Error('Solo se permiten videos'));
    cb(null, true);
  }
});

// ---------- ANTI-SPAM / RATE LIMITING ----------
// Límites simples por IP (no hace falta ningún servicio externo). Sin esto,
// cualquiera podría probar miles de contraseñas por minuto, crear cuentas en
// masa, o inundar comentarios/mensajes con un script. `standardHeaders` manda
// los headers RateLimit-* (más nuevos); apagamos los `X-RateLimit-*` legado.
function makeLimiter(windowMs, max, message) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
    // Detrás de Render hay un proxy: sin esto express-rate-limit tira un
    // error de "trust proxy" y no puede distinguir IPs distintas.
    keyGenerator: (req) => req.ip
  });
}
// Login/registro/recuperar contraseña: lo más sensible a fuerza bruta.
const authLimiter = makeLimiter(15 * 60 * 1000, 20, 'Demasiados intentos. Esperá unos minutos y volvé a intentar.');
// Crear contenido (publicaciones, comentarios, mensajes, reportes): generoso
// para uso normal, pero corta un script que publique sin parar.
const writeLimiter = makeLimiter(60 * 1000, 30, 'Estás yendo muy rápido — esperá un momento y volvé a intentar.');

app.set('trust proxy', 1);
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => {
    // Pedidos sin "origin" (ej. apps nativas en algunos casos, o curl) los
    // dejamos pasar; si viene un origin, tiene que estar en la lista.
    if (!origin || CLIENT_ORIGINS.includes(origin)) return cb(null, true);
    // Sin este log era imposible saber CUÁL origen rechazó (el error que
    // llega al navegador no lo dice) — con esto, la próxima vez que pase,
    // en los Logs de Render se ve exactamente qué URL quedó afuera de
    // CLIENT_ORIGIN.
    console.error('[CORS] Origen rechazado:', origin, '— permitidos:', CLIENT_ORIGINS.join(', '));
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
function notify(recipientUserId, actorUserId, actorPetId, type, { postId = null, playdateId = null, storyId = null } = {}) {
  if (!recipientUserId || recipientUserId === actorUserId) return;
  db.prepare(
    `INSERT INTO notifications (recipient_user_id, actor_pet_id, type, post_id, playdate_id, story_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(recipientUserId, actorPetId, type, postId, playdateId, storyId);
}

// ---------- ETIQUETAS DE MASCOTAS ----------
// Se usan en publicaciones, comentarios e historias (ver pet_tags en db.js).
// targetType es 'post' | 'comment' | 'story'.

// Valida la lista de IDs de mascota que mandó el cliente para etiquetar:
// tiene que ser JSON de números enteros positivos, sin duplicados y con un
// tope razonable (nadie necesita etiquetar a más de 10 mascotas en una sola
// publicación/comentario/historia).
function sanitizeTaggedPetIds(raw) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const ids = parsed.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0);
  return Array.from(new Set(ids)).slice(0, 10);
}

// Guarda las etiquetas válidas (mascota existe, no es quien etiqueta, y no
// está bloqueada con quien etiqueta) y devuelve la lista de mascotas
// realmente etiquetadas — para poder mandarles la notificación después.
function attachTags(targetType, targetId, petIds, taggerPetId) {
  if (!petIds.length) return [];
  const insert = db.prepare('INSERT INTO pet_tags (target_type, target_id, pet_id) VALUES (?, ?, ?)');
  const tagged = [];
  for (const petId of petIds) {
    if (petId === taggerPetId) continue;
    const pet = db
      .prepare('SELECT id, owner_id, name AS pet_name, species, color, photo_path FROM pets WHERE id = ?')
      .get(petId);
    if (!pet) continue;
    if (arePetsBlocked(taggerPetId, petId)) continue;
    insert.run(targetType, targetId, petId);
    tagged.push(pet);
  }
  return tagged;
}

// Formatea la lista que devuelve attachTags para mandarla directo en la
// respuesta de "se creó" (publicación/comentario/historia) sin tener que
// pedirle al cliente que recargue todo para ver los nombres de las
// mascotas recién etiquetadas.
function formatTagged(req, tagged) {
  return tagged.map((t) => ({
    pet_id: t.id,
    pet_name: t.pet_name,
    species: t.species,
    color: t.color,
    photo_url: absoluteUploadUrl(req, t.photo_path)
  }));
}

// Trae las mascotas etiquetadas en varios targets a la vez (una publicación
// por cada post del feed, por ejemplo) en una sola consulta, agrupadas por
// target_id — así no hay que hacer una consulta por publicación.
function tagsFor(targetType, targetIds) {
  const map = new Map();
  if (!targetIds.length) return map;
  const placeholders = targetIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT pet_tags.target_id AS target_id, pets.id AS pet_id, pets.name AS pet_name,
              pets.species, pets.color, pets.photo_path
       FROM pet_tags
       JOIN pets ON pets.id = pet_tags.pet_id
       WHERE pet_tags.target_type = ? AND pet_tags.target_id IN (${placeholders})
       ORDER BY pet_tags.id ASC`
    )
    .all(targetType, ...targetIds);
  rows.forEach((r) => {
    if (!map.has(r.target_id)) map.set(r.target_id, []);
    map.get(r.target_id).push(r);
  });
  return map;
}

// Arma la lista final de mascotas etiquetadas para una respuesta de la API,
// con la URL absoluta de su foto ya resuelta.
function taggedPetsFor(req, map, targetId) {
  const rows = map.get(targetId) || [];
  return rows.map((r) => ({
    pet_id: r.pet_id,
    pet_name: r.pet_name,
    species: r.species,
    color: r.color,
    photo_url: absoluteUploadUrl(req, r.photo_path)
  }));
}

function ownerIdOfPet(petId) {
  const row = db.prepare('SELECT owner_id FROM pets WHERE id = ?').get(petId);
  return row ? row.owner_id : null;
}

function followerCount(petId) {
  return db.prepare('SELECT COUNT(*) AS c FROM follows WHERE followed_pet_id = ?').get(petId).c;
}
function followingCount(petId) {
  return db.prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_pet_id = ?').get(petId).c;
}
function isFollowing(followerPetId, followedPetId) {
  if (!followerPetId) return false;
  return !!db
    .prepare('SELECT 1 FROM follows WHERE follower_pet_id = ? AND followed_pet_id = ?')
    .get(followerPetId, followedPetId);
}

// ---------- BLOQUEOS ----------
// El bloqueo es mutuo a propósito: si A bloquea a B, ninguna de las dos
// mascotas ve contenido de la otra ni le puede escribir — igual de simple
// para quien bloqueó (no tiene que además bloquear "en el otro sentido") y
// más difícil de esquivar para quien fue bloqueado.
function arePetsBlocked(petIdA, petIdB) {
  if (!petIdA || !petIdB) return false;
  return !!db
    .prepare(
      `SELECT 1 FROM blocks
       WHERE (blocker_pet_id = ? AND blocked_pet_id = ?)
          OR (blocker_pet_id = ? AND blocked_pet_id = ?)`
    )
    .get(petIdA, petIdB, petIdB, petIdA);
}

// Devuelve el conjunto de pet_id que "myPetId" no debería ver en ningún
// lado (feed, reels, cerca de ti, comentarios): a quienes bloqueó, y a
// quienes lo bloquearon a él.
function blockedPetIdsFor(myPetId) {
  if (!myPetId) return new Set();
  const rows = db
    .prepare(
      `SELECT blocked_pet_id AS id FROM blocks WHERE blocker_pet_id = ?
       UNION
       SELECT blocker_pet_id AS id FROM blocks WHERE blocked_pet_id = ?`
    )
    .all(myPetId, myPetId);
  return new Set(rows.map((r) => r.id));
}

// Reportes de errores atrapados por ErrorBoundary en el frontend (ver
// ErrorBoundary.jsx) — sin esto, un error que sólo pasa en el teléfono de
// alguien es imposible de diagnosticar porque no hay forma de abrir la
// consola del navegador ahí. Se ve en la pestaña "Logs" de Render, buscando
// "[CLIENT ERROR]". Sin autenticación a propósito: un error puede pasar
// incluso con la sesión vencida, y no queremos perder ese reporte por eso.
app.post('/api/client-errors', (req, res) => {
  const { label, message, stack, componentStack, userAgent, url } = req.body || {};
  console.error('[CLIENT ERROR]', JSON.stringify({
    label: label ? String(label).slice(0, 100) : null,
    message: message ? String(message).slice(0, 500) : null,
    stack: stack ? String(stack).slice(0, 3000) : null,
    componentStack: componentStack ? String(componentStack).slice(0, 3000) : null,
    userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
    url: url ? String(url).slice(0, 300) : null,
    at: new Date().toISOString()
  }));
  res.json({ ok: true });
});

// ---------- AUTH ----------

app.post('/api/auth/register', authLimiter, (req, res) => {
  const { name, email, password, petName, petSpecies, petBreed, petAge, petBio, lat, lng, acceptTerms } = req.body;
  if (!name || !email || !password || !petName || !petSpecies || !petBreed) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  // El registro exige haber aceptado los Términos y la Política de
  // Privacidad — sin esto no se puede crear la cuenta (ver AuthView.jsx).
  if (acceptTerms !== true) {
    return res.status(400).json({ error: 'Tenés que aceptar los Términos y Condiciones y la Política de Privacidad' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Ese correo ya está registrado' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const userInfo = db
    .prepare('INSERT INTO users (name, email, password_hash, accepted_terms_at) VALUES (?, ?, ?, datetime(\'now\'))')
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

app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  const token = signToken(user.id);
  res.json({ ok: true, token });
});

// Recuperar contraseña — paso 1: pedir el enlace por mail. Siempre
// respondemos "ok" exista o no la cuenta (no confirmamos ni negamos si un
// correo está registrado — evita que alguien use esto para averiguar qué
// correos tienen cuenta en PawPals).
app.post('/api/auth/request-reset', authLimiter, async (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Ingresá tu correo' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(token, expires, user.id);
    const resetUrl = `${APP_URL}?resetToken=${token}`;
    sendPasswordResetEmail(email, resetUrl).catch(() => {});
  }
  res.json({ ok: true });
});

// Recuperar contraseña — paso 2: el enlace del mail trae el token en la URL.
app.post('/api/auth/reset-password', authLimiter, (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Faltan datos o la contraseña es demasiado corta (mínimo 6 caracteres)' });
  }
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user || !user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: 'El enlace no es válido o ya venció. Pedí uno nuevo.' });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
    .run(newHash, user.id);
  res.json({ ok: true });
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
    pet: {
      ...pet,
      photo_url: absoluteUploadUrl(req, pet.photo_path),
      cover_url: absoluteUploadUrl(req, pet.cover_path)
    },
    stats: {
      posts: postsCount,
      playdates: playdatesCount,
      friends: friendsCount,
      followers: followerCount(pet.id),
      following: followingCount(pet.id)
    }
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

// Foto de portada del perfil (estilo Facebook) — misma mecánica que la foto
// de perfil (/api/pets/me/photo), pero guarda en la columna cover_path y se
// recorta 16:9 en el cliente (ver ImageCropper en ProfileView).
app.patch('/api/pets/me/cover', requireAuth, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: uploadErrorMessage(err, IMAGE_MAX_MB) });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  db.prepare('UPDATE pets SET cover_path = ? WHERE id = ?').run(req.file.filename, pet.id);

  res.json({ cover_url: absoluteUploadUrl(req, req.file.filename) });
});

// Avatar personalizado ("Avatares" del menú) — look (variante de especie) +
// fondo + accesorio elegidos entre opciones fijas. Se valida contra la
// misma lista blanca que usa el cliente (ver AVATAR_BACKGROUNDS /
// AVATAR_ACCESSORIES / AVATAR_VARIANT_KEYS en PetIllustration.jsx) para no
// guardar cualquier string arbitrario.
const AVATAR_BG_WHITELIST = ['#8ce99a', '#63e6be', '#66d9e8', '#74c0fc', '#b197fc', '#ffa8a8', '#ffd43b', '#ffc078'];
const AVATAR_ACCESSORY_WHITELIST = ['none', 'cap', 'glasses', 'bow', 'bandana', 'crown'];
const AVATAR_VARIANT_WHITELIST = [
  'dog-1', 'dog-2', 'dog-3',
  'cat-1', 'cat-2', 'cat-3',
  'rabbit-1', 'rabbit-2', 'rabbit-3',
  'bird-1', 'bird-2', 'bird-3',
  'turtle-1', 'turtle-2', 'turtle-3'
];
app.patch('/api/pets/me/avatar', requireAuth, (req, res) => {
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });
  const { bg, accessory, variant } = req.body || {};
  // El "look" es opcional en el body (por si en algún momento se llama a
  // esta ruta sólo para actualizar fondo/accesorio) — si no viene, se
  // conserva el que ya tenía guardado la mascota, o el primero de su
  // especie si nunca eligió uno.
  const nextVariant = variant || pet.avatar_variant || `${pet.species}-1`;
  if (
    !AVATAR_BG_WHITELIST.includes(bg) ||
    !AVATAR_ACCESSORY_WHITELIST.includes(accessory) ||
    !AVATAR_VARIANT_WHITELIST.includes(nextVariant)
  ) {
    return res.status(400).json({ error: 'Fondo, look o accesorio inválido' });
  }
  db.prepare('UPDATE pets SET avatar_bg = ?, avatar_accessory = ?, avatar_variant = ? WHERE id = ?').run(bg, accessory, nextVariant, pet.id);
  res.json({ avatar_bg: bg, avatar_accessory: accessory, avatar_variant: nextVariant });
});

// Guarda la ubicación real del dispositivo (o la reemplaza si la persona la
// actualiza a mano desde Configuración). Los valores llegan del navegador
// (navigator.geolocation), nunca inventados por el backend.
app.patch('/api/pets/me/location', requireAuth, (req, res) => {
  const lat = Number(req.body.lat);
  const lng = Number(req.body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Ubicación inválida' });
  }
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });
  db.prepare('UPDATE pets SET lat = ?, lng = ? WHERE id = ?').run(lat, lng, pet.id);
  res.json({ ok: true });
});

// Prender/apagar si la mascota aparece en los resultados de "Cerca de ti" de
// otras personas (ver sección de Privacidad en Configuración).
app.patch('/api/pets/me/privacy', requireAuth, (req, res) => {
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });
  db.prepare('UPDATE pets SET share_location = ? WHERE id = ?').run(req.body.shareLocation ? 1 : 0, pet.id);
  res.json({ ok: true, shareLocation: !!req.body.shareLocation });
});

// Borrado de cuenta (Configuración → Eliminar mi cuenta). Pedimos la
// contraseña de nuevo como confirmación extra antes de una acción
// irreversible. El borrado de la fila en "users" hace cascada (ON DELETE
// CASCADE) sobre mascotas, publicaciones, historias, comentarios, likes,
// citas de juego, mensajes, seguimientos y notificaciones relacionadas —
// acá además intentamos borrar del disco los archivos que haya subido
// (best-effort: si algún archivo ya no está, no rompemos el borrado por eso).
app.delete('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  if (!bcrypt.compareSync(req.body.password || '', user.password_hash)) {
    // 403, no 401: la persona SIGUE autenticada (su token es válido), sólo
    // escribió mal la contraseña de confirmación. Si acá devolviéramos 401,
    // el frontend lo interpreta como "sesión vencida" y borra el token
    // guardado (ver api.js), dejándola des-logueada de golpe sin explicación
    // después de un solo error de tipeo.
    return res.status(403).json({ error: 'Contraseña incorrecta' });
  }

  const pet = getPetByOwner(req.userId);
  const filePaths = [];
  if (pet) {
    if (pet.photo_path) filePaths.push(pet.photo_path);
    if (pet.cover_path) filePaths.push(pet.cover_path);
    db.prepare('SELECT image_path, video_path FROM posts WHERE pet_id = ?').all(pet.id)
      .forEach((p) => { if (p.image_path) filePaths.push(p.image_path); if (p.video_path) filePaths.push(p.video_path); });
    db.prepare('SELECT media_path, music_path FROM stories WHERE pet_id = ?').all(pet.id)
      .forEach((s) => { if (s.media_path) filePaths.push(s.media_path); if (s.music_path) filePaths.push(s.music_path); });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId);

  filePaths.forEach((filename) => {
    fs.unlink(path.join(UPLOADS_DIR, filename), () => {});
  });

  res.json({ ok: true });
});

// Editar perfil (nombre, especie, raza, edad, bio) desde Mi perfil.
app.patch('/api/pets/me/profile', requireAuth, (req, res) => {
  const { name, species, breed, age, bio } = req.body;
  if (!name || !species || !breed) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });
  db.prepare(
    'UPDATE pets SET name = ?, species = ?, breed = ?, age = ?, bio = ? WHERE id = ?'
  ).run(name, species, breed, age || null, bio || '', pet.id);
  res.json({ ok: true });
});

// Cambiar contraseña desde Configuración — pide la actual como confirmación
// (403, no 401, por la misma razón que en /api/me: la persona sigue
// autenticada, sólo puede haber escrito mal la contraseña actual).
app.patch('/api/me/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña tiene que tener al menos 6 caracteres' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(403).json({ error: 'Tu contraseña actual no es correcta' });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.userId);
  res.json({ ok: true });
});

// Cambiar el correo de la cuenta — también pide la contraseña actual.
app.patch('/api/me/email', requireAuth, (req, res) => {
  const { newEmail, currentPassword } = req.body || {};
  const email = String(newEmail || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Ingresá un correo válido' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  if (!bcrypt.compareSync(currentPassword || '', user.password_hash)) {
    return res.status(403).json({ error: 'Tu contraseña actual no es correcta' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.userId);
  if (existing) return res.status(409).json({ error: 'Ese correo ya está en uso por otra cuenta' });

  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, req.userId);
  res.json({ ok: true, email });
});

// Buscador de mascotas por nombre, para el selector de "etiquetar mascotas"
// (posts, comentarios e historias). Va ANTES de /api/pets/:id a propósito:
// Express matchea rutas en el orden en que se definen, y si esta quedara
// después, "/api/pets/search" caería en el parámetro :id de la otra ruta.
app.get('/api/pets/search', requireAuth, (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);
  const myPet = getPetByOwner(req.userId);
  const blocked = blockedPetIdsFor(myPet ? myPet.id : null);
  const rows = db
    .prepare(
      `SELECT id AS pet_id, name AS pet_name, species, breed, color, photo_path
       FROM pets
       WHERE name LIKE ? COLLATE NOCASE
       ORDER BY name ASC
       LIMIT 20`
    )
    .all(`%${q}%`)
    .filter((r) => !blocked.has(r.pet_id));

  res.json(rows.map((r) => ({ ...r, photo_url: absoluteUploadUrl(req, r.photo_path) })));
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
    pet: {
      ...pet,
      photo_url: absoluteUploadUrl(req, pet.photo_path),
      cover_url: absoluteUploadUrl(req, pet.cover_path)
    },
    owner_name: pet.owner_name,
    is_me: !!myPet && myPet.id === pet.id,
    distance_km: distanceKm,
    playdate_status: playdateStatus,
    is_following: myPet && myPet.id !== pet.id ? isFollowing(myPet.id, pet.id) : false,
    is_blocked: myPet && myPet.id !== pet.id ? arePetsBlocked(myPet.id, pet.id) : false,
    stats: { posts: postsCount, followers: followerCount(pet.id), following: followingCount(pet.id) }
  });
});

// Todas las publicaciones de una mascota (para la grilla "Publicaciones" del
// perfil — antes sólo se veía el número en las estadísticas, sin forma de
// abrirlas). Misma forma de fila que /api/feed, filtrada por pet_id, para
// poder reusar el mismo renderizado de foto+caption+etiquetas en el cliente.
app.get('/api/pets/:id/posts', requireAuth, (req, res) => {
  const petId = Number(req.params.id);
  const myPet = getPetByOwner(req.userId);
  if (myPet && arePetsBlocked(myPet.id, petId)) {
    return res.status(403).json({ error: 'No podés ver las publicaciones de esta mascota' });
  }
  const rows = db
    .prepare(
      `SELECT posts.id, posts.caption, posts.media, posts.image_path, posts.comments_disabled, posts.created_at,
              posts.shared_post_id,
              pets.id AS pet_id, pets.owner_id, pets.name AS pet_name, pets.species, pets.breed, pets.color, pets.photo_path,
              (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comments_count,
              EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me,
              orig.caption AS shared_caption, orig.image_path AS shared_image_path,
              orig.created_at AS shared_created_at,
              origpet.id AS shared_pet_id, origpet.name AS shared_pet_name, origpet.species AS shared_species,
              origpet.breed AS shared_breed, origpet.color AS shared_color, origpet.photo_path AS shared_photo_path
       FROM posts
       JOIN pets ON pets.id = posts.pet_id
       LEFT JOIN posts orig ON orig.id = posts.shared_post_id
       LEFT JOIN pets origpet ON origpet.id = orig.pet_id
       WHERE posts.post_type = 'post' AND posts.pet_id = ?
       ORDER BY posts.created_at DESC, posts.id DESC`
    )
    .all(req.userId, petId);

  const tagMap = tagsFor('post', rows.map((r) => r.id));

  res.json(
    rows.map((r) => ({
      ...r,
      liked_by_me: !!r.liked_by_me,
      comments_disabled: !!r.comments_disabled,
      is_mine: r.owner_id === req.userId,
      image_url: absoluteUploadUrl(req, r.image_path),
      pet_photo_url: absoluteUploadUrl(req, r.photo_path),
      shared_image_url: absoluteUploadUrl(req, r.shared_image_path),
      shared_pet_photo_url: absoluteUploadUrl(req, r.shared_photo_path),
      tagged_pets: taggedPetsFor(req, tagMap, r.id)
    }))
  );
});

// ---------- SEGUIDORES ----------

app.post('/api/pets/:id/follow', requireAuth, (req, res) => {
  const targetId = Number(req.params.id);
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.status(400).json({ error: 'Todavía no tienes una mascota configurada' });
  if (myPet.id === targetId) return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
  const targetPet = db.prepare('SELECT * FROM pets WHERE id = ?').get(targetId);
  if (!targetPet) return res.status(404).json({ error: 'Mascota no encontrada' });

  const already = isFollowing(myPet.id, targetId);
  if (already) {
    db.prepare('DELETE FROM follows WHERE follower_pet_id = ? AND followed_pet_id = ?').run(myPet.id, targetId);
  } else {
    db.prepare('INSERT INTO follows (follower_pet_id, followed_pet_id) VALUES (?, ?)').run(myPet.id, targetId);
    notify(targetPet.owner_id, req.userId, myPet.id, 'follow', {});
  }

  res.json({ following: !already, followers_count: followerCount(targetId) });
});

function petListWithFollowInfo(pets, myPetId) {
  return pets.map((p) => ({
    pet_id: p.id,
    pet_name: p.name,
    species: p.species,
    color: p.color,
    breed: p.breed,
    photo_url: p.photo_url,
    is_me: myPetId === p.id,
    is_following: myPetId ? isFollowing(myPetId, p.id) : false
  }));
}

app.get('/api/pets/:id/followers', requireAuth, (req, res) => {
  const petId = Number(req.params.id);
  const myPet = getPetByOwner(req.userId);
  const rows = db
    .prepare(
      `SELECT pets.* FROM follows JOIN pets ON pets.id = follows.follower_pet_id
       WHERE follows.followed_pet_id = ? ORDER BY follows.created_at DESC`
    )
    .all(petId)
    .map((p) => ({ ...p, photo_url: absoluteUploadUrl(req, p.photo_path) }));
  res.json(petListWithFollowInfo(rows, myPet ? myPet.id : null));
});

app.get('/api/pets/:id/following', requireAuth, (req, res) => {
  const petId = Number(req.params.id);
  const myPet = getPetByOwner(req.userId);
  const rows = db
    .prepare(
      `SELECT pets.* FROM follows JOIN pets ON pets.id = follows.followed_pet_id
       WHERE follows.follower_pet_id = ? ORDER BY follows.created_at DESC`
    )
    .all(petId)
    .map((p) => ({ ...p, photo_url: absoluteUploadUrl(req, p.photo_path) }));
  res.json(petListWithFollowInfo(rows, myPet ? myPet.id : null));
});

// ---------- BLOQUEOS ----------

app.post('/api/pets/:id/block', requireAuth, (req, res) => {
  const targetId = Number(req.params.id);
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.status(400).json({ error: 'Todavía no tienes una mascota configurada' });
  if (myPet.id === targetId) return res.status(400).json({ error: 'No puedes bloquearte a ti mismo' });
  const targetPet = db.prepare('SELECT * FROM pets WHERE id = ?').get(targetId);
  if (!targetPet) return res.status(404).json({ error: 'Mascota no encontrada' });

  const already = db
    .prepare('SELECT id FROM blocks WHERE blocker_pet_id = ? AND blocked_pet_id = ?')
    .get(myPet.id, targetId);

  if (already) {
    db.prepare('DELETE FROM blocks WHERE id = ?').run(already.id);
    res.json({ blocked: false });
  } else {
    db.prepare('INSERT INTO blocks (blocker_pet_id, blocked_pet_id) VALUES (?, ?)').run(myPet.id, targetId);
    // Bloquear implica dejar de seguirse mutuamente — no tendría sentido
    // seguir "siguiendo" a alguien que ya no puede ver tu contenido.
    db.prepare('DELETE FROM follows WHERE (follower_pet_id = ? AND followed_pet_id = ?) OR (follower_pet_id = ? AND followed_pet_id = ?)')
      .run(myPet.id, targetId, targetId, myPet.id);
    res.json({ blocked: true });
  }
});

// Lista de mascotas bloqueadas por mí, para poder desbloquearlas desde
// Configuración (si no, bloquear sería una acción sin vuelta atrás desde la UI).
app.get('/api/pets/blocked/mine', requireAuth, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.json([]);
  const rows = db
    .prepare(
      `SELECT pets.* FROM blocks JOIN pets ON pets.id = blocks.blocked_pet_id
       WHERE blocks.blocker_pet_id = ? ORDER BY blocks.created_at DESC`
    )
    .all(myPet.id)
    .map((p) => ({ id: p.id, name: p.name, species: p.species, color: p.color, photo_url: absoluteUploadUrl(req, p.photo_path) }));
  res.json(rows);
});

// ---------- REPORTES ----------
// Queda registrado en la tabla "reports" para que el equipo lo revise
// después (no hay panel de moderación todavía — se puede consultar la
// tabla directamente, o se agrega uno más adelante si hace falta).
app.post('/api/reports', requireAuth, writeLimiter, (req, res) => {
  const { targetType, targetId, reason, details } = req.body || {};
  const validTypes = ['post', 'comment', 'pet'];
  if (!validTypes.includes(targetType) || !Number.isFinite(Number(targetId))) {
    return res.status(400).json({ error: 'Reporte inválido' });
  }
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'Elegí un motivo para el reporte' });
  }
  db.prepare(
    'INSERT INTO reports (reporter_user_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?)'
  ).run(req.userId, targetType, Number(targetId), String(reason).slice(0, 100), details ? String(details).slice(0, 500) : null);
  res.json({ ok: true });
});

// ---------- PANEL DE REPORTES (sólo para el dueño de la app) ----------
// Todavía no existe un sistema de roles/usuarios "admin" — en vez de sumar
// esa complejidad recién ahora, esta pantalla se protege con una clave
// secreta separada (ADMIN_KEY) que se manda por la URL, no con el login
// normal de un usuario cualquiera. Si ADMIN_KEY no está configurada como
// variable de entorno, la ruta directamente no responde (404) para que
// nunca quede expuesta por accidente con una clave "vacía".
const ADMIN_KEY = process.env.ADMIN_KEY || '';
function requireAdminKey(req, res, next) {
  if (!ADMIN_KEY) return res.status(404).json({ error: 'No disponible' });
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) return res.status(403).json({ error: 'Clave incorrecta' });
  next();
}

app.get('/api/admin/reports', requireAdminKey, (req, res) => {
  const rows = db
    .prepare(
      `SELECT reports.id, reports.target_type, reports.target_id, reports.reason, reports.details,
              reports.status, reports.created_at,
              reporter.name AS reporter_name, reporter.email AS reporter_email
       FROM reports
       JOIN users reporter ON reporter.id = reports.reporter_user_id
       ORDER BY reports.created_at DESC, reports.id DESC`
    )
    .all();

  // A cada reporte le sumamos un resumen de a qué/quién apunta, según el
  // tipo, para no tener que ir a buscarlo a mano en la base cada vez.
  const enriched = rows.map((r) => {
    let target_summary = null;
    if (r.target_type === 'post') {
      const post = db
        .prepare(`SELECT posts.caption, pets.name AS pet_name FROM posts JOIN pets ON pets.id = posts.pet_id WHERE posts.id = ?`)
        .get(r.target_id);
      target_summary = post ? `Publicación de ${post.pet_name}: "${(post.caption || '').slice(0, 80)}"` : 'Publicación ya eliminada';
    } else if (r.target_type === 'comment') {
      const comment = db
        .prepare(`SELECT comments.body, pets.name AS pet_name FROM comments JOIN pets ON pets.id = comments.pet_id WHERE comments.id = ?`)
        .get(r.target_id);
      target_summary = comment ? `Comentario de ${comment.pet_name}: "${(comment.body || '').slice(0, 80)}"` : 'Comentario ya eliminado';
    } else if (r.target_type === 'pet') {
      const pet = db.prepare(`SELECT name, species FROM pets WHERE id = ?`).get(r.target_id);
      target_summary = pet ? `Perfil de ${pet.name} (${pet.species})` : 'Perfil ya eliminado';
    }
    return { ...r, target_summary };
  });

  res.json(enriched);
});

app.patch('/api/admin/reports/:id', requireAdminKey, (req, res) => {
  const { status } = req.body || {};
  if (!['open', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, Number(req.params.id));
  res.json({ ok: true });
});

// ---------- FEED ----------

app.get('/api/feed', requireAuth, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  const blocked = blockedPetIdsFor(myPet ? myPet.id : null);
  const rows = db
    .prepare(
      `SELECT posts.id, posts.caption, posts.media, posts.image_path, posts.comments_disabled, posts.created_at,
              posts.shared_post_id,
              pets.id AS pet_id, pets.owner_id, pets.name AS pet_name, pets.species, pets.breed, pets.color, pets.photo_path,
              (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comments_count,
              EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me,
              orig.caption AS shared_caption, orig.image_path AS shared_image_path,
              orig.created_at AS shared_created_at,
              origpet.id AS shared_pet_id, origpet.name AS shared_pet_name, origpet.species AS shared_species,
              origpet.breed AS shared_breed, origpet.color AS shared_color, origpet.photo_path AS shared_photo_path
       FROM posts
       JOIN pets ON pets.id = posts.pet_id
       LEFT JOIN posts orig ON orig.id = posts.shared_post_id
       LEFT JOIN pets origpet ON origpet.id = orig.pet_id
       WHERE posts.post_type = 'post'
       ORDER BY posts.created_at DESC, posts.id DESC`
    )
    .all(req.userId)
    // Publicaciones de alguien bloqueado (en cualquier sentido) no aparecen
    // en el feed. No filtramos por SQL para no complicar la consulta (el
    // bloqueo es una tabla chica, filtrar en JS después alcanza de sobra).
    .filter((r) => !blocked.has(r.pet_id));

  const tagMap = tagsFor('post', rows.map((r) => r.id));

  res.json(
    rows.map((r) => ({
      ...r,
      liked_by_me: !!r.liked_by_me,
      comments_disabled: !!r.comments_disabled,
      is_mine: r.owner_id === req.userId,
      image_url: absoluteUploadUrl(req, r.image_path),
      pet_photo_url: absoluteUploadUrl(req, r.photo_path),
      shared_image_url: absoluteUploadUrl(req, r.shared_image_path),
      shared_pet_photo_url: absoluteUploadUrl(req, r.shared_photo_path),
      tagged_pets: taggedPetsFor(req, tagMap, r.id)
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

app.post('/api/posts', requireAuth, writeLimiter, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: uploadErrorMessage(err, IMAGE_MAX_MB) });
    next();
  });
}, (req, res) => {
  const { caption } = req.body;
  // El texto ya no es obligatorio (antes sí) — alcanza con subir una foto
  // sola. Lo único que no se permite es publicar sin texto Y sin foto.
  const trimmedCaption = (caption || '').trim();
  if (!trimmedCaption && !req.file) {
    return res.status(400).json({ error: 'La publicación no puede estar vacía — agregá una foto o un texto' });
  }
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const imagePath = req.file ? req.file.filename : null;

  const info = db
    .prepare('INSERT INTO posts (pet_id, caption, media, image_path) VALUES (?, ?, ?, ?)')
    .run(pet.id, trimmedCaption.slice(0, 280), '📸', imagePath);
  const postId = info.lastInsertRowid;

  const taggedPetIds = sanitizeTaggedPetIds(req.body.tagged_pet_ids);
  const tagged = attachTags('post', postId, taggedPetIds, pet.id);
  tagged.forEach((taggedPet) => notify(taggedPet.owner_id, req.userId, pet.id, 'tag_post', { postId }));

  res.json({
    id: postId,
    image_url: absoluteUploadUrl(req, imagePath),
    tagged_pets: formatTagged(req, tagged)
  });
});

app.get('/api/posts/:id/comments', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });

  const myPet = getPetByOwner(req.userId);
  const blocked = blockedPetIdsFor(myPet ? myPet.id : null);

  const rows = db
    .prepare(
      `SELECT comments.id, comments.body, comments.created_at, comments.edited_at,
              pets.id AS pet_id, pets.name AS pet_name, pets.species, pets.color, pets.photo_path
       FROM comments
       JOIN pets ON pets.id = comments.pet_id
       WHERE comments.post_id = ?
       ORDER BY comments.created_at ASC, comments.id ASC`
    )
    .all(postId)
    .filter((r) => !blocked.has(r.pet_id));

  const tagMap = tagsFor('comment', rows.map((r) => r.id));

  res.json(rows.map((r) => ({
    ...r,
    is_mine: myPet ? r.pet_id === myPet.id : false,
    photo_url: absoluteUploadUrl(req, r.photo_path),
    tagged_pets: taggedPetsFor(req, tagMap, r.id)
  })));
});

app.post('/api/posts/:id/comments', requireAuth, writeLimiter, (req, res) => {
  const postId = Number(req.params.id);
  const { body, taggedPetIds } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'El comentario no puede estar vacío' });

  const post = db
    .prepare('SELECT posts.id, posts.comments_disabled, posts.pet_id AS post_pet_id, pets.owner_id FROM posts JOIN pets ON pets.id = posts.pet_id WHERE posts.id = ?')
    .get(postId);
  if (!post) return res.status(404).json({ error: 'Publicación no encontrada' });
  if (post.comments_disabled) return res.status(403).json({ error: 'Los comentarios están desactivados para esta publicación' });

  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });
  if (arePetsBlocked(pet.id, post.post_pet_id)) {
    return res.status(403).json({ error: 'No podés comentar en esta publicación' });
  }

  const info = db
    .prepare('INSERT INTO comments (post_id, pet_id, body) VALUES (?, ?, ?)')
    .run(postId, pet.id, body.trim().slice(0, 280));
  const commentId = info.lastInsertRowid;

  notify(post.owner_id, req.userId, pet.id, 'comment', { postId });

  // El body acá es JSON (no FormData, a diferencia de crear una publicación
  // o historia), así que taggedPetIds llega como array directo — lo
  // convertimos a JSON string sólo para reusar el mismo sanitizador.
  const sanitizedTagIds = sanitizeTaggedPetIds(JSON.stringify(Array.isArray(taggedPetIds) ? taggedPetIds : []));
  const tagged = attachTags('comment', commentId, sanitizedTagIds, pet.id);
  tagged.forEach((taggedPet) => notify(taggedPet.owner_id, req.userId, pet.id, 'tag_comment', { postId }));

  const comment = db
    .prepare(
      `SELECT comments.id, comments.body, comments.created_at, comments.edited_at,
              pets.id AS pet_id, pets.name AS pet_name, pets.species, pets.color, pets.photo_path
       FROM comments JOIN pets ON pets.id = comments.pet_id
       WHERE comments.id = ?`
    )
    .get(commentId);

  res.json({
    ...comment,
    is_mine: true,
    photo_url: absoluteUploadUrl(req, comment.photo_path),
    tagged_pets: formatTagged(req, tagged)
  });
});

// Editar un comentario propio (sólo quien lo escribió — ni siquiera el
// dueño de la publicación puede editar el comentario de otra persona,
// aunque sí puede borrarlo, ver más abajo).
app.patch('/api/comments/:id', requireAuth, (req, res) => {
  const commentId = Number(req.params.id);
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'El comentario no puede estar vacío' });

  const comment = db
    .prepare('SELECT comments.*, pets.owner_id FROM comments JOIN pets ON pets.id = comments.pet_id WHERE comments.id = ?')
    .get(commentId);
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
  if (comment.owner_id !== req.userId) return res.status(403).json({ error: 'No puedes editar un comentario que no es tuyo' });

  db.prepare("UPDATE comments SET body = ?, edited_at = datetime('now') WHERE id = ?")
    .run(body.trim().slice(0, 280), commentId);

  const updated = db
    .prepare(
      `SELECT comments.id, comments.body, comments.created_at, comments.edited_at,
              pets.id AS pet_id, pets.name AS pet_name, pets.species, pets.color, pets.photo_path
       FROM comments JOIN pets ON pets.id = comments.pet_id WHERE comments.id = ?`
    )
    .get(commentId);
  res.json({ ...updated, is_mine: true, photo_url: absoluteUploadUrl(req, updated.photo_path) });
});

// Borrar un comentario: puede hacerlo quien lo escribió, o el dueño de la
// publicación (igual que Instagram — el dueño de un post puede moderar sus
// propios comentarios aunque no los haya escrito él).
app.delete('/api/comments/:id', requireAuth, (req, res) => {
  const commentId = Number(req.params.id);
  const comment = db
    .prepare(
      `SELECT comments.id, comments.post_id, pets.owner_id AS comment_owner_id, postpets.owner_id AS post_owner_id
       FROM comments
       JOIN pets ON pets.id = comments.pet_id
       JOIN posts ON posts.id = comments.post_id
       JOIN pets postpets ON postpets.id = posts.pet_id
       WHERE comments.id = ?`
    )
    .get(commentId);
  if (!comment) return res.status(404).json({ error: 'Comentario no encontrado' });
  if (comment.comment_owner_id !== req.userId && comment.post_owner_id !== req.userId) {
    return res.status(403).json({ error: 'No puedes eliminar este comentario' });
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
  res.json({ ok: true, post_id: comment.post_id });
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

  const blocked = blockedPetIdsFor(myPet.id);

  const others = db
    .prepare(
      `SELECT pets.*, users.name AS owner_name FROM pets JOIN users ON users.id = pets.owner_id
       WHERE pets.owner_id != ? AND pets.share_location = 1`
    )
    .all(req.userId)
    .filter((p) => !blocked.has(p.id));

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

app.post('/api/stories', requireAuth, writeLimiter, (req, res, next) => {
  uploadStory.fields([{ name: 'media', maxCount: 1 }, { name: 'music', maxCount: 1 }])(req, res, (err) => {
    if (err) return res.status(400).json({ error: uploadErrorMessage(err, STORY_MAX_MB) });
    next();
  });
}, (req, res) => {
  const mediaFile = req.files?.media?.[0];
  let musicFile = req.files?.music?.[0];
  if (!mediaFile) return res.status(400).json({ error: 'No se recibió ninguna foto o video' });
  if (musicFile && musicFile.size > STORY_MUSIC_MAX_MB * 1024 * 1024) {
    fs.unlink(path.join(UPLOADS_DIR, musicFile.filename), () => {});
    return res.status(400).json({ error: `El audio pesa demasiado (máximo ${STORY_MUSIC_MAX_MB} MB).` });
  }
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const mediaType = mediaFile.mimetype.startsWith('video/') ? 'video' : 'image';
  // Silenciar el audio original sólo tiene sentido para un video (una foto
  // no tiene audio propio).
  const muteOriginal = mediaType === 'video' && req.body.mute_original === '1' ? 1 : 0;
  const overlays = sanitizeOverlays(req.body.overlays);
  const info = db
    .prepare('INSERT INTO stories (pet_id, media_path, media_type, music_path, mute_original, overlays) VALUES (?, ?, ?, ?, ?, ?)')
    .run(pet.id, mediaFile.filename, mediaType, musicFile ? musicFile.filename : null, muteOriginal, overlays.length ? JSON.stringify(overlays) : null);
  const storyId = info.lastInsertRowid;

  const taggedPetIds = sanitizeTaggedPetIds(req.body.tagged_pet_ids);
  const tagged = attachTags('story', storyId, taggedPetIds, pet.id);
  tagged.forEach((taggedPet) => notify(taggedPet.owner_id, req.userId, pet.id, 'tag_story', { storyId }));

  res.json({
    id: storyId,
    media_url: absoluteUploadUrl(req, mediaFile.filename),
    media_type: mediaType,
    music_url: musicFile ? absoluteUploadUrl(req, musicFile.filename) : null,
    mute_original: !!muteOriginal,
    overlays,
    tagged_pets: formatTagged(req, tagged)
  });
});

app.get('/api/stories', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT stories.id, stories.media_path, stories.media_type, stories.music_path, stories.mute_original, stories.overlays, stories.created_at,
              pets.id AS pet_id, pets.name AS pet_name, pets.species, pets.color, pets.photo_path, pets.owner_id
       FROM stories
       JOIN pets ON pets.id = stories.pet_id
       WHERE stories.created_at > datetime('now', '-1 day')
       ORDER BY stories.created_at ASC`
    )
    .all();

  const tagMap = tagsFor('story', rows.map((r) => r.id));

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
    let overlays = [];
    try { overlays = r.overlays ? JSON.parse(r.overlays) : []; } catch { overlays = []; }
    byPet.get(r.pet_id).stories.push({
      id: r.id,
      media_url: absoluteUploadUrl(req, r.media_path),
      media_type: r.media_type,
      // Audio propio que subió el dueño de la mascota (no una librería
      // nuestra): vive en /uploads como cualquier otro archivo subido.
      music_url: r.music_path ? absoluteUploadUrl(req, r.music_path) : null,
      mute_original: !!r.mute_original,
      overlays,
      created_at: r.created_at,
      tagged_pets: taggedPetsFor(req, tagMap, r.id)
    });
  });

  // La propia mascota siempre primero (para agregar/ver la tuya de un vistazo).
  const groups = Array.from(byPet.values()).sort((a, b) => (b.is_mine ? 1 : 0) - (a.is_mine ? 1 : 0));
  res.json(groups);
});

// ---------- REELS ----------

app.post('/api/reels', requireAuth, writeLimiter, (req, res, next) => {
  uploadReel.single('video')(req, res, (err) => {
    if (err) return res.status(400).json({ error: uploadErrorMessage(err, REEL_MAX_MB) });
    next();
  });
}, (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún video' });
  const { caption } = req.body;
  const pet = getPetByOwner(req.userId);
  if (!pet) return res.status(404).json({ error: 'No tienes una mascota registrada' });

  const overlays = sanitizeOverlays(req.body.overlays);
  const info = db
    .prepare("INSERT INTO posts (pet_id, caption, video_path, post_type, overlays) VALUES (?, ?, ?, 'reel', ?)")
    .run(pet.id, (caption || '').trim().slice(0, 280), req.file.filename, overlays.length ? JSON.stringify(overlays) : null);

  res.json({ id: info.lastInsertRowid, video_url: absoluteUploadUrl(req, req.file.filename), overlays });
});

app.get('/api/reels', requireAuth, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  const blocked = blockedPetIdsFor(myPet ? myPet.id : null);
  const rows = db
    .prepare(
      `SELECT posts.id, posts.caption, posts.video_path, posts.overlays, posts.created_at,
              pets.id AS pet_id, pets.owner_id, pets.name AS pet_name, pets.species, pets.breed, pets.color, pets.photo_path,
              (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS likes_count,
              (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comments_count,
              EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = ?) AS liked_by_me
       FROM posts
       JOIN pets ON pets.id = posts.pet_id
       WHERE posts.post_type = 'reel'
       ORDER BY posts.created_at DESC, posts.id DESC`
    )
    .all(req.userId)
    .filter((r) => !blocked.has(r.pet_id));

  res.json(
    rows.map((r) => {
      let overlays = [];
      try { overlays = r.overlays ? JSON.parse(r.overlays) : []; } catch { overlays = []; }
      return {
        ...r,
        liked_by_me: !!r.liked_by_me,
        is_mine: r.owner_id === req.userId,
        video_url: absoluteUploadUrl(req, r.video_path),
        pet_photo_url: absoluteUploadUrl(req, r.photo_path),
        overlays
      };
    })
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

// ---------- MENSAJES ----------
// Mensajería directa mascota-a-mascota (como los DM de Instagram): cualquier
// mascota le puede escribir a cualquier otra, sin pedir "amistad" primero,
// igual que ya se puede comentar o proponer una cita de juego sin pedir
// permiso antes.

app.get('/api/conversations', requireAuth, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.json([]);

  const rows = db
    .prepare('SELECT * FROM messages WHERE sender_pet_id = ? OR recipient_pet_id = ? ORDER BY created_at ASC')
    .all(myPet.id, myPet.id);

  // Agrupamos en JS en vez de con SQL más elaborado (ventanas/CTEs): con el
  // volumen de mensajes de una app como esta alcanza de sobra y es mucho
  // más fácil de seguir.
  const byPartner = new Map();
  for (const m of rows) {
    const partnerId = m.sender_pet_id === myPet.id ? m.recipient_pet_id : m.sender_pet_id;
    const entry = byPartner.get(partnerId) || { last: null, unread: 0 };
    entry.last = m; // vienen ordenados ASC, así que el último en pisar es el más nuevo
    if (m.recipient_pet_id === myPet.id && !m.is_read) entry.unread += 1;
    byPartner.set(partnerId, entry);
  }

  const blocked = blockedPetIdsFor(myPet.id);
  const partnerIds = [...byPartner.keys()].filter((id) => !blocked.has(id));
  if (partnerIds.length === 0) return res.json([]);

  const placeholders = partnerIds.map(() => '?').join(',');
  const pets = db.prepare(`SELECT * FROM pets WHERE id IN (${placeholders})`).all(...partnerIds);
  const petById = new Map(pets.map((p) => [p.id, p]));

  const list = partnerIds
    .map((id) => {
      const pet = petById.get(id);
      const entry = byPartner.get(id);
      if (!pet) return null;
      return {
        pet_id: pet.id,
        pet_name: pet.name,
        species: pet.species,
        color: pet.color,
        photo_url: absoluteUploadUrl(req, pet.photo_path),
        last_message: entry.last.body,
        last_message_at: entry.last.created_at,
        last_message_is_mine: entry.last.sender_pet_id === myPet.id,
        unread_count: entry.unread
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.last_message_at < b.last_message_at ? 1 : -1));

  res.json(list);
});

app.get('/api/conversations/unread-count', requireAuth, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.json({ count: 0 });
  const row = db.prepare('SELECT COUNT(*) AS c FROM messages WHERE recipient_pet_id = ? AND is_read = 0').get(myPet.id);
  res.json({ count: row.c });
});

app.get('/api/conversations/:petId/messages', requireAuth, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.status(400).json({ error: 'Todavía no tienes una mascota configurada' });
  const partnerId = Number(req.params.petId);
  const partnerPet = db.prepare('SELECT * FROM pets WHERE id = ?').get(partnerId);
  if (!partnerPet) return res.status(404).json({ error: 'Mascota no encontrada' });
  if (arePetsBlocked(myPet.id, partnerId)) return res.status(403).json({ error: 'No podés ver esta conversación' });

  db.prepare('UPDATE messages SET is_read = 1 WHERE recipient_pet_id = ? AND sender_pet_id = ? AND is_read = 0').run(
    myPet.id,
    partnerId
  );

  const rows = db
    .prepare(
      `SELECT * FROM messages
       WHERE (sender_pet_id = ? AND recipient_pet_id = ?) OR (sender_pet_id = ? AND recipient_pet_id = ?)
       ORDER BY created_at ASC`
    )
    .all(myPet.id, partnerId, partnerId, myPet.id);

  res.json({
    partner: {
      pet_id: partnerPet.id,
      pet_name: partnerPet.name,
      species: partnerPet.species,
      color: partnerPet.color,
      photo_url: absoluteUploadUrl(req, partnerPet.photo_path)
    },
    messages: rows.map((m) => ({
      id: m.id,
      body: m.body,
      is_mine: m.sender_pet_id === myPet.id,
      created_at: m.created_at
    }))
  });
});

app.post('/api/conversations/:petId/messages', requireAuth, writeLimiter, (req, res) => {
  const myPet = getPetByOwner(req.userId);
  if (!myPet) return res.status(400).json({ error: 'Todavía no tienes una mascota configurada' });
  const partnerId = Number(req.params.petId);
  if (partnerId === myPet.id) return res.status(400).json({ error: 'No puedes enviarte un mensaje a ti mismo' });
  const partnerPet = db.prepare('SELECT * FROM pets WHERE id = ?').get(partnerId);
  if (!partnerPet) return res.status(404).json({ error: 'Mascota no encontrada' });
  if (arePetsBlocked(myPet.id, partnerId)) return res.status(403).json({ error: 'No podés enviarle mensajes a esta mascota' });

  const body = ((req.body && req.body.body) || '').trim();
  if (!body) return res.status(400).json({ error: 'Escribe un mensaje' });
  if (body.length > 2000) return res.status(400).json({ error: 'El mensaje es demasiado largo' });

  const info = db
    .prepare('INSERT INTO messages (sender_pet_id, recipient_pet_id, body) VALUES (?, ?, ?)')
    .run(myPet.id, partnerId, body);
  const created = db.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid);

  res.json({ id: created.id, body: created.body, is_mine: true, created_at: created.created_at });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`PawPals API escuchando en http://localhost:${PORT}`);
});
