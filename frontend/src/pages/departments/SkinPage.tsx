import { DepartmentPage, type DepartmentConfig } from '@/pages/departments/DepartmentPage'

const config: DepartmentConfig = {
  department: 'skin',
  path: '/services/skin',
  seoTitle: 'Skin Treatments',
  seoDescription:
    'Dermatology consultations, acne and acne-scar care, chemical peels, pigmentation care and laser hair reduction with Cedarline’s dermatologists in Bengaluru.',
  eyebrow: 'Skin & dermatology',
  title: 'Skin treatments led by dermatologists',
  description:
    'Medical dermatology and aesthetic procedures, planned and supervised by qualified dermatologists in a dedicated procedure room.',
  heroImage: '/images/skin-treatment.webp',
  introTitle: 'Doctor-led care for skin, nails and scalp',
  intro: [
    'Every skin journey at Cedarline starts with a consultation with a dermatologist, who assesses your skin and history before suggesting any treatment.',
    'Procedures such as peels and laser sessions are performed with medical-grade equipment, with realistic expectations discussed upfront.',
  ],
  introImage: '/images/skin-facial.webp',
  highlights: ['Consultant dermatologists', 'Medical-grade laser equipment', 'Patch tests before procedures', 'Care for adults and children'],
  journey: [
    { title: 'Consultation', text: 'Your dermatologist reviews your concern, history and current skincare.' },
    { title: 'Personal plan', text: 'A plan may combine skincare, prescriptions or procedures, with costs explained.' },
    { title: 'Procedures', text: 'Performed in our procedure room after consent and any needed patch test.' },
    { title: 'Review', text: 'Progress is reviewed and the plan adjusted if needed.' },
  ],
  faqs: [
    { q: 'Do I need a consultation before a peel or laser session?', a: 'Yes. A dermatologist assesses your skin first so the right procedure and settings can be chosen, or advises if a procedure isn’t suitable.' },
    { q: 'How many laser hair reduction sessions will I need?', a: 'Several sessions are usually needed; the number varies by skin and hair type and is discussed at your consultation.' },
    { q: 'Do you treat children’s skin conditions?', a: 'Yes, our consultant dermatologist sees children. Patients under 18 must be accompanied by a parent or guardian.' },
    { q: 'Are prices fixed?', a: 'Each service shows an indicative starting price. Your dermatologist confirms the plan and its cost before any procedure begins.' },
  ],
}

export default function SkinPage() {
  return <DepartmentPage config={config} />
}
