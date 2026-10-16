"""Fictional seed content for the Cedarline Multispeciality Clinic demo.

Everything here is invented for demonstration: the clinic, doctors, qualifications,
prices and policies. Phone numbers use an invalid Bengaluru prefix (80-0xxx) and
emails use the reserved `.example` domain so they can never reach a real person.
Photos are royalty-free stock images (Unsplash) and do not depict the named people.
"""

from datetime import time

CLINIC = {
    "name": "Cedarline Multispeciality Clinic",
    "tagline": "Specialist dental, skin, hair and family care under one roof.",
    "about": (
        "Cedarline Multispeciality Clinic is an outpatient clinic offering general medicine, paediatrics, "
        "dental care, dermatology and hair & scalp care. Our team of nine consultants works together so "
        "families can see the right specialist without moving between hospitals. The clinic has modern "
        "dental suites, a dedicated dermatology procedure room, an in-house sample collection point and "
        "a step-free entrance with lift access."
    ),
    "phone": "+91 80 0123 4567",
    "whatsapp": None,
    "email": "hello@cedarline.example",
    "address_line": "2nd Floor, Cedar Court, 48 Lakeside Avenue, Indiranagar",
    "city": "Bengaluru",
    "state": "Karnataka",
    "postal_code": "560038",
    "country": "India",
    "map_embed_url": "https://www.google.com/maps?q=Indiranagar,Bengaluru&output=embed",
    "opening_hours": [
        {"day": "Monday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "Tuesday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "Wednesday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "Thursday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "Friday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "Saturday", "open": "09:00", "close": "17:00", "closed": False},
        {"day": "Sunday", "open": None, "close": None, "closed": True},
    ],
    "emergency_note": (
        "Cedarline is an outpatient clinic and does not provide emergency care. In a medical emergency, "
        "call 112 or go to the nearest hospital emergency department."
    ),
}

MON, TUE, WED, THU, FRI, SAT = range(6)

DOCTORS = [
    {
        "slug": "ananya-rao",
        "full_name": "Dr. Ananya Rao",
        "department": "general",
        "specialization": "Family Physician",
        "qualifications": "MBBS, MD (Family Medicine)",
        "experience_years": 14,
        "bio": "Dr. Ananya Rao leads Cedarline's general medicine team. She sees adults for everyday illnesses, "
        "long-term conditions and preventive check-ups, and coordinates referrals to our specialists.",
        "languages": ["English", "Kannada", "Hindi"],
        "photo_url": "/images/doctors/ananya-rao.webp",
        "consultation_days": [MON, TUE, WED, THU, FRI, SAT],
        "start_time": time(9, 0),
        "end_time": time(13, 0),
        "slot_minutes": 20,
    },
    {
        "slug": "vikram-menon",
        "full_name": "Dr. Vikram Menon",
        "department": "general",
        "specialization": "Internal Medicine Specialist",
        "qualifications": "MBBS, MD (Internal Medicine)",
        "experience_years": 18,
        "bio": "Dr. Vikram Menon focuses on adult internal medicine, including diabetes, blood pressure and "
        "thyroid follow-up. He runs Cedarline's evening clinic for working professionals.",
        "languages": ["English", "Malayalam", "Hindi"],
        "photo_url": "/images/doctors/vikram-menon.webp",
        "consultation_days": [MON, WED, FRI],
        "start_time": time(14, 0),
        "end_time": time(20, 0),
        "slot_minutes": 20,
    },
    {
        "slug": "arjun-nair",
        "full_name": "Dr. Arjun Nair",
        "department": "dental",
        "specialization": "Orthodontist",
        "qualifications": "BDS, MDS (Orthodontics)",
        "experience_years": 11,
        "bio": "Dr. Arjun Nair straightens teeth for teenagers and adults using metal braces, ceramic braces "
        "and clear aligners, with digital scans in place of messy impressions wherever possible.",
        "languages": ["English", "Malayalam", "Tamil"],
        "photo_url": "/images/doctors/arjun-nair.webp",
        "consultation_days": [MON, TUE, THU, SAT],
        "start_time": time(10, 0),
        "end_time": time(17, 0),
        "slot_minutes": 30,
    },
    {
        "slug": "meera-iyer",
        "full_name": "Dr. Meera Iyer",
        "department": "dental",
        "specialization": "Restorative & Cosmetic Dentist",
        "qualifications": "BDS, MDS (Conservative Dentistry & Endodontics)",
        "experience_years": 9,
        "bio": "Dr. Meera Iyer provides check-ups, fillings, root canal treatment, implants and whitening. "
        "She is known for unhurried appointments and clear explanations of every option and cost.",
        "languages": ["English", "Tamil", "Kannada"],
        "photo_url": "/images/doctors/meera-iyer.webp",
        "consultation_days": [TUE, WED, FRI],
        "start_time": time(9, 0),
        "end_time": time(16, 0),
        "slot_minutes": 30,
    },
    {
        "slug": "naomi-fernandes",
        "full_name": "Dr. Naomi Fernandes",
        "department": "skin",
        "specialization": "Consultant Dermatologist",
        "qualifications": "MBBS, MD (Dermatology, Venereology & Leprosy)",
        "experience_years": 12,
        "bio": "Dr. Naomi Fernandes treats skin, nail and allergy-related skin concerns in adults and children, "
        "including acne, eczema and pigmentation, and supervises all procedures in our dermatology suite.",
        "languages": ["English", "Konkani", "Hindi"],
        "photo_url": "/images/doctors/naomi-fernandes.webp",
        "consultation_days": [MON, WED, THU, SAT],
        "start_time": time(10, 0),
        "end_time": time(16, 0),
        "slot_minutes": 30,
    },
    {
        "slug": "rohan-kapoor",
        "full_name": "Dr. Rohan Kapoor",
        "department": "skin",
        "specialization": "Aesthetic Dermatologist",
        "qualifications": "MBBS, DNB (Dermatology)",
        "experience_years": 8,
        "bio": "Dr. Rohan Kapoor performs chemical peels, laser hair reduction and acne-scar procedures, "
        "and believes in realistic expectations and evidence-based treatment plans.",
        "languages": ["English", "Hindi", "Punjabi"],
        "photo_url": "/images/doctors/rohan-kapoor.webp",
        "consultation_days": [TUE, FRI, SAT],
        "start_time": time(12, 0),
        "end_time": time(17, 0),
        "slot_minutes": 30,
    },
    {
        "slug": "sara-thomas",
        "full_name": "Dr. Sara Thomas",
        "department": "hair",
        "specialization": "Trichologist",
        "qualifications": "MBBS, MD (Dermatology), Fellowship in Trichology",
        "experience_years": 10,
        "bio": "Dr. Sara Thomas specialises in hair and scalp conditions. Her consultations include "
        "trichoscopy (a magnified scalp examination) and, where needed, blood tests to look for causes.",
        "languages": ["English", "Malayalam"],
        "photo_url": "/images/doctors/sara-thomas.webp",
        "consultation_days": [MON, THU, FRI],
        "start_time": time(10, 0),
        "end_time": time(17, 0),
        "slot_minutes": 30,
    },
    {
        "slug": "daniel-dsouza",
        "full_name": "Dr. Daniel D'Souza",
        "department": "hair",
        "specialization": "Hair Restoration Surgeon",
        "qualifications": "MBBS, MS (General Surgery), MCh (Plastic Surgery)",
        "experience_years": 15,
        "bio": "Dr. Daniel D'Souza assesses patients for hair restoration, including FUE hair transplantation, "
        "and plans procedures only after a detailed consultation and scalp evaluation.",
        "languages": ["English", "Kannada", "Konkani"],
        "photo_url": "/images/doctors/daniel-dsouza.webp",
        "consultation_days": [WED, SAT],
        "start_time": time(11, 0),
        "end_time": time(17, 0),
        "slot_minutes": 45,
    },
    {
        "slug": "leela-krishnan",
        "full_name": "Dr. Leela Krishnan",
        "department": "pediatrics",
        "specialization": "Paediatrician",
        "qualifications": "MBBS, MD (Paediatrics)",
        "experience_years": 13,
        "bio": "Dr. Leela Krishnan cares for newborns, children and teenagers, from routine growth checks and "
        "immunisations to common childhood illnesses, with a calm, child-friendly approach.",
        "languages": ["English", "Tamil", "Kannada"],
        "photo_url": "/images/doctors/leela-krishnan.webp",
        "consultation_days": [MON, TUE, WED, THU, FRI],
        "start_time": time(9, 0),
        "end_time": time(14, 0),
        "slot_minutes": 20,
    },
]

SERVICES = [
    # --- General medicine --------------------------------------------------------------
    ("general", "general-consultation", "General Physician Consultation", "stethoscope", 20, 700,
     "Consultations for everyday illnesses, follow-ups and referrals to the right specialist.",
     "A consultation with a family physician for common illnesses such as fevers, coughs and infections, "
     "follow-up of ongoing conditions, and referrals to Cedarline specialists when needed."),
    ("general", "preventive-health-checkup", "Preventive Health Check-up", "clipboard-check", 60, 2500,
     "Age-appropriate screening packages with a doctor's review of your results.",
     "Preventive check-up packages that combine routine blood tests, vital signs and a physician review. "
     "The doctor explains the results and suggests follow-up where appropriate."),
    ("general", "diabetes-bp-care", "Diabetes & Blood Pressure Care", "activity", 30, 900,
     "Regular reviews and lifestyle guidance for long-term conditions.",
     "Structured follow-up visits for people living with diabetes, high blood pressure or thyroid conditions, "
     "including review of home readings and test results."),
    # --- Paediatrics --------------------------------------------------------------------
    ("pediatrics", "child-wellness", "Child Wellness & Growth Checks", "baby", 20, 800,
     "Growth, development and nutrition reviews from newborns to teens.",
     "Routine well-child visits that track growth and development milestones, with time for parents' questions."),
    ("pediatrics", "childhood-immunisation", "Childhood Immunisation", "syringe", 20, None,
     "Vaccinations following the recommended immunisation schedule.",
     "Childhood vaccinations given by our paediatric team, with records updated at every visit. "
     "Vaccine costs vary and are confirmed at the clinic."),
    # --- Dental ---------------------------------------------------------------------------
    ("dental", "dental-checkup-cleaning", "Dental Check-up & Cleaning", "smile", 45, 1200,
     "Examination, scaling and polishing to keep teeth and gums healthy.",
     "A full dental examination with scaling and polishing to remove plaque and tartar, plus advice on "
     "brushing and flossing. X-rays are taken only when needed."),
    ("dental", "root-canal-treatment", "Root Canal Treatment", "shield-plus", 60, 6500,
     "Treatment to save a tooth with an infected or inflamed nerve.",
     "Root canal treatment cleans and seals the inside of a tooth so it can be kept. It is usually completed "
     "in one to three visits under local anaesthesia, and the tooth may need a crown afterwards."),
    ("dental", "braces-aligners", "Braces & Clear Aligners", "align-center", 45, 45000,
     "Metal, ceramic and clear aligner options to straighten teeth.",
     "Orthodontic treatment for teenagers and adults using metal braces, tooth-coloured ceramic braces or "
     "removable clear aligners. Treatment length depends on each case and is discussed at consultation."),
    ("dental", "teeth-whitening", "Teeth Whitening", "sparkles", 60, 8000,
     "Professional in-clinic whitening supervised by a dentist.",
     "In-clinic teeth whitening after a dental check-up to make sure whitening is suitable. Results vary "
     "from person to person."),
    ("dental", "dental-implants", "Dental Implants", "anchor", 60, 30000,
     "Fixed replacement for missing teeth, planned with 3D imaging.",
     "Dental implants replace missing teeth with a titanium post and crown. Suitability is assessed at a "
     "consultation, which may include 3D imaging."),
    ("dental", "childrens-dentistry", "Children's Dentistry", "baby", 30, 900,
     "Gentle check-ups, fluoride and sealants for children.",
     "Child-friendly dental visits including check-ups, fluoride application and fissure sealants to "
     "help prevent cavities."),
    # --- Skin -----------------------------------------------------------------------------
    ("skin", "dermatology-consultation", "Dermatology Consultation", "scan-face", 30, 1000,
     "Assessment of skin, nail and scalp concerns by a dermatologist.",
     "A consultation with a dermatologist for concerns such as acne, rashes, eczema, moles, nail problems "
     "and pigmentation, with a personalised plan made by the doctor."),
    ("skin", "acne-scar-treatment", "Acne & Acne-Scar Treatment", "droplets", 45, 2500,
     "Medical and procedural options for active acne and acne scars.",
     "Doctor-led care for active acne and acne scarring. Depending on the dermatologist's assessment this "
     "may include prescription skincare, peels, microneedling or laser sessions."),
    ("skin", "chemical-peels", "Chemical Peels", "flask-conical", 45, 3000,
     "Clinical-grade peels performed by a dermatologist.",
     "Chemical peels use controlled exfoliation to improve the look of dull skin, uneven tone or mild "
     "scarring. Peel type and number of sessions are decided by the dermatologist."),
    ("skin", "pigmentation-care", "Pigmentation & Melasma Care", "sun", 45, 3500,
     "Assessment and management plans for uneven skin tone.",
     "Assessment of pigmentation concerns such as melasma, sun spots and post-acne marks, followed by a "
     "management plan that may combine sun protection, topical care and procedures."),
    ("skin", "laser-hair-reduction", "Laser Hair Reduction", "zap", 60, 4000,
     "Medical-grade laser sessions for long-term hair reduction.",
     "Laser hair reduction performed with medical-grade equipment after a patch test. Several sessions are "
     "usually needed and the number varies by skin and hair type."),
    # --- Hair -----------------------------------------------------------------------------
    ("hair", "hair-scalp-consultation", "Hair & Scalp Consultation", "search", 30, 1200,
     "Trichologist assessment including trichoscopy of the scalp.",
     "A consultation with a trichologist for hair fall, thinning or scalp concerns, including trichoscopy "
     "(a magnified scalp examination). Blood tests may be suggested to look for underlying causes."),
    ("hair", "prp-hair-therapy", "PRP Therapy for Hair", "test-tube", 60, 5000,
     "Platelet-rich plasma sessions, offered after a trichologist's assessment.",
     "PRP (platelet-rich plasma) therapy uses a concentrate prepared from the patient's own blood. It is "
     "offered only when the trichologist considers it suitable, usually as a course of sessions."),
    ("hair", "scalp-treatment", "Dandruff & Scalp Treatment", "wind", 45, 2000,
     "Clinic-based care for flaky, itchy or oily scalps.",
     "Assessment and clinic-based treatment for dandruff and other scalp concerns, with a home-care plan "
     "set by the doctor."),
    ("hair", "hair-transplant-consultation", "Hair Transplant Consultation (FUE)", "scissors", 45, 1500,
     "Detailed assessment for follicular unit extraction (FUE).",
     "A detailed consultation with our hair restoration surgeon to assess donor area, expectations and "
     "suitability for FUE hair transplantation before any procedure is planned."),
]

BLOG_DISCLAIMER = (
    "\n\n## A note from Cedarline\nThis article is general information for patient education. It is not a "
    "diagnosis or a substitute for advice from a qualified healthcare professional who knows your history."
)

BLOG_POSTS = [
    {
        "slug": "how-often-should-you-see-the-dentist",
        "title": "How often should you see the dentist?",
        "category": "Dental",
        "author": "meera-iyer",
        "cover_image": "/images/blog/dental-xray.webp",
        "reading_minutes": 4,
        "days_ago": 6,
        "excerpt": "Routine check-ups catch small problems before they become painful or expensive. Here is what a "
        "typical check-up involves and how to plan your visits.",
        "content": "Many people only visit a dentist when something hurts. Regular check-ups make it possible to "
        "spot problems such as cavities and gum inflammation early, when treatment is usually simpler.\n\n"
        "## What happens at a check-up\nA check-up at Cedarline includes an examination of your teeth, gums "
        "and mouth, followed by scaling and polishing when needed. X-rays are taken only when the dentist "
        "needs more information.\n\n## How often to go\nMany adults are advised to have a check-up about every "
        "six months, but the right interval depends on your own oral health. Your dentist will recommend a "
        "schedule that suits you.\n\n## Between visits\nBrush twice a day with a fluoride toothpaste, clean "
        "between your teeth daily, and limit sugary snacks and drinks between meals.",
    },
    {
        "slug": "clear-aligners-or-braces",
        "title": "Clear aligners or braces: what to know before you decide",
        "category": "Dental",
        "author": "arjun-nair",
        "cover_image": "/images/blog/aligners.webp",
        "reading_minutes": 5,
        "days_ago": 15,
        "excerpt": "Both can straighten teeth effectively. The better choice depends on your bite, your lifestyle "
        "and how consistently you can wear aligners.",
        "content": "Orthodontic treatment moves teeth gradually into better positions. Today patients can choose "
        "between fixed braces and removable clear aligners.\n\n## Fixed braces\nMetal or tooth-coloured "
        "ceramic brackets are bonded to the teeth and adjusted at regular visits. Because they are fixed, they "
        "work continuously without relying on the patient to wear them.\n\n## Clear aligners\nAligners are a "
        "series of removable transparent trays. They are discreet and easy to clean around, but they only work "
        "when worn for most of the day, as instructed by the orthodontist.\n\n## Making the choice\nAn "
        "orthodontic consultation includes an examination and scans so the orthodontist can explain which "
        "options suit your teeth, the expected treatment time and the cost.",
    },
    {
        "slug": "simple-daily-skincare-routine",
        "title": "Building a simple daily skincare routine",
        "category": "Skin",
        "author": "naomi-fernandes",
        "cover_image": "/images/blog/skincare.webp",
        "reading_minutes": 4,
        "days_ago": 9,
        "excerpt": "A routine does not need ten steps. Cleansing, moisturising and sun protection cover the basics "
        "for most people.",
        "content": "Skincare marketing can make routines feel complicated. For most people, a few consistent "
        "steps matter more than the number of products.\n\n## The basics\nA gentle cleanser, a moisturiser "
        "suited to your skin type, and a broad-spectrum sunscreen during the day form a sensible foundation.\n\n"
        "## Introduce products slowly\nWhen trying something new, add one product at a time so you can tell "
        "how your skin responds.\n\n## When to see a dermatologist\nIf a skin concern is persistent, painful, "
        "spreading or affecting your confidence, a dermatologist can assess it and suggest an appropriate plan.",
    },
    {
        "slug": "sunscreen-basics",
        "title": "Sunscreen basics: choosing and using it well",
        "category": "Skin",
        "author": "rohan-kapoor",
        "cover_image": "/images/blog/doctor-phone.webp",
        "reading_minutes": 3,
        "days_ago": 24,
        "excerpt": "Sun protection is one of the simplest daily habits for healthy skin. Here is how to pick a "
        "sunscreen and apply enough of it.",
        "content": "Ultraviolet (UV) exposure contributes to sunburn, uneven skin tone and skin ageing.\n\n## "
        "Choosing a sunscreen\nLook for a product labelled broad-spectrum, which protects against both UVA and "
        "UVB rays, in a texture you are happy to wear every day.\n\n## Using enough\nMost people apply less "
        "than the amount used in product testing. Apply generously to all exposed skin and reapply after "
        "sweating, swimming or long periods outdoors.\n\n## More than sunscreen\nShade, hats and sunglasses add "
        "useful protection, especially around midday.",
    },
    {
        "slug": "hair-fall-when-to-see-a-specialist",
        "title": "Hair fall: when should you see a specialist?",
        "category": "Hair",
        "author": "sara-thomas",
        "cover_image": "/images/blog/hair-care.webp",
        "reading_minutes": 4,
        "days_ago": 12,
        "excerpt": "Shedding some hair every day is normal. Sudden, patchy or persistent hair loss deserves a "
        "proper assessment.",
        "content": "Everyone sheds hair daily as part of the normal hair growth cycle, so finding some hair on "
        "your brush is not usually a cause for concern.\n\n## Signs worth checking\nIt is worth seeing a "
        "specialist if you notice sudden heavy shedding, patches of hair loss, a widening parting, or scalp "
        "itching, redness or pain.\n\n## What a consultation involves\nAt Cedarline, a trichologist reviews "
        "your history, examines the scalp using trichoscopy and may suggest blood tests. Treatment is planned "
        "only after this assessment.\n\n## Why self-treatment can mislead\nHair loss has many possible causes, "
        "so products that help one person may not help another.",
    },
    {
        "slug": "preparing-for-your-first-appointment",
        "title": "Preparing for your first appointment: a quick checklist",
        "category": "Patient Guide",
        "author": "ananya-rao",
        "cover_image": "/images/blog/health-records.webp",
        "reading_minutes": 3,
        "days_ago": 3,
        "excerpt": "A little preparation helps you get the most from your consultation. Bring these items and "
        "arrive a few minutes early.",
        "content": "A first visit goes more smoothly when the doctor has the information they need.\n\n## What "
        "to bring\nBring a photo ID, a list of any medicines you take, previous reports "
        "or prescriptions related to your concern, and your insurance details if you plan to claim "
        "reimbursement.\n\n## Before you arrive\nWrite down your main questions so you don't forget them, and "
        "arrive about 10 minutes early to complete registration.\n\n## Children\nPatients under 18 must be "
        "accompanied by a parent or guardian.",
    },
    {
        "slug": "why-preventive-health-checkups-matter",
        "title": "Why preventive health check-ups matter",
        "category": "General Health",
        "author": "vikram-menon",
        "cover_image": "/images/blog/stethoscope.webp",
        "reading_minutes": 4,
        "days_ago": 30,
        "excerpt": "Some common conditions cause few symptoms early on. Periodic check-ups help you and your doctor "
        "keep track of your health over time.",
        "content": "Conditions such as high blood pressure or raised blood sugar can develop gradually without "
        "obvious symptoms.\n\n## What a check-up looks like\nA preventive check-up usually combines a "
        "conversation about your history and lifestyle, basic measurements such as blood pressure and weight, "
        "and blood tests chosen for your age and risk factors.\n\n## Making results useful\nResults are most "
        "helpful when a doctor reviews them with you and compares them over time. At Cedarline every package "
        "includes a physician review.",
    },
    {
        "slug": "keeping-track-of-childhood-vaccinations",
        "title": "Keeping track of your child's vaccinations",
        "category": "Children's Health",
        "author": "leela-krishnan",
        "cover_image": "/images/doctor-patient.webp",
        "reading_minutes": 3,
        "days_ago": 20,
        "excerpt": "A simple system for remembering due dates means fewer missed doses and less stress at each visit.",
        "content": "Childhood immunisation schedules include several visits in the first years of life, which "
        "can be hard to keep track of.\n\n## Keep one record\nKeep your child's vaccination card in one place "
        "and bring it to every visit so it can be updated.\n\n## Set reminders\nAsk the clinic for the next due "
        "date at each visit and add it to your phone calendar.\n\n## Missed a dose?\nIf a vaccine has been "
        "missed, speak to your paediatrician, who can advise how to catch up.",
    },
]
