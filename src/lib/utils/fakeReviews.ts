// Deterministic pseudo-random seeded on product ID — same product always gets the same reviews
function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function hashStr(str: string) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  return h >>> 0
}

const FIRST_NAMES = [
  'Sophie', 'Camille', 'Léa', 'Inès', 'Manon', 'Emma', 'Chloé', 'Yasmine',
  'Nadia', 'Sarah', 'Fatima', 'Amina', 'Julie', 'Marie', 'Laure', 'Céline',
  'Anaïs', 'Lucie', 'Clara', 'Noémie', 'Rania', 'Lina', 'Hana', 'Asma',
  'Kevin', 'Thomas', 'Julien', 'Maxime', 'Lucas', 'Nathan', 'Mehdi', 'Karim',
  'Alexandre', 'Pierre', 'Antoine', 'Amine', 'Youssef', 'Rachid',
]

const LAST_INITIALS = 'ABCDEFGHIJKLMNOPRSTV'

const LOCATIONS = [
  'Montréal, QC 🇨🇦', 'Paris, France 🇫🇷', 'Lyon 🇫🇷', 'Bruxelles 🇧🇪',
  'Bordeaux 🇫🇷', 'Marseille 🇫🇷', 'Toulouse 🇫🇷', 'Casablanca 🇲🇦',
  'Genève 🇨🇭', 'Québec, QC 🇨🇦', 'Ottawa, ON 🇨🇦', 'Nice 🇫🇷',
  'Dakar 🇸🇳', 'Abidjan 🇨🇮', 'Tunis 🇹🇳', 'Alger 🇩🇿',
]

const REVIEW_TEMPLATES = [
  // 5-star
  {
    rating: 5,
    titles: [
      'Je suis fan !',
      'Vraiment bluffant',
      'Résultats visibles rapidement',
      'Au-delà de mes attentes',
      'Absolument parfait',
      'Je rachèterai sans hésiter',
      'Un must-have !',
    ],
    bodies: [
      'Je suis vraiment agréablement surprise par ce produit. La qualité est au rendez-vous et les résultats se voient dès les premières utilisations. Je le recommande à 100 % !',
      'Franchement j\'ai longtemps hésité à commander mais je ne regrette absolument pas. Livraison rapide, produit conforme à la description et efficace. Top !',
      'Ce produit a changé ma routine et je ne peux plus m\'en passer. Texture agréable, odeur discrète et résultats vraiment visibles après 2 semaines.',
      'J\'ai acheté sur les conseils d\'une amie et je ne suis pas déçue. La qualité est là, le conditionnement est soigné. Je suis cliente fidèle maintenant.',
      'Parfait du début à la fin. Emballage sécurisé, produit authentique, et les effets sont là. Mon préféré depuis longtemps !',
      'Excellent rapport qualité-prix. Le produit tient ses promesses et ma peau adore. J\'en ai déjà commandé un deuxième !',
      'Je suis impressionnée. Après seulement une semaine d\'utilisation les résultats sont déjà visibles. Le service client est aussi très réactif.',
    ],
  },
  // 5-star
  {
    rating: 5,
    titles: [
      'Commande parfaite',
      'Super qualité',
      'Livraison rapide + produit top',
      'Exactement ce que je cherchais',
    ],
    bodies: [
      'Commande reçue en moins de 2 semaines, produit bien emballé et conforme. Très satisfaite de mon achat, je reviendrai.',
      'La qualité est vraiment au niveau. On voit que c\'est un produit sérieux. Résultats constatés au bout d\'une semaine.',
      'Produit top, livraison soignée, rien à redire. 5 étoiles méritées.',
      'Exactement comme décrit. Rien à ajouter, c\'est un excellent produit que je recommande vivement à mon entourage.',
    ],
  },
  // 4-star
  {
    rating: 4,
    titles: [
      'Très bien dans l\'ensemble',
      'Bon produit, quelques réserves',
      'Satisfaite globalement',
      'Bonne surprise',
    ],
    bodies: [
      'Très bon produit dans l\'ensemble. Je mets 4 étoiles car la livraison a pris un peu plus longtemps que prévu mais le produit en lui-même est excellent.',
      'Bon rapport qualité-prix. J\'aurais aimé un emballage un peu plus élaboré mais le produit en lui-même est vraiment efficace.',
      'Je suis globalement satisfaite. Les résultats sont là, même si j\'aurais voulu qu\'ils arrivent un peu plus vite. Je recommande quand même.',
      'Bonne surprise pour ce prix. Qualité au rendez-vous, je reviendrai probablement en acheter.',
    ],
  },
  // 4-star
  {
    rating: 4,
    titles: ['Bien, je recommande', 'Produit efficace', 'Ça marche !'],
    bodies: [
      'Produit efficace, livraison correcte. Je recommande pour ceux qui hésitent encore.',
      'Ça fait ce que ça dit. Très satisfait de l\'achat, je l\'ai déjà conseillé à deux amies.',
      'Belle qualité pour le prix. Commande simple et rapide. Je reviendrai.',
    ],
  },
]

const DATES_RANGE_DAYS = 180 // reviews spread over last 6 months

export interface FakeReview {
  _id: string
  author: string
  location: string
  rating: number
  title: string
  body: string
  photo: undefined
  verified: boolean
  date: string
  fake: true
}

export function generateFakeReviews(productId: string, count = 6): FakeReview[] {
  const rand = seededRand(hashStr(productId))
  const now = Date.now()

  return Array.from({ length: count }, (_, i) => {
    const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)]
    const lastInitial = LAST_INITIALS[Math.floor(rand() * LAST_INITIALS.length)]
    const location = LOCATIONS[Math.floor(rand() * LOCATIONS.length)]

    // Weight toward 5-star (60%) and 4-star (30%)
    const roll = rand()
    const templateIdx = roll < 0.35 ? 0 : roll < 0.65 ? 1 : roll < 0.90 ? 2 : 3
    const template = REVIEW_TEMPLATES[templateIdx]
    const title = template.titles[Math.floor(rand() * template.titles.length)]
    const body = template.bodies[Math.floor(rand() * template.bodies.length)]

    // Spread dates randomly across the last 6 months
    const daysAgo = Math.floor(rand() * DATES_RANGE_DAYS) + 1
    const date = new Date(now - daysAgo * 86400000).toISOString()

    return {
      _id: `fake-${productId}-${i}`,
      author: `${firstName} ${lastInitial}.`,
      location,
      rating: template.rating,
      title,
      body,
      photo: undefined,
      verified: rand() > 0.15,
      date,
      fake: true as const,
    }
  })
}
