// Témoignages de clientes, affichés sur l'accueil (les 3 plus récents) et en
// entier sur la page À propos (/a-propos#temoignages).
//
// Tant que ce tableau est vide, la section n'apparaît nulle part sur le site.
//
// AJOUTER UN TÉMOIGNAGE : copier ce modèle entre les crochets ci-dessous,
// remplir les champs, puis enregistrer (une virgule entre deux témoignages).
//
//   {
//     nom: 'Julie D.',        // texte : prénom + initiale recommandé
//     date: '2026-03',        // AAAA-MM : mois et année du message
//     message: 'Le texte…',   // texte, sans guillemets (ajoutés à l'affichage)
//     seance: 'naissance',    // facultatif : grossesse, naissance, famille, portrait ou mariage
//   },
//
// L'ordre n'a pas d'importance : le site trie du plus récent au plus ancien.
// Une entrée incomplète (nom, date ou message manquant, date mal écrite) est
// ignorée à l'affichage et signalée dans la console en développement.
//
// RAPPEL : n'ajouter que de vrais messages de clientes, avec leur accord pour
// publier leur nom sous cette forme.

export const TEMOIGNAGES = []
