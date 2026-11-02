import type { Category, CategorySlug } from './types'

/**
 * RUA's service categories and full service lists (ruaskinandhair.com/services). Lists keep RUA's
 * wording; items that were split across bullets on the old site ("Ear" / "Nose & Body Piercings")
 * are merged, and items with their own treatment page link to it.
 */
export const CATEGORIES: Category[] = [
  {
    slug: 'medical-dermatology',
    name: 'Medical Dermatology',
    navName: 'Medical Dermatology',
    icon: 'stethoscope',
    tagline:
      'Comprehensive diagnosis and management for a wide spectrum of skin, hair, and nail disorders with evidence-based care.',
    intro:
      'From acne and pigmentation to psoriasis, infections and autoimmune skin disease, our dermatologists diagnose precisely — using dermoscopy where it helps — and treat the cause, not just the symptoms. Care for babies, children and teenagers is a special interest of the team.',
    image: '/images/rua/services/medical-dermatology.webp',
    imageAlt: 'Dermatologist examining skin with a dermatoscope',
    items: [
      { name: 'Acne and Acne Scar Treatments', treatment: 'acne-scar-treatment' },
      { name: 'Pigmentation and Melasma Correction', treatment: 'pigmentation-melasma-treatment' },
      { name: 'Eczema, Psoriasis and Allergy Management', treatment: 'psoriasis-eczema-treatment' },
      { name: 'Rosacea and Sensitive Skin Care' },
      { name: 'Fungal, Viral and Bacterial Infection Treatment' },
      { name: 'Pediatric Dermatology', treatment: 'paediatric-dermatology' },
      { name: 'Nail and Hair Disorder Evaluation' },
      { name: 'Autoimmune and Chronic Skin Disease Management' },
      { name: 'Diagnostic Skin Biopsies' },
      { name: 'Sexually Transmitted Diseases and Other Sexual Problems' },
      { name: 'Skin Cancers' },
      { name: 'Leprosy' },
    ],
    doctors: ['dr-jeevith-c-reddy', 'dr-eshritha-c', 'dr-jatin-k-reddy'],
    equipment: ['lllt', 'q-switched-diode'],
    faqs: [
      {
        q: 'When should I see a dermatologist?',
        a: 'For any skin, hair or nail problem that lasts more than a couple of weeks, keeps coming back or worries you — rashes, acne, pigmentation, infections, hair fall or changing moles. A dermatologist can diagnose precisely and treat the cause.',
      },
      {
        q: 'Do you treat children?',
        a: 'Yes. Paediatric dermatology is a special interest of Dr. Eshritha C, and we see babies, children and teenagers for eczema, infections, birthmarks, warts, acne and more.',
      },
      {
        q: 'Are consultations for sexual health and STDs confidential?',
        a: 'Yes. Consultations for sexually transmitted diseases and other sexual problems are private and handled with complete confidentiality.',
      },
    ],
    seo: {
      title: 'Dermatologist in Bangalore – Medical Dermatology | RUA',
      description:
        'Medical dermatology in Bengaluru for acne, pigmentation, psoriasis, eczema, infections, hair & nail disorders and skin cancer checks — by MD dermatologists at RUA.',
      h1: 'Medical Dermatology in Bangalore',
    },
  },
  {
    slug: 'dermatosurgery',
    name: 'Dermatosurgery',
    navName: 'Dermatosurgery',
    icon: 'scissors',
    tagline:
      'Performed with utmost safety and aesthetics in mind, our minor skin surgeries combine precision with cosmetic finesse.',
    intro:
      'Minor skin surgeries are done in a sterile procedure room under local anaesthesia, usually in a single short visit. Our dermatosurgeons plan every procedure to keep marks as small as possible — with scarless techniques wherever they suit.',
    image: '/images/rua/services/dermatosurgery.webp',
    imageAlt: 'Dermatosurgeon performing a precise minor skin procedure',
    items: [
      { name: 'Mole removal or transplant', treatment: 'wart-skin-tag-removal' },
      { name: 'Wart and skin tag removal', treatment: 'wart-skin-tag-removal' },
      { name: 'Circumcision' },
      { name: 'Ear lobe repair' },
      { name: 'Nose piercing repair' },
      { name: 'Ear, Nose & Body Piercings' },
      { name: 'Cyst and lipoma excision' },
      { name: 'Scar revision procedures', treatment: 'co2-laser-resurfacing' },
      { name: 'Nail surgeries (ingrown nail, nail bed repair)' },
      { name: 'Vitiligo surgeries', treatment: 'vitiligo-surgery' },
      { name: 'Punch grafting for vitiligo', treatment: 'vitiligo-surgery' },
      { name: 'Electrocautery and radiofrequency procedures', treatment: 'wart-skin-tag-removal' },
      { name: 'Diagnostic and therapeutic biopsies' },
      { name: 'Scarless surgeries' },
    ],
    doctors: ['dr-jatin-k-reddy', 'dr-eshritha-c'],
    equipment: ['rf-plasma-pen', 'cryo', 'co2-laser'],
    faqs: [
      {
        q: 'Are dermatosurgery procedures painful?',
        a: 'Procedures are done under local anaesthesia or numbing cream, so most people feel only the initial numbing. Any soreness afterwards is usually mild.',
      },
      {
        q: 'Will there be a scar?',
        a: 'Procedures are planned to minimise marks, and many leave little or no visible scar once healed. Your dermatosurgeon will explain what to expect for your specific procedure.',
      },
      {
        q: 'How long do the procedures take?',
        a: 'Most minor procedures take between 10 and 45 minutes, and you go home the same day with simple aftercare instructions.',
      },
    ],
    seo: {
      title: 'Dermatosurgery in Bangalore – Mole, Wart & Cyst Removal | RUA',
      description:
        'Minor skin surgery in Bengaluru: mole, wart and skin tag removal, cyst and lipoma excision, earlobe repair, nail surgery, scar revision and vitiligo surgery at RUA.',
      h1: 'Dermatosurgery in Bangalore',
    },
  },
  {
    slug: 'aesthetic-dermatology',
    name: 'Advanced Cosmetic Dermatology',
    navName: 'Cosmetic Dermatology',
    icon: 'sparkles',
    tagline:
      'Cutting-edge aesthetic treatments to rejuvenate, refine, and enhance while preserving natural-looking results.',
    intro:
      'Aesthetic treatments at RUA are planned by dermatologists, not beauticians — from HydraFacial and peels to skin boosters, Botox and fillers. The goal is always natural: skin that looks healthier and more rested, still unmistakably you.',
    image: '/images/rua/equipment/microneedling-radiofrequency.webp',
    imageAlt: 'Microneedling radiofrequency treatment on the forehead',
    items: [
      { name: 'Laser hair reduction (Triple wavelength)', treatment: 'laser-hair-reduction' },
      { name: 'Pigment and tattoo removal lasers', treatment: 'tattoo-removal' },
      { name: 'Exosome and PRP skin rejuvenation', treatment: 'skin-boosters' },
      { name: 'NCTF', treatment: 'skin-boosters' },
      { name: 'PDRN treatments', treatment: 'skin-boosters' },
      { name: 'Medifacials and chemical peels', treatment: 'chemical-peel' },
      { name: 'Microneedling RF and collagen induction therapy', treatment: 'mnrf-microneedling' },
      { name: 'Botox and dermal fillers', treatment: 'botox-fillers' },
      { name: 'Thread lift for contouring and lift', treatment: 'botox-fillers' },
      { name: 'Skin boosters for hydration and glow', treatment: 'skin-boosters' },
      { name: 'Carbon and Hollywood laser peel' },
      { name: 'Laser resurfacing for scars and texture', treatment: 'co2-laser-resurfacing' },
      { name: 'HIFU' },
      { name: 'Laser toning', treatment: 'pigmentation-melasma-treatment' },
      { name: 'Lip, Nipple & Vaginal Micropigmentation' },
      { name: 'Ombre brows' },
      { name: 'Microblading' },
    ],
    doctors: ['dr-eshritha-c', 'dr-jatin-k-reddy'],
    equipment: ['hydrafacial', 'mnrf', 'derma-pen', 'q-switched-diode'],
    faqs: [
      {
        q: 'Who performs cosmetic treatments at RUA?',
        a: 'Every cosmetic treatment is planned and supervised by our MD dermatologists, who choose the right treatment, product and strength for your skin.',
      },
      {
        q: 'Will my results look natural?',
        a: 'That is our priority. We prefer conservative, well-planned treatments that refresh and refine rather than change how you look.',
      },
      {
        q: 'Is there downtime?',
        a: 'Many treatments — like HydraFacial or skin boosters — have little or no downtime. We tell you exactly what to expect before every treatment.',
      },
    ],
    seo: {
      title: 'Cosmetic Dermatology in Bangalore – HydraFacial, Botox | RUA',
      description:
        'Advanced cosmetic dermatology in Bengaluru: HydraFacial, chemical peels, MNRF, skin boosters, PDRN, NCTF, Botox, fillers and thread lifts — by RUA’s dermatologists.',
      h1: 'Advanced Cosmetic Dermatology in Bangalore',
    },
  },
  {
    slug: 'laser-treatments',
    name: 'Laser Treatments',
    navName: 'Laser Treatments',
    icon: 'zap',
    tagline:
      'Medical-grade lasers for unwanted hair, pigmentation, tattoos, scars and skin texture — chosen and operated by dermatologists.',
    intro:
      'RUA uses a triple-wavelength diode laser for hair reduction, a Q-switched Nd:YAG laser for pigment, tattoos and laser toning, a fractional CO₂ laser for scars and texture, and red & blue light (LLLT). Settings are tailored to Indian skin by our doctors.',
    image: '/images/rua/equipment/q-switched-nd-yag-diode-laser.webp',
    imageAlt: 'Laser treatment being performed on the face',
    items: [
      { name: 'Laser hair reduction (Triple wavelength)', treatment: 'laser-hair-reduction' },
      { name: 'Lifetime laser hair reduction packages', treatment: 'laser-hair-reduction' },
      { name: 'Pigment and tattoo removal lasers', treatment: 'tattoo-removal' },
      { name: 'Laser toning', treatment: 'pigmentation-melasma-treatment' },
      { name: 'Laser resurfacing for scars and texture', treatment: 'co2-laser-resurfacing' },
      { name: 'Laser for acne and acne scars', treatment: 'acne-scar-treatment' },
      { name: 'Laser for pigmentation and melasma', treatment: 'pigmentation-melasma-treatment' },
      { name: 'Carbon and Hollywood laser peel' },
      { name: 'Low-level laser therapy (LLLT) for hair', treatment: 'hair-loss-treatment' },
    ],
    doctors: ['dr-eshritha-c', 'dr-jatin-k-reddy'],
    equipment: ['q-switched-diode', 'co2-laser', 'lllt'],
    faqs: [
      {
        q: 'Are lasers safe for Indian skin?',
        a: 'Yes, when the right laser and settings are used. Our dermatologists choose wavelengths and energies for your skin type and prepare the skin where needed to reduce the risk of pigmentation.',
      },
      {
        q: 'Which lasers does RUA use?',
        a: 'A triple-wavelength diode laser, a Q-switched Nd:YAG laser, a fractional CO₂ laser, and red & blue light (LLLT) devices.',
      },
      {
        q: 'How many laser sessions will I need?',
        a: 'It depends on the treatment — for example, laser hair reduction usually needs 6–8 sessions and scar resurfacing 2–4. Your dermatologist will give you a plan at consultation.',
      },
    ],
    seo: {
      title: 'Laser Treatments in Bangalore – Hair, Pigment & Scars | RUA',
      description:
        'Dermatologist-led laser treatments in Bengaluru: triple-wavelength laser hair reduction, tattoo and pigment removal, laser toning and CO₂ resurfacing for scars at RUA.',
      h1: 'Laser Treatments in Bangalore',
    },
  },
  {
    slug: 'hair-treatments',
    name: 'Hair Treatments',
    navName: 'Hair Treatments',
    icon: 'sprout',
    tagline: 'Advanced therapeutic solutions for hair loss, scalp health, and long-term maintenance.',
    intro:
      'Hair fall has many causes — genetics, hormones, nutrition, stress or scalp disease. We diagnose first, then combine medical treatment with regenerative therapies such as PRP, GFC and exosomes, scalp mesotherapy, QR678 and low-level laser therapy.',
    image: '/images/rua/equipment/derma-pen.webp',
    imageAlt: 'Microneedling treatment with a derma pen',
    items: [
      { name: 'PRP / GFC / Exosome therapy for hair growth', treatment: 'prp-hair-treatment' },
      { name: 'Scalp mesotherapy and microneedling', treatment: 'hair-loss-treatment' },
      { name: 'QR-678', treatment: 'hair-loss-treatment' },
      { name: 'Low-level laser therapy (LLLT)', treatment: 'hair-loss-treatment' },
      { name: 'Medical management of male and female hair loss', treatment: 'hair-loss-treatment' },
      { name: 'Dandruff and scalp treatments', treatment: 'hair-loss-treatment' },
      { name: 'Hair strengthening and maintenance programs', treatment: 'gfc-hair-treatment' },
      { name: 'Post-transplant care and rejuvenation', treatment: 'fue-hair-transplant' },
      { name: 'Scalp Micropigmentation', treatment: 'scalp-micropigmentation' },
    ],
    doctors: ['dr-jatin-k-reddy', 'dr-jeevith-c-reddy'],
    equipment: ['derma-pen', 'lllt'],
    faqs: [
      {
        q: 'What causes hair fall?',
        a: 'Common causes include genetic pattern hair loss, hormonal changes (including PCOS and after childbirth), low iron or vitamin levels, thyroid problems, stress, crash dieting and scalp conditions. Finding the cause is the first step.',
      },
      {
        q: 'How long do hair treatments take to work?',
        a: 'Hair grows slowly, so most treatments take three to six months to show a visible change. Starting early gives the best results.',
      },
      {
        q: 'Do you treat women’s hair loss?',
        a: 'Yes. Female hair loss often has hormonal or nutritional causes, so we tailor the work-up and treatment plan for women.',
      },
    ],
    seo: {
      title: 'Hair Loss Treatment in Bangalore – PRP, GFC & More | RUA',
      description:
        'Dermatologist-led hair fall and hair loss treatment in Bengaluru: diagnosis, PRP, GFC, exosomes, QR678, mesotherapy, LLLT and scalp micropigmentation at RUA.',
      h1: 'Hair Loss & Hair Treatments in Bangalore',
    },
  },
  {
    slug: 'hair-transplant',
    name: 'Hair Transplant',
    navName: 'Hair Transplant',
    icon: 'crown',
    tagline:
      'At RUA, our hair restoration techniques are designed for natural, long-lasting results with minimal downtime.',
    intro:
      'Hair transplants at RUA are planned and performed by Dr. Jatin K Reddy, a consultant dermatologist and hair transplant surgeon with a fellowship in hair transplantation, in a dedicated procedure theatre. Every hairline is designed to suit your face, age and future hair loss.',
    image: '/images/rua/services/hair-transplant.webp',
    imageAlt: 'Hair transplant procedure in progress',
    items: [
      { name: 'FUE (Follicular Unit Extraction)', treatment: 'fue-hair-transplant' },
      { name: 'DHI (Direct Hair Implantation)', treatment: 'dhi-hair-transplant' },
      { name: 'Sapphire Bio FUE', treatment: 'fue-hair-transplant' },
      { name: 'Bio-Enhanced Hair Transplant', treatment: 'fue-hair-transplant' },
      { name: 'Beard and Moustache Transplant', treatment: 'beard-eyebrow-transplant' },
      { name: 'Eyebrow Transplant', treatment: 'beard-eyebrow-transplant' },
      { name: 'Revision / Corrective Transplant', treatment: 'dhi-hair-transplant' },
      { name: 'Female Hairline & Crown Restoration', treatment: 'fue-hair-transplant' },
    ],
    doctors: ['dr-jatin-k-reddy'],
    equipment: [],
    faqs: [
      {
        q: 'Who performs the hair transplant?',
        a: 'Dr. Jatin K Reddy — MBBS, MD (DVL), consultant dermatologist and hair transplant surgeon with a fellowship in hair transplantation.',
      },
      {
        q: 'Which technique is right for me?',
        a: 'It depends on the area to be covered, the density you want and your donor hair. FUE (including Sapphire Bio FUE) covers larger areas efficiently; DHI gives fine control for hairlines and dense packing. We recommend the best fit after a scalp assessment.',
      },
      {
        q: 'How long is the recovery?',
        a: 'Most people return to desk work in 3–5 days. Small crusts clear in about 10 days, new growth begins around month 3–4, and the final result shows at 9–12 months.',
      },
    ],
    seo: {
      title: 'Hair Transplant in Bangalore – FUE, DHI & Sapphire FUE | RUA',
      description:
        'Hair transplant in Bengaluru by a fellowship-trained dermatologist surgeon: FUE, Sapphire Bio FUE, DHI, beard and eyebrow transplants. Natural hairlines, EMI options.',
      h1: 'Hair Transplant in Bangalore',
    },
  },
  {
    slug: 'premium-packages',
    name: 'Premium Aesthetic Packages',
    navName: 'Premium Packages',
    icon: 'gem',
    tagline: 'Curated transformation programs and maintenance plans tailored to your goals and timelines.',
    intro:
      'Packages bring together the right treatments, in the right order, for a goal and a date — a wedding, a milestone or simply better skin. Every programme is built by a dermatologist after a consultation, with flexible payment and EMI options.',
    image: '/images/rua/services/premium-glow.webp',
    imageAlt: 'Glowing skin after a facial treatment',
    items: [
      { name: 'Bridal and groom transformation packages', treatment: 'hydrafacial' },
      { name: 'RUA Signature Glow Therapy', treatment: 'hydrafacial' },
      { name: 'Anti-ageing and skin tightening programs', treatment: 'skin-boosters' },
      { name: 'Pigmentation correction and brightening plans', treatment: 'pigmentation-melasma-treatment' },
      { name: 'Acne control and scar refinement programs', treatment: 'acne-scar-treatment' },
      { name: 'Hair revitalisation and nourishment therapies', treatment: 'gfc-hair-treatment' },
      { name: 'Monthly skin maintenance facials', treatment: 'hydrafacial' },
      { name: 'Post-travel and detox facials', treatment: 'hydrafacial' },
      { name: 'IV wellness drips' },
      { name: 'Lifetime Laser hair reduction packages', treatment: 'laser-hair-reduction' },
    ],
    doctors: ['dr-eshritha-c', 'dr-jatin-k-reddy', 'dr-jeevith-c-reddy'],
    equipment: ['hydrafacial', 'q-switched-diode', 'mnrf'],
    faqs: [
      {
        q: 'Can packages be customised?',
        a: 'Yes. Every programme is tailored to your goals, skin and timeline after a consultation with one of our dermatologists.',
      },
      {
        q: 'When should brides and grooms start?',
        a: 'Ideally three to six months before the wedding, so treatments can be spaced safely and the final glow sessions land just before the day.',
      },
      {
        q: 'Do packages include EMI options?',
        a: 'Yes. RUA offers flexible payment options and EMI plans for treatment packages.',
      },
    ],
    seo: {
      title: 'Bridal & Skin Packages in Bangalore – Premium Programs | RUA',
      description:
        'Premium aesthetic packages in Bengaluru: bridal and groom programmes, RUA Signature Glow Therapy, anti-ageing, pigmentation and acne plans, and lifetime laser packages.',
      h1: 'Premium Aesthetic Packages',
    },
  },
]

export const getCategory = (slug: string | undefined) => CATEGORIES.find((c) => c.slug === slug)
export const categoryName = (slug: CategorySlug) => getCategory(slug)?.name ?? slug
