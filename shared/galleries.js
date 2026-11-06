// Galeries clients : constantes partagées entre le Worker et le site.

// Types de séance d'une galerie : ceux de la réservation, plus Mariage et Autre.
export const GALLERY_SESSION_TYPES = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'famille', label: 'Famille' },
  { value: 'grossesse', label: 'Grossesse' },
  { value: 'naissance', label: 'Naissance' },
  { value: 'mariage', label: 'Mariage' },
  { value: 'autre', label: 'Autre' },
]
export const galleryTypeLabel = (value) => GALLERY_SESSION_TYPES.find((t) => t.value === value)?.label ?? value

// Nombre de photos retouchées incluses : choix rapides et bornes.
export const INCLUDED_CHOICES = [20, 30, 40, 50]
export const INCLUDED_MIN = 1
export const INCLUDED_MAX = 100

// Durées de conservation par défaut — À VALIDER AVEC LA CLIENTE.
// Modifiables galerie par galerie dans l'admin.
export const GALLERY_RETENTION = {
  selectionDays: 30, // sélection ouverte : date limite = création + 30 jours
  deliveryDays: 90, // livraison disponible : 90 jours après la livraison
  undeliveredPurgeDays: 60, // suppression 60 jours après une sélection jamais livrée
  proofsAfterDeliveryDays: 7, // aperçus de sélection supprimés 7 jours après la livraison
}

// Texte du filigrane appliqué aux aperçus de sélection.
export const WATERMARK_TEXT = 'Mathilde Lecomte · Photographe'

// Code d'accès : 8 caractères faciles à dicter (sans 0/O/1/I/L).
export const GALLERY_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const GALLERY_CODE_LENGTH = 8
export const normalizeGalleryCode = (input) => String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// Versions d'image stockées pour chaque photo.
export const PHOTO_VERSIONS = {
  proof: ['thumb', 'preview', 'blur'],
  final: ['thumb', 'preview', 'blur', 'hd'],
}
// Taille maximale acceptée par version (octets). Le fichier HD est limité
// par la taille de requête des plans Free et Pro de Cloudflare (100 Mo).
export const VERSION_MAX_BYTES = { thumb: 1_000_000, preview: 4_000_000, blur: 60_000, hd: 95_000_000 }

export const GALLERY_STATUSES = ['draft', 'selection_open', 'selection_validated', 'delivered', 'expired']
