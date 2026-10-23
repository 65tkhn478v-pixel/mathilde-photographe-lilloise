-- Pseudo Instagram facultatif du client (stocké sans « @ »).
-- Migration additive : colonne nullable, aucune donnée existante modifiée.
-- Le code déployé avant cette migration l'ignore simplement.
ALTER TABLE bookings ADD COLUMN instagram TEXT;
