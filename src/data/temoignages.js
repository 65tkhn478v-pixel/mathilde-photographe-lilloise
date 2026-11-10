// Témoignages de clientes, affichés sur l'accueil (3 au plus) et en entier
// sur la page À propos (/a-propos#temoignages).
//
// Si ce tableau est vide, la section n'apparaît nulle part sur le site.
//
// AJOUTER UN TÉMOIGNAGE : copier ce modèle entre les crochets ci-dessous,
// remplir les champs, puis enregistrer (une virgule entre deux témoignages).
//
//   {
//     nom: "Julie D.",          // obligatoire : texte, prénom + initiale recommandé
//     date: "2026-03",          // facultatif : AAAA-MM, mois et année du message
//     seance: "naissance",      // facultatif : grossesse, naissance, famille, couple, portrait ou mariage
//     accueil: true,            // facultatif : à afficher sur l'accueil (voir plus bas)
//     message: "Le texte…",     // obligatoire : texte, sans guillemets (ajoutés à l'affichage)
//   },
//
// Entourer les textes de guillemets doubles "…" : les apostrophes ’ du texte
// n'ont alors pas besoin d'être échappées.
//
// ORDRE : le site affiche d'abord les témoignages datés, du plus récent au plus
// ancien (même mois : ordre de ce fichier), puis ceux sans date, dans l'ordre
// de ce fichier.
//
// ACCUEIL : si au moins un témoignage porte `accueil: true`, l'accueil montre
// ceux-là (3 au plus, dans l'ordre ci-dessus) ; sinon les 3 premiers. La page
// À propos montre toujours tous les témoignages.
//
// Une entrée sans nom ou sans message, ou avec une date mal écrite, est ignorée
// à l'affichage et signalée dans la console en développement.
//
// RAPPEL : n'ajouter que de vrais messages de clientes, avec leur accord pour
// publier leur nom sous cette forme.

export const TEMOIGNAGES = [
  {
    nom: "Manon",
    date: "2026-01",
    seance: "famille",
    accueil: true,
    message: "Nous avons eu vos photos et nous voulions vous remercier, elles sont magnifiques. On remarque vraiment votre professionnalisme. Nous aimons beaucoup les photos très spontanées, celles qui capturent un rire aux éclats, un regard, une mimique. Encore merci !",
  },
  {
    nom: "Maxime et Soukayna",
    date: "2025-11",
    seance: "naissance",
    message: "Je vous remercie pour votre travail exceptionnel, les photos sont juste magnifiques, je n’ai rien à dire, c’est exactement ce que je voulais. Je ne pourrais même pas vous dire mes coups de cœur, je les aime toutes. Vous avez su capturer les bons moments. Merci pour votre accueil, on a très vite été très à l’aise et tout était à notre disposition pour faire de belles photos. Merci encore mille fois !",
  },
  {
    nom: "Noémie",
    date: "2025-11",
    seance: "famille",
    message: "Un grand merci pour les photos, elles sont très jolies. Un grand merci et à bientôt pour un nouveau shooting.",
  },
  {
    nom: "Jules et Mathilde",
    date: "2025-11",
    seance: "couple",
    message: "Merci beaucoup, les photos sont extraordinaires.",
  },
  {
    nom: "Antoine et Opale",
    seance: "naissance",
    accueil: true,
    message: "Merci mille fois pour ces photos, elles sont superbes et correspondent parfaitement à ce que nous souhaitions pour immortaliser la naissance de notre fille ! Difficile d’en choisir des favorites tant chacune est belle dans son propre style. Encore merci pour ces photos et votre rapidité d’envoi, nous sommes vraiment ravis !",
  },
  {
    nom: "Margaux",
    seance: "grossesse",
    accueil: true,
    message: "Les photos sont vraiment incroyables ! Je n’ai rien à redire ! Vraiment, c’était un plaisir ! Merci d’avoir immortalisé ma grossesse.",
  },
  {
    nom: "Aurianne",
    message: "Déjà, merci beaucoup car les photos sont incroyables ! Vous avez réussi à retranscrire exactement ce qu’on voulait ! Pour les coups de cœur, nous en avons trop… Encore un énorme merci !",
  },
  {
    nom: "Une famille",
    seance: "famille",
    message: "Un immense merci pour ce merveilleux shooting famille de Noël ! Vos photos sont tout simplement incroyables. Vous avez réussi à capturer de magnifiques instants et à créer des souvenirs précieux. Au-delà de votre immense talent, vous êtes une personne formidable, tellement humaine, douce et bienveillante. On se sent tout de suite à l’aise avec vous, et votre professionnalisme se ressent dans chaque détail. Merci pour votre accueil, votre gentillesse et pour ces magnifiques photos. Nous vous recommandons les yeux fermés !",
  },
  {
    nom: "Des jeunes parents",
    message: "On a bien reçu ton mail et on est émerveillés par ton talent et tes magnifiques photos. Mille mercis d’avoir sublimé notre amour, notre bébé cœur, et on est éternellement reconnaissants pour ta gentillesse et ton travail. Au plaisir de faire un jour un autre shooting avec toi !",
  },
  {
    nom: "Une cliente",
    message: "Merci beaucoup pour votre rapidité et votre professionnalisme. Les photos sont top ! J’adore.",
  },
]
