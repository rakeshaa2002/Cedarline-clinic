import type { Treatment } from './types'

/** Skin, laser, aesthetic and dermatosurgery pages. General patient information — plans are always personalised. */
export const SKIN_TREATMENTS: Treatment[] = [
  {
    slug: 'acne-scar-treatment',
    category: 'medical-dermatology',
    name: 'Acne & Acne Scar Treatment',
    h1: 'Acne & Acne Scar Treatment in Bangalore',
    seo: {
      title: 'Acne Treatment in Bangalore – Acne & Scar Specialists | RUA',
      description:
        'Dermatologist-led acne treatment and acne scar reduction — medical therapy, peels, blue light, MNRF and CO₂ laser — at RUA Skin & Hair Center, Bengaluru.',
    },
    summary:
      'Acne is a medical skin condition, and treating it early prevents scars. RUA’s dermatologists first control active pimples, blackheads and cysts with medical treatment, then reduce marks and scars with procedures such as chemical peels, microneedling RF and fractional CO₂ laser — an area our doctors have published research on.',
    facts: [
      { label: 'Approach', value: 'Control active acne first, then treat scars' },
      { label: 'Medical care', value: 'Prescription creams and tablets when needed' },
      { label: 'Procedures', value: 'Peels, extraction, blue light, MNRF, CO₂ laser' },
      { label: 'Visible change', value: 'Acne: 6–12 weeks · scars: over several months' },
      { label: 'Also treats', value: 'Back acne, blackheads, closed comedones' },
    ],
    whoFor: [
      'Pimples, blackheads and whiteheads',
      'Painful cystic or hormonal acne',
      'Back and body acne',
      'Dark marks left after acne',
      'Pitted, rolling, boxcar or papular acne scars',
    ],
    steps: [
      { title: 'Grade & find the cause', text: 'Skin examination, acne grading and a look at triggers such as hormones and skincare.' },
      { title: 'Control active acne', text: 'Medical treatment, comedone extraction, peels or blue light to calm breakouts.' },
      { title: 'Fade the marks', text: 'Peels and targeted treatments for dark spots left behind.' },
      { title: 'Repair scars', text: 'MNRF, fractional CO₂ laser or scar revision procedures, often combined.' },
    ],
    results:
      'Active acne usually improves within six to twelve weeks of the right treatment. Scars improve gradually over several sessions as new collagen forms. We set realistic goals at the start and adjust as your skin responds.',
    cost: 'Cost depends on the treatments in your plan. Acne control and scar refinement programmes are available as packages, with EMI options.',
    faqs: [
      {
        q: 'Can acne scars be removed completely?',
        a: 'Scars can usually be improved significantly, often by combining treatments over several sessions. Complete removal is not always possible, and we set realistic expectations at the start.',
      },
      {
        q: 'Why does my acne keep coming back?',
        a: 'Hormones, skincare products, diet, stress and stopping treatment too early can all play a part. A dermatologist looks for the cause and plans maintenance to keep acne under control.',
      },
      {
        q: 'Should acne be treated before scars?',
        a: 'Yes. Active acne is controlled first so that new scars don’t form while existing ones are being treated.',
      },
    ],
    doctors: ['dr-jeevith-c-reddy', 'dr-eshritha-c'],
    equipment: ['mnrf', 'co2-laser', 'lllt'],
    related: ['co2-laser-resurfacing', 'mnrf-microneedling', 'chemical-peel'],
    image: '/images/rua/equipment/microneedling-radiofrequency.webp',
    procedureType: 'TherapeuticProcedure',
  },
  {
    slug: 'pigmentation-melasma-treatment',
    category: 'medical-dermatology',
    name: 'Pigmentation & Melasma Treatment',
    h1: 'Pigmentation & Melasma Treatment in Bangalore',
    seo: {
      title: 'Pigmentation Treatment in Bangalore – Melasma Care | RUA',
      description:
        'Diagnosis-led treatment for pigmentation, melasma, dark spots, lip pigmentation and uneven tone — medical care, peels and laser toning at RUA, Bengaluru.',
    },
    summary:
      'Pigmentation has many causes — melasma, sun damage, post-acne marks, lip pigmentation and more — and each needs a different plan. RUA’s dermatologists diagnose the type and depth of pigment, then combine medical creams, sun protection, chemical peels and Q-switched laser toning to fade it safely.',
    facts: [
      { label: 'Diagnosis', value: 'Skin examination, with dermoscopy where useful' },
      { label: 'Treatments', value: 'Medical creams, peels, laser toning' },
      { label: 'Typical course', value: 'Several sessions over 3–6 months' },
      { label: 'Melasma', value: 'Chronic — controlled with maintenance' },
      { label: 'Must-have', value: 'Daily broad-spectrum sunscreen' },
    ],
    whoFor: [
      'Melasma — brown patches on the cheeks, forehead or upper lip',
      'Sun spots, freckles and uneven tone',
      'Dark marks after acne or injury',
      'Lip and under-eye pigmentation',
    ],
    steps: [
      { title: 'Diagnose', text: 'Identify the type and depth of pigmentation and any triggers.' },
      { title: 'Protect', text: 'Sun protection and trigger control — the foundation of every plan.' },
      { title: 'Treat', text: 'Depigmenting creams, chemical peels and Q-switched laser toning, as suited to your skin.' },
      { title: 'Maintain', text: 'A maintenance routine to keep pigment from returning.' },
    ],
    results:
      'Many people notice lightening within six to eight weeks; deeper pigment takes longer. Melasma tends to recur with sun exposure and hormonal changes, so a maintenance plan keeps it under control.',
    cost: 'Pigmentation correction and brightening plans are available as packages, with EMI options. Your dermatologist recommends the right combination after examining your skin.',
    faqs: [
      {
        q: 'Can melasma be cured permanently?',
        a: 'Melasma can be controlled very well, but it tends to come back with sun exposure and hormonal changes. A maintenance plan keeps it under control.',
      },
      {
        q: 'Is laser toning safe for Indian skin?',
        a: 'Low-energy Q-switched laser toning is commonly used for pigmentation in Indian skin when the settings are carefully chosen by a dermatologist.',
      },
      {
        q: 'How soon will I see results?',
        a: 'Many people see lightening within six to eight weeks. Deeper or long-standing pigmentation takes longer and may need a combination of treatments.',
      },
    ],
    doctors: ['dr-jeevith-c-reddy', 'dr-eshritha-c'],
    equipment: ['q-switched-diode'],
    related: ['chemical-peel', 'tattoo-removal', 'hydrafacial'],
    image: '/images/rua/services/skin-ritual.webp',
    procedureType: 'TherapeuticProcedure',
  },
  {
    slug: 'psoriasis-eczema-treatment',
    category: 'medical-dermatology',
    name: 'Psoriasis, Eczema & Allergy Care',
    h1: 'Psoriasis & Eczema Treatment in Bangalore',
    seo: {
      title: 'Psoriasis & Eczema Treatment in Bangalore | RUA',
      description:
        'Long-term care for psoriasis, eczema, dermatitis, urticaria and skin allergies — from topical therapy to biologics — with RUA’s dermatologists in Bengaluru.',
    },
    summary:
      'Psoriasis, eczema and skin allergies are chronic inflammatory conditions that flare and settle. RUA’s dermatologists confirm the diagnosis, identify triggers and build a step-by-step plan — from creams and moisturisers to tablets and, for severe disease, biologic therapy — to keep your skin calm in the long term.',
    facts: [
      { label: 'Conditions', value: 'Psoriasis, eczema, dermatitis, urticaria' },
      { label: 'Approach', value: 'Diagnosis, trigger control, stepwise treatment' },
      { label: 'Advanced options', value: 'Systemic and biologic therapy when needed' },
      { label: 'Follow-up', value: 'Regular reviews to prevent flares' },
      { label: 'Also', value: 'Scalp, nail and children’s eczema care' },
    ],
    whoFor: [
      'Red, scaly patches on the scalp, elbows, knees or nails',
      'Dry, itchy, inflamed skin — atopic or contact dermatitis',
      'Seborrheic dermatitis and dandruff-prone skin',
      'Hives (urticaria) and suspected skin allergies',
      'Children with eczema',
    ],
    steps: [
      { title: 'Confirm the diagnosis', text: 'A careful examination, and tests or a biopsy when needed.' },
      { title: 'Identify triggers', text: 'Skincare, irritants, stress, infections and lifestyle factors.' },
      { title: 'Treat in steps', text: 'Topical therapy first; tablets or biologics for more severe disease.' },
      { title: 'Stay in control', text: 'Regular reviews and a flare plan, with lifestyle guidance.' },
    ],
    results:
      'Most people see calmer skin within weeks of the right treatment. Because these conditions are long-term, the aim is lasting control — fewer, milder flares — rather than a one-time fix.',
    cost: 'Cost depends on the treatment needed. Consultation first; follow-up visits are planned around how your skin responds.',
    faqs: [
      {
        q: 'Is psoriasis contagious?',
        a: 'No. Psoriasis is an immune-related condition and cannot spread from person to person.',
      },
      {
        q: 'Can eczema be cured?',
        a: 'Eczema can’t always be cured, but it can usually be controlled well with the right skincare, trigger management and treatment. Many children improve as they grow.',
      },
      {
        q: 'What are biologics?',
        a: 'Biologics are advanced medicines that target specific parts of the immune system. They are considered for moderate to severe psoriasis and some other conditions when other treatments are not enough.',
      },
    ],
    doctors: ['dr-jeevith-c-reddy'],
    related: ['paediatric-dermatology', 'pigmentation-melasma-treatment', 'acne-scar-treatment'],
    image: '/images/rua/services/medical-dermatology.webp',
    procedureType: 'TherapeuticProcedure',
  },
  {
    slug: 'paediatric-dermatology',
    category: 'medical-dermatology',
    name: 'Paediatric Dermatology',
    h1: 'Paediatric Dermatologist in Bangalore',
    seo: {
      title: 'Paediatric Dermatologist in Bangalore – Child Skin Care | RUA',
      description:
        'Gentle, expert skin, hair and nail care for babies, children and teens — eczema, birthmarks, warts, infections and teen acne — at RUA, Bengaluru.',
    },
    summary:
      'Children’s skin needs gentle, specialised care. RUA treats babies, children and teenagers for eczema, birthmarks, warts and molluscum, fungal and bacterial infections, hair and nail problems and teen acne — with treatments chosen for young skin. Paediatric dermatology is a special interest of Dr. Eshritha C.',
    facts: [
      { label: 'Ages', value: 'Newborns to teenagers' },
      { label: 'Approach', value: 'Gentle, child-friendly and explained to parents' },
      { label: 'Common concerns', value: 'Eczema, infections, warts, birthmarks, acne' },
      { label: 'Procedures', value: 'Minimal, and only when needed' },
      { label: 'Special interest of', value: 'Dr. Eshritha C' },
    ],
    whoFor: [
      'Eczema and dry, itchy skin',
      'Birthmarks and pigmented patches',
      'Warts and molluscum contagiosum',
      'Fungal, viral and bacterial skin infections',
      'Teen acne, and hair or nail concerns',
    ],
    steps: [
      { title: 'Listen & examine', text: 'A calm, unhurried consultation for your child.' },
      { title: 'Explain', text: 'We explain the diagnosis and options clearly to parents.' },
      { title: 'Treat gently', text: 'Treatments and strengths chosen for your child’s age and skin.' },
      { title: 'Follow up', text: 'Reviews to track progress and adjust the plan.' },
    ],
    results:
      'Many childhood skin conditions improve quickly once correctly diagnosed. Long-term conditions such as eczema are kept under control with a simple routine and flare plan.',
    cost: 'Consultation first. Most children need simple treatment; any procedure is discussed with parents beforehand.',
    faqs: [
      {
        q: 'At what age can my child see a dermatologist?',
        a: 'At any age, including newborns. Many skin concerns in babies are simple to manage once diagnosed.',
      },
      {
        q: 'Are skin treatments safe for children?',
        a: 'We choose treatments and strengths suited to a child’s age and skin, and explain every step to parents.',
      },
      {
        q: 'Should birthmarks be checked?',
        a: 'Yes. A dermatologist can identify the type of birthmark and advise whether it needs monitoring or treatment.',
      },
    ],
    doctors: ['dr-eshritha-c'],
    related: ['psoriasis-eczema-treatment', 'wart-skin-tag-removal', 'acne-scar-treatment'],
    image: '/images/rua/services/medical-dermatology.webp',
    procedureType: 'TherapeuticProcedure',
  },
  {
    slug: 'wart-skin-tag-removal',
    category: 'dermatosurgery',
    name: 'Wart & Skin Tag Removal',
    h1: 'Wart & Skin Tag Removal in Bangalore',
    seo: {
      title: 'Wart & Skin Tag Removal in Bangalore – Quick & Safe | RUA',
      description:
        'Quick removal of warts, skin tags, DPNs and moles with radiofrequency, plasma pen, cryotherapy or CO₂ laser — by dermatologists at RUA, Bengaluru.',
    },
    summary:
      'Warts, skin tags, DPNs (small dark bumps on the face) and moles are common and usually harmless, but they can be bothersome or unsightly. RUA’s dermatologists examine each lesion first, then remove it precisely — usually in a single short visit — with radiofrequency, plasma pen, cryotherapy or CO₂ laser.',
    facts: [
      { label: 'Procedure time', value: 'Usually 10–30 minutes' },
      { label: 'Anaesthesia', value: 'Numbing cream or local anaesthetic' },
      { label: 'Healing', value: 'Small scabs heal in 5–10 days' },
      { label: 'Methods', value: 'Radiofrequency, plasma pen, cryo, CO₂ laser' },
      { label: 'Warts', value: 'May need more than one session' },
    ],
    whoFor: [
      'Skin tags on the neck, underarms or eyelids',
      'Common, plantar and flat warts',
      'DPNs (dermatosis papulosa nigra)',
      'Moles, after examination — removal, excision or transplant',
    ],
    steps: [
      { title: 'Examine', text: 'Each lesion is checked first — with dermoscopy for moles.' },
      { title: 'Numb', text: 'Numbing cream or a small local anaesthetic injection.' },
      { title: 'Remove', text: 'Precise removal with the method best suited to the lesion.' },
      { title: 'Heal', text: 'Simple wound care; small scabs fall off within about a week.' },
    ],
    results:
      'Most lesions are removed in one visit and heal within one to two weeks with little or no mark. Warts are caused by a virus and sometimes need repeat treatment.',
    cost: 'Priced by the number and type of lesions. You get a clear quote at your consultation.',
    faqs: [
      {
        q: 'Will skin tags grow back?',
        a: 'A removed skin tag doesn’t regrow, but new ones can appear over time, especially in areas of friction.',
      },
      {
        q: 'Why do warts sometimes need more than one session?',
        a: 'Warts are caused by a virus that can remain in the surrounding skin, so some need repeat treatment to clear completely.',
      },
      {
        q: 'Is mole removal safe?',
        a: 'Yes. A dermatologist examines the mole first; suspicious moles are excised and can be sent for testing.',
      },
    ],
    doctors: ['dr-jatin-k-reddy', 'dr-eshritha-c', 'dr-jeevith-c-reddy'],
    equipment: ['rf-plasma-pen', 'cryo', 'co2-laser'],
    related: ['co2-laser-resurfacing', 'vitiligo-surgery', 'paediatric-dermatology'],
    image: '/images/rua/equipment/radiofrequency-plasma-pen.webp',
    procedureType: 'SurgicalProcedure',
  },
  {
    slug: 'vitiligo-surgery',
    category: 'dermatosurgery',
    name: 'Vitiligo Surgery',
    h1: 'Vitiligo Surgery & Punch Grafting in Bangalore',
    seo: {
      title: 'Vitiligo Surgery in Bangalore – Punch Grafting | RUA',
      description:
        'Surgical treatment for stable vitiligo — punch grafting and other vitiligo surgeries to restore pigment — with RUA’s dermatosurgeons in Bengaluru.',
    },
    summary:
      'When vitiligo patches have been stable and stopped spreading, surgery can restore colour where medicines haven’t. In punch grafting, tiny pieces of normally pigmented skin are transferred into the white patch, where pigment gradually spreads out from each graft.',
    facts: [
      { label: 'Suitable for', value: 'Stable vitiligo — no change for several months' },
      { label: 'Techniques', value: 'Punch grafting and other vitiligo surgeries' },
      { label: 'Anaesthesia', value: 'Local' },
      { label: 'Repigmentation', value: 'Gradual, over weeks to months' },
      { label: 'Often combined with', value: 'Medical treatment to support repigmentation' },
    ],
    whoFor: [
      'Stable vitiligo patches that haven’t responded to medicines',
      'Segmental vitiligo',
      'Patches on the face, lips or hands, after assessment',
      'Loss of pigment after burns or injury (leucoderma)',
    ],
    steps: [
      { title: 'Confirm stability', text: 'We review your history to confirm the patches have been stable.' },
      { title: 'Plan', text: 'Donor and recipient areas are planned for the best match.' },
      { title: 'Grafting', text: 'Tiny grafts are placed into the white patch under local anaesthesia.' },
      { title: 'Follow-up', text: 'Supportive treatment and reviews while pigment spreads.' },
    ],
    results:
      'Pigment usually starts to spread from the grafts within a few weeks and continues to improve over the following months. Results are best in stable vitiligo.',
    cost: 'Priced by the size and number of patches treated. You receive a quote after your assessment.',
    faqs: [
      {
        q: 'How do I know if my vitiligo is stable?',
        a: 'Generally, no new patches and no increase in size for several months. Your dermatologist will assess this before recommending surgery.',
      },
      {
        q: 'Is vitiligo surgery painful?',
        a: 'It is done under local anaesthesia, so you should feel little during the procedure. Mild soreness afterwards is usually brief.',
      },
      {
        q: 'When will the colour return?',
        a: 'Pigment usually begins to spread from the grafts over a few weeks and keeps improving over months.',
      },
    ],
    doctors: ['dr-eshritha-c'],
    related: ['wart-skin-tag-removal', 'psoriasis-eczema-treatment', 'paediatric-dermatology'],
    image: '/images/rua/services/dermatosurgery.webp',
    procedureType: 'SurgicalProcedure',
  },
  {
    slug: 'laser-hair-reduction',
    category: 'laser-treatments',
    name: 'Laser Hair Reduction',
    h1: 'Laser Hair Reduction in Bangalore',
    seo: {
      title: 'Laser Hair Removal in Bangalore – Triple Wavelength | RUA',
      description:
        'Triple-wavelength diode laser hair reduction for face and body, suited to Indian skin — dermatologist-supervised, with lifetime packages, at RUA, Bengaluru.',
    },
    summary:
      'Laser hair reduction uses light energy to disable hair follicles, so unwanted hair grows back finer and sparser. RUA uses a triple-wavelength diode laser, which combines three wavelengths to treat different hair depths and skin types — including Indian skin — under dermatologist supervision.',
    facts: [
      { label: 'Technology', value: 'Triple-wavelength diode laser' },
      { label: 'Sessions', value: 'Usually 6–8, 4–8 weeks apart' },
      { label: 'Session time', value: '15–60 minutes, by area' },
      { label: 'Downtime', value: 'None to mild redness' },
      { label: 'Packages', value: 'Including lifetime laser hair reduction' },
    ],
    whoFor: [
      'Unwanted facial hair — upper lip, chin and jawline',
      'Underarms, arms, legs and bikini line',
      'Beard shaping, back and chest for men',
      'Hormonal hair growth such as PCOS, alongside medical care',
      'Ingrown hairs and razor bumps',
    ],
    steps: [
      { title: 'Consult & patch test', text: 'Skin and hair assessment, with a test spot when needed.' },
      { title: 'Prepare', text: 'Shave the area the day before; avoid waxing, threading and tanning.' },
      { title: 'Treat', text: 'Quick laser pulses with built-in cooling for comfort.' },
      { title: 'Maintain', text: 'Sessions spaced to the hair cycle, plus occasional maintenance.' },
    ],
    results:
      'Most people notice finer, sparser regrowth after the first few sessions. Laser gives long-term reduction rather than a guarantee of permanent removal — hormonal areas may need occasional maintenance sessions.',
    cost: 'Priced by area and number of sessions. Lifetime laser hair reduction packages are available, with EMI options.',
    faqs: [
      {
        q: 'Is laser hair removal permanent?',
        a: 'It gives long-lasting reduction: treated hair grows back much finer and sparser, and many people need only occasional maintenance. Hormonal areas may need more.',
      },
      {
        q: 'Is it safe for Indian skin?',
        a: 'Yes, when the right wavelength and settings are used. Triple-wavelength diode lasers treat a wide range of skin types, and our doctors adjust settings for your skin.',
      },
      {
        q: 'Does it hurt?',
        a: 'Most people describe a quick, warm snap. Built-in cooling keeps it comfortable.',
      },
      {
        q: 'How should I prepare?',
        a: 'Shave the area a day before, avoid waxing, threading or plucking for four weeks, and avoid sun tanning before your sessions.',
      },
    ],
    doctors: ['dr-eshritha-c', 'dr-jatin-k-reddy'],
    equipment: ['q-switched-diode'],
    related: ['tattoo-removal', 'hydrafacial', 'pigmentation-melasma-treatment'],
    image: '/images/rua/equipment/q-switched-nd-yag-diode-laser.webp',
    procedureType: 'NoninvasiveProcedure',
  },
  {
    slug: 'tattoo-removal',
    category: 'laser-treatments',
    name: 'Laser Tattoo & Pigment Removal',
    h1: 'Laser Tattoo Removal in Bangalore',
    seo: {
      title: 'Laser Tattoo Removal in Bangalore – Q-Switched Laser | RUA',
      description:
        'Q-switched Nd:YAG laser tattoo removal and pigment lasers for unwanted tattoos and pigmented marks — by dermatologists at RUA, Bengaluru.',
    },
    summary:
      'Laser tattoo removal uses very short pulses of laser energy to break tattoo ink into tiny particles, which your body clears over the following weeks. RUA uses a Q-switched Nd:YAG laser, which is also used for certain pigmented marks and for laser toning.',
    facts: [
      { label: 'Technology', value: 'Q-switched Nd:YAG laser' },
      { label: 'Sessions', value: 'Usually several, 6–8 weeks apart' },
      { label: 'Session time', value: '10–30 minutes' },
      { label: 'Aftercare', value: 'Redness or small blisters heal in about a week' },
      { label: 'Best response', value: 'Black and dark-blue inks' },
    ],
    whoFor: [
      'Unwanted or faded tattoos',
      'Lightening a tattoo before a cover-up',
      'Eyebrow or cosmetic tattoo correction',
      'Certain pigmented marks, after diagnosis',
    ],
    steps: [
      { title: 'Assess', text: 'Ink colours, size, age of the tattoo and your skin type.' },
      { title: 'Test spot', text: 'A small test area when needed, to choose the right settings.' },
      { title: 'Treat', text: 'Laser pulses with cooling; each session takes minutes.' },
      { title: 'Heal & repeat', text: 'Simple aftercare, with sessions spaced for the ink to clear.' },
    ],
    results:
      'Each session lightens the ink further. Amateur and black tattoos usually respond best; dense, multicoloured professional tattoos need more sessions, and some colours may not clear completely.',
    cost: 'Depends on the size, colours and number of sessions. You receive a quote after assessment.',
    faqs: [
      {
        q: 'How many sessions will my tattoo need?',
        a: 'It varies with the size, ink colours, depth and age of the tattoo. Most need several sessions spaced six to eight weeks apart.',
      },
      {
        q: 'Does laser tattoo removal leave a scar?',
        a: 'With the right settings and aftercare, scarring is uncommon. Temporary lightening or darkening of the skin can occur and usually settles.',
      },
      {
        q: 'Can eyebrow tattoos be removed?',
        a: 'Yes. Cosmetic brow tattoos can often be lightened or removed, with care taken around the eye area.',
      },
    ],
    doctors: ['dr-eshritha-c', 'dr-jatin-k-reddy'],
    equipment: ['q-switched-diode'],
    related: ['laser-hair-reduction', 'pigmentation-melasma-treatment', 'co2-laser-resurfacing'],
    image: '/images/rua/equipment/q-switched-nd-yag-diode-laser.webp',
    procedureType: 'NoninvasiveProcedure',
  },
  {
    slug: 'co2-laser-resurfacing',
    category: 'laser-treatments',
    name: 'CO₂ Laser Resurfacing',
    h1: 'CO₂ Laser Resurfacing for Scars in Bangalore',
    seo: {
      title: 'CO2 Laser for Acne Scars in Bangalore – Resurfacing | RUA',
      description:
        'Fractional CO₂ laser resurfacing for acne scars, texture and skin growths — by dermatologists who have published research on CO₂ laser scar treatment. RUA, Bengaluru.',
    },
    summary:
      'Fractional CO₂ laser resurfacing creates thousands of microscopic treatment zones in the skin, triggering new collagen to smooth acne scars, uneven texture and enlarged pores. RUA’s dermatologists have published research on pinhole CO₂ ablation for papular scars.',
    facts: [
      { label: 'Technology', value: 'Fractional CO₂ laser' },
      { label: 'Sessions', value: 'Usually 2–4, 4–8 weeks apart' },
      { label: 'Downtime', value: 'Redness and fine crusting for 5–7 days' },
      { label: 'Results', value: 'Build over 3–6 months' },
      { label: 'Also used for', value: 'Precise removal of certain skin growths' },
    ],
    whoFor: [
      'Acne scars — rolling, boxcar and papular scars',
      'Uneven texture and large pores',
      'Surgical and chickenpox scars',
      'Skin growths such as warts or DPNs',
    ],
    steps: [
      { title: 'Prime the skin', text: 'Skin preparation, especially important for darker skin types.' },
      { title: 'Numb', text: 'A numbing cream is applied before the session.' },
      { title: 'Resurface', text: 'Fractional CO₂ treatment tailored to your scars and skin.' },
      { title: 'Heal', text: 'Gentle care and strict sun protection while new skin forms.' },
    ],
    results:
      'Skin looks pink and feels rough for about a week as it heals. Scars soften gradually over the following months as collagen remodels; most people need two to four sessions for a meaningful change.',
    cost: 'Priced per session or as a scar refinement programme, with EMI options.',
    faqs: [
      {
        q: 'Is CO₂ laser safe for Indian skin?',
        a: 'Yes, with careful settings and preparation. Darker skin has a higher risk of temporary pigmentation, so we prime the skin beforehand and plan conservative settings.',
      },
      {
        q: 'How much downtime should I expect?',
        a: 'Usually five to seven days of redness and fine crusting. Most people plan treatment around a few days of rest from social events.',
      },
      {
        q: 'Can CO₂ laser be combined with other scar treatments?',
        a: 'Yes. Scars often respond best to a combination — such as microneedling RF, chemical peels or scar revision procedures — planned by your dermatologist.',
      },
    ],
    doctors: ['dr-eshritha-c', 'dr-jatin-k-reddy'],
    equipment: ['co2-laser'],
    related: ['acne-scar-treatment', 'mnrf-microneedling', 'chemical-peel'],
    image: '/images/rua/equipment/co2-laser.webp',
    procedureType: 'NoninvasiveProcedure',
  },
  {
    slug: 'hydrafacial',
    category: 'aesthetic-dermatology',
    name: 'HydraFacial & Medifacials',
    h1: 'HydraFacial in Bangalore',
    seo: {
      title: 'HydraFacial in Bangalore – Medifacial by Dermatologists | RUA',
      description:
        'HydraFacial and dermatologist-designed medifacials that cleanse, exfoliate, extract and hydrate — glowing skin with no downtime at RUA, Bengaluru.',
    },
    summary:
      'HydraFacial is a medical-grade facial that cleanses, exfoliates, extracts and hydrates in one session, using vortex suction and serums matched to your skin. At RUA it is part of a range of dermatologist-designed medifacials — ideal before events or as monthly skin maintenance.',
    facts: [
      { label: 'Session time', value: 'About 45–60 minutes' },
      { label: 'Downtime', value: 'None — straight back to your day' },
      { label: 'Results', value: 'Instant glow; best with a monthly routine' },
      { label: 'Suits', value: 'Most skin types' },
      { label: 'Popular for', value: 'Bridal prep, dull or congested skin' },
    ],
    whoFor: [
      'Dull, tired or dehydrated skin',
      'Blackheads, congestion and large pores',
      'Pre-event and bridal glow',
      'Monthly maintenance, and post-travel or detox facials',
    ],
    steps: [
      { title: 'Cleanse & exfoliate', text: 'Gentle resurfacing removes dead skin and prepares the pores.' },
      { title: 'Extract', text: 'Painless vortex suction clears blackheads and congestion.' },
      { title: 'Infuse', text: 'Hydrating serums chosen for your skin are infused deep into it.' },
      { title: 'Protect', text: 'Antioxidants and sunscreen to finish.' },
    ],
    results:
      'Skin looks brighter, smoother and more hydrated straight away. Regular monthly sessions maintain the results and keep pores clear.',
    cost: 'Priced per session or as monthly, bridal and RUA Signature Glow packages, with EMI options.',
    faqs: [
      {
        q: 'How often should I get a HydraFacial?',
        a: 'Once a month suits most people for maintenance. Before an event, a session a few days earlier gives the best glow.',
      },
      {
        q: 'Is HydraFacial suitable for acne-prone skin?',
        a: 'It can help with congestion and blackheads. If you have active, inflamed acne, your dermatologist may treat the acne medically first.',
      },
      {
        q: 'HydraFacial or chemical peel?',
        a: 'HydraFacial is gentle with no downtime; peels work deeper on pigmentation, acne and texture. Many plans combine both.',
      },
    ],
    doctors: ['dr-eshritha-c'],
    equipment: ['hydrafacial'],
    related: ['chemical-peel', 'skin-boosters', 'mnrf-microneedling'],
    image: '/images/rua/services/premium-glow.webp',
    procedureType: 'NoninvasiveProcedure',
  },
  {
    slug: 'chemical-peel',
    category: 'aesthetic-dermatology',
    name: 'Chemical Peels',
    h1: 'Chemical Peels in Bangalore',
    seo: {
      title: 'Chemical Peel in Bangalore – For Acne & Pigmentation | RUA',
      description:
        'Dermatologist-chosen chemical peels — glycolic, salicylic, lactic, TCA and depigmenting peels — for acne, pigmentation and dull skin at RUA, Bengaluru.',
    },
    summary:
      'A chemical peel applies a carefully selected acid solution to remove damaged outer layers of skin and stimulate renewal. Your dermatologist chooses the peel and its strength for your concern and skin type — for acne, pigmentation, melasma, dullness or texture.',
    facts: [
      { label: 'Session time', value: '20–40 minutes' },
      { label: 'Typical course', value: '4–6 sessions, 2–4 weeks apart' },
      { label: 'Downtime', value: 'Light flaking for a few days' },
      { label: 'Peel types', value: 'Glycolic, salicylic, lactic, TCA, depigmenting' },
      { label: 'Essential', value: 'Daily sunscreen' },
    ],
    whoFor: [
      'Active acne and post-acne marks',
      'Pigmentation, melasma and uneven tone',
      'Dull, rough or tired-looking skin',
      'Fine lines and uneven texture',
    ],
    steps: [
      { title: 'Analyse & prime', text: 'Skin analysis, with priming creams when needed for Indian skin.' },
      { title: 'Apply', text: 'The chosen peel is applied and timed precisely.' },
      { title: 'Neutralise & soothe', text: 'The peel is neutralised and the skin calmed.' },
      { title: 'Home care', text: 'Gentle skincare and strict sun protection between sessions.' },
    ],
    results:
      'Skin looks fresher after the first peel, with clearer, more even skin building over a course of sessions.',
    cost: 'Priced per session or as part of acne, pigmentation or glow programmes, with EMI options.',
    faqs: [
      {
        q: 'Are chemical peels safe for Indian skin?',
        a: 'Yes, when the peel is chosen and timed by a dermatologist. We often prime the skin first to reduce the risk of pigmentation.',
      },
      {
        q: 'Will my skin peel a lot?',
        a: 'Most medical peels cause light flaking for a few days rather than visible sheets of skin.',
      },
      {
        q: 'How many peels will I need?',
        a: 'Usually four to six sessions, two to four weeks apart, depending on your concern and how your skin responds.',
      },
    ],
    doctors: ['dr-eshritha-c', 'dr-jeevith-c-reddy'],
    related: ['pigmentation-melasma-treatment', 'acne-scar-treatment', 'hydrafacial'],
    image: '/images/rua/services/skin-ritual.webp',
    procedureType: 'NoninvasiveProcedure',
  },
  {
    slug: 'mnrf-microneedling',
    category: 'aesthetic-dermatology',
    name: 'Microneedling RF (MNRF)',
    h1: 'Microneedling RF (MNRF) in Bangalore',
    seo: {
      title: 'MNRF in Bangalore – Microneedling RF for Scars & Pores | RUA',
      description:
        'Microneedling radiofrequency (MNRF) and collagen induction therapy for acne scars, open pores, texture and skin tightening at RUA, Bengaluru.',
    },
    summary:
      'Microneedling RF combines fine needles with radiofrequency energy delivered beneath the skin’s surface. This stimulates collagen and elastin to improve acne scars, enlarged pores, fine lines and early skin laxity — with less surface downtime than ablative lasers.',
    facts: [
      { label: 'Session time', value: '45–60 minutes, including numbing' },
      { label: 'Typical course', value: '3–4 sessions, 4–6 weeks apart' },
      { label: 'Downtime', value: 'Redness for 1–3 days' },
      { label: 'Results', value: 'Improve over about 3 months' },
      { label: 'Also available', value: 'Derma Pen collagen induction therapy' },
    ],
    whoFor: [
      'Acne scars and uneven texture',
      'Enlarged pores',
      'Fine lines and early skin laxity',
      'Stretch marks, in selected cases',
    ],
    steps: [
      { title: 'Consult', text: 'Scar type, skin quality and goals are assessed.' },
      { title: 'Numb', text: 'A numbing cream keeps the treatment comfortable.' },
      { title: 'Treat', text: 'Microneedles deliver radiofrequency energy at the planned depth.' },
      { title: 'Recover', text: 'Gentle skincare and sunscreen while collagen rebuilds.' },
    ],
    results:
      'Skin feels smoother within weeks, and scars and pores continue to improve for about three months after each session as new collagen forms.',
    cost: 'Priced per session or as a package, with EMI options.',
    faqs: [
      {
        q: 'MNRF or CO₂ laser for acne scars?',
        a: 'MNRF has shorter downtime and suits many skin types; fractional CO₂ can resurface more strongly. Your dermatologist may combine them for the best result.',
      },
      {
        q: 'Is MNRF painful?',
        a: 'A numbing cream is applied first, so most people feel warmth and mild prickling during treatment.',
      },
      {
        q: 'When will I see results?',
        a: 'Texture improves within a few weeks, with continued improvement over about three months after each session.',
      },
    ],
    doctors: ['dr-eshritha-c'],
    equipment: ['mnrf', 'derma-pen'],
    related: ['co2-laser-resurfacing', 'acne-scar-treatment', 'skin-boosters'],
    image: '/images/rua/equipment/microneedling-radiofrequency.webp',
    procedureType: 'PercutaneousProcedure',
  },
  {
    slug: 'skin-boosters',
    category: 'aesthetic-dermatology',
    name: 'Skin Boosters, PDRN & NCTF',
    h1: 'Skin Boosters, PDRN & NCTF in Bangalore',
    seo: {
      title: 'Skin Boosters & PDRN in Bangalore – Hydration & Repair | RUA',
      description:
        'Injectable skin boosters, PDRN (polynucleotide “salmon DNA”), NCTF, exosome and PRP rejuvenation for glow, fine lines and tired under-eyes — by RUA’s dermatologists.',
    },
    summary:
      'Skin boosters are micro-injections that improve the skin from within. Hyaluronic-acid boosters deeply hydrate, PDRN (polynucleotides, often called “salmon DNA”) supports repair and regeneration, and NCTF delivers a revitalising complex for dull skin, fine lines and tired under-eyes. Exosome and PRP skin rejuvenation are also available.',
    facts: [
      { label: 'Session time', value: '30–45 minutes' },
      { label: 'Typical course', value: '2–3 sessions, 3–4 weeks apart' },
      { label: 'Downtime', value: 'Small bumps settle in 1–2 days' },
      { label: 'Results', value: 'Glow and hydration build over weeks' },
      { label: 'Options', value: 'HA boosters, PDRN, NCTF, exosomes, PRP' },
    ],
    whoFor: [
      'Dull, dehydrated or tired-looking skin',
      'Fine lines and crepey texture',
      'Under-eye hollowness and dark circles (NCTF)',
      'Skin recovering from acne, lasers or sun damage (PDRN)',
    ],
    steps: [
      { title: 'Assess', text: 'Skin quality, concerns and goals are reviewed.' },
      { title: 'Numb', text: 'A numbing cream is applied for comfort.' },
      { title: 'Micro-injections', text: 'The chosen booster is placed in tiny amounts across the treatment area.' },
      { title: 'Aftercare', text: 'Small bumps settle within a day or two; avoid make-up briefly.' },
    ],
    results:
      'Skin looks more hydrated and radiant within a few weeks, and keeps improving through the course. Maintenance sessions every few months sustain the effect.',
    cost: 'Priced by product and number of sessions, or as an anti-ageing programme, with EMI options.',
    faqs: [
      {
        q: 'What is PDRN or “salmon DNA”?',
        a: 'PDRN is a purified polynucleotide derived from salmon DNA. It is used in dermatology to support skin repair and regeneration, and is injected in tiny amounts by a doctor.',
      },
      {
        q: 'Are skin boosters the same as fillers?',
        a: 'No. Boosters spread through the skin to improve hydration and quality; fillers add volume or shape to specific areas.',
      },
      {
        q: 'How long do the results last?',
        a: 'Typically a few months. A maintenance session every few months keeps the effect.',
      },
    ],
    doctors: ['dr-eshritha-c'],
    related: ['botox-fillers', 'hydrafacial', 'mnrf-microneedling'],
    image: '/images/rua/services/premium-glow.webp',
    procedureType: 'PercutaneousProcedure',
  },
  {
    slug: 'botox-fillers',
    category: 'aesthetic-dermatology',
    name: 'Botox & Dermal Fillers',
    h1: 'Botox & Dermal Fillers in Bangalore',
    seo: {
      title: 'Botox & Fillers in Bangalore – Natural Results | RUA',
      description:
        'Doctor-administered Botox for lines and jaw slimming, hyaluronic-acid fillers for lips, under-eyes and contours, and thread lifts — natural-looking results at RUA.',
    },
    summary:
      'Botulinum toxin (“Botox”) relaxes specific muscles to soften expression lines, while hyaluronic-acid dermal fillers restore volume and refine contours. At RUA both are performed by dermatologists, with a conservative approach that keeps your expressions natural. Thread lifts are also available for lifting and contouring.',
    facts: [
      { label: 'Treatment time', value: '15–45 minutes' },
      { label: 'Downtime', value: 'Minimal; small bruises are possible' },
      { label: 'Botox results', value: 'Visible in 3–7 days, lasting about 3–4 months' },
      { label: 'Filler results', value: 'Immediate, lasting months depending on area' },
      { label: 'Approach', value: 'Natural, conservative and doctor-led' },
    ],
    whoFor: [
      'Forehead lines, frown lines and crow’s feet',
      'Jaw (masseter) slimming and teeth grinding',
      'Lip enhancement and definition',
      'Under-eye hollows, cheeks and chin',
      'Lifting and contouring with threads',
    ],
    steps: [
      { title: 'Facial assessment', text: 'Your features, expressions and goals are analysed.' },
      { title: 'Plan & consent', text: 'A clear plan, product choice and expected results.' },
      { title: 'Precise treatment', text: 'Fine injections placed by the doctor.' },
      { title: 'Review', text: 'A check-in at about two weeks to fine-tune if needed.' },
    ],
    results:
      'Botox softens lines within a week and lasts around three to four months. Fillers show immediately and last for months, depending on the area and product.',
    cost: 'Priced by product, units or syringes, and area. You receive a clear quote after your facial assessment.',
    faqs: [
      {
        q: 'Will I look frozen?',
        a: 'Not with a conservative, well-placed dose. Our aim is to soften lines while keeping natural expression.',
      },
      {
        q: 'Are fillers reversible?',
        a: 'Hyaluronic-acid fillers can be dissolved with an enzyme if needed.',
      },
      {
        q: 'Is Botox safe?',
        a: 'In qualified hands and at cosmetic doses, botulinum toxin has a long safety record. Your dermatologist reviews your medical history first.',
      },
    ],
    doctors: ['dr-eshritha-c'],
    related: ['skin-boosters', 'mnrf-microneedling', 'hydrafacial'],
    image: '/images/rua/equipment/radiofrequency-plasma-pen.webp',
    procedureType: 'PercutaneousProcedure',
  },
]
