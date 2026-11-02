import type { Doctor, DoctorSlug } from './types'

/** RUA's founding dermatologists — credentials and profiles as published by RUA. */
export const DOCTORS: Doctor[] = [
  {
    slug: 'dr-jatin-k-reddy',
    name: 'Dr. Jatin K Reddy',
    shortName: 'Dr. Jatin',
    role: 'Consultant Dermatologist & Hair Transplant Surgeon',
    qualifications: 'MBBS, MD (DVL)',
    fellowship: 'Fellowship in Hair Transplantation',
    persona: 'The Jack',
    personaLine: 'The powerhouse of our team — multitalented and ever-reliable.',
    bio: [
      'Balancing precision with strength, he does it all with ease, uplifting the team and steering our vision forward.',
      'Dr. Jatin K Reddy has always been drawn to the precision of hair transplantation and dermatosurgery, where science and artistry come together to restore confidence.',
    ],
    focus: ['Hair transplantation — FUE, Sapphire Bio FUE & DHI', 'Hair loss & scalp treatments', 'Dermatosurgery', 'Clinical dermatology'],
    categories: ['hair-transplant', 'hair-treatments', 'dermatosurgery', 'laser-treatments'],
    treatments: [
      'fue-hair-transplant',
      'dhi-hair-transplant',
      'beard-eyebrow-transplant',
      'hair-transplant-cost',
      'hair-loss-treatment',
      'prp-hair-treatment',
      'gfc-hair-treatment',
      'scalp-micropigmentation',
      'wart-skin-tag-removal',
    ],
    photo: '/images/rua/doctors/dr-jatin-k-reddy.webp',
    seo: {
      title: 'Dr. Jatin K Reddy – Hair Transplant Surgeon, Bangalore | RUA',
      description:
        'Dr. Jatin K Reddy, MBBS, MD (DVL), Fellowship in Hair Transplantation — consultant dermatologist and hair transplant surgeon at RUA Skin & Hair Center, Bengaluru.',
    },
  },
  {
    slug: 'dr-eshritha-c',
    name: 'Dr. Eshritha C',
    shortName: 'Dr. Eshritha',
    role: 'Consultant Dermatologist',
    qualifications: 'MBBS, MD (DVL)',
    fellowship: 'Fellowship in Dermatosurgery, Lasers & Aesthetic Dermatology',
    persona: 'The Artisan',
    personaLine: 'Grace meets empathy in her presence — the sweetest soul of our team.',
    bio: [
      'With beauty that shines inside out, she blends warmth with clinical excellence.',
      'Dr. Eshritha C found her calling in aesthetic and pediatric dermatology, combining gentle care with treatments that are both transformative and reassuring.',
    ],
    focus: ['Aesthetic & cosmetic dermatology', 'Lasers', 'Dermatosurgery & vitiligo surgery', 'Paediatric dermatology'],
    categories: ['aesthetic-dermatology', 'laser-treatments', 'dermatosurgery', 'premium-packages', 'medical-dermatology'],
    treatments: [
      'hydrafacial',
      'chemical-peel',
      'mnrf-microneedling',
      'skin-boosters',
      'botox-fillers',
      'laser-hair-reduction',
      'tattoo-removal',
      'co2-laser-resurfacing',
      'vitiligo-surgery',
      'paediatric-dermatology',
      'acne-scar-treatment',
      'pigmentation-melasma-treatment',
    ],
    photo: '/images/rua/doctors/dr-eshritha-c.webp',
    seo: {
      title: 'Dr. Eshritha C – Dermatologist in Bangalore | RUA',
      description:
        'Dr. Eshritha C, MBBS, MD (DVL), Fellowship in Dermatosurgery, Lasers & Aesthetic Dermatology — consultant dermatologist at RUA Skin & Hair Center, Bengaluru.',
    },
  },
  {
    slug: 'dr-jeevith-c-reddy',
    name: 'Dr. Jeevith C Reddy',
    shortName: 'Dr. Jeevith',
    role: 'Consultant Dermatologist',
    qualifications: 'MBBS, MD (DVL)',
    fellowship: 'Fellowship in Functional & Longevity Medicine',
    persona: 'The Anchor',
    personaLine: 'At the heart of our team stands a steady hand and a guiding force — our senior dermatologist.',
    bio: [
      'Dr. Jeevith C Reddy developed a deep interest in biologicals, clinical dermatology, and lifestyle medicine, always looking at skin health as part of a larger picture of well-being.',
    ],
    focus: ['Clinical dermatology', 'Biologics for chronic skin disease', 'Functional & longevity medicine', 'Lifestyle medicine'],
    categories: ['medical-dermatology', 'hair-treatments', 'dermatosurgery'],
    treatments: [
      'psoriasis-eczema-treatment',
      'acne-scar-treatment',
      'pigmentation-melasma-treatment',
      'hair-loss-treatment',
      'chemical-peel',
      'wart-skin-tag-removal',
    ],
    photo: '/images/rua/doctors/dr-jeevith-c-reddy.webp',
    seo: {
      title: 'Dr. Jeevith C Reddy – Dermatologist in Bangalore | RUA',
      description:
        'Dr. Jeevith C Reddy, MBBS, MD (DVL), Fellowship in Functional & Longevity Medicine — senior consultant dermatologist at RUA Skin & Hair Center, Bengaluru.',
    },
  },
]

export const getDoctor = (slug: string | undefined) => DOCTORS.find((d) => d.slug === slug)
export const doctorsBySlugs = (slugs: readonly DoctorSlug[]) =>
  slugs.map((s) => DOCTORS.find((d) => d.slug === s)).filter((d): d is Doctor => Boolean(d))
