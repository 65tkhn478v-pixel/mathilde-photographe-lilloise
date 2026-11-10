-- Galeries : tous formats photo, tailles réellement stockées, envois en
-- plusieurs morceaux, réglages par défaut modifiables.
-- Migration strictement additive : colonnes nullables (NULL pour les photos
-- déjà déposées) et nouvelles tables. Aucune donnée existante n'est modifiée.

-- Format détecté par la signature du fichier (jpeg, png, webp, avif, heic,
-- tiff, cr3, cr2, raw…) et type MIME du fichier livré (photos finales).
ALTER TABLE gallery_photos ADD COLUMN format TEXT;
ALTER TABLE gallery_photos ADD COLUMN mime_type TEXT;

-- Taille réelle de chaque version stockée dans R2 (octets). NULL pour les
-- photos déposées avant cette migration : « Vérifier sur le serveur » (page
-- Paramètres) les renseigne à partir du bucket.
ALTER TABLE gallery_photos ADD COLUMN thumb_bytes INTEGER;
ALTER TABLE gallery_photos ADD COLUMN preview_bytes INTEGER;
ALTER TABLE gallery_photos ADD COLUMN blur_bytes INTEGER;
ALTER TABLE gallery_photos ADD COLUMN hd_bytes INTEGER;

-- Photos finales : 1 si les métadonnées (EXIF, GPS…) ont été retirées avant
-- l'envoi (JPEG, PNG), 0 si le format ne le permet pas (envoyé tel quel).
ALTER TABLE gallery_photos ADD COLUMN metadata_stripped INTEGER;

-- Envoi d'une photo finale en plusieurs morceaux (multipart R2) en cours :
-- permet la reprise après une coupure, et l'abandon propre si la photo ou la
-- galerie est supprimée.
CREATE TABLE gallery_uploads (
  photo_id INTEGER PRIMARY KEY REFERENCES gallery_photos (id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  part_size INTEGER NOT NULL,
  total_bytes INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  parts TEXT NOT NULL DEFAULT '[]', -- [{ "partNumber": 1, "etag": "…" }, …]
  created_at TEXT NOT NULL
);

-- Réglages par défaut (clé / valeur texte). Une clé absente = valeur par
-- défaut du code (shared/settings.js).
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
