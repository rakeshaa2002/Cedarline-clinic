import type { DoctorSlug, EquipmentId, Faq } from './types'

/** RUA Skin & Hair Center: brand facts as published on its website and Instagram (@ruaskinandhair). */
export const BRAND = {
  name: 'RUA Skin & Hair Center',
  shortName: 'RUA',
  tagline: 'Restore. Unfold. Awaken.',
  positioning: '3 Expert Dermatologists · Doctor-Led',
  specialities: ['Dermatology', 'Cosmetology', 'Lasers', 'Hair Transplants'],
  promise:
    'RUA offers personalised, holistic treatment plans rooted in evidence-based, ethical practice — assuring visible results with uncompromised quality, hygiene and safety.',
  description:
    'Doctor-led dermatology, cosmetology, lasers and hair transplants by three MD (DVL) dermatologists at two centres in Bengaluru — Ramamurthy Nagar and Indiranagar.',
  siteUrl: 'https://www.ruaskinandhair.com',
  whatsapp: '917019976689',
  whatsappDisplay: '+91 70199 76689',
  hours: { days: 'Sunday – Saturday', open: '10:00', close: '20:00', label: '10:00 am – 8:00 pm', short: '10am – 8pm' },
  social: [
    { id: 'instagram', label: 'Instagram', handle: '@ruaskinandhair', url: 'https://www.instagram.com/ruaskinandhair/' },
    { id: 'youtube', label: 'YouTube', handle: '@RUASkinandhair', url: 'https://www.youtube.com/@RUASkinandhair' },
    { id: 'facebook', label: 'Facebook', handle: 'RUA Skin & Hair Center', url: 'https://www.facebook.com/profile.php?id=61581739901248' },
    { id: 'threads', label: 'Threads', handle: '@ruaskinandhair', url: 'https://www.threads.net/@ruaskinandhair' },
  ],
} as const

export const PROOF_POINTS = [
  { value: '3', label: 'MD (DVL) dermatologists', detail: 'Each with fellowship training' },
  { value: '2', label: 'Centres in Bengaluru', detail: 'Ramamurthy Nagar & Indiranagar' },
  { value: '7', label: 'Days a week', detail: 'Open 10am – 8pm, every day' },
  { value: '5', label: 'Published papers', detail: 'Peer-reviewed dermatology research' },
] as const

/** RUA's own "Why choose us" points. */
export const WHY_RUA = [
  {
    icon: 'sparkles',
    title: 'Expert skincare',
    text: 'RUA makes expert skincare both effective and accessible — every plan is personalised by a dermatologist.',
  },
  {
    icon: 'wallet',
    title: 'Flexible payment',
    text: 'Flexible payment options and EMI plans for treatment packages.',
  },
  {
    icon: 'award',
    title: 'Fellowship-trained doctors',
    text: 'Three MBBS, MD (DVL) dermatologists with fellowships in hair transplantation, dermatosurgery, lasers & aesthetics, and functional medicine.',
  },
  {
    icon: 'shield',
    title: 'Safe environment',
    text: 'We maintain a safe and sterile environment for all our treatments, with uncompromised quality and hygiene.',
  },
] as const

export const PHILOSOPHY = {
  heading: 'Uncompromised quality, hygiene and safety.',
  lead: 'We believe in results, yes — but more importantly, we believe in journeys, and in walking alongside our patients with clarity, warmth, and care.',
  paragraphs: [
    'At RUA, we don’t see care as a procedure or a transaction. We see it as a relationship. Every person who walks through our doors has a story, and it is our responsibility to listen carefully and treat with empathy.',
    'We also believe in mentorship and guidance — helping patients understand their conditions, their options, and the reasoning behind every treatment. Knowledge builds trust, and trust is the foundation of meaningful care. Our role is not only to treat, but also to teach and guide, so that every patient feels confident in their own journey.',
    'The treatments we offer are rooted in evidence and precision, but always guided by compassion and respect for the individual.',
  ],
}

export const STORY = {
  eyebrow: 'How it started',
  heading: 'Where expertise meets empathy',
  paragraphs: [
    'RUA began as a simple conversation between three colleagues who shared a dream: to create a space where people could feel genuinely cared for and understood. Each member of the team came with different strengths and passions within dermatology, but together we discovered something complete.',
    'Individually, we were from three different paths. But when we came together, those paths formed a circle of care — complete, balanced, and deeply personal. That coming together became RUA. A name that carries with it our vision, our dreams, and our belief that true care is both scientific and human.',
  ],
}

export const LOOKING_AHEAD = {
  heading: 'RUA is still writing its story.',
  paragraphs: [
    'What began as a shared dream has grown into a living philosophy — one that continues to evolve with innovation, with experience, and with the people who place their trust in us.',
    'For us, dermatology is not only about skin and hair. It is about confidence, well-being, and the quiet strength that comes from feeling at home in your own skin.',
    'This is RUA. A place shaped by vision, guided by empathy, and built on the belief that every journey deserves care that is thoughtful, honest, and complete.',
  ],
}

/** "Specialised machines used at RUA". */
export const EQUIPMENT: { id: EquipmentId; name: string; image: string; use: string; treatments: string[] }[] = [
  {
    id: 'q-switched-diode',
    name: 'Q-switched Nd:YAG & Diode Laser',
    image: '/images/rua/equipment/q-switched-nd-yag-diode-laser.webp',
    use: 'Triple-wavelength laser hair reduction, tattoo and pigment removal, and laser toning.',
    treatments: ['laser-hair-reduction', 'tattoo-removal', 'pigmentation-melasma-treatment'],
  },
  {
    id: 'hydrafacial',
    name: 'HydraFacial',
    image: '/images/rua/equipment/hydrafacial.webp',
    use: 'Cleansing, exfoliation, extraction and deep hydration in one medi-facial.',
    treatments: ['hydrafacial'],
  },
  {
    id: 'co2-laser',
    name: 'CO₂ Laser',
    image: '/images/rua/equipment/co2-laser.webp',
    use: 'Fractional resurfacing for acne scars and texture; precise removal of skin growths.',
    treatments: ['co2-laser-resurfacing', 'acne-scar-treatment', 'wart-skin-tag-removal'],
  },
  {
    id: 'mnrf',
    name: 'Microneedling Radiofrequency Device',
    image: '/images/rua/equipment/microneedling-radiofrequency.webp',
    use: 'Collagen induction for acne scars, open pores, fine lines and skin tightening.',
    treatments: ['mnrf-microneedling', 'acne-scar-treatment'],
  },
  {
    id: 'rf-plasma-pen',
    name: 'Radiofrequency / Plasma Pen',
    image: '/images/rua/equipment/radiofrequency-plasma-pen.webp',
    use: 'Precise removal of warts, skin tags, DPNs and moles with minimal marks.',
    treatments: ['wart-skin-tag-removal'],
  },
  {
    id: 'cryo',
    name: 'Cryo Device',
    image: '/images/rua/equipment/cryo-device.webp',
    use: 'Cryotherapy — controlled freezing for warts and selected benign growths.',
    treatments: ['wart-skin-tag-removal'],
  },
  {
    id: 'derma-pen',
    name: 'Derma Pen',
    image: '/images/rua/equipment/derma-pen.webp',
    use: 'Microneedling for scars and texture, and scalp microneedling for hair growth.',
    treatments: ['mnrf-microneedling', 'hair-loss-treatment'],
  },
  {
    id: 'lllt',
    name: 'Red & Blue Light Devices (LLLT)',
    image: '/images/rua/equipment/red-blue-light-lllt.webp',
    use: 'Low-level light therapy for acne-prone skin and to support hair growth.',
    treatments: ['acne-scar-treatment', 'hair-loss-treatment'],
  },
]

/** Papers authored by RUA's dermatologists (RUA website → Research papers). */
export const RESEARCH: { title: string; journal: string; year?: number; url: string; doi?: string; doctors?: DoctorSlug[] }[] = [
  {
    title: 'Scar wars: Pinhole ablation with super-pulse carbon dioxide for papular scars',
    journal: 'Journal of Cutaneous and Aesthetic Surgery',
    year: 2026,
    url: 'https://jcasonline.com/scar-wars-pinhole-ablation-with-super-pulse-carbon-dioxide-for-papular-scars/',
    doi: '10.25259/JCAS_121_2025',
    doctors: ['dr-eshritha-c', 'dr-jatin-k-reddy'],
  },
  {
    title: 'Generalised granuloma annulare in a child with Alagille syndrome with a novel mutation',
    journal: 'Indian Journal of Dermatology, Venereology and Leprology',
    year: 2025,
    url: 'https://ijdvl.com/generalised-granuloma-annulare-in-a-child-with-alagille-syndrome-with-a-novel-mutation/',
    doi: '10.25259/IJDVL_546_2025',
    doctors: ['dr-jatin-k-reddy'],
  },
  {
    title: 'Dermoscopic Distinction of Tinea Incognito on the Face and Topical Steroid Damaged Face: A Cross-Sectional Study in Skin of Color',
    journal: 'Indian Dermatology Online Journal',
    year: 2024,
    url: 'https://pubmed.ncbi.nlm.nih.gov/39640475/',
    doi: '10.4103/idoj.idoj_57_24',
  },
  {
    title: 'Dermoscopy of Familial Gigantic Melanocytosis: A Report of Rare Entity',
    journal: 'Indian Journal of Dermatology',
    year: 2024,
    url: 'https://pubmed.ncbi.nlm.nih.gov/39296699/',
    doi: '10.4103/ijd.ijd_313_23',
  },
  {
    title: 'Research article in the Indian Journal of Leprology',
    journal: 'Indian Journal of Leprology',
    url: 'https://www.ijl.org.in/article-detail/96/516',
  },
]

/** Patient testimonials published on RUA's website. */
export const TESTIMONIALS: { quote: string; context: string; doctor: DoctorSlug }[] = [
  {
    quote:
      'I cannot thank Dr. Jatin enough for the outstanding care and expertise. Not only did Dr. Jatin quickly identify & treat my skin concerns, but they also took the time to explain everything in detail, making me feel completely at ease. What impressed me most was the personalized attention, patience, and genuine concern for my well-being. The results have been amazing, and I feel more confident than ever.',
    context: 'Skin treatment with Dr. Jatin K Reddy',
    doctor: 'dr-jatin-k-reddy',
  },
  {
    quote:
      'I had vitiligo surgery done by Dr. Eshritha and I’m really happy with the results. She explained everything clearly, made me feel comfortable, & the procedure went smoothly. The treated areas are healing well & already showing great improvement. Highly recommend her for anyone considering vitiligo treatment — she’s kind, skilled, & genuinely cares.',
    context: 'Vitiligo surgery with Dr. Eshritha C',
    doctor: 'dr-eshritha-c',
  },
  {
    quote:
      'I had contacted Dr Eshritha from RUA Skin & Hair Center, for my mother who was struggling with a stubborn skin infection that others couldn’t help me with. The doctor was so patient and explained everything in detail. The results have been amazing — I finally have a go-to place & doctor for all of my mother’s skin concerns.',
    context: 'Skin infection care with Dr. Eshritha C',
    doctor: 'dr-eshritha-c',
  },
]

/** Themes from RUA's Instagram — doctor-led education ("Skin & Hair Unfiltered"). */
export const INSTAGRAM_POSTS = [
  { kicker: 'Meet the dream team', title: 'Dr. Jatin · Dr. Eshritha · Dr. Jeevith', tone: 'cocoa' },
  { kicker: 'A dermatologist explains the PDRN trend', title: 'Salmon DNA on your face?', tone: 'greige' },
  { kicker: 'Now open', title: 'RUA Indiranagar is here', tone: 'cream' },
  { kicker: 'Skincare, decoded', title: 'Copying a Korean routine? Check if it suits you.', tone: 'greige' },
  { kicker: 'Straight to the follicle', title: 'Going deeper than a serum', tone: 'cocoa' },
  { kicker: 'Skin & hair', title: 'Stone, paper, scissors. Choose wisely.', tone: 'greige' },
] as const

export const INSTAGRAM_HIGHLIGHTS = ['Procedures', 'HydraFacial', 'Microneedling', 'Skin Boosters', 'Testimonials'] as const

/** "What would you like help with?" — patient language mapped to treatment pages. */
export const CONCERNS: { label: string; treatment: string; icon: string }[] = [
  { label: 'Hair fall & thinning', treatment: 'hair-loss-treatment', icon: 'sprout' },
  { label: 'Acne & acne scars', treatment: 'acne-scar-treatment', icon: 'droplets' },
  { label: 'Pigmentation & melasma', treatment: 'pigmentation-melasma-treatment', icon: 'sun' },
  { label: 'Unwanted hair', treatment: 'laser-hair-reduction', icon: 'zap' },
  { label: 'Baldness & hair transplant', treatment: 'fue-hair-transplant', icon: 'crown' },
  { label: 'Dull, tired skin', treatment: 'hydrafacial', icon: 'sparkles' },
  { label: 'Fine lines & ageing', treatment: 'skin-boosters', icon: 'flower' },
  { label: 'Warts, moles & skin tags', treatment: 'wart-skin-tag-removal', icon: 'scissors' },
  { label: 'Psoriasis & eczema', treatment: 'psoriasis-eczema-treatment', icon: 'stethoscope' },
  { label: 'Vitiligo', treatment: 'vitiligo-surgery', icon: 'hand' },
  { label: 'Tattoo removal', treatment: 'tattoo-removal', icon: 'wand' },
  { label: 'My child’s skin', treatment: 'paediatric-dermatology', icon: 'baby' },
]

export const GENERAL_FAQS: Faq[] = [
  {
    q: 'Do I need a consultation before a treatment?',
    a: 'Yes. Every treatment at RUA starts with a consultation with one of our dermatologists, so your plan is right for your skin, hair and health.',
  },
  {
    q: 'Which centre should I visit?',
    a: 'Both centres — Ramamurthy Nagar and Indiranagar — are open every day from 10am to 8pm. Choose the one that is easier for you; our team will confirm your doctor’s availability.',
  },
  {
    q: 'Do you offer EMI or payment plans?',
    a: 'Yes. RUA offers flexible payment options and EMI plans for treatment packages. Ask our front desk for the current options.',
  },
  {
    q: 'Are your doctors qualified dermatologists?',
    a: 'Yes. All three doctors are MBBS, MD (DVL) dermatologists with fellowship training — in hair transplantation; dermatosurgery, lasers & aesthetic dermatology; and functional & longevity medicine.',
  },
]
