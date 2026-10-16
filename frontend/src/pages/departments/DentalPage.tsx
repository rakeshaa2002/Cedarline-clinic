import { DepartmentPage, type DepartmentConfig } from '@/pages/departments/DepartmentPage'

const config: DepartmentConfig = {
  department: 'dental',
  path: '/services/dental',
  seoTitle: 'Dental Treatments',
  seoDescription:
    'Dental check-ups and cleaning, root canal treatment, braces and clear aligners, implants, whitening and children’s dentistry at Cedarline, Bengaluru.',
  eyebrow: 'Dental care',
  title: 'Dental treatments for healthy, confident smiles',
  description:
    'From routine cleaning to clear aligners and implants, our dentists explain every option and its cost before treatment begins.',
  heroImage: '/images/dental-suite.webp',
  introTitle: 'Gentle, modern dentistry for every age',
  intro: [
    'Our dental team combines preventive care with restorative, orthodontic and cosmetic treatment in three well-equipped dental suites.',
    'Digital X-rays are used only when the dentist needs more information, and treatment plans are written down so you can take time to decide.',
  ],
  introImage: '/images/dental-aligners.webp',
  highlights: ['Digital X-ray and intraoral scanning', 'Metal, ceramic and clear aligner options', 'Children’s dentistry', 'Written treatment plans and costs'],
  journey: [
    { title: 'Examination', text: 'A full check of teeth, gums and bite, with X-rays only if needed.' },
    { title: 'Discussion', text: 'Your dentist explains findings, options, timelines and costs.' },
    { title: 'Treatment', text: 'Care is carried out at a pace you’re comfortable with.' },
    { title: 'Follow-up', text: 'We schedule reviews and remind you about routine check-ups.' },
  ],
  faqs: [
    { q: 'How often should I have a dental check-up?', a: 'Many adults are advised to have a check-up about every six months, but your dentist will recommend an interval based on your own oral health.' },
    { q: 'Can I choose between braces and clear aligners?', a: 'Often, yes. Our orthodontist examines your teeth and bite and explains which options suit you, along with expected treatment time and cost.' },
    { q: 'Do you see children?', a: 'Yes. Children’s dentistry includes gentle check-ups, fluoride application and fissure sealants. Patients under 18 must be accompanied by a parent or guardian.' },
    { q: 'How do I book a dental appointment?', a: 'Call our front desk during opening hours or email us with your preferred dates. The How to book page lists each dentist’s consultation days.' },
  ],
}

export default function DentalPage() {
  return <DepartmentPage config={config} />
}
