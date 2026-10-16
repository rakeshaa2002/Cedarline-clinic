import { DepartmentPage, type DepartmentConfig } from '@/pages/departments/DepartmentPage'

const config: DepartmentConfig = {
  department: 'hair',
  path: '/services/hair',
  seoTitle: 'Hair Treatments',
  seoDescription:
    'Hair fall and scalp assessment with trichoscopy, dandruff and scalp treatment, PRP therapy and FUE hair transplant consultations at Cedarline, Bengaluru.',
  eyebrow: 'Hair & trichology',
  title: 'Hair and scalp care that starts with a proper diagnosis',
  description:
    'Our trichologist and hair restoration surgeon assess the cause of hair fall before recommending any treatment.',
  heroImage: '/images/hair-hero.webp',
  introTitle: 'Understanding hair fall before treating it',
  intro: [
    'Hair loss has many possible causes, so every hair consultation includes a detailed history and trichoscopy — a magnified examination of the scalp.',
    'Where needed, blood tests help identify underlying factors. Procedures such as PRP or FUE transplantation are discussed only after this assessment.',
  ],
  introImage: '/images/hair-scalp-care.webp',
  highlights: ['Trichoscopy scalp imaging', 'Dedicated trichologist', 'Hair restoration surgeon', 'Clear expectations and costs'],
  journey: [
    { title: 'History', text: 'We discuss your hair changes, health, diet and hair-care routine.' },
    { title: 'Trichoscopy', text: 'A magnified scalp examination helps identify patterns and causes.' },
    { title: 'Plan', text: 'Your doctor recommends a plan, which may include tests or treatment.' },
    { title: 'Monitoring', text: 'Progress is tracked with follow-up photos and reviews.' },
  ],
  faqs: [
    { q: 'When should I see a specialist about hair fall?', a: 'It is worth booking a consultation if you notice sudden heavy shedding, patches of hair loss, a widening parting, or scalp itching, redness or pain.' },
    { q: 'What is trichoscopy?', a: 'Trichoscopy is a magnified examination of the scalp and hair that helps the doctor understand what is happening. It is painless.' },
    { q: 'Is PRP suitable for everyone?', a: 'No. PRP is offered only when the trichologist considers it suitable after assessment, usually as a course of sessions.' },
    { q: 'Do you perform hair transplants?', a: 'Our hair restoration surgeon offers FUE consultations to assess suitability, expectations and donor area before any procedure is planned.' },
  ],
}

export default function HairPage() {
  return <DepartmentPage config={config} />
}
