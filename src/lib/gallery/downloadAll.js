// « Tout télécharger » : la méthode dépend du navigateur.
//
// 1. Chrome / Edge sur ordinateur (API File System Access) : un ZIP construit
//    en streaming dans le navigateur (client-zip, sans compression : les JPEG
//    ne se compressent pas) et écrit directement sur le disque, fichier par
//    fichier. La mémoire reste basse même pour 1,5 Go ; le Worker ne fait que
//    servir les fichiers (aucun ZIP côté serveur, donc aucune limite de CPU).
// 2. Safari, Firefox, Android : téléchargements successifs, un fichier à la
//    fois (le navigateur peut demander une seule fois l'autorisation).
// 3. iPhone / iPad : Safari ne sait pas enregistrer plusieurs fichiers d'un
//    coup ; on explique le parcours photo par photo.

export function downloadMethod() {
  if (typeof window === 'undefined') return 'sequential'
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (ios) return 'ios'
  if (typeof window.showSaveFilePicker === 'function') return 'zip'
  return 'sequential'
}

function uniqueNames(photos) {
  const seen = new Map()
  return photos.map((p) => {
    const count = seen.get(p.name) ?? 0
    seen.set(p.name, count + 1)
    return count ? p.name.replace(/(\.[^.]+)?$/, ` (${count + 1})$1`) : p.name
  })
}

/** Flux ZIP (Response) des photos HD, sans compression. */
export async function zipResponse(photos, srcOf, onProgress) {
  const { downloadZip } = await import('client-zip')
  const names = uniqueNames(photos)
  async function* files() {
    for (const [i, photo] of photos.entries()) {
      const response = await fetch(srcOf(photo, 'hd'), { credentials: 'same-origin' })
      if (!response.ok) throw new Error('Téléchargement interrompu.')
      onProgress?.(i + 1, photos.length)
      yield { name: names[i], input: response, lastModified: new Date() }
    }
  }
  return downloadZip(files())
}

export async function downloadAsZip(photos, srcOf, zipName, onProgress) {
  const handle = await window.showSaveFilePicker({
    suggestedName: zipName,
    types: [{ description: 'Archive ZIP', accept: { 'application/zip': ['.zip'] } }],
  })
  const writable = await handle.createWritable()
  const response = await zipResponse(photos, srcOf, onProgress)
  await response.body.pipeTo(writable)
}

export async function downloadOneByOne(photos, srcOf, onProgress) {
  for (const [i, photo] of photos.entries()) {
    const link = document.createElement('a')
    link.href = srcOf(photo, 'hd')
    link.download = photo.name
    document.body.appendChild(link)
    link.click()
    link.remove()
    onProgress?.(i + 1, photos.length)
    // Laisse le navigateur démarrer chaque téléchargement avant le suivant.
    await new Promise((resolve) => setTimeout(resolve, 900))
  }
}
