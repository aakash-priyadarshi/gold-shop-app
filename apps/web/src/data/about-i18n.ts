/**
 * Statically translated content for /about/[lang] pages.
 * Server-rendered for SEO — no client-side translation needed.
 */

export type AboutContentLanguage = "en" | "fr" | "de" | "hi" | "es" | "ar" | "ne";
export type Language =
  | AboutContentLanguage
  | "gu"
  | "mr"
  | "ta"
  | "te"
  | "kn";

export const SUPPORTED_ABOUT_LANGS: AboutContentLanguage[] = [
  "fr",
  "de",
  "hi",
  "es",
  "ar",
  "ne",
];

export const LANG_META: Record<
  Language,
  { name: string; nativeName: string; dir?: "rtl"; flag: string }
> = {
  en: { name: "English", nativeName: "English", flag: "🇬🇧" },
  fr: { name: "French", nativeName: "Français", flag: "🇫🇷" },
  de: { name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  hi: { name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  gu: { name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  mr: { name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  ta: { name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  te: { name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  kn: { name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  es: { name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  ar: { name: "Arabic", nativeName: "العربية", dir: "rtl", flag: "🇦🇪" },
  ne: { name: "Nepali", nativeName: "नेपाली", flag: "🇳🇵" },
};

/* ─── Platform Profiles ─────────────────────────────────────── */

export interface PlatformProfile {
  name: string;
  url: string;
  logo: string;
  category: string;
}

/** Platforms where Orivraa has LIVE profiles (links are real & verified). */
export const LIVE_PLATFORMS: PlatformProfile[] = [
  {
    name: "SaaSHub",
    url: "https://www.saashub.com/orivraa-alternatives",
    logo: "🔍",
    category: "SaaS Discovery Platform",
  },
  {
    name: "G2",
    url: "https://www.g2.com/sellers/orivraa",
    logo: "⭐",
    category: "Enterprise Software Reviews",
  },
  {
    name: "Crunchbase",
    url: "https://www.crunchbase.com/organization/orivraa",
    logo: "📊",
    category: "Business Intelligence",
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/orivraa",
    logo: "💼",
    category: "Professional Network",
  },
  {
    name: "F6S",
    url: "https://www.f6s.com/orivraa-ltd",
    logo: "🚀",
    category: "Startup Network",
  },
  {
    name: "Trustpilot",
    url: "https://www.trustpilot.com/review/orivraa.com",
    logo: "🛡️",
    category: "Consumer Trust Reviews",
  },
];

export interface ComingSoonPlatform {
  name: string;
  logo: string;
  category: string;
}

/** Platforms where profiles are being set up. */
export const COMING_SOON_PLATFORMS: ComingSoonPlatform[] = [
  { name: "Google Business", logo: "📍", category: "Local Business Listing" },
  { name: "Capterra", logo: "⭐", category: "Business Software Directory" },
  { name: "Product Hunt", logo: "🎯", category: "Product Launch Platform" },
  { name: "AlternativeTo", logo: "🔄", category: "Software Alternatives" },
  { name: "BetaList", logo: "🌱", category: "Startup Discovery" },
];

/* ─── Testimonials ──────────────────────────────────────────── */

export interface Testimonial {
  name: string;
  role: string;
  location: string;
  text: string;
  rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Ramesh K.",
    role: "Jewellery Shop Owner",
    location: "Kathmandu, Nepal",
    text: "Orivraa transformed how I run my shop. Live gold rates, easy inventory management, and customers from all over the world now find my designs.",
    rating: 5,
  },
  {
    name: "Priya S.",
    role: "Customer",
    location: "Mumbai, India",
    text: "I ordered a custom gold necklace through Orivraa. The transparent pricing and direct artisan communication made me confident in my purchase.",
    rating: 5,
  },
  {
    name: "Ahmed M.",
    role: "Gold Trader",
    location: "Dubai, UAE",
    text: "The real-time market rates and multi-currency support are exactly what I needed. Orivraa is the platform the jewellery industry was waiting for.",
    rating: 5,
  },
  {
    name: "Sarah L.",
    role: "Customer",
    location: "London, UK",
    text: "Beautiful craftsmanship and fair prices. The RFQ system let me get quotes from multiple sellers before choosing. Highly recommend!",
    rating: 4,
  },
  {
    name: "Carlos R.",
    role: "Jewellery Designer",
    location: "Miami, USA",
    text: "As a designer, the platform gives me global reach. The POS system and billing tools are a game-changer for my small business.",
    rating: 5,
  },
];

/* ─── Translated Page Content ───────────────────────────────── */

export interface AboutContent {
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  browseSellers: string;
  createCustomOrder: string;
  ourStoryTitle: string;
  storyP1: string;
  storyP2: string;
  storyP3: string;
  ourValuesTitle: string;
  valuesSubtitle: string;
  whyChooseTitle: string;
  whyChooseSubtitle: string;
  becomeSeller: string;
  becomeSellerDesc: string;
  registerAsSeller: string;
  getInTouch: string;
  getInTouchDesc: string;
  emailUs: string;
  forSellers: string;
  allRightsReserved: string;
  languageGuideTitle: string;
  languageGuideDesc: string;
  languageGuideSteps: string[];
  findUsTitle: string;
  findUsSubtitle: string;
  visitProfile: string;
  comingSoonOn: string;
  comingSoonBadge: string;
  testimonialsTitle: string;
  testimonialsSubtitle: string;
  availableIn: string;
  switchLanguage: string;
  verifiedSellers: string;
  happyCustomers: string;
  countries: string;
  customOrders: string;
  trustTitle: string;
  trustDesc: string;
  qualityTitle: string;
  qualityDesc: string;
  customerFirstTitle: string;
  customerFirstDesc: string;
  globalReachTitle: string;
  globalReachDesc: string;
  liveGoldPrices: string;
  liveGoldPricesDesc: string;
  verifiedSellersFeature: string;
  verifiedSellersFeatureDesc: string;
  customOrdersFeature: string;
  customOrdersFeatureDesc: string;
  secureShipping: string;
  secureShippingDesc: string;
  sellerBenefits: string[];
}

export const ABOUT_CONTENT: Record<AboutContentLanguage, AboutContent> = {
  en: {
    metaTitle: "About Orivraa | Trusted Jewellery Marketplace",
    metaDescription:
      "Learn about Orivraa — the premium jewellery marketplace connecting trusted artisans with buyers across Nepal, India, Dubai, USA & UK.",
    heroTitle: "About Orivraa",
    heroSubtitle:
      "Your trusted marketplace for authentic gold and silver jewelry. Connecting skilled artisans with jewelry lovers worldwide.",
    browseSellers: "Browse Sellers",
    createCustomOrder: "Create Custom Order",
    ourStoryTitle: "Our Story",
    storyP1:
      "Orivraa was born from a simple idea: make it easy for people to find and purchase authentic, high-quality gold and silver jewelry from trusted artisans around the world.",
    storyP2:
      "In many countries, buying gold jewelry involves visiting multiple shops, comparing prices manually, and often dealing with unclear pricing. We wanted to change that by creating a transparent marketplace where buyers can see real-time gold prices, compare sellers, and order custom jewelry with confidence.",
    storyP3:
      "Today, Orivraa connects thousands of customers with verified jewelers across Nepal, India, UAE, and beyond. Whether you're looking for a traditional wedding set or a modern custom design, we help you find the perfect piece at a fair price.",
    ourValuesTitle: "Our Values",
    valuesSubtitle: "The principles that guide everything we do",
    whyChooseTitle: "Why Choose Orivraa?",
    whyChooseSubtitle:
      "Features that make us the trusted choice for gold jewelry",
    becomeSeller: "Become a Seller",
    becomeSellerDesc:
      "Join our marketplace and reach thousands of customers looking for quality gold and silver jewelry. We handle the platform, you focus on your craft.",
    registerAsSeller: "Register as Seller",
    getInTouch: "Get in Touch",
    getInTouchDesc:
      "Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
    emailUs: "Email Us",
    forSellers: "For Sellers",
    allRightsReserved: "All rights reserved.",
    languageGuideTitle: "Available in Your Language",
    languageGuideDesc:
      "Orivraa is available in 12 languages. Here's how to switch to your preferred language:",
    languageGuideSteps: [
      "Click the language selector (globe icon) in the top navigation bar",
      "Choose your preferred language from the dropdown",
      "The entire interface will be translated instantly",
      "Your language preference is saved automatically for future visits",
    ],
    findUsTitle: "Find Us On",
    findUsSubtitle:
      "Orivraa is listed on leading platforms. Visit our profiles to learn more and leave a review.",
    visitProfile: "Visit Profile",
    comingSoonOn: "Coming soon on",
    comingSoonBadge: "Coming Soon",
    testimonialsTitle: "What Our Users Say",
    testimonialsSubtitle:
      "Real stories from jewellers and customers who use Orivraa",
    availableIn: "This page is also available in:",
    switchLanguage: "Switch Language",
    verifiedSellers: "Verified Sellers",
    happyCustomers: "Happy Customers",
    countries: "Countries",
    customOrders: "Custom Orders",
    trustTitle: "Trust & Transparency",
    trustDesc:
      "Every seller on our platform is verified. We ensure transparent pricing with real-time gold rates and no hidden fees.",
    qualityTitle: "Quality Craftsmanship",
    qualityDesc:
      "Our sellers are skilled artisans who create beautiful, high-quality jewelry using traditional and modern techniques.",
    customerFirstTitle: "Customer First",
    customerFirstDesc:
      "Your satisfaction is our priority. From custom designs to secure delivery, we ensure a seamless experience.",
    globalReachTitle: "Global Reach",
    globalReachDesc:
      "Connect with trusted jewelers from Nepal, India, UAE, and beyond. Find the perfect piece from anywhere in the world.",
    liveGoldPrices: "Live Gold Prices",
    liveGoldPricesDesc:
      "Real-time gold and silver rates from international markets, converted to local currencies.",
    verifiedSellersFeature: "Verified Sellers",
    verifiedSellersFeatureDesc:
      "All sellers undergo strict verification. Look for the blue badge for verified shops.",
    customOrdersFeature: "Custom Orders",
    customOrdersFeatureDesc:
      "Request custom jewelry designs and get quotes from multiple sellers.",
    secureShipping: "Secure Shipping",
    secureShippingDesc:
      "Insured shipping with tracking for all orders, whether local or international.",
    sellerBenefits: [
      "Reach customers worldwide",
      "Easy shop management tools",
      "Secure payment processing",
      "Real-time order notifications",
      "Analytics and insights",
    ],
  },
  fr: {
    metaTitle: "À propos d'Orivraa | Marketplace de Bijoux de Confiance",
    metaDescription:
      "Découvrez Orivraa — la marketplace premium de bijoux connectant des artisans de confiance avec des acheteurs au Népal, en Inde, à Dubaï, aux USA et au UK.",
    heroTitle: "À propos d'Orivraa",
    heroSubtitle:
      "Votre marketplace de confiance pour des bijoux en or et argent authentiques. Connectant des artisans qualifiés avec des amateurs de bijoux du monde entier.",
    browseSellers: "Parcourir les vendeurs",
    createCustomOrder: "Créer une commande personnalisée",
    ourStoryTitle: "Notre histoire",
    storyP1:
      "Orivraa est née d'une idée simple : faciliter la recherche et l'achat de bijoux authentiques et de haute qualité auprès d'artisans de confiance du monde entier.",
    storyP2:
      "Dans de nombreux pays, acheter des bijoux en or implique de visiter plusieurs boutiques, de comparer les prix manuellement et de faire face à des tarifications peu claires. Nous voulions changer cela en créant une marketplace transparente.",
    storyP3:
      "Aujourd'hui, Orivraa connecte des milliers de clients avec des bijoutiers vérifiés au Népal, en Inde, aux EAU et au-delà.",
    ourValuesTitle: "Nos valeurs",
    valuesSubtitle: "Les principes qui guident tout ce que nous faisons",
    whyChooseTitle: "Pourquoi choisir Orivraa ?",
    whyChooseSubtitle:
      "Les fonctionnalités qui font de nous le choix de confiance pour les bijoux en or",
    becomeSeller: "Devenir vendeur",
    becomeSellerDesc:
      "Rejoignez notre marketplace et atteignez des milliers de clients. Nous gérons la plateforme, vous vous concentrez sur votre art.",
    registerAsSeller: "S'inscrire en tant que vendeur",
    getInTouch: "Contactez-nous",
    getInTouchDesc:
      "Des questions ? Nous serions ravis de vous entendre. Envoyez-nous un message.",
    emailUs: "Envoyez-nous un email",
    forSellers: "Pour les vendeurs",
    allRightsReserved: "Tous droits réservés.",
    languageGuideTitle: "Disponible dans votre langue",
    languageGuideDesc:
      "Orivraa est disponible en 12 langues. Voici comment changer de langue :",
    languageGuideSteps: [
      "Cliquez sur le sélecteur de langue (icône globe) dans la barre de navigation",
      "Choisissez votre langue préférée dans le menu déroulant",
      "L'interface entière sera traduite instantanément",
      "Votre préférence de langue est sauvegardée automatiquement",
    ],
    findUsTitle: "Retrouvez-nous sur",
    findUsSubtitle:
      "Orivraa est référencé sur les principales plateformes. Visitez nos profils pour en savoir plus.",
    visitProfile: "Visiter le profil",
    comingSoonOn: "Bientôt sur",
    comingSoonBadge: "Bientôt",
    testimonialsTitle: "Ce que disent nos utilisateurs",
    testimonialsSubtitle:
      "Témoignages réels de bijoutiers et de clients utilisant Orivraa",
    availableIn: "Cette page est également disponible en :",
    switchLanguage: "Changer de langue",
    verifiedSellers: "Vendeurs vérifiés",
    happyCustomers: "Clients satisfaits",
    countries: "Pays",
    customOrders: "Commandes personnalisées",
    trustTitle: "Confiance & Transparence",
    trustDesc:
      "Chaque vendeur est vérifié. Prix transparents avec cours de l'or en temps réel et aucun frais caché.",
    qualityTitle: "Artisanat de qualité",
    qualityDesc:
      "Nos vendeurs sont des artisans qualifiés créant de beaux bijoux de haute qualité.",
    customerFirstTitle: "Client d'abord",
    customerFirstDesc:
      "Votre satisfaction est notre priorité. Des designs personnalisés à la livraison sécurisée.",
    globalReachTitle: "Portée mondiale",
    globalReachDesc:
      "Connectez-vous avec des bijoutiers de confiance du Népal, d'Inde, des EAU et d'ailleurs.",
    liveGoldPrices: "Prix de l'or en direct",
    liveGoldPricesDesc:
      "Cours de l'or et de l'argent en temps réel, convertis en devises locales.",
    verifiedSellersFeature: "Vendeurs vérifiés",
    verifiedSellersFeatureDesc:
      "Tous les vendeurs passent une vérification stricte. Cherchez le badge bleu.",
    customOrdersFeature: "Commandes personnalisées",
    customOrdersFeatureDesc:
      "Demandez des designs personnalisés et recevez des devis de plusieurs vendeurs.",
    secureShipping: "Livraison sécurisée",
    secureShippingDesc:
      "Expédition assurée avec suivi pour toutes les commandes.",
    sellerBenefits: [
      "Atteignez des clients dans le monde entier",
      "Outils de gestion de boutique faciles",
      "Traitement des paiements sécurisé",
      "Notifications de commande en temps réel",
      "Analyses et statistiques",
    ],
  },
  de: {
    metaTitle: "Über Orivraa | Vertrauenswürdiger Schmuck-Marktplatz",
    metaDescription:
      "Erfahren Sie mehr über Orivraa — den Premium-Schmuckmarktplatz, der vertrauenswürdige Kunsthandwerker mit Käufern in Nepal, Indien, Dubai, USA und UK verbindet.",
    heroTitle: "Über Orivraa",
    heroSubtitle:
      "Ihr vertrauenswürdiger Marktplatz für authentischen Gold- und Silberschmuck. Verbindet qualifizierte Kunsthandwerker mit Schmuckliebhabern weltweit.",
    browseSellers: "Verkäufer durchsuchen",
    createCustomOrder: "Individuelle Bestellung erstellen",
    ourStoryTitle: "Unsere Geschichte",
    storyP1:
      "Orivraa wurde aus einer einfachen Idee geboren: Es soll einfach sein, authentischen, hochwertigen Gold- und Silberschmuck von vertrauenswürdigen Kunsthandwerkern weltweit zu finden.",
    storyP2:
      "In vielen Ländern bedeutet der Kauf von Goldschmuck, mehrere Geschäfte zu besuchen und Preise manuell zu vergleichen. Wir wollten das ändern, indem wir einen transparenten Marktplatz schaffen.",
    storyP3:
      "Heute verbindet Orivraa Tausende von Kunden mit verifizierten Juwelieren in Nepal, Indien, den VAE und darüber hinaus.",
    ourValuesTitle: "Unsere Werte",
    valuesSubtitle: "Die Prinzipien, die alles leiten, was wir tun",
    whyChooseTitle: "Warum Orivraa wählen?",
    whyChooseSubtitle:
      "Funktionen, die uns zur vertrauenswürdigen Wahl für Goldschmuck machen",
    becomeSeller: "Verkäufer werden",
    becomeSellerDesc:
      "Treten Sie unserem Marktplatz bei und erreichen Sie Tausende von Kunden. Wir kümmern uns um die Plattform, Sie konzentrieren sich auf Ihr Handwerk.",
    registerAsSeller: "Als Verkäufer registrieren",
    getInTouch: "Kontaktieren Sie uns",
    getInTouchDesc:
      "Haben Sie Fragen? Wir freuen uns, von Ihnen zu hören. Senden Sie uns eine Nachricht.",
    emailUs: "E-Mail senden",
    forSellers: "Für Verkäufer",
    allRightsReserved: "Alle Rechte vorbehalten.",
    languageGuideTitle: "In Ihrer Sprache verfügbar",
    languageGuideDesc:
      "Orivraa ist in 12 Sprachen verfügbar. So wechseln Sie die Sprache:",
    languageGuideSteps: [
      "Klicken Sie auf den Sprachwahlschalter (Globus-Symbol) in der Navigationsleiste",
      "Wählen Sie Ihre bevorzugte Sprache aus dem Dropdown-Menü",
      "Die gesamte Oberfläche wird sofort übersetzt",
      "Ihre Spracheinstellung wird automatisch gespeichert",
    ],
    findUsTitle: "Finden Sie uns auf",
    findUsSubtitle:
      "Orivraa ist auf führenden Plattformen gelistet. Besuchen Sie unsere Profile, um mehr zu erfahren.",
    visitProfile: "Profil besuchen",
    comingSoonOn: "Demnächst auf",
    comingSoonBadge: "Demnächst",
    testimonialsTitle: "Was unsere Nutzer sagen",
    testimonialsSubtitle:
      "Echte Geschichten von Juwelieren und Kunden, die Orivraa nutzen",
    availableIn: "Diese Seite ist auch verfügbar in:",
    switchLanguage: "Sprache wechseln",
    verifiedSellers: "Verifizierte Verkäufer",
    happyCustomers: "Zufriedene Kunden",
    countries: "Länder",
    customOrders: "Individuelle Bestellungen",
    trustTitle: "Vertrauen & Transparenz",
    trustDesc:
      "Jeder Verkäufer ist verifiziert. Transparente Preise mit Echtzeit-Goldkursen und keine versteckten Gebühren.",
    qualityTitle: "Qualitätshandwerk",
    qualityDesc:
      "Unsere Verkäufer sind qualifizierte Kunsthandwerker, die schönen, hochwertigen Schmuck herstellen.",
    customerFirstTitle: "Kunde zuerst",
    customerFirstDesc:
      "Ihre Zufriedenheit ist unsere Priorität. Von individuellem Design bis zur sicheren Lieferung.",
    globalReachTitle: "Globale Reichweite",
    globalReachDesc:
      "Verbinden Sie sich mit vertrauenswürdigen Juwelieren aus Nepal, Indien, VAE und darüber hinaus.",
    liveGoldPrices: "Live-Goldpreise",
    liveGoldPricesDesc:
      "Echtzeit-Gold- und Silberkurse von internationalen Märkten, in lokale Währungen umgerechnet.",
    verifiedSellersFeature: "Verifizierte Verkäufer",
    verifiedSellersFeatureDesc:
      "Alle Verkäufer durchlaufen eine strenge Verifizierung. Achten Sie auf das blaue Abzeichen.",
    customOrdersFeature: "Individuelle Bestellungen",
    customOrdersFeatureDesc:
      "Fordern Sie individuelle Designs an und erhalten Sie Angebote von mehreren Verkäufern.",
    secureShipping: "Sicherer Versand",
    secureShippingDesc:
      "Versicherter Versand mit Sendungsverfolgung für alle Bestellungen.",
    sellerBenefits: [
      "Kunden weltweit erreichen",
      "Einfache Shop-Management-Tools",
      "Sichere Zahlungsabwicklung",
      "Echtzeit-Bestellbenachrichtigungen",
      "Analysen und Einblicke",
    ],
  },
  hi: {
    metaTitle: "Orivraa के बारे में | विश्वसनीय आभूषण मार्केटप्लेस",
    metaDescription:
      "Orivraa के बारे में जानें — नेपाल, भारत, दुबई, USA और UK में विश्वसनीय कारीगरों को खरीदारों से जोड़ने वाला प्रीमियम आभूषण मार्केटप्लेस।",
    heroTitle: "Orivraa के बारे में",
    heroSubtitle:
      "प्रामाणिक सोने और चांदी के आभूषणों के लिए आपका विश्वसनीय मार्केटप्लेस। कुशल कारीगरों को दुनिया भर के आभूषण प्रेमियों से जोड़ता है।",
    browseSellers: "विक्रेता देखें",
    createCustomOrder: "कस्टम ऑर्डर बनाएं",
    ourStoryTitle: "हमारी कहानी",
    storyP1:
      "Orivraa एक सरल विचार से पैदा हुआ: दुनिया भर के विश्वसनीय कारीगरों से प्रामाणिक, उच्च गुणवत्ता वाले सोने और चांदी के आभूषण खोजना और खरीदना आसान बनाना।",
    storyP2:
      "कई देशों में, सोने के आभूषण खरीदने के लिए कई दुकानों पर जाना, कीमतों की मैन्युअल तुलना करना और अक्सर अस्पष्ट मूल्य निर्धारण से निपटना पड़ता है। हम एक पारदर्शी मार्केटप्लेस बनाकर इसे बदलना चाहते थे।",
    storyP3:
      "आज, Orivraa नेपाल, भारत, UAE और उससे आगे के सत्यापित जौहरियों के साथ हजारों ग्राहकों को जोड़ता है।",
    ourValuesTitle: "हमारे मूल्य",
    valuesSubtitle: "वे सिद्धांत जो हमारे हर काम का मार्गदर्शन करते हैं",
    whyChooseTitle: "Orivraa क्यों चुनें?",
    whyChooseSubtitle:
      "विशेषताएं जो हमें सोने के आभूषणों के लिए विश्वसनीय विकल्प बनाती हैं",
    becomeSeller: "विक्रेता बनें",
    becomeSellerDesc:
      "हमारे मार्केटप्लेस से जुड़ें और हजारों ग्राहकों तक पहुंचें। हम प्लेटफॉर्म संभालते हैं, आप अपनी कला पर ध्यान दें।",
    registerAsSeller: "विक्रेता के रूप में पंजीकरण करें",
    getInTouch: "संपर्क करें",
    getInTouchDesc:
      "कोई सवाल? हम आपसे सुनना चाहेंगे। हमें एक संदेश भेजें।",
    emailUs: "ईमेल करें",
    forSellers: "विक्रेताओं के लिए",
    allRightsReserved: "सर्वाधिकार सुरक्षित।",
    languageGuideTitle: "आपकी भाषा में उपलब्ध",
    languageGuideDesc:
      "Orivraa 12 भाषाओं में उपलब्ध है। अपनी पसंदीदा भाषा में बदलने का तरीका:",
    languageGuideSteps: [
      "नेविगेशन बार में भाषा चयनकर्ता (ग्लोब आइकन) पर क्लिक करें",
      "ड्रॉपडाउन से अपनी पसंदीदा भाषा चुनें",
      "पूरा इंटरफेस तुरंत अनुवादित हो जाएगा",
      "आपकी भाषा वरीयता भविष्य की यात्राओं के लिए स्वचालित रूप से सहेजी जाती है",
    ],
    findUsTitle: "हमें यहां खोजें",
    findUsSubtitle:
      "Orivraa प्रमुख प्लेटफार्मों पर सूचीबद्ध है। अधिक जानने के लिए हमारे प्रोफाइल पर जाएं।",
    visitProfile: "प्रोफाइल देखें",
    comingSoonOn: "जल्द आ रहा है",
    comingSoonBadge: "जल्द आ रहा है",
    testimonialsTitle: "हमारे उपयोगकर्ता क्या कहते हैं",
    testimonialsSubtitle:
      "Orivraa का उपयोग करने वाले जौहरियों और ग्राहकों की वास्तविक कहानियां",
    availableIn: "यह पेज इन भाषाओं में भी उपलब्ध है:",
    switchLanguage: "भाषा बदलें",
    verifiedSellers: "सत्यापित विक्रेता",
    happyCustomers: "खुश ग्राहक",
    countries: "देश",
    customOrders: "कस्टम ऑर्डर",
    trustTitle: "विश्वास और पारदर्शिता",
    trustDesc:
      "हर विक्रेता सत्यापित है। रियल-टाइम सोने की दरों के साथ पारदर्शी मूल्य निर्धारण और कोई छिपी फीस नहीं।",
    qualityTitle: "गुणवत्तापूर्ण शिल्पकारी",
    qualityDesc:
      "हमारे विक्रेता कुशल कारीगर हैं जो पारंपरिक और आधुनिक तकनीकों का उपयोग करके सुंदर, उच्च गुणवत्ता के आभूषण बनाते हैं।",
    customerFirstTitle: "ग्राहक पहले",
    customerFirstDesc:
      "आपकी संतुष्टि हमारी प्राथमिकता है। कस्टम डिजाइन से लेकर सुरक्षित डिलीवरी तक।",
    globalReachTitle: "वैश्विक पहुंच",
    globalReachDesc:
      "नेपाल, भारत, UAE और उससे आगे के विश्वसनीय जौहरियों से जुड़ें।",
    liveGoldPrices: "लाइव सोने की कीमतें",
    liveGoldPricesDesc:
      "अंतरराष्ट्रीय बाजारों से रियल-टाइम सोने और चांदी की दरें, स्थानीय मुद्राओं में परिवर्तित।",
    verifiedSellersFeature: "सत्यापित विक्रेता",
    verifiedSellersFeatureDesc:
      "सभी विक्रेता कड़ी सत्यापन प्रक्रिया से गुजरते हैं। नीले बैज की तलाश करें।",
    customOrdersFeature: "कस्टम ऑर्डर",
    customOrdersFeatureDesc:
      "कस्टम डिजाइन का अनुरोध करें और कई विक्रेताओं से कोटेशन प्राप्त करें।",
    secureShipping: "सुरक्षित शिपिंग",
    secureShippingDesc:
      "सभी ऑर्डर के लिए ट्रैकिंग के साथ बीमित शिपिंग।",
    sellerBenefits: [
      "दुनिया भर के ग्राहकों तक पहुंचें",
      "आसान दुकान प्रबंधन उपकरण",
      "सुरक्षित भुगतान प्रसंस्करण",
      "रियल-टाइम ऑर्डर सूचनाएं",
      "एनालिटिक्स और इनसाइट्स",
    ],
  },
  es: {
    metaTitle: "Sobre Orivraa | Marketplace de Joyería de Confianza",
    metaDescription:
      "Conoce Orivraa — el marketplace premium de joyería que conecta artesanos de confianza con compradores en Nepal, India, Dubái, USA y UK.",
    heroTitle: "Sobre Orivraa",
    heroSubtitle:
      "Tu marketplace de confianza para joyería auténtica de oro y plata. Conectando artesanos cualificados con amantes de la joyería en todo el mundo.",
    browseSellers: "Explorar vendedores",
    createCustomOrder: "Crear pedido personalizado",
    ourStoryTitle: "Nuestra historia",
    storyP1:
      "Orivraa nació de una idea simple: facilitar la búsqueda y compra de joyería auténtica y de alta calidad de artesanos de confianza de todo el mundo.",
    storyP2:
      "En muchos países, comprar joyería de oro implica visitar múltiples tiendas y comparar precios manualmente. Queríamos cambiar eso creando un marketplace transparente.",
    storyP3:
      "Hoy, Orivraa conecta a miles de clientes con joyeros verificados en Nepal, India, EAU y más allá.",
    ourValuesTitle: "Nuestros valores",
    valuesSubtitle: "Los principios que guían todo lo que hacemos",
    whyChooseTitle: "¿Por qué elegir Orivraa?",
    whyChooseSubtitle:
      "Características que nos hacen la opción de confianza para joyería de oro",
    becomeSeller: "Convertirse en vendedor",
    becomeSellerDesc:
      "Únete a nuestro marketplace y llega a miles de clientes. Nosotros gestionamos la plataforma, tú te concentras en tu oficio.",
    registerAsSeller: "Registrarse como vendedor",
    getInTouch: "Contáctanos",
    getInTouchDesc:
      "¿Preguntas? Nos encantaría saber de ti. Envíanos un mensaje.",
    emailUs: "Envíanos un email",
    forSellers: "Para vendedores",
    allRightsReserved: "Todos los derechos reservados.",
    languageGuideTitle: "Disponible en tu idioma",
    languageGuideDesc:
      "Orivraa está disponible en 12 idiomas. Así es como cambiar de idioma:",
    languageGuideSteps: [
      "Haz clic en el selector de idioma (icono de globo) en la barra de navegación",
      "Elige tu idioma preferido del menú desplegable",
      "Toda la interfaz se traducirá instantáneamente",
      "Tu preferencia de idioma se guarda automáticamente",
    ],
    findUsTitle: "Encuéntranos en",
    findUsSubtitle:
      "Orivraa está listado en plataformas líderes. Visita nuestros perfiles para saber más.",
    visitProfile: "Visitar perfil",
    comingSoonOn: "Próximamente en",
    comingSoonBadge: "Próximamente",
    testimonialsTitle: "Lo que dicen nuestros usuarios",
    testimonialsSubtitle:
      "Historias reales de joyeros y clientes que usan Orivraa",
    availableIn: "Esta página también está disponible en:",
    switchLanguage: "Cambiar idioma",
    verifiedSellers: "Vendedores verificados",
    happyCustomers: "Clientes satisfechos",
    countries: "Países",
    customOrders: "Pedidos personalizados",
    trustTitle: "Confianza y Transparencia",
    trustDesc:
      "Cada vendedor está verificado. Precios transparentes con tasas de oro en tiempo real y sin tarifas ocultas.",
    qualityTitle: "Artesanía de calidad",
    qualityDesc:
      "Nuestros vendedores son artesanos cualificados que crean hermosas joyas de alta calidad.",
    customerFirstTitle: "Cliente primero",
    customerFirstDesc:
      "Tu satisfacción es nuestra prioridad. Desde diseños personalizados hasta entrega segura.",
    globalReachTitle: "Alcance global",
    globalReachDesc:
      "Conéctate con joyeros de confianza de Nepal, India, EAU y más allá.",
    liveGoldPrices: "Precios del oro en vivo",
    liveGoldPricesDesc:
      "Tasas de oro y plata en tiempo real de mercados internacionales, convertidas a monedas locales.",
    verifiedSellersFeature: "Vendedores verificados",
    verifiedSellersFeatureDesc:
      "Todos los vendedores pasan una verificación estricta. Busca la insignia azul.",
    customOrdersFeature: "Pedidos personalizados",
    customOrdersFeatureDesc:
      "Solicita diseños personalizados y recibe cotizaciones de múltiples vendedores.",
    secureShipping: "Envío seguro",
    secureShippingDesc:
      "Envío asegurado con seguimiento para todos los pedidos.",
    sellerBenefits: [
      "Llega a clientes en todo el mundo",
      "Herramientas fáciles de gestión de tienda",
      "Procesamiento seguro de pagos",
      "Notificaciones de pedidos en tiempo real",
      "Análisis y estadísticas",
    ],
  },
  ar: {
    metaTitle: "عن Orivraa | سوق المجوهرات الموثوق",
    metaDescription:
      "تعرف على Orivraa — سوق المجوهرات الفاخرة الذي يربط الحرفيين الموثوقين بالمشترين في نيبال والهند ودبي وأمريكا وبريطانيا.",
    heroTitle: "عن Orivraa",
    heroSubtitle:
      "سوقك الموثوق للمجوهرات الأصلية من الذهب والفضة. نربط الحرفيين المهرة بعشاق المجوهرات حول العالم.",
    browseSellers: "تصفح البائعين",
    createCustomOrder: "إنشاء طلب مخصص",
    ourStoryTitle: "قصتنا",
    storyP1:
      "وُلدت Orivraa من فكرة بسيطة: تسهيل العثور على المجوهرات الأصلية وشرائها من حرفيين موثوقين حول العالم.",
    storyP2:
      "في العديد من البلدان، يتطلب شراء المجوهرات الذهبية زيارة عدة متاجر ومقارنة الأسعار يدويًا. أردنا تغيير ذلك بإنشاء سوق شفاف.",
    storyP3:
      "اليوم، تربط Orivraa آلاف العملاء مع صائغين معتمدين في نيبال والهند والإمارات وما وراءها.",
    ourValuesTitle: "قيمنا",
    valuesSubtitle: "المبادئ التي توجه كل ما نقوم به",
    whyChooseTitle: "لماذا تختار Orivraa؟",
    whyChooseSubtitle:
      "الميزات التي تجعلنا الخيار الموثوق للمجوهرات الذهبية",
    becomeSeller: "كن بائعًا",
    becomeSellerDesc:
      "انضم إلى سوقنا وصل إلى آلاف العملاء. نحن ندير المنصة، وأنت تركز على حرفتك.",
    registerAsSeller: "التسجيل كبائع",
    getInTouch: "تواصل معنا",
    getInTouchDesc:
      "لديك أسئلة؟ نحب أن نسمع منك. أرسل لنا رسالة.",
    emailUs: "أرسل لنا بريدًا إلكترونيًا",
    forSellers: "للبائعين",
    allRightsReserved: "جميع الحقوق محفوظة.",
    languageGuideTitle: "متاح بلغتك",
    languageGuideDesc:
      "Orivraa متاح بـ 12 لغة. إليك كيفية تبديل اللغة:",
    languageGuideSteps: [
      "انقر على محدد اللغة (أيقونة الكرة الأرضية) في شريط التنقل",
      "اختر لغتك المفضلة من القائمة المنسدلة",
      "سيتم ترجمة الواجهة بالكامل فورًا",
      "يتم حفظ تفضيل لغتك تلقائيًا للزيارات المستقبلية",
    ],
    findUsTitle: "تجدنا على",
    findUsSubtitle:
      "Orivraa مُدرجة في المنصات الرائدة. قم بزيارة ملفاتنا لمعرفة المزيد.",
    visitProfile: "زيارة الملف",
    comingSoonOn: "قريبًا على",
    comingSoonBadge: "قريبًا",
    testimonialsTitle: "ماذا يقول مستخدمونا",
    testimonialsSubtitle:
      "قصص حقيقية من الصائغين والعملاء الذين يستخدمون Orivraa",
    availableIn: "هذه الصفحة متاحة أيضًا بـ:",
    switchLanguage: "تبديل اللغة",
    verifiedSellers: "بائعون معتمدون",
    happyCustomers: "عملاء سعداء",
    countries: "دول",
    customOrders: "طلبات مخصصة",
    trustTitle: "الثقة والشفافية",
    trustDesc:
      "كل بائع معتمد. تسعير شفاف مع أسعار الذهب في الوقت الحقيقي وبدون رسوم مخفية.",
    qualityTitle: "حرفية عالية الجودة",
    qualityDesc:
      "بائعونا حرفيون مهرة يصنعون مجوهرات جميلة وعالية الجودة باستخدام تقنيات تقليدية وحديثة.",
    customerFirstTitle: "العميل أولاً",
    customerFirstDesc:
      "رضاك هو أولويتنا. من التصاميم المخصصة إلى التوصيل الآمن.",
    globalReachTitle: "وصول عالمي",
    globalReachDesc:
      "تواصل مع صائغين موثوقين من نيبال والهند والإمارات وما وراءها.",
    liveGoldPrices: "أسعار الذهب المباشرة",
    liveGoldPricesDesc:
      "أسعار الذهب والفضة في الوقت الحقيقي من الأسواق الدولية، محوّلة إلى العملات المحلية.",
    verifiedSellersFeature: "بائعون معتمدون",
    verifiedSellersFeatureDesc:
      "جميع البائعين يخضعون لتحقق صارم. ابحث عن الشارة الزرقاء.",
    customOrdersFeature: "طلبات مخصصة",
    customOrdersFeatureDesc:
      "اطلب تصاميم مخصصة واحصل على عروض أسعار من عدة بائعين.",
    secureShipping: "شحن آمن",
    secureShippingDesc: "شحن مؤمّن مع تتبع لجميع الطلبات.",
    sellerBenefits: [
      "الوصول إلى عملاء حول العالم",
      "أدوات سهلة لإدارة المتجر",
      "معالجة دفع آمنة",
      "إشعارات طلبات في الوقت الحقيقي",
      "تحليلات ورؤى",
    ],
  },
  ne: {
    metaTitle: "Orivraa बारेमा | विश्वसनीय गहना बजार",
    metaDescription:
      "Orivraa बारेमा जान्नुहोस् — नेपाल, भारत, दुबई, USA र UK मा विश्वसनीय कारीगरहरूलाई खरीददारहरूसँग जोड्ने प्रिमियम गहना बजार।",
    heroTitle: "Orivraa बारेमा",
    heroSubtitle:
      "प्रामाणिक सुन र चाँदीका गहनाहरूको लागि तपाईंको विश्वसनीय बजार। कुशल कारीगरहरूलाई विश्वभरका गहना प्रेमीहरूसँग जोड्दै।",
    browseSellers: "बिक्रेताहरू हेर्नुहोस्",
    createCustomOrder: "कस्टम अर्डर बनाउनुहोस्",
    ourStoryTitle: "हाम्रो कथा",
    storyP1:
      "Orivraa एउटा सरल विचारबाट जन्मियो: विश्वभरका विश्वसनीय कारीगरहरूबाट प्रामाणिक, उच्च गुणस्तरका सुन र चाँदीका गहनाहरू खोज्न र किन्न सजिलो बनाउने।",
    storyP2:
      "धेरै देशहरूमा, सुनका गहनाहरू किन्नको लागि धेरै पसलहरूमा जानुपर्छ र मूल्यहरू म्यानुअल रूपमा तुलना गर्नुपर्छ। हामीले पारदर्शी बजार बनाएर यो परिवर्तन गर्न चाहन्थ्यौं।",
    storyP3:
      "आज, Orivraa ले नेपाल, भारत, UAE र अन्यत्रका प्रमाणित गहनाविदहरूसँग हजारौं ग्राहकहरूलाई जोड्दछ।",
    ourValuesTitle: "हाम्रा मूल्यहरू",
    valuesSubtitle: "हामीले गर्ने सबै कुरालाई मार्गदर्शन गर्ने सिद्धान्तहरू",
    whyChooseTitle: "Orivraa किन छान्ने?",
    whyChooseSubtitle:
      "सुनका गहनाहरूको लागि हामीलाई विश्वसनीय विकल्प बनाउने विशेषताहरू",
    becomeSeller: "बिक्रेता बन्नुहोस्",
    becomeSellerDesc:
      "हाम्रो बजारमा सामेल हुनुहोस् र हजारौं ग्राहकहरूसम्म पुग्नुहोस्। हामी प्लेटफर्म सम्हाल्छौं, तपाईं आफ्नो कलामा ध्यान दिनुहोस्।",
    registerAsSeller: "बिक्रेताको रूपमा दर्ता गर्नुहोस्",
    getInTouch: "सम्पर्कमा रहनुहोस्",
    getInTouchDesc:
      "कुनै प्रश्न? हामी तपाईंबाट सुन्न चाहन्छौं। हामीलाई सन्देश पठाउनुहोस्।",
    emailUs: "इमेल गर्नुहोस्",
    forSellers: "बिक्रेताहरूको लागि",
    allRightsReserved: "सर्वाधिकार सुरक्षित।",
    languageGuideTitle: "तपाईंको भाषामा उपलब्ध",
    languageGuideDesc:
      "Orivraa १२ भाषाहरूमा उपलब्ध छ। आफ्नो मनपर्ने भाषामा स्विच गर्ने तरिका:",
    languageGuideSteps: [
      "नेभिगेसन बारमा भाषा चयनकर्ता (ग्लोब आइकन) मा क्लिक गर्नुहोस्",
      "ड्रपडाउनबाट आफ्नो मनपर्ने भाषा छान्नुहोस्",
      "सम्पूर्ण इन्टरफेस तुरुन्तै अनुवाद हुनेछ",
      "तपाईंको भाषा प्राथमिकता भविष्यका भ्रमणहरूको लागि स्वचालित रूपमा सुरक्षित हुन्छ",
    ],
    findUsTitle: "हामीलाई यहाँ भेट्नुहोस्",
    findUsSubtitle:
      "Orivraa प्रमुख प्लेटफर्महरूमा सूचीबद्ध छ। थप जान्न हाम्रो प्रोफाइलमा जानुहोस्।",
    visitProfile: "प्रोफाइल हेर्नुहोस्",
    comingSoonOn: "चाँडै आउँदैछ",
    comingSoonBadge: "चाँडै आउँदैछ",
    testimonialsTitle: "हाम्रा प्रयोगकर्ताहरू के भन्छन्",
    testimonialsSubtitle:
      "Orivraa प्रयोग गर्ने गहनाविदहरू र ग्राहकहरूका वास्तविक कथाहरू",
    availableIn: "यो पेज यी भाषाहरूमा पनि उपलब्ध छ:",
    switchLanguage: "भाषा परिवर्तन गर्नुहोस्",
    verifiedSellers: "प्रमाणित बिक्रेताहरू",
    happyCustomers: "खुसी ग्राहकहरू",
    countries: "देशहरू",
    customOrders: "कस्टम अर्डरहरू",
    trustTitle: "विश्वास र पारदर्शिता",
    trustDesc:
      "प्रत्येक बिक्रेता प्रमाणित छ। रियल-टाइम सुनको दर र कुनै लुकेको शुल्क बिना पारदर्शी मूल्य निर्धारण।",
    qualityTitle: "गुणस्तरीय शिल्पकला",
    qualityDesc:
      "हाम्रा बिक्रेताहरू कुशल कारीगरहरू हुन् जसले परम्परागत र आधुनिक प्रविधिहरू प्रयोग गरेर सुन्दर, उच्च गुणस्तरका गहनाहरू बनाउँछन्।",
    customerFirstTitle: "ग्राहक पहिलो",
    customerFirstDesc:
      "तपाईंको सन्तुष्टि हाम्रो प्राथमिकता हो। कस्टम डिजाइनदेखि सुरक्षित डेलिभरीसम्म।",
    globalReachTitle: "विश्वव्यापी पहुँच",
    globalReachDesc:
      "नेपाल, भारत, UAE र अन्यत्रका विश्वसनीय गहनाविदहरूसँग जडान हुनुहोस्।",
    liveGoldPrices: "लाइभ सुनको मूल्य",
    liveGoldPricesDesc:
      "अन्तर्राष्ट्रिय बजारबाट रियल-टाइम सुन र चाँदीको दर, स्थानीय मुद्रामा रूपान्तरित।",
    verifiedSellersFeature: "प्रमाणित बिक्रेताहरू",
    verifiedSellersFeatureDesc:
      "सबै बिक्रेताहरू कडा प्रमाणीकरणबाट गुज्रिन्छन्। नीलो ब्याज खोज्नुहोस्।",
    customOrdersFeature: "कस्टम अर्डरहरू",
    customOrdersFeatureDesc:
      "कस्टम डिजाइनको अनुरोध गर्नुहोस् र धेरै बिक्रेताहरूबाट उद्धरण प्राप्त गर्नुहोस्।",
    secureShipping: "सुरक्षित शिपिङ",
    secureShippingDesc: "सबै अर्डरहरूको लागि ट्र्याकिङसहित बीमित शिपिङ।",
    sellerBenefits: [
      "विश्वभरका ग्राहकहरूसम्म पुग्नुहोस्",
      "सजिलो पसल व्यवस्थापन उपकरणहरू",
      "सुरक्षित भुक्तानी प्रशोधन",
      "रियल-टाइम अर्डर सूचनाहरू",
      "एनालिटिक्स र इनसाइट्स",
    ],
  },
};
