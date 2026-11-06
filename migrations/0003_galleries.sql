-- Galeries clients (sélection puis livraison des photos).
-- Migration additive : nouvelles tables uniquement, aucune table existante
-- modifiée. Les fichiers sont dans R2 ; ici, seulement les métadonnées.

CREATE TABLE galleries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE, -- partie aléatoire de l'URL client (>= 16 caractères)
  storage_key TEXT NOT NULL UNIQUE, -- préfixe aléatoire des objets R2
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('portrait', 'famille', 'grossesse', 'naissance', 'mariage', 'autre')),
  shoot_date TEXT NOT NULL, -- YYYY-MM-DD
  included_count INTEGER NOT NULL CHECK (included_count BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'selection_open', 'selection_validated', 'delivered', 'expired')),
  access_code_hash TEXT NOT NULL, -- HMAC du code, jamais le code en clair
  access_version INTEGER NOT NULL DEFAULT 1, -- incrémenté à chaque nouveau code : invalide les sessions
  cover_photo_id INTEGER,
  selection_deadline TEXT NOT NULL, -- instant UTC (fin de journée, heure de Paris)
  selection_opened_at TEXT,
  selection_validated_at TEXT,
  client_comment TEXT,
  delivered_at TEXT,
  delivery_expires_at TEXT,
  purge_at TEXT NOT NULL, -- suppression définitive (D1 + R2)
  proofs_purged_at TEXT,
  booking_id INTEGER REFERENCES bookings (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_galleries_status ON galleries (status);
CREATE INDEX idx_galleries_purge ON galleries (purge_at);

CREATE TABLE gallery_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gallery_id INTEGER NOT NULL REFERENCES galleries (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('proof', 'final')),
  original_filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  sort_key TEXT NOT NULL,
  has_thumb INTEGER NOT NULL DEFAULT 0,
  has_preview INTEGER NOT NULL DEFAULT 0,
  has_blur INTEGER NOT NULL DEFAULT 0,
  has_hd INTEGER NOT NULL DEFAULT 0,
  complete INTEGER NOT NULL DEFAULT 0, -- toutes les versions déposées
  created_at TEXT NOT NULL,
  -- Reprise d'un dépôt : un même fichier (nom + taille) n'est jamais déposé deux fois.
  UNIQUE (gallery_id, kind, original_filename, size_bytes)
);

CREATE INDEX idx_gallery_photos_gallery ON gallery_photos (gallery_id, kind, sort_key);

CREATE TABLE gallery_selections (
  gallery_id INTEGER NOT NULL REFERENCES galleries (id) ON DELETE CASCADE,
  photo_id INTEGER NOT NULL REFERENCES gallery_photos (id) ON DELETE CASCADE,
  selected_at TEXT NOT NULL,
  PRIMARY KEY (gallery_id, photo_id)
);

-- Les tentatives de code d'accès réutilisent la table rate_limits existante
-- (action « gallery:<id> », IP hachée), comme la connexion admin.
