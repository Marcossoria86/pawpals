// Usamos el módulo node:sqlite incluido en Node (18.19+/22.5+) en vez de un
// paquete externo como better-sqlite3: así no depende de compilar nada nativo
// al hacer `npm install`, lo cual falla fácilmente en distintos sistemas
// operativos y en algunos entornos de despliegue.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'pawpals.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT NOT NULL,
  age INTEGER,
  bio TEXT,
  color TEXT NOT NULL DEFAULT '#f2e3da',
  photo_path TEXT,
  lat REAL,
  lng REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  caption TEXT NOT NULL,
  media TEXT NOT NULL DEFAULT '📸',
  image_path TEXT,
  video_path TEXT,
  post_type TEXT NOT NULL DEFAULT 'post',
  shared_post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
  comments_disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS playdates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  target_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(requester_pet_id, target_pet_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  media_path TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  playdate_id INTEGER REFERENCES playdates(id) ON DELETE CASCADE,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  recipient_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  followed_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(follower_pet_id, followed_pet_id)
);
`);

// Migraciones simples: agregan columnas nuevas a tablas que ya existían en
// bases de datos desplegadas antes de esta versión (CREATE TABLE IF NOT
// EXISTS no alcanza para eso — sólo crea la tabla si no existía, no le
// agrega columnas a una que ya estaba ahí).
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn('stories', 'music_key', 'TEXT');
ensureColumn('stories', 'overlays', 'TEXT');
ensureColumn('posts', 'overlays', 'TEXT');

function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  );
  const insertPet = db.prepare(
    `INSERT INTO pets (owner_id, name, species, breed, age, bio, color, lat, lng)
     VALUES (@owner_id, @name, @species, @breed, @age, @bio, @color, @lat, @lng)`
  );
  const insertPost = db.prepare(
    'INSERT INTO posts (pet_id, caption, media) VALUES (?, ?, ?)'
  );
  const insertComment = db.prepare(
    'INSERT INTO comments (post_id, pet_id, body) VALUES (?, ?, ?)'
  );

  const demoPassword = bcrypt.hashSync('pawpals123', 10);

  const demoOwners = [
    { name: 'Camila', email: 'camila@example.com', pet: { name: 'Luna', species: 'cat', breed: 'Gato siamés', age: 2, bio: 'Duerme casi todo el día y exige comida puntual.', color: '#f2e3da', lat: 19.4326, lng: -99.1332 } },
    { name: 'Diego', email: 'diego@example.com', pet: { name: 'Toby', species: 'dog', breed: 'Beagle', age: 4, bio: 'Le encantan los charcos y las pelotas de tenis.', color: '#e1ede8', lat: 19.4200, lng: -99.1500 } },
    { name: 'Valentina', email: 'valentina@example.com', pet: { name: 'Nube', species: 'rabbit', breed: 'Conejo enano', age: 1, bio: 'Solo socializa en espacios cerrados y tranquilos.', color: '#f2e3da', lat: 19.4450, lng: -99.1400 } },
    { name: 'Andrés', email: 'andres@example.com', pet: { name: 'Simón', species: 'dog', breed: 'Labrador', age: 3, bio: 'Perro grande y activo, ideal para paseos largos.', color: '#e1ede8', lat: 19.4100, lng: -99.1600 } },
    { name: 'Laura', email: 'laura@example.com', pet: { name: 'Mishi', species: 'cat', breed: 'Común europeo', age: 5, bio: 'Disponible para paseos por la tarde en el parque.', color: '#f2e3da', lat: 19.4380, lng: -99.1450 } }
  ];

  const petIds = {};
  demoOwners.forEach((o) => {
    const userInfo = insertUser.run(o.name, o.email, demoPassword);
    const petInfo = insertPet.run({ owner_id: userInfo.lastInsertRowid, ...o.pet });
    petIds[o.pet.name] = petInfo.lastInsertRowid;
  });

  const tobyPostId = insertPost.run(petIds['Toby'], 'Toby descubrió el charco más grande del parque. No hay arrepentimiento.', '🐶').lastInsertRowid;
  insertPost.run(petIds['Luna'], 'Luna durmió 19 horas hoy. Un nuevo récord personal.', '🐱');
  insertPost.run(petIds['Simón'], 'Simón trajo la pelota equivocada... otra vez.', '🎾');
  insertPost.run(petIds['Nube'], 'Nube exige zanahoria antes de las 8am.', '🥕');

  insertComment.run(tobyPostId, petIds['Luna'], 'Jaja típico de Toby 😂');
  insertComment.run(tobyPostId, petIds['Mishi'], '¡Qué envidia, ojalá pudiera salir a jugar así!');
}

seedIfEmpty();

module.exports = db;
