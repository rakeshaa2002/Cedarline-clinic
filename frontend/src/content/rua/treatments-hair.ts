import type { Treatment } from './types'

/** Hair transplant and hair treatment pages. General patient information — plans are always personalised. */
export const HAIR_TREATMENTS: Treatment[] = [
  {
    slug: 'fue-hair-transplant',
    category: 'hair-transplant',
    name: 'FUE Hair Transplant',
    h1: 'FUE & Sapphire FUE Hair Transplant in Bangalore',
    seo: {
      title: 'FUE Hair Transplant in Bangalore – Sapphire & Bio FUE | RUA',
      description:
        'FUE, Sapphire Bio FUE and Bio-Enhanced hair transplants by a fellowship-trained hair transplant surgeon at RUA, Bengaluru. Natural hairlines, minimal downtime.',
    },
    summary:
      'Follicular Unit Extraction (FUE) moves healthy hair follicles one by one from the back of your scalp to areas that are thinning or bald — without a linear scar. At RUA, FUE, Sapphire Bio FUE and Bio-Enhanced transplants are planned and performed by Dr. Jatin K Reddy, a consultant dermatologist with a fellowship in hair transplantation.',
    facts: [
      { label: 'Procedure time', value: 'Usually 6–8 hours, in one day' },
      { label: 'Anaesthesia', value: 'Local — you stay awake and comfortable' },
      { label: 'Back to desk work', value: 'Typically in 3–5 days' },
      { label: 'New growth', value: 'From about month 3–4' },
      { label: 'Final result', value: '9–12 months (crown may take longer)' },
      { label: 'Donor area', value: 'Tiny dot marks, hidden in short hair' },
    ],
    whoFor: [
      'Men with stable male-pattern baldness and a good donor area',
      'Receding hairlines and temple recession',
      'Women with hairline or crown thinning, after a medical work-up',
      'Anyone who wants to wear short hair without a linear donor scar',
      'Restoring density after an earlier transplant (revision work)',
    ],
    steps: [
      { title: 'Consultation & hairline design', text: 'Scalp and donor analysis, a graft estimate and a hairline drawn to suit your face, age and future hair loss.' },
      { title: 'Extraction', text: 'Individual follicular units are harvested with fine micro-punches from the permanent donor zone, under local anaesthesia.' },
      { title: 'Implantation', text: 'Recipient channels are opened — with sapphire blades in Sapphire FUE — and each graft is placed at a natural angle, direction and density.' },
      { title: 'Aftercare & follow-up', text: 'Clear washing and sleeping instructions, review visits, and optional PRP or GFC to support healing and growth.' },
    ],
    results:
      'Mild swelling and small crusts settle within 7–10 days. Transplanted hairs usually shed between weeks 2 and 6 — this is expected — before new growth begins around months 3–4. Density keeps improving for up to a year. Medical treatment is often advised alongside, to protect the hair you already have.',
    cost:
      'The cost of an FUE transplant depends on the number of grafts, the technique (classic FUE, Sapphire Bio FUE or Bio-Enhanced), the area treated and your donor quality. You receive a graft estimate and a transparent quote after your scalp assessment, with flexible payment and EMI options.',
    faqs: [
      {
        q: 'Is an FUE hair transplant permanent?',
        a: 'Follicles taken from the donor zone at the back of the scalp are resistant to pattern hair loss and keep that resistance after transplantation, so results are long-lasting. Your existing, non-transplanted hair can still thin, which is why we plan for the future and often add medical treatment.',
      },
      {
        q: 'Does FUE hurt?',
        a: 'The procedure is done under local anaesthesia, so most people feel only the first numbing injections. Mild soreness for a few days is usually managed with simple medicines.',
      },
      {
        q: 'What is Sapphire Bio FUE?',
        a: 'Sapphire FUE uses sapphire-tipped blades to open the recipient channels, giving fine, smooth incisions for precise graft placement and comfortable healing. Bio-Enhanced techniques add growth-factor therapy to support healing. Your surgeon will advise whether they suit you.',
      },
      {
        q: 'How many grafts will I need?',
        a: 'It depends on the size of the area, the density you want and your donor supply. We examine your scalp and give you a graft estimate at the consultation.',
      },
    ],
    doctors: ['dr-jatin-k-reddy'],
    related: ['dhi-hair-transplant', 'hair-transplant-cost', 'prp-hair-treatment'],
    image: '/images/rua/services/hair-transplant.webp',
    procedureType: 'SurgicalProcedure',
  },
  {
    slug: 'dhi-hair-transplant',
    category: 'hair-transplant',
    name: 'DHI Hair Transplant',
    h1: 'DHI Hair Transplant in Bangalore',
    seo: {
      title: 'DHI Hair Transplant in Bangalore – Direct Implantation | RUA',
      description:
        'Direct Hair Implantation (DHI) with implanter pens for dense, natural hairlines — planned and performed by RUA’s fellowship-trained hair transplant surgeon in Bengaluru.',
    },
    summary:
      'Direct Hair Implantation (DHI) refines FUE: follicles are extracted the same way, then loaded into an implanter pen and placed directly into the scalp, controlling the depth, angle and direction of every graft. It is especially suited to hairline design, dense packing and corrective work.',
    facts: [
      { label: 'Procedure time', value: 'Usually 6–8 hours' },
      { label: 'Anaesthesia', value: 'Local' },
      { label: 'Shaving', value: 'Decided at consultation — partial shave may suit small areas' },
      { label: 'Back to desk work', value: 'Typically in 3–5 days' },
      { label: 'Final result', value: '9–12 months' },
    ],
    whoFor: [
      'Hairline restoration and refinement',
      'Adding density between existing hairs',
      'Women with hairline or crown thinning, after medical evaluation',
      'Revision and corrective transplants',
    ],
    steps: [
      { title: 'Assessment & planning', text: 'Scalp, donor and hair-loss pattern assessment, with a hairline designed for your face.' },
      { title: 'Follicle extraction', text: 'Grafts are harvested individually by FUE from the permanent donor zone.' },
      { title: 'Direct implantation', text: 'Each graft is implanted with a pen-like implanter, setting angle, depth and direction one by one.' },
      { title: 'Recovery & reviews', text: 'Aftercare guidance and review visits, with optional PRP or GFC to support growth.' },
    ],
    results:
      'Healing is similar to FUE: small crusts settle in about 10 days, transplanted hairs shed in the first weeks, and new growth starts around months 3–4. The final density and hairline show at 9–12 months.',
    cost:
      'DHI is priced on graft count and complexity. Because every graft is placed with an implanter pen, DHI usually costs more than classic FUE. You receive a written estimate after your assessment, with EMI options available.',
    faqs: [
      {
        q: 'Is DHI better than FUE?',
        a: 'Neither is better for everyone. DHI gives fine control for hairlines and dense packing; FUE, including Sapphire Bio FUE, can cover larger areas efficiently. We recommend the technique that suits your hair-loss pattern and goals.',
      },
      {
        q: 'Can DHI be done without shaving?',
        a: 'In selected cases with smaller areas, the recipient area may not need a full shave. This depends on the number of grafts and is decided at your consultation.',
      },
      {
        q: 'When will I see results?',
        a: 'New hairs usually begin to grow around month three to four, with the final result at nine to twelve months.',
      },
    ],
    doctors: ['dr-jatin-k-reddy'],
    related: ['fue-hair-transplant', 'hair-transplant-cost', 'beard-eyebrow-transplant'],
    image: '/images/rua/services/hair-transplant.webp',
    procedureType: 'SurgicalProcedure',
  },
  {
    slug: 'hair-transplant-cost',
    category: 'hair-transplant',
    name: 'Hair Transplant Cost',
    h1: 'Hair Transplant Cost in Bangalore',
    seo: {
      title: 'Hair Transplant Cost in Bangalore – Price Guide | RUA',
      description:
        'What decides the cost of a hair transplant in Bangalore — grafts, technique, area and aftercare — and how RUA gives a transparent, graft-based quote with EMI options.',
    },
    summary:
      'The cost of a hair transplant in Bangalore depends mainly on how many grafts you need and the technique used. At RUA you get a scalp assessment, a graft estimate and a transparent written quote before you decide — with flexible payment and EMI options.',
    facts: [
      { label: 'Quote based on', value: 'Graft count, technique and area' },
      { label: 'Assessment', value: 'Scalp and donor analysis at consultation' },
      { label: 'Techniques', value: 'FUE, Sapphire Bio FUE, DHI, Bio-Enhanced' },
      { label: 'Payment', value: 'Flexible options and EMI plans' },
      { label: 'Performed by', value: 'Fellowship-trained dermatologist surgeon' },
    ],
    whoForTitle: 'What affects the price',
    whoFor: [
      'The number of grafts needed — the extent of your hair loss',
      'The technique: FUE, Sapphire Bio FUE, DHI or Bio-Enhanced',
      'The area: scalp, hairline, crown, beard or eyebrows',
      'Donor quality, and whether more than one session is needed',
      'Add-on therapies such as PRP or GFC to support healing',
    ],
    stepsTitle: 'How to get your quote',
    steps: [
      { title: 'Book a consultation', text: 'Online, on WhatsApp or by phone, at either RUA centre.' },
      { title: 'Scalp & donor assessment', text: 'We examine your hair-loss pattern, donor density and scalp health.' },
      { title: 'Graft estimate & plan', text: 'You get a graft estimate, a recommended technique and a hairline design.' },
      { title: 'Written quote', text: 'A clear, written quote with flexible payment and EMI options — no surprises.' },
    ],
    results:
      'A well-planned transplant is a long-term investment: follicles from the donor zone are resistant to pattern hair loss and are long-lasting. Who performs the surgery, the procedure environment and the aftercare matter more to your result than the lowest price per graft.',
    cost:
      'We don’t publish a single price because no two scalps need the same number of grafts. Send photos of your hair loss on WhatsApp for an initial idea, then confirm with an in-person assessment.',
    faqs: [
      {
        q: 'How much does a hair transplant cost in Bangalore?',
        a: 'Prices vary with the number of grafts, the technique and the area treated, so an accurate figure needs a scalp assessment. RUA gives you a graft estimate and a written quote at the consultation, with EMI options available.',
      },
      {
        q: 'Is cost per graft the best way to compare clinics?',
        a: 'It is useful, but also compare who performs the surgery, the technique, the procedure environment and the aftercare included. These have a bigger effect on your result than a small difference in price.',
      },
      {
        q: 'Do you offer EMI for hair transplants?',
        a: 'Yes. RUA offers flexible payment options and EMI plans. Ask our front desk for the current options.',
      },
      {
        q: 'Can I get an estimate online?',
        a: 'You can send photos on WhatsApp for an initial idea. The final quote is always confirmed after an in-person examination.',
      },
    ],
    doctors: ['dr-jatin-k-reddy'],
    related: ['fue-hair-transplant', 'dhi-hair-transplant', 'prp-hair-treatment'],
    image: '/images/rua/services/hair-transplant.webp',
    procedureType: 'SurgicalProcedure',
  },
  {
    slug: 'beard-eyebrow-transplant',
    category: 'hair-transplant',
    name: 'Beard, Moustache & Eyebrow Transplant',
    h1: 'Beard & Eyebrow Transplant in Bangalore',
    seo: {
      title: 'Beard & Eyebrow Transplant in Bangalore | RUA',
      description:
        'Beard, moustache and eyebrow transplants with single-hair grafts placed at natural angles — by RUA’s fellowship-trained hair transplant surgeon in Bengaluru.',
    },
    summary:
      'Patchy beards, thin moustaches and sparse or scarred eyebrows can be filled with hair follicles taken from your own scalp. Each graft is placed at the exact angle and direction of natural facial hair, for a soft and believable result.',
    facts: [
      { label: 'Procedure time', value: '3–6 hours, depending on the area' },
      { label: 'Anaesthesia', value: 'Local' },
      { label: 'Healing', value: 'Small crusts settle in 7–10 days' },
      { label: 'New growth', value: 'From about month 3' },
      { label: 'Final result', value: 'Around 9–12 months' },
    ],
    whoFor: [
      'Patchy or uneven beard growth',
      'A thin moustache or gaps',
      'Sparse, over-plucked or scarred eyebrows',
      'Scars in the beard area, after assessment',
    ],
    steps: [
      { title: 'Design', text: 'We map a beard, moustache or brow shape that suits your face.' },
      { title: 'Harvest', text: 'Fine single- and double-hair grafts are extracted from the scalp by FUE.' },
      { title: 'Placement', text: 'Grafts are placed one by one at natural angles and direction.' },
      { title: 'Aftercare', text: 'Simple care instructions and review visits as the new hair grows.' },
    ],
    results:
      'Transplanted hairs shed in the first weeks, then regrow from around month three. Eyebrow hairs come from the scalp and can grow longer than natural brow hair, so they need occasional trimming.',
    cost: 'The cost depends on the number of grafts and the area. You receive a quote after assessment, with EMI options available.',
    faqs: [
      {
        q: 'Will a beard transplant look natural?',
        a: 'Yes, when grafts are placed at the right angle and density. We design the beard line and density to match your face and natural hair direction.',
      },
      {
        q: 'Do transplanted eyebrows need trimming?',
        a: 'Yes. They come from the scalp and can grow longer than natural brow hair, so occasional trimming keeps them neat.',
      },
      {
        q: 'When can I shave or trim the area?',
        a: 'Usually after about 10–14 days, once healing is complete. We give you a personalised aftercare schedule.',
      },
    ],
    doctors: ['dr-jatin-k-reddy'],
    related: ['fue-hair-transplant', 'dhi-hair-transplant', 'hair-transplant-cost'],
    image: '/images/rua/services/hair-transplant.webp',
    procedureType: 'SurgicalProcedure',
  },
  {
    slug: 'hair-loss-treatment',
    category: 'hair-treatments',
    name: 'Hair Loss Treatment',
    h1: 'Hair Loss & Hair Fall Treatment in Bangalore',
    seo: {
      title: 'Hair Loss Treatment in Bangalore – Dermatologist-Led | RUA',
      description:
        'Diagnosis-first hair fall and hair loss treatment for men and women — medical therapy, PRP, GFC, exosomes, QR678, mesotherapy and LLLT — at RUA, Bengaluru.',
    },
    summary:
      'Effective hair loss treatment starts with the right diagnosis. RUA’s dermatologists examine your scalp, find out why you are losing hair — pattern hair loss, shedding after illness or stress, nutritional or hormonal causes, or alopecia areata — and build a plan that may combine medical treatment with in-clinic therapies.',
    facts: [
      { label: 'First visit', value: 'History, scalp examination and trichoscopy where useful' },
      { label: 'Tests', value: 'Blood tests only when indicated' },
      { label: 'Therapies', value: 'Medical, PRP, GFC, exosomes, QR678, mesotherapy, LLLT' },
      { label: 'Visible change', value: 'Usually in 3–6 months' },
      { label: 'For', value: 'Men and women' },
    ],
    whoFor: [
      'More hair fall than usual, or a widening parting',
      'A receding hairline or thinning crown',
      'Hair loss after illness, childbirth, stress or dieting',
      'Patchy hair loss',
      'Dandruff, itchy or oily scalp',
    ],
    steps: [
      { title: 'Diagnose', text: 'History, scalp examination and trichoscopy, with blood tests when needed.' },
      { title: 'Treat the cause', text: 'Medical management of male and female hair loss, tailored to you.' },
      { title: 'Boost regrowth', text: 'PRP, GFC, exosomes, QR678, scalp mesotherapy, microneedling or LLLT when they are likely to help.' },
      { title: 'Maintain', text: 'Hair strengthening and maintenance programmes, with periodic reviews.' },
    ],
    results:
      'Hair grows slowly, so most treatments take three to six months to make a visible difference. Early treatment usually gives the best results. For advanced, stable baldness, a hair transplant may be discussed.',
    cost: 'Cost depends on the diagnosis and the therapies chosen. Treatment starts with a consultation; multi-session programmes are available as packages with EMI options.',
    faqs: [
      {
        q: 'How much hair fall is normal?',
        a: 'Losing around 50–100 hairs a day is common. If you notice much more hair on your pillow or in the shower, a widening parting or thinning patches, it is worth seeing a dermatologist.',
      },
      {
        q: 'Is hair loss treatment different for women?',
        a: 'Often, yes. Female hair loss can be linked to hormones, iron or thyroid levels, PCOS or childbirth, so the work-up and treatment are tailored.',
      },
      {
        q: 'Do I need PRP or GFC?',
        a: 'Not always. Many people respond well to medical treatment alone; in-clinic therapies are added when they are likely to help. Your dermatologist will advise.',
      },
      {
        q: 'When should I consider a hair transplant?',
        a: 'When hair loss is advanced and stable and you have a good donor area. We assess this honestly at your consultation.',
      },
    ],
    doctors: ['dr-jatin-k-reddy', 'dr-jeevith-c-reddy'],
    equipment: ['derma-pen', 'lllt'],
    related: ['prp-hair-treatment', 'gfc-hair-treatment', 'fue-hair-transplant'],
    image: '/images/rua/equipment/derma-pen.webp',
    procedureType: 'TherapeuticProcedure',
  },
  {
    slug: 'prp-hair-treatment',
    category: 'hair-treatments',
    name: 'PRP Hair Treatment',
    h1: 'PRP Hair Treatment in Bangalore',
    seo: {
      title: 'PRP Hair Treatment in Bangalore – Sessions & Results | RUA',
      description:
        'Platelet-rich plasma (PRP) therapy for hair fall and thinning, prepared from your own blood and delivered by RUA’s dermatologists in Bengaluru. Packages and EMI.',
    },
    summary:
      'PRP (platelet-rich plasma) therapy uses growth factors from your own blood to support weakening hair follicles. A small blood sample is processed to concentrate the platelets, which are then injected into thinning areas of the scalp. It works best for early to moderate thinning and is often combined with medical treatment.',
    facts: [
      { label: 'Session time', value: 'About 45–60 minutes' },
      { label: 'Typical course', value: '3–4 sessions, 4–6 weeks apart' },
      { label: 'Downtime', value: 'Minimal — mild scalp tenderness for a day' },
      { label: 'Visible change', value: 'Often within 3–6 months' },
      { label: 'Maintenance', value: 'Periodic top-up sessions' },
    ],
    whoFor: [
      'Early male or female pattern hair loss',
      'Diffuse thinning and increased hair fall',
      'Supporting growth after a hair transplant',
      'Anyone who prefers a non-surgical option',
    ],
    steps: [
      { title: 'Blood sample', text: 'A small amount of your blood is drawn, like a routine blood test.' },
      { title: 'Processing', text: 'The sample is centrifuged to separate and concentrate the platelet-rich plasma.' },
      { title: 'Scalp preparation', text: 'The scalp is cleaned and numbed for comfort.' },
      { title: 'Micro-injections', text: 'PRP is injected evenly into the thinning areas with fine needles.' },
    ],
    results:
      'Many people notice less hair fall first, followed by thicker, stronger hair over three to six months. Results vary with the cause and stage of hair loss; maintenance sessions help sustain them.',
    cost: 'PRP is priced per session or as a multi-session package, with EMI options. Your dermatologist will recommend the number of sessions after assessment.',
    faqs: [
      {
        q: 'Is PRP for hair painful?',
        a: 'The scalp is numbed before treatment, so most people feel only mild pressure or pricks. Any tenderness usually settles within a day.',
      },
      {
        q: 'How many PRP sessions will I need?',
        a: 'A typical course is three to four sessions, four to six weeks apart, followed by occasional maintenance sessions.',
      },
      {
        q: 'PRP or GFC — which is better?',
        a: 'Both use growth factors from your own blood. GFC concentrates the growth factors in a cell-free form, which some people find more comfortable. Your dermatologist will suggest the better fit for you.',
      },
      {
        q: 'Who should avoid PRP?',
        a: 'People with certain blood or platelet disorders, an active scalp infection, or on some blood-thinning medicines may not be suitable. We check this at the consultation.',
      },
    ],
    doctors: ['dr-jatin-k-reddy'],
    related: ['gfc-hair-treatment', 'hair-loss-treatment', 'fue-hair-transplant'],
    image: '/images/rua/equipment/derma-pen.webp',
    procedureType: 'TherapeuticProcedure',
  },
  {
    slug: 'gfc-hair-treatment',
    category: 'hair-treatments',
    name: 'GFC Hair Treatment',
    h1: 'GFC Hair Treatment in Bangalore',
    seo: {
      title: 'GFC Hair Treatment in Bangalore – Growth Factor Therapy | RUA',
      description:
        'Growth Factor Concentrate (GFC) therapy for hair thinning — growth factors from your own blood, delivered by RUA’s dermatologists in Bengaluru. Packages and EMI.',
    },
    summary:
      'GFC (Growth Factor Concentrate) therapy is an advanced form of platelet therapy. Growth factors are released from your own platelets and concentrated into a cell-free solution, which is delivered into the scalp to strengthen thinning hair and support regrowth.',
    facts: [
      { label: 'Session time', value: 'About 45–60 minutes' },
      { label: 'Typical course', value: '3–4 sessions, about a month apart' },
      { label: 'Downtime', value: 'Minimal' },
      { label: 'Visible change', value: 'Usually within 3–6 months' },
      { label: 'Source', value: 'Your own blood (autologous)' },
    ],
    whoFor: [
      'Early to moderate pattern hair loss in men and women',
      'Diffuse thinning and excessive hair fall',
      'Hair strengthening and maintenance programmes',
      'Support after a hair transplant',
    ],
    steps: [
      { title: 'Blood sample', text: 'A small blood sample is taken.' },
      { title: 'Activation & concentration', text: 'Growth factors are released from the platelets and concentrated in a cell-free solution.' },
      { title: 'Scalp preparation', text: 'The scalp is cleaned and numbed.' },
      { title: 'Precise delivery', text: 'GFC is delivered evenly into thinning areas.' },
    ],
    results:
      'Hair fall usually reduces first, with improved thickness and density over the following months. Combined with the right medical treatment, GFC can help maintain your hair long term.',
    cost: 'Priced per session or as a package, with flexible payment and EMI options.',
    faqs: [
      {
        q: 'How is GFC different from PRP?',
        a: 'PRP uses concentrated platelets; GFC uses the growth factors released from them, in a cell-free form. Both come from your own blood.',
      },
      {
        q: 'How many GFC sessions do I need?',
        a: 'Most plans start with three to four sessions about a month apart, followed by maintenance sessions as advised.',
      },
      {
        q: 'Is there any downtime after GFC?',
        a: 'Very little. You can usually return to your routine the same day; avoid heavy workouts and hair products for a short time as advised.',
      },
    ],
    doctors: ['dr-jatin-k-reddy'],
    related: ['prp-hair-treatment', 'hair-loss-treatment', 'scalp-micropigmentation'],
    image: '/images/rua/equipment/derma-pen.webp',
    procedureType: 'TherapeuticProcedure',
  },
  {
    slug: 'scalp-micropigmentation',
    category: 'hair-treatments',
    name: 'Scalp Micropigmentation',
    h1: 'Scalp Micropigmentation (SMP) in Bangalore',
    seo: {
      title: 'Scalp Micropigmentation in Bangalore – SMP Hair Tattoo | RUA',
      description:
        'Scalp micropigmentation (SMP) creates the look of density or a crisp shaved hairline with fine pigment dots — at RUA Skin & Hair Center, Bengaluru.',
    },
    summary:
      'Scalp micropigmentation (SMP) is a non-surgical cosmetic technique that places tiny pigment dots in the scalp to mimic hair follicles. It creates the look of fuller hair or a closely shaved head, and can camouflage scars.',
    facts: [
      { label: 'Sessions', value: 'Usually 2–3' },
      { label: 'Session time', value: '2–4 hours' },
      { label: 'Downtime', value: 'Mild redness for 1–2 days' },
      { label: 'Lasts', value: 'Several years, with occasional touch-ups' },
      { label: 'Regrows hair?', value: 'No — it is cosmetic camouflage' },
    ],
    whoFor: [
      'Diffuse thinning where you want the look of density',
      'Men who prefer a shaved, buzz-cut look',
      'Camouflaging transplant or surgical scars',
      'People who are not suited to a transplant',
    ],
    steps: [
      { title: 'Design & shade match', text: 'Hairline and density planned, pigment matched to your skin and hair.' },
      { title: 'First session', text: 'A base layer of fine dots is placed across the area.' },
      { title: 'Build density', text: 'Further sessions add layers for a natural, three-dimensional look.' },
      { title: 'Aftercare', text: 'Simple care for a few days; touch-ups as the pigment softens over the years.' },
    ],
    results:
      'Results are visible straight after each session and settle over a few days. The pigment softens gradually over the years, and a touch-up session refreshes it.',
    cost: 'Priced by area and number of sessions, with EMI options available.',
    faqs: [
      {
        q: 'Does SMP look natural?',
        a: 'With the right dot size, depth and shade matched to your skin and hair, SMP looks like natural follicles. It is planned around how you wear your hair.',
      },
      {
        q: 'Does SMP fade?',
        a: 'Pigment softens gradually over the years. A touch-up session refreshes it.',
      },
      {
        q: 'Can SMP be combined with a hair transplant?',
        a: 'Yes. It can add the look of density between transplanted areas or hide donor-area scars.',
      },
    ],
    doctors: ['dr-jatin-k-reddy'],
    related: ['hair-loss-treatment', 'fue-hair-transplant', 'gfc-hair-treatment'],
    image: '/images/rua/services/hair-transplant.webp',
    procedureType: 'NoninvasiveProcedure',
  },
]
