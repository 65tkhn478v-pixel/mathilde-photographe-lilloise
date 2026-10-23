-- Réservation de séances : créneaux publiés par Mathilde, demandes des clients,
-- compteurs anti-abus. Toutes les dates sont en UTC, format ISO 8601
-- (Date.prototype.toISOString : "2026-11-03T13:00:00.000Z"), ce qui permet
-- de les comparer comme des chaînes.

CREATE TABLE slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  closed INTEGER NOT NULL DEFAULT 0 CHECK (closed IN (0, 1)),
  created_at TEXT NOT NULL,
  CHECK (end_at > start_at)
);

CREATE INDEX idx_slots_start ON slots (start_at);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  slot_id INTEGER NOT NULL REFERENCES slots (id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('portrait', 'famille', 'grossesse', 'naissance')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  consent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
  created_at TEXT NOT NULL,
  decided_at TEXT
);

-- Garantie en base : au plus une demande active (en attente ou confirmée)
-- par créneau, y compris si deux requêtes arrivent en même temps.
CREATE UNIQUE INDEX idx_bookings_active_slot
  ON bookings (slot_id)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX idx_bookings_email_status ON bookings (email, status);
CREATE INDEX idx_bookings_slot ON bookings (slot_id);

-- Compteurs anti-abus. `subject` est un HMAC de l'IP (l'IP en clair n'est
-- jamais stockée).
CREATE TABLE rate_limits (
  subject TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL,
  blocked_until TEXT,
  PRIMARY KEY (subject, action)
);
