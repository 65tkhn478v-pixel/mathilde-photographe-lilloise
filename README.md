# Mathilde Lecomte — Photographe (Lille)

Site sur-mesure remplaçant le thème Pixieset générique
(`mathilde-photographelille.mypixieset.com`) de Mathilde Lecomte, photographe
indépendante spécialisée grossesse / naissance / mariage / famille à Lille.

## Stack

React + Vite, Tailwind CSS v4 (thème CSS-first, voir `src/index.css`),
React Router, Framer Motion (animations discrètes, `MOTION_INTENSITY` 4/10),
Radix UI (`Dialog` pour le menu mobile et la lightbox du portfolio).

## Lancer le projet

```bash
npm install
npm run dev
```

```bash
npm run build   # build de production dans dist/
npm run preview # sert le build localement
npm run lint    # oxlint
```

## À faire avant mise en production

- **Photos** : les images de `public/images/` sont les photos réelles de
  Mathilde reprises de son site actuel, en export web (~1500px). Ce sont des
  **placeholders temporaires** — à remplacer par les fichiers HD originaux
  fournis par la cliente avant mise en ligne définitive.
- **Galerie « Famille »** : aucune séance famille n'existe encore dans les
  photos disponibles. La page `/portfolio/famille` affiche volontairement un
  état « à venir » plutôt qu'une fausse galerie — à remplir dès que de
  vraies photos seront disponibles (`src/data/portfolio.js`).
- **Formulaire de contact** : aucun backend n'est configuré (pas de domaine
  ni d'hébergement définitif au moment de la construction du site). La
  soumission ouvre actuellement le client mail du visiteur via un lien
  `mailto:` pré-rempli vers l'adresse définie dans `src/data/site.js`
  (`CONTACT_EMAIL`). À remplacer par un vrai envoi serveur (ex. Cloudflare
  Worker + Email Routing, ou un service comme Formspree) une fois
  l'hébergement choisi, pour plus de fiabilité.
- **Nom de domaine** : un domaine provisoire
  (`www.mathilde-lecomte-photographe.fr`) est utilisé dans les balises SEO
  (`index.html`, `public/sitemap.xml`, `public/robots.txt`,
  `src/data/site.js`). À remplacer partout une fois le vrai domaine acheté.
- **Mentions légales** : statut juridique, SIRET, adresse précise et
  informations d'hébergement sont marqués « à compléter »
  (`src/pages/MentionsLegales.jsx`) — informations non communiquées par la
  cliente à ce stade, volontairement non inventées.
- **Palette et typographie** : palette monochrome blanc/gris (`paper` /
  `mist` / `ink` / `ink-soft` / `ink-faint` / `line` / `accent`, contrastes
  AA vérifiés) et typographie reprise du site Pixieset d'origine par
  inspection des styles calculés — Spectral (titres, équivalent libre de
  Freight Big Pro), Playfair Display (nav/logo/libellés, repris à
  l'identique) et Libre Caslon Text (corps de texte, équivalent libre de
  LTC Caslon). Détail des choix en commentaire dans `src/index.css`.
  Aucune charte graphique officielle n'existant à ce jour, ces choix
  restent à valider avec la cliente.

## Structure

```
src/
  components/   Nav, Footer, Hero, PortfolioGrid, Lightbox, ContactForm,
                SocialIcons...
  pages/        Home, About, Portfolio, PortfolioCategory, Services, Contact...
  data/         site.js (constantes, réseaux, textes courts)
                portfolio.js (catégories + photos + alt text)
  hooks/
    usePageMeta.js   title / meta description / canonical / OG par page
public/
  images/       photos réelles (placeholders, voir ci-dessus)
  robots.txt, sitemap.xml
```
