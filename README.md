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
- **Nom de domaine** : aucun. Le site est servi sur
  `https://mathilde-photographe-lilloise.h9759k6njr.workers.dev`, URL utilisée dans les balises SEO
  (`index.html`, `public/sitemap.xml`, `public/robots.txt`,
  `src/data/site.js`).
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

## Réservation

Mathilde publie à l'avance ses créneaux depuis un espace privé ; les clients
demandent l'un de ces créneaux sur `/reserver`, puis la préviennent par mail.
Elle recontacte chaque client et confirme elle-même.

- **Séances réservables en ligne** : portrait, famille, grossesse, naissance
  (`shared/booking.js`). Mariage et projets plus importants : formulaire de
  contact.
- **1 créneau = 1 demande active.** Une demande bloque le créneau (« en
  attente ») ; un refus ou une suppression le libère. Garanti en base par un
  index unique partiel (`migrations/0001_reservations.sql`), y compris en cas
  de requêtes simultanées.
- **Le client n'a rien d'autre à faire** une fois la demande envoyée : elle
  est enregistrée et visible tout de suite dans l'espace admin. Mathilde
  recontacte le client (mail, téléphone ou Instagram, champ facultatif).
- **Espace admin** : `/espace-mathilde` (non lié depuis le site, `noindex`,
  exclu du sitemap et de robots.txt). La protection est le mot de passe, pas
  l'URL. Onglets Calendrier (vue mensuelle) / Demandes / Mes créneaux /
  Historique.
- **Statuts** : couleur dédiée + icône + libellé (`StatusBadge`), palette de
  statut dans `src/index.css` (contrastes calculés en commentaire).
- **Migrations** : `migrations/` est appliqué à la base de production à
  chaque déploiement (`wrangler d1 migrations apply DB --remote`). Ne jamais
  modifier une migration déjà appliquée : en ajouter une nouvelle, additive.
- **Conservation des demandes** : 12 mois après la date de la séance
  (`RETENTION_MONTHS`, `shared/booking.js`), **durée à valider avec la
  cliente**. Purge manuelle depuis l'onglet Historique.

### Notification de Mathilde par mail (facultative, désactivée par défaut)

À chaque nouvelle demande, le Worker peut envoyer un mail court à
`lecomtemathildeproo@gmail.com` via [Resend](https://resend.com)
(`worker/notify.js`). Tant que le secret `RESEND_API_KEY` n'existe pas, rien
n'est envoyé et rien ne change. L'envoi ne retarde jamais la réponse au
client et un échec n'empêche jamais l'enregistrement de la demande.

Sans domaine vérifié, Resend n'autorise l'expéditeur `onboarding@resend.dev`
que vers l'adresse du compte Resend lui-même. Pour activer :

1. Créer un compte Resend **avec l'adresse `lecomtemathildeproo@gmail.com`**.
2. Dans Resend, créer une clé API (permission « Sending access »).
3. Dans Cloudflare : Workers & Pages → le Worker → Settings → Variables and
   Secrets → ajouter un **Secret** `RESEND_API_KEY` avec cette clé (ou
   `npx wrangler secret put RESEND_API_KEY`).
4. Faire une demande test sur `/reserver` et vérifier la réception (et les
   indésirables).

Aucune déclaration n'est nécessaire dans `wrangler.jsonc`.

### Architecture

```
worker/          API du Worker Cloudflare (/api/*), routeur maison
  index.js         routes, session obligatoire sur /api/admin/*, contrôle Origin
  public.js        GET /api/slots, POST /api/bookings
  admin.js         connexion, créneaux, demandes, historique, purge
  auth.js          cookie de session signé HMAC-SHA256 (7 jours)
  crypto.js        PBKDF2, HMAC, comparaison en temps constant
  rateLimit.js     anti-bruteforce et anti-abus (IP hachée, jamais stockée en clair)
  notify.js        notification facultative de Mathilde (Resend)
shared/          code commun Worker + site : règles de réservation, dates Europe/Paris
migrations/      schéma D1 (slots, bookings, rate_limits)
scripts/         mot de passe admin, seed local, lancement dev
src/pages/Reserver.jsx, src/components/booking/   parcours client (4 étapes)
src/pages/admin/                                  espace admin
```

`wrangler.jsonc` : `main` pointe vers `worker/index.js` et
`assets.run_worker_first: ["/api/*"]` limite le Worker à l'API ; le reste du
site est servi en statique depuis `dist/` (`not_found_handling` en mode SPA).

### En local

```bash
npm install
npm run db:migrate:local      # crée les tables dans la base D1 locale (.wrangler/)
npm run admin:set-password    # mot de passe admin (saisie masquée) → .dev.vars
npm run db:seed:local         # facultatif : créneaux fictifs sur 2 semaines, « Client Test »
npm run dev:full              # Worker + D1 (port 8787) et Vite (port 5173)
```

Ouvrir http://localhost:5173/reserver et http://localhost:5173/espace-mathilde.
Vite redirige `/api` vers `wrangler dev` (`vite.config.js`). Au démarrage,
`wrangler dev` exécute `npm run build` pour servir `dist/` ; c'est normal.

`npm run db:seed:local` **vide** les tables locales avant d'insérer ses
données de test. Il n'agit que sur la base locale et n'est pas une migration.

`.dev.vars` (mot de passe haché + secret de session) est ignoré par git.
Le mot de passe en clair n'est écrit nulle part. Pour le changer, relancer
`npm run admin:set-password` puis redémarrer `npm run dev:full`.

### Mise en production (étapes NON exécutées)

À faire par la personne qui gère le compte Cloudflare, dans cet ordre :

1. Créer la base distante :
   `npx wrangler d1 create mathilde-reservations`
2. Reporter l'identifiant affiché dans le `database_id` de `wrangler.jsonc`
   (fait : base `mathilde-reservations` du compte de production).
3. Appliquer les migrations sur la base distante :
   `npx wrangler d1 migrations apply DB --remote`
4. Définir les secrets (valeurs de `.dev.vars`, ou nouvelles valeurs générées
   avec `npm run admin:set-password`) :
   `npx wrangler secret put ADMIN_PASSWORD_HASH`
   `npx wrangler secret put SESSION_SECRET`
5. Déployer : `npx wrangler deploy` (ou via le build Git connecté).
6. Si le déploiement crée une version sans la promouvoir (déploiements
   progressifs / Workers Builds), promouvoir la version dans le dashboard
   Cloudflare (Workers & Pages → le Worker → Deployments).
7. Vérifier sur `https://mathilde-photographe-lilloise.h9759k6njr.workers.dev` :
   connexion à `/espace-mathilde`, publication d'un créneau, demande test sur
   `/reserver`, puis suppression de cette demande test.

Tout fonctionne sur `workers.dev` : aucun domaine, aucun service d'envoi de
mail ni Cloudflare Access n'est nécessaire.
