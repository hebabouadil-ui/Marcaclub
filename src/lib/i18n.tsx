'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Lang = 'fr' | 'en'

const t = {
  fr: {
    nav: {
      shop: 'Boutique',
      newArrivals: 'Nouveautés',
      live: 'Lookbook',
      signIn: 'Connexion',
      myOrders: 'Mes commandes',
      profile: 'Mon profil',
      signOut: 'Déconnexion',
      currency: 'Devise',
    },
    announcement: {
      default: 'Livraison mondiale · Paiement sécurisé · Nouveautés chaque semaine',
    },
    hero: {
      badge: 'Accessoires Auto Premium · Livraison Mondiale',
      shopNow: 'Voir la collection',
      createAccount: 'Créer un compte',
      shipsWorldwide: 'Livraison mondiale',
      securePayment: 'Paiement sécurisé',
      fastDelivery: 'Livraison 7–12 jours',
    },
    categories: {
      title: 'Ce Qui Arrive',
      explore: 'Bientôt',
      women: 'Femme',
      womenSub: 'Robes, tops, pantalons',
      men: 'Homme',
      menSub: 'T-shirts, jeans, vestes',
      accessories: 'Accessoires',
      accessoriesSub: 'Sacs, bijoux, ceintures',
      newArrivals: 'Nouveautés',
      newArrivalsSub: 'Derniers arrivages',
    },
    featured: {
      label: 'Sélection',
      title: 'Pièces du Moment',
      viewAll: 'Tout voir',
      comingSoon: 'Bientôt disponible',
      comingSoonSub: 'De nouveaux arrivages en préparation',
      viewCollection: 'Voir toute la collection',
    },
    live: {
      title: 'Notre Communauté',
      subtitle: 'Rejoignez l\'univers Marcaclub',
      description: 'Inspirations mode, avant-premières exclusives et offres réservées à notre communauté. Suivez-nous pour ne rien manquer.',
      liveNow: 'LIVE en cours',
      joinInstagram: 'Instagram Live',
      joinTikTok: 'TikTok Live',
      followInstagram: 'Instagram',
      followTikTok: 'TikTok',
    },
    liveBanner: {
      text: 'Nous sommes en LIVE',
      join: 'Rejoindre',
    },
    footer: {
      tagline: 'Auto Premium',
      description: 'Accessoires auto premium sélectionnés et livrés dans le monde entier. Qualité garantie, livraison rapide.',
      shop: 'Boutique',
      collection: 'Collection',
      newArrivals: 'Nouveautés',
      women: 'Femme',
      men: 'Homme',
      info: 'Informations',
      liveSessions: 'Communauté',
      myCart: 'Mon Panier',
      securePayment: 'Paiement sécurisé',
      delivery: 'Livraison 7–12 jours',
      contact: 'Nous contacter',
      rights: 'Tous droits réservés.',
      worldwide: 'Livraison mondiale — Accessoires auto premium',
    },
    products: {
      title: 'Notre Collection',
      search: 'Rechercher...',
      all: 'Tous',
      noResults: 'Aucun résultat',
      noResultsSub: 'Essayez une autre catégorie ou recherche',
      available: (n: number) => `${n} pièce${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''}`,
    },
    product: {
      home: 'Accueil',
      collection: 'Collection',
      outOfStock: 'Épuisé',
      sizeOutOfStock: 'Taille épuisée',
      lowStock: (n: number) => `Plus que ${n} en stock`,
      inStock: (n: number) => `${n} en stock`,
      inStockLabel: 'En stock',
      size: 'Taille — Choisir',
      quantity: 'Quantité',
      addToCart: 'Ajouter au panier',
      buyNow: 'Commander maintenant',
      continueShopping: 'Continuer mes achats',
      description: 'Description',
      securePayment: 'Paiement sécurisé',
      delivery: 'Livraison 7–12 jours',
      quality: 'Qualité premium garantie',
      chooseSize: 'Veuillez choisir une taille',
      lastItems: 'Dernières pièces',
    },
    cart: {
      title: 'Mon Panier',
      empty: 'Votre panier est vide',
      emptySub: 'Explorez notre collection et ajoutez vos favoris.',
      shopNow: 'Acheter maintenant',
      size: 'Taille',
      summary: 'Résumé de commande',
      total: 'Total',
      shipping: 'Livraison calculée à la commande',
      checkout: 'Commander',
      continueShopping: 'Continuer mes achats',
    },
    productCard: {
      view: 'Voir le produit',
      outOfStock: 'Épuisé',
      lastItems: 'Dernières pièces',
    },
  },
  en: {
    nav: {
      shop: 'Shop',
      newArrivals: 'New Arrivals',
      live: 'Lookbook',
      signIn: 'Sign In',
      myOrders: 'My Orders',
      profile: 'Profile',
      signOut: 'Sign Out',
      currency: 'Currency',
    },
    announcement: {
      default: 'Worldwide Shipping · Secure Checkout · New Arrivals Every Week',
    },
    hero: {
      badge: 'Premium Car Accessories · Worldwide Shipping',
      shopNow: 'Shop Now',
      createAccount: 'Create Free Account',
      shipsWorldwide: 'Ships Worldwide',
      securePayment: 'Secure Payment',
      fastDelivery: 'Fast Delivery 7–12 days',
    },
    categories: {
      title: 'What\'s Coming',
      explore: 'Coming Soon',
      women: 'Women',
      womenSub: 'Dresses, tops, pants',
      men: 'Men',
      menSub: 'T-shirts, jeans, jackets',
      accessories: 'Accessories',
      accessoriesSub: 'Bags, jewelry, belts',
      newArrivals: 'New Arrivals',
      newArrivalsSub: 'Latest drops',
    },
    featured: {
      label: 'Selection',
      title: 'Featured Pieces',
      viewAll: 'View all',
      comingSoon: 'Coming Soon',
      comingSoonSub: 'New arrivals are on their way',
      viewCollection: 'View full collection',
    },
    live: {
      title: 'Our Community',
      subtitle: 'Join the Marcaclub World',
      description: 'Fashion inspiration, exclusive previews and member-only offers. Follow us so you never miss a drop.',
      liveNow: 'LIVE now',
      joinInstagram: 'Instagram Live',
      joinTikTok: 'TikTok Live',
      followInstagram: 'Instagram',
      followTikTok: 'TikTok',
    },
    liveBanner: {
      text: 'We are LIVE now',
      join: 'Join us',
    },
    footer: {
      tagline: 'Auto Premium',
      description: 'Premium car accessories curated and delivered worldwide. Quality guaranteed, fast shipping.',
      shop: 'Shop',
      collection: 'Collection',
      newArrivals: 'New Arrivals',
      women: 'Women',
      men: 'Men',
      info: 'Information',
      liveSessions: 'Live Sessions',
      myCart: 'My Cart',
      securePayment: 'Secure Payment',
      delivery: 'Delivery 7–12 days',
      contact: 'Contact us',
      rights: 'All rights reserved.',
      worldwide: 'Worldwide delivery — Premium car accessories',
    },
    products: {
      title: 'Our Collection',
      search: 'Search...',
      all: 'All',
      noResults: 'No results',
      noResultsSub: 'Try a different category or search',
      available: (n: number) => `${n} item${n > 1 ? 's' : ''} available`,
    },
    product: {
      home: 'Home',
      collection: 'Collection',
      outOfStock: 'Out of Stock',
      sizeOutOfStock: 'Size out of stock',
      lowStock: (n: number) => `Only ${n} left in stock`,
      inStock: (n: number) => `${n} in stock`,
      inStockLabel: 'In Stock',
      size: 'Size — Choose',
      quantity: 'Quantity',
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      continueShopping: 'Continue Shopping',
      description: 'Description',
      securePayment: 'Secure Payment',
      delivery: 'Delivery 7–12 days',
      quality: 'Premium quality guaranteed',
      chooseSize: 'Please choose a size',
      lastItems: 'Last items',
    },
    cart: {
      title: 'My Cart',
      empty: 'Your cart is empty',
      emptySub: 'Explore our collection and add your favorites.',
      shopNow: 'Shop Now',
      size: 'Size',
      summary: 'Order Summary',
      total: 'Total',
      shipping: 'Shipping calculated at checkout',
      checkout: 'Checkout',
      continueShopping: 'Continue Shopping',
    },
    productCard: {
      view: 'View product',
      outOfStock: 'Out of Stock',
      lastItems: 'Last items',
    },
  },
}

type Translations = typeof t.fr
const LanguageContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; tr: Translations }>({
  lang: 'fr',
  setLang: () => {},
  tr: t.fr,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved === 'en' || saved === 'fr') setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, tr: t[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
