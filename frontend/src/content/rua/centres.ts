import type { Centre, CentreSlug } from './types'

const embed = (query: string) => `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`
const search = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

/** RUA's two centres, as listed on ruaskinandhair.com. Both open Sunday – Saturday, 10am – 8pm. */
export const CENTRES: Centre[] = [
  {
    slug: 'ramamurthy-nagar',
    name: 'RUA Ramamurthy Nagar',
    area: 'Ramamurthy Nagar',
    addressLines: [
      '#14, 2nd Floor, 11th Cross, GPH Tower',
      'Above Burger King, 1st Block Akashaya Nagar',
      'TC Palya Main Road, KR Puram, Bengaluru – 560016',
    ],
    street: '#14, 2nd Floor, 11th Cross, GPH Tower, Above Burger King, 1st Block Akashaya Nagar, TC Palya Main Road, KR Puram',
    locality: 'Ramamurthy Nagar',
    postalCode: '560016',
    landmark: 'GPH Tower, above Burger King on TC Palya Main Road',
    phone: '+919959763678',
    phoneDisplay: '+91 99597 63678',
    mapsUrl: 'https://maps.app.goo.gl/7ZEBLKJp6LNgWhjo7',
    mapEmbedUrl: embed('RUA Skin & Hair Center, 13.0207431, 77.6844423'),
    geo: { lat: 13.0207431, lng: 77.6844423 },
    intro:
      'Our Ramamurthy Nagar centre sits in GPH Tower on TC Palya Main Road, above Burger King — easy to reach from KR Puram, Ramamurthy Nagar, TC Palya and Akshaya Nagar.',
    directions: [
      'On TC Palya Main Road, KR Puram — look for GPH Tower above Burger King.',
      'RUA is on the 2nd floor, 11th Cross, 1st Block Akashaya Nagar.',
      'Call the centre if you need help finding us — we are happy to guide you.',
    ],
    seo: {
      title: 'Skin & Hair Clinic in Ramamurthy Nagar, Bangalore | RUA',
      description:
        'RUA Skin & Hair Center, Ramamurthy Nagar: dermatologists for skin, hair, lasers and hair transplant in GPH Tower, TC Palya Main Road. Open 7 days, 10am–8pm.',
      h1: 'Skin & Hair Clinic in Ramamurthy Nagar, Bangalore',
    },
  },
  {
    slug: 'indiranagar',
    name: 'RUA Indiranagar',
    area: 'Indiranagar',
    isNew: true,
    addressLines: ['060/1050, 1st Cross, Puttappa Layout', 'HAL 3rd Stage, Backgate of NCFE School', 'Bengaluru – 560075'],
    street: '060/1050, 1st Cross, Puttappa Layout, HAL 3rd Stage, Backgate of NCFE School',
    locality: 'Indiranagar',
    postalCode: '560075',
    landmark: 'Puttappa Layout, HAL 3rd Stage — at the back gate of NCFE School',
    phone: '+917019976689',
    phoneDisplay: '+91 70199 76689',
    mapsUrl: search('RUA Skin & Hair Center, 060/1050 1st Cross, Puttappa Layout, HAL 3rd Stage, Bengaluru 560075'),
    mapEmbedUrl: embed('060/1050 1st Cross, Puttappa Layout, HAL 3rd Stage, Indiranagar, Bengaluru 560075'),
    intro:
      'Our newest centre, RUA Indiranagar, is on 1st Cross, Puttappa Layout in HAL 3rd Stage — close to the back gate of NCFE School and convenient for Indiranagar, HAL and New Thippasandra.',
    directions: [
      'Head to Puttappa Layout, HAL 3rd Stage, Indiranagar.',
      'RUA is on 1st Cross, at the back gate of NCFE School.',
      'Look for the RUA Skin & Hair Center signboard with our cocoa wood-slat facade.',
    ],
    seo: {
      title: 'Skin & Hair Clinic in Indiranagar, Bangalore | RUA',
      description:
        'RUA Skin & Hair Center, Indiranagar: MD dermatologists for acne, pigmentation, lasers, hair loss and hair transplant in HAL 3rd Stage. Open 7 days, 10am–8pm.',
      h1: 'Skin & Hair Clinic in Indiranagar, Bangalore',
    },
  },
]

export const getCentre = (slug: string | undefined) => CENTRES.find((c) => c.slug === slug)
export const centreName = (slug: CentreSlug) => getCentre(slug)?.name ?? slug
