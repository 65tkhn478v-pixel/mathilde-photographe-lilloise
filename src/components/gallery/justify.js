/**
 * Grille justifiée : rangées de hauteur égale, largeur pleine, formats
 * respectés. Renvoie [{ items: [{photo, width, height}], height }].
 */
export function justifyRows(photos, containerWidth, targetHeight, gap) {
  const rows = []
  let row = []
  let ratioSum = 0
  for (const photo of photos) {
    const ratio = photo.w / photo.h || 1
    row.push({ photo, ratio })
    ratioSum += ratio
    const width = ratioSum * targetHeight + gap * (row.length - 1)
    if (width >= containerWidth) {
      const height = (containerWidth - gap * (row.length - 1)) / ratioSum
      rows.push({ height, items: row.map((r) => ({ photo: r.photo, width: r.ratio * height, height })) })
      row = []
      ratioSum = 0
    }
  }
  if (row.length) {
    // Dernière rangée : hauteur cible, sans étirement.
    const height = Math.min(targetHeight, (containerWidth - gap * (row.length - 1)) / ratioSum)
    rows.push({ height, items: row.map((r) => ({ photo: r.photo, width: r.ratio * height, height })) })
  }
  return rows
}

/** Hauteur cible selon la largeur : 2 à 3 photos par rangée sur mobile. */
export function targetRowHeight(width) {
  if (width < 480) return Math.round(width / 2.2)
  if (width < 1024) return 220
  return 280
}
