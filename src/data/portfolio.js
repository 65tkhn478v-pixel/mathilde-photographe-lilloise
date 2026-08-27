// Photos réelles de Mathilde Lecomte, reprises de son site actuel
// (mathilde-photographelille.mypixieset.com) comme référence de style et
// placeholders temporaires. Export web ~1500px : à remplacer par les
// fichiers HD originaux fournis par la cliente avant mise en production.
//
// La catégorie "famille" n'a pas de galerie dédiée sur le site actuel
// (uniquement mariage / grossesse / naissance) : voir CategoryFamille dans
// PortfolioCategory pour le traitement de cette absence, conformément au
// brief (ne pas inventer de fausses réalisations).

export const CATEGORIES = [
  {
    slug: 'mariage',
    label: 'Mariage',
    intro:
      'Des rires, des mains qui se cherchent, un baiser volé dans un escalier de pierre — le mariage vécu, pas mis en scène.',
    cover: '/images/portfolio/mariage/mariage-08.webp',
  },
  {
    slug: 'grossesse',
    label: 'Grossesse',
    intro:
      "Un ventre tenu à deux mains, une lumière de fin d'après-midi — la trace de cette attente, avec pudeur.",
    cover: '/images/portfolio/grossesse/grossesse-03.webp',
  },
  {
    slug: 'naissance',
    label: 'Naissance',
    intro:
      'Les tout premiers jours : une main refermée sur un doigt, un sommeil profond contre une épaule.',
    cover: '/images/portfolio/naissance/naissance-08.webp',
  },
  {
    slug: 'famille',
    label: 'Famille',
    intro:
      'Une galerie dédiée à la famille est en préparation — photos à venir.',
    cover: null,
    comingSoon: true,
  },
]

export const PHOTOS = {
  mariage: [
    {
      src: '/images/portfolio/mariage/mariage-01.webp',
      alt: "Deux mariées partagent un fou rire en coupant leur gâteau meringué, coupe de champagne à portée de main.",
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/mariage/mariage-02.webp',
      alt: 'Un bouquet de roses blanches et crème échangé entre les mains des mariés, alliances au doigt.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/mariage/mariage-03.webp',
      alt: "Un couple de mariés s'embrasse dans le grand escalier en pierre d'une mairie, bouquet à la main.",
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/mariage/mariage-04.webp',
      alt: 'Les mariés assis côte à côte dans un escalier, mains posées l\'une sur l\'autre, sourire complice.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/mariage/mariage-05.webp',
      alt: 'Gros plan sur les mains des mariés posées sur une balustrade de pierre, alliances et bouquet de roses.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/mariage/mariage-06.webp',
      alt: 'Deux mariées éclatent de rire en partageant une part de gâteau, entourées de plantes vertes.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/mariage/mariage-07.webp',
      alt: 'Une mariée serre son épouse dans ses bras, visages cachés derrière un bouquet de roses et renoncules.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/mariage/mariage-08.webp',
      alt: 'Les mariés front contre front, yeux fermés, dans la lumière douce d\'un hall en pierre blanche.',
      orientation: 'portrait',
    },
  ],
  grossesse: [
    {
      src: '/images/portfolio/grossesse/grossesse-01.webp',
      alt: 'Un couple assis au sol contre un canapé clair, tendrement enlacé autour du ventre arrondi de la future maman.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/grossesse/grossesse-02.webp',
      alt: "Gros plan sur les mains d'une future maman et de son conjoint posées ensemble sur un ventre de grossesse.",
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/grossesse/grossesse-03.webp',
      alt: 'Un couple front contre front, mains jointes, dans la lumière naturelle d\'une fenêtre.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/grossesse/grossesse-04.webp',
      alt: "Portrait en noir et blanc d'une future maman de profil devant une fenêtre, une main sur son ventre.",
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/grossesse/grossesse-05.webp',
      alt: 'Un couple se regarde en souriant, la main du futur papa posée délicatement sur le ventre de sa compagne.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/grossesse/grossesse-06.webp',
      alt: 'Un futur papa enlace sa compagne enceinte par derrière, joue contre joue, dans une pièce lumineuse.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/grossesse/grossesse-07.webp',
      alt: 'Portrait souriant d\'une future maman assise, une main posée sur son ventre.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/grossesse/grossesse-08.webp',
      alt: 'Une future maman en tenue boudoir claire, éclairée par la lumière naturelle d\'une fenêtre.',
      orientation: 'portrait',
    },
  ],
  naissance: [
    {
      src: '/images/portfolio/naissance/naissance-01.webp',
      alt: 'Une maman dépose un baiser sur le front de son nouveau-né endormi, tenu au creux de la main de son père.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/naissance/naissance-02.webp',
      alt: "Un nouveau-né endormi coiffé d'un bonnet en laine à oreilles de lapin, blotti dans les mains d'un parent.",
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/naissance/naissance-03.webp',
      alt: 'Deux parents front contre front regardent leur nouveau-né emmailloté, à contre-jour.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/naissance/naissance-04.webp',
      alt: 'Gros plan sur le profil endormi d\'un nouveau-né, joue contre un lange blanc.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/naissance/naissance-05.webp',
      alt: 'Photo en noir et blanc d\'un père tenant son nouveau-né endormi au creux du bras.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/naissance/naissance-06.webp',
      alt: 'Vue en contre-plongée de deux parents penchés au-dessus de leur nouveau-né endormi, en noir et blanc.',
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/naissance/naissance-07.webp',
      alt: "Un nouveau-né dort paisiblement, la tête calée dans la main de son père.",
      orientation: 'portrait',
    },
    {
      src: '/images/portfolio/naissance/naissance-08.webp',
      alt: "Un père embrasse le front de son nouveau-né aux yeux grands ouverts, blotti dans ses bras.",
      orientation: 'portrait',
    },
  ],
}
