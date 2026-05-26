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

// Women-only names across French, English, Arabic/North-African, Spanish backgrounds
const NAMES: { first: string; last: string }[] = [
  // French / Québécois
  { first: 'Sophie', last: 'M.' }, { first: 'Camille', last: 'B.' },
  { first: 'Léa', last: 'D.' }, { first: 'Manon', last: 'R.' },
  { first: 'Emma', last: 'T.' }, { first: 'Chloé', last: 'L.' },
  { first: 'Anaïs', last: 'P.' }, { first: 'Lucie', last: 'G.' },
  { first: 'Clara', last: 'F.' }, { first: 'Noémie', last: 'C.' },
  { first: 'Julie', last: 'H.' }, { first: 'Marie', last: 'V.' },
  { first: 'Céline', last: 'N.' }, { first: 'Laure', last: 'K.' },
  { first: 'Pauline', last: 'S.' }, { first: 'Aurélie', last: 'J.' },
  { first: 'Mathilde', last: 'W.' }, { first: 'Elisa', last: 'A.' },
  // English / Canadian / American
  { first: 'Jessica', last: 'T.' }, { first: 'Ashley', last: 'M.' },
  { first: 'Brittany', last: 'H.' }, { first: 'Lauren', last: 'S.' },
  { first: 'Emily', last: 'C.' }, { first: 'Megan', last: 'R.' },
  { first: 'Stephanie', last: 'B.' }, { first: 'Amanda', last: 'W.' },
  { first: 'Jennifer', last: 'L.' }, { first: 'Rachel', last: 'D.' },
  { first: 'Olivia', last: 'P.' }, { first: 'Madison', last: 'K.' },
  { first: 'Hannah', last: 'G.' }, { first: 'Samantha', last: 'F.' },
  // Arabic / North-African / Middle-Eastern
  { first: 'Yasmine', last: 'B.' }, { first: 'Nadia', last: 'A.' },
  { first: 'Fatima', last: 'Z.' }, { first: 'Amina', last: 'O.' },
  { first: 'Rania', last: 'K.' }, { first: 'Lina', last: 'M.' },
  { first: 'Hana', last: 'S.' }, { first: 'Asma', last: 'C.' },
  { first: 'Sara', last: 'E.' }, { first: 'Imane', last: 'H.' },
  { first: 'Nour', last: 'T.' }, { first: 'Rim', last: 'D.' },
  // Spanish / Latin
  { first: 'Isabella', last: 'G.' }, { first: 'Valentina', last: 'R.' },
  { first: 'Sofia', last: 'L.' }, { first: 'Camila', last: 'M.' },
]

// Locations: Canada, US, Europe — weighted toward CA/US/FR
const LOCATIONS = [
  // Canada (30%)
  'Montréal, QC 🇨🇦', 'Toronto, ON 🇨🇦', 'Vancouver, BC 🇨🇦',
  'Québec, QC 🇨🇦', 'Ottawa, ON 🇨🇦', 'Calgary, AB 🇨🇦',
  // United States (25%)
  'New York, NY 🇺🇸', 'Los Angeles, CA 🇺🇸', 'Miami, FL 🇺🇸',
  'Chicago, IL 🇺🇸', 'Houston, TX 🇺🇸', 'Seattle, WA 🇺🇸',
  // France (20%)
  'Paris 🇫🇷', 'Lyon 🇫🇷', 'Marseille 🇫🇷', 'Bordeaux 🇫🇷',
  'Toulouse 🇫🇷', 'Nice 🇫🇷', 'Strasbourg 🇫🇷',
  // Other Europe (15%)
  'Bruxelles 🇧🇪', 'Genève 🇨🇭', 'Londres 🇬🇧', 'Amsterdam 🇳🇱',
  'Madrid 🇪🇸', 'Berlin 🇩🇪', 'Barcelone 🇪🇸',
  // Other francophone (10%)
  'Casablanca 🇲🇦', 'Tunis 🇹🇳', 'Abidjan 🇨🇮', 'Dakar 🇸🇳',
]

// Location weights (index ranges map to higher CA/US probability)
const LOCATION_WEIGHTS = [
  ...Array(6).fill(0),   // Canada ×6 slots
  ...Array(5).fill(1),   // US ×5 slots (using index offset below)
]
void LOCATION_WEIGHTS // unused — we use direct index math

// Review templates by language
const TEMPLATES: { rating: number; lang: string; title: string; body: string }[] = [
  // ── English 5-star ──
  { rating: 5, lang: 'en', title: 'Absolutely love it! ❤️', body: 'I was a bit skeptical at first but this product completely exceeded my expectations. My skin feels so much smoother and the results showed up within the first week. Already ordered a second one!' },
  { rating: 5, lang: 'en', title: 'Game changer for my routine', body: "Honestly this is the best purchase I've made in a long time. The quality is amazing and it actually works. Fast shipping too, I got it way quicker than expected. 10/10 would recommend!" },
  { rating: 5, lang: 'en', title: 'So happy with this purchase!', body: "I bought this after seeing it recommended online and I'm so glad I did. It's exactly as described, the packaging is beautiful and the product itself is top quality. My friends keep asking what I'm using 😄" },
  { rating: 5, lang: 'en', title: 'Works better than expected', body: "I've tried so many similar products and none of them worked as well as this one. After just two weeks I can already see a huge difference. Will definitely be a staple in my skincare routine going forward." },
  { rating: 5, lang: 'en', title: 'Incredible results 🌟', body: "This product is the real deal! I was hesitant because of the price but it's 100% worth it. The texture is lightweight, absorbs quickly, and my skin has never looked better. Fast shipping and great packaging too." },
  { rating: 5, lang: 'en', title: 'Finally found something that works!', body: "I've been struggling with my skin for years and nothing seemed to help until I tried this. I've been using it for 3 weeks and the improvement is unreal. My confidence is through the roof. Thank you!!" },
  { rating: 5, lang: 'en', title: 'My go-to product now 💕', body: "Ordered this on a whim and now I can't live without it. My skin looks so fresh and radiant. Shipping was fast and it came really well packaged. This will be a permanent part of my routine." },
  { rating: 5, lang: 'en', title: 'Highly recommend!', body: "Great product, great price, fast delivery. What more could you ask for? I've been using it daily for a month and the difference in my skin is noticeable. All my coworkers have been asking what I'm doing differently 😊" },
  // ── English 4-star ──
  { rating: 4, lang: 'en', title: 'Really good, minor issues', body: "Really happy with this purchase overall. The product itself is great and I can see results already. Only giving 4 stars because shipping took a bit longer than expected, but it was definitely worth the wait." },
  { rating: 4, lang: 'en', title: 'Good product, will repurchase', body: "This does what it claims and the quality is solid. I've been using it for two weeks and I'm seeing gradual improvement. Not a miracle overnight but consistent results over time. Would buy again." },
  { rating: 4, lang: 'en', title: 'Pretty happy with it', body: "Overall a solid product. I liked the texture and how quickly it absorbs. Results are real but take a bit of patience. Good value for money though, I'll definitely order again." },
  // ── French 5-star ──
  { rating: 5, lang: 'fr', title: 'Je suis fan ! ❤️', body: "Je suis vraiment agréablement surprise par ce produit. La qualité est au rendez-vous et les résultats se voient dès les premières utilisations. Je le recommande à 100 % à toutes mes amies !" },
  { rating: 5, lang: 'fr', title: 'Au-delà de mes attentes', body: "J'avais des doutes au début mais ce produit a vraiment changé ma routine beauté. Texture parfaite, odeur agréable et les résultats sont là dès la première semaine. Je ne peux plus m'en passer !" },
  { rating: 5, lang: 'fr', title: 'Résultats visibles rapidement ✨', body: "Après seulement 10 jours d'utilisation, ma peau est transformée. Ce produit tient vraiment ses promesses. Livraison soignée et rapide. J'en ai déjà commandé un deuxième pour mon stock !" },
  { rating: 5, lang: 'fr', title: 'Un must-have absolu !', body: "Je cherchais ce type de produit depuis longtemps et j'ai enfin trouvé. Qualité premium, emballage luxueux et efficacité prouvée. Ma peau n'a jamais été aussi belle. Merci pour ce produit incroyable !" },
  { rating: 5, lang: 'fr', title: 'Commande parfaite 🙌', body: "Commande reçue rapidement, bien emballée, produit conforme à la description. Résultats visibles après 2 semaines. Je suis ravie de mon achat et je reviendrai sans hésiter !" },
  { rating: 5, lang: 'fr', title: 'Excellent rapport qualité-prix', body: "Pour ce prix, la qualité est vraiment impressionnante. On sent que c'est un produit sérieux dès la première utilisation. Ma peau adore et moi aussi ! Je recommande vivement." },
  { rating: 5, lang: 'fr', title: 'Parfait du début à la fin', body: "J'ai acheté sur les conseils d'une amie et je ne suis pas déçue. Le produit est authentique, efficace, et les résultats se maintiennent dans le temps. Je suis désormais cliente fidèle !" },
  { rating: 5, lang: 'fr', title: 'Livraison rapide + produit top ⭐', body: "Livraison en moins de 2 semaines, produit soigneusement emballé. La qualité est là, rien à redire. 5 étoiles méritées. Je l'ai déjà conseillé à plusieurs amies qui ont commandé à leur tour." },
  // ── French 4-star ──
  { rating: 4, lang: 'fr', title: "Très bien dans l'ensemble", body: "Très bon produit dans l'ensemble. Je mets 4 étoiles car la livraison a pris un peu plus longtemps que prévu, mais le produit en lui-même est excellent. Les résultats sont là. Je recommande." },
  { rating: 4, lang: 'fr', title: 'Satisfaite, je reviendrai', body: "Je suis globalement satisfaite de mon achat. Les résultats sont au rendez-vous même si ça prend un peu de temps. Bon rapport qualité-prix. Je reviendrai probablement en acheter." },
  { rating: 4, lang: 'fr', title: 'Bonne surprise pour le prix', body: "Je ne m'attendais pas à une telle qualité pour ce prix. Produit efficace, livraison correcte. Je suis contente de mon achat et je le recommande aux hésitantes !" },
  // ── Spanish 5-star ──
  { rating: 5, lang: 'es', title: '¡Me encanta! ❤️', body: "Este producto es increíble. Lo uso desde hace dos semanas y ya noto una gran diferencia en mi piel. La calidad es excelente y el envío llegó más rápido de lo esperado. ¡100% recomendado!" },
  { rating: 5, lang: 'es', title: 'Resultados reales y rápidos ✨', body: "Llevaba tiempo buscando algo así y por fin lo encontré. Mi piel se ve más suave, luminosa y uniforme. El packaging es muy cuidado y el producto se siente premium. ¡Volvería a comprar sin dudarlo!" },
  { rating: 4, lang: 'es', title: 'Muy buena compra', body: "Producto de muy buena calidad. Los resultados son visibles aunque hay que tener un poco de paciencia. El envío tardó algo más de lo esperado pero mereció la pena esperar. Lo recomiendo." },
  // ── German 5-star ──
  { rating: 5, lang: 'de', title: 'Absolut begeistert! ⭐', body: "Dieses Produkt hat meine Erwartungen weit übertroffen. Schon nach einer Woche sehe ich deutliche Verbesserungen. Die Qualität ist hervorragend und die Lieferung war schnell und sicher verpackt. Sehr empfehlenswert!" },
  { rating: 4, lang: 'de', title: 'Sehr gutes Produkt', body: "Insgesamt sehr zufrieden. Das Produkt funktioniert wie beschrieben und die Qualität stimmt. Der Versand hat etwas länger gedauert als erwartet, aber das Ergebnis war die Wartezeit wert." },
  // ── Italian 5-star ──
  { rating: 5, lang: 'it', title: 'Prodotto fantastico! 🌟', body: "Sono rimasta davvero colpita da questo prodotto. I risultati sono visibili già dalla prima settimana e la qualità è eccellente. Spedizione veloce e imballaggio curato. Lo consiglio a tutte!" },
  { rating: 4, lang: 'it', title: 'Molto soddisfatta', body: "Prodotto di ottima qualità, risultati concreti dopo due settimane di utilizzo. La spedizione ha impiegato un po' più del previsto ma il prodotto è stato ben imballato. Lo riacquisterei." },
  // ── Arabic 5-star ──
  { rating: 5, lang: 'ar', title: 'منتج رائع جداً ❤️', body: 'هذا المنتج غير حياتي! البشرة أصبحت أكثر نضارة وإشراقاً بعد أسبوعين فقط. الجودة ممتازة والتوصيل كان سريعاً. أنصح به كل النساء بشدة وسأطلبه مرة أخرى بالتأكيد!' },
  { rating: 5, lang: 'ar', title: 'نتائج مذهلة ✨', body: 'منتج من الدرجة الأولى، جربته وأنا سعيدة جداً بالنتائج. البشرة صارت أنعم وأجمل. التغليف محترم والتوصيل في الوقت المحدد. شكراً جزيلاً، سأوصي به لصديقاتي.' },
  { rating: 4, lang: 'ar', title: 'جيد جداً', body: 'منتج جيد جداً، النتائج تظهر تدريجياً لكنها حقيقية. التوصيل أخذ وقتاً أطول قليلاً من المتوقع لكن المنتج يستحق الانتظار. سأشتريه مجدداً.' },
]

const DATES_RANGE_DAYS = 210 // reviews spread over last 7 months

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

export function generateFakeReviews(productId: string, count = 8): FakeReview[] {
  const rand = seededRand(hashStr(productId))
  const now = Date.now()

  // Weight locations: CA ~30%, US ~25%, FR ~20%, other EU ~15%, other ~10%
  const locationPool = [
    // Canada ×9
    'Montréal, QC 🇨🇦', 'Toronto, ON 🇨🇦', 'Vancouver, BC 🇨🇦',
    'Québec, QC 🇨🇦', 'Ottawa, ON 🇨🇦', 'Calgary, AB 🇨🇦',
    'Edmonton, AB 🇨🇦', 'Laval, QC 🇨🇦', 'Mississauga, ON 🇨🇦',
    // US ×8
    'New York, NY 🇺🇸', 'Los Angeles, CA 🇺🇸', 'Miami, FL 🇺🇸',
    'Chicago, IL 🇺🇸', 'Houston, TX 🇺🇸', 'Seattle, WA 🇺🇸',
    'Atlanta, GA 🇺🇸', 'Dallas, TX 🇺🇸',
    // France ×7
    'Paris 🇫🇷', 'Lyon 🇫🇷', 'Marseille 🇫🇷', 'Bordeaux 🇫🇷',
    'Toulouse 🇫🇷', 'Nice 🇫🇷', 'Strasbourg 🇫🇷',
    // Europe ×5
    'Bruxelles 🇧🇪', 'Genève 🇨🇭', 'Londres 🇬🇧', 'Amsterdam 🇳🇱',
    'Madrid 🇪🇸',
    // Other ×3
    'Casablanca 🇲🇦', 'Tunis 🇹🇳', 'Abidjan 🇨🇮',
  ]

  return Array.from({ length: count }, (_, i) => {
    const name = NAMES[Math.floor(rand() * NAMES.length)]
    const location = locationPool[Math.floor(rand() * locationPool.length)]

    // Weight toward 5-star (65%) and 4-star (28%)
    const roll = rand()
    const fiveStarTemplates = TEMPLATES.filter(t => t.rating === 5)
    const fourStarTemplates = TEMPLATES.filter(t => t.rating === 4)
    const pool = roll < 0.65 ? fiveStarTemplates : roll < 0.93 ? fourStarTemplates : fiveStarTemplates
    const tpl = pool[Math.floor(rand() * pool.length)]

    // Spread dates randomly
    const daysAgo = Math.floor(rand() * DATES_RANGE_DAYS) + 2
    const date = new Date(now - daysAgo * 86400000).toISOString()

    return {
      _id: `fake-${productId}-${i}`,
      author: `${name.first} ${name.last}`,
      location,
      rating: tpl.rating,
      title: tpl.title,
      body: tpl.body,
      photo: undefined,
      verified: rand() > 0.12,
      date,
      fake: true as const,
    }
  })
}
