# RUA Skin & Hair Center — Website, SEO & Brand Audit

**Prepared for:** RUA Skin & Hair Center
**Prepared by:** Arquette Digital
**Date:** 2 November 2026
**Site audited:** https://www.ruaskinandhair.com — Home, Services, Centers, About Us, Contact, `robots.txt`, `sitemap.xml` (raw HTML and HTTP checks on 2 Nov 2026)
**Measured against:** RUA Business Growth Assessment, Local Competitor Analysis and Bengaluru Search Volume Audit (Arquette Digital, Oct 2026); RUA's Instagram (@ruaskinandhair); clinic photographs supplied by RUA
**Status:** audit only — nothing on the live site or the new platform has been changed.

---

## Summary

The live site looks like RUA, but search engines can barely use it. Every page tells Google that its real address is on **ruaskinandhaircenter.com — a domain that does not exist** — and three inner pages say they are copies of the homepage. There are no pages for the treatments, doctors or centres that Bengaluru patients search for (HydraFacial 6,600 searches a month, hair loss treatment 4,400, laser hair removal 4,400, hair transplant 2,900…). The header's **Call Us Now button dials +1234567890**.

Five fixes this week (section 1) stop the self-inflicted damage on the current site. The Phase 1 build then needs the structure in section 7: a services hub with six treatment clusters and dedicated treatment pages, a page per doctor, a page per centre, and online booking with tracking. The design should make the website feel like walking into the clinic (section 6).

| Area | Rating | Headline finding |
|---|---|---|
| Indexing & canonicals | **Critical** | Canonical, og:url, schema and sitemap all point to a non-existent domain; /services, /centers and /about-us canonicalise to the homepage |
| Calls & conversion | **Critical** | Header call button dials a placeholder number; no online booking; no conversion events |
| On-page SEO | Poor | One 144-character title shared by 4 of 5 pages; 0–7 H1s per page |
| Site structure | Poor | ~75 treatments listed on one page; no treatment, doctor or centre URLs |
| Structured data | Weak | Organization + WebSite only (on the dead domain); no clinic, doctor or treatment schema |
| Local SEO (website side) | Weak | Both centres share one page; nothing for the Indiranagar Google profile to link to |
| Doctor authority (E-E-A-T) | Under-used | Strong credentials and published research, but no doctor pages; papers shown as raw links |
| Brand & design | Good base | Colours match the clinic; photography is mostly stock and placeholder |
| Rendering & speed | Fair | Server-rendered (good); no caching; several multi-MB images |
| Measurement | Partial | GA4 only; no Tag Manager, Meta Pixel, or call/WhatsApp/form conversions |

---

## 1. Fix this week (live site)

### 1.1 Canonicals, sitemap and schema point to a domain that doesn't exist — Critical

- **Evidence:** every page declares `rel="canonical"` on `https://ruaskinandhaircenter.com` (Contact uses `…/contact`). The same host is used in `og:url`, in the Organization and WebSite schema (`url`, `logo`), in the `Sitemap:` line of robots.txt and in all five sitemap URLs. A DNS lookup for ruaskinandhaircenter.com returns *non-existent domain*.
- **Why it matters:** Google is told the preferred copy of every page lives on a host that can't be reached. The sitemap can't help indexing because none of its URLs are on the live site, and link previews and schema reference broken URLs.
- **Fix:** set the site URL to `https://www.ruaskinandhair.com` in one place (the Next.js `metadataBase` / site config) and regenerate canonicals, `og:url`, schema and the sitemap from it. Resubmit the sitemap in Search Console for the `www.ruaskinandhair.com` property.

### 1.2 Inner pages canonicalise to the homepage — Critical

- **Evidence:** /services, /centers and /about-us all declare the homepage as their canonical.
- **Why it matters:** this asks Google to treat them as duplicates of the homepage, so they are unlikely to rank for anything of their own.
- **Fix:** a self-referencing canonical on every page.

### 1.3 "Call Us Now" dials +1234567890 — Critical

- **Evidence:** `tel:+1234567890` appears twice on every page (the header call button). Centre phone numbers are mostly plain text; the only real tel link (`tel:+91 70199 76689`, on Services and About) contains spaces.
- **Fix:** point the header button at a real number, or a two-option menu (Indiranagar `+91 70199 76689`, Ramamurthy Nagar `+91 99597 63678`). Make every phone number tappable, written as `tel:+917019976689`.

### 1.4 Four pages share one title and description — High

- **Evidence:** Home, Services, Centers and About Us all use the same 144-character title, *"RUA Skin & Hair Center - RUA Skin & Hair Center provides trusted care for skin and hair concerns with safe treatments and professional guidance."*, and the same meta description. Google shows about 60 characters, so the brand name repeats and the topic is cut off. Only Contact has its own.
- **Fix (examples):**

| Page | Title | Description |
|---|---|---|
| Home | RUA Skin & Hair Center – Dermatologists in Bangalore | Doctor-led skin, hair and laser care from 3 MD dermatologists in Indiranagar and Ramamurthy Nagar. Open 7 days, 10am–8pm. Book a consultation. |
| Services | Skin, Hair & Laser Treatments in Bangalore \| RUA | Medical dermatology, dermatosurgery, lasers, aesthetics, hair treatments and hair transplants at RUA's two Bengaluru centres. |
| Centers | Skin & Hair Clinics in Indiranagar & Ramamurthy Nagar \| RUA | Addresses, timings, directions and doctors at RUA Indiranagar and RUA Ramamurthy Nagar, Bengaluru. Open 7 days. |
| About Us | About RUA – Founded by Three Dermatologists \| RUA | How Dr. Eshritha C, Dr. Jatin K Reddy and Dr. Jeevith C Reddy built RUA: philosophy, equipment and published research. |

### 1.5 Sitemap and robots.txt — High

- **Evidence:** robots.txt points to `https://ruaskinandhaircenter.com/sitemap.xml`. The sitemap lists five URLs on that dead host, including `/about` (which returns 404 — the live page is `/about-us`), all with the same `lastmod` of 20 Dec 2025.
- **Fix:** generate the sitemap from the real routes on `www.ruaskinandhair.com` with true last-modified dates, and reference it in robots.txt.

### Quick wins (same week)

- **Redirects:** `https://ruaskinandhair.com` answers with a **307 (temporary)** redirect to www, and `http://ruaskinandhair.com` takes two hops. Use one permanent (301/308) redirect straight to `https://www.ruaskinandhair.com`.
- **Headings:** one H1 per page (today: Home 2, Services 2, About Us 7, Contact 0).
- **Services page errors:** fix the content errors listed in section 3.2.
- **Broken and unlabelled links:** the LinkedIn footer link is `#` on every page, and the map and WhatsApp buttons have no text label (screen readers announce nothing).
- **Language:** change `lang="en"` to `lang="en-IN"`.

---

## 2. Technical SEO

| Check | Finding | Recommendation |
|---|---|---|
| Rendering | Next.js on Vercel; page text is in the raw HTML (server-rendered). | Good. Keep this standard in any rebuild (see section 8). |
| Caching | `Cache-Control: private, no-cache, no-store`; Vercel cache `MISS` on the homepage. Every visit is rendered on demand. | Statically generate (or ISR) the public pages for a faster first byte. |
| Images | Large source files: Hero.png 3.9 MB (served through the optimiser), 4.png 2.2 MB, team.png 2.4 MB, derma_pen.jpg 1.25 MB, logo_icon.png 5000×5000 px. Machine, team and service images bypass the optimiser (direct `src`). | Serve AVIF/WebP at display size; preload the main (LCP) image. |
| Alt text | "logo" ×10, "Testimonial" ×9, "Hero Image" ×6, "icon" ×5, "abstract_1" ×4, "up-right-arrow" ×3. The Hair Transplant card reuses the alt "Hair Treatments". | Describe the picture ("Dr. Jatin K Reddy performing a laser treatment at RUA"); give decorative images `alt=""`. |
| Structured data | Organization (name, url, logo) and WebSite only — both on the dead domain. | Add MedicalClinic per centre, Physician per doctor, MedicalProcedure/MedicalWebPage per treatment, and BreadcrumbList (section 7.5). |
| Analytics | GA4 (`G-XQXYNQCWV4`) via gtag on every page. No Google Tag Manager, no Meta Pixel, and nothing in the page code marks calls, WhatsApp taps or form submissions as conversions. No Search Console meta tag (it may be DNS-verified). | Set up Tag Manager and the event plan in section 5. Confirm the Search Console property covers `www.ruaskinandhair.com`. |
| Not checked | Core Web Vitals field data, Search Console coverage, backlinks. | Export from Search Console and PageSpeed Insights before the rebuild, as a baseline. |

---

## 3. Content and site structure

### 3.1 Nothing to rank with

The site has five pages. All ~75 treatments are bullet points on one Services page, and URLs such as `/services/hair-transplant`, `/services/prp-hair-treatment` and `/doctors` return 404. The demand in the Search Volume Audit (Bengaluru, monthly) has nowhere to land:

| Searches | On the site today |
|---|---|
| dermatologist near me 60,500 · skin doctor near me 22,200 · skin clinic near me 9,900 | Homepage and Google profiles only; no centre pages |
| HydraFacial 6,600 · HydraFacial near me 3,600 · HydraFacial price 1,600 | Not listed as a treatment (only "Medifacials", and the machine on About), although it is an Instagram highlight |
| laser hair removal 4,400 · facial hair removal 4,400 · laser hair removal cost 880 | One bullet: "Laser hair reduction (Triple wavelength)" |
| hair loss treatment 4,400 · dermatologist for hair loss 1,300 · hair fall treatment 1,000 | One bullet |
| hair transplant 2,900 · hair transplant cost 2,900 · hair transplant in Bangalore 1K–10K | Eight bullets; no page and no cost guidance |
| chemical peel 2,400 | Half a bullet ("Medifacials and chemical peels") |
| PRP hair treatment 1,900 · GFC treatment for hair 1,900 | One shared bullet |
| psoriasis 10K–100K · acne, pigmentation, melasma 1K–10K each | Bullets |
| tattoo removal near me, wart removal, skin tag removal 1K–10K each | Bullets |

### 3.2 Errors on the Services page

- **Laser Treatment** repeats the Medical Dermatology list word for word (acne … leprosy) under the intro "We provide laser treatment". No laser treatment is actually listed in that section.
- Single items are split into separate bullets: "Ear" / "Nose & Body Piercings"; "Lip" / "Nipple" / "Vaginal Micropigmentation"; "Fungal" / "Viral and Bacterial Infection Treatment".
- The Hair Transplant card's image is labelled "Hair Treatments".
- "Board certified" is a US term. "MD (DVL) dermatologists with fellowship training" is accurate and stronger in India.

### 3.3 Doctors

- **Strengths:** three MBBS, MD (DVL) dermatologists with fellowships (Dermatosurgery, Lasers & Aesthetic Dermatology; Hair Transplantation; Functional & Longevity Medicine). Real portraits and a warm founding story.
- **Gaps:**
  - There are no doctor pages; profiles appear only on Home and About.
  - Missing: medical council registration numbers, education, years in practice, languages, and which centre and days each doctor consults.
  - The persona headings ("Meet the ARTISAN / JACK / ANCHOR") come before the clinical credentials.
  - Doctors aren't linked to the treatments they perform.
  - Names are inconsistent: "Dr. Eshritha.C" vs "Dr. Eshritha C"; "Hairtransplant Surgeon".
- **Research:** six links are shown as raw URLs. The *Scar wars* (JCAS) paper is listed twice, "Adding more papers here soon." appears twice, and no paper names its author. Few local competitors can show published research; it belongs as a titled publication list on each author's page.

### 3.4 Centres

- **One shared page:** both centres sit on `/centers`. There is no `/centers/indiranagar` or `/centers/ramamurthy-nagar` for each Google Business Profile to link to, or to rank for searches like "skin clinic in Indiranagar".
- **Placeholder photos:** the six centre photos are files named `centre_sample-1…6`, and they don't match the RUA clinic photos supplied to us (wood-slat façade, gold logo wall). Confirm, and replace them with real photos.
- **Addresses:** address text should match each Google Business Profile exactly. The Indiranagar address is lower-case and informal ("060/1050 1st cross puttappa layout HAL 3rd stage backgate NCFE school"), and Ramamurthy Nagar uses "Akashaya Nagar" (usually spelt "Akshaya Nagar").
- **WhatsApp routing:** the floating WhatsApp button uses the Indiranagar number (`wa.me/917019976689`), so Ramamurthy Nagar patients are routed to Indiranagar.

### 3.5 Trust and education

- **Testimonials:** three specific testimonials (vitiligo surgery, a stubborn skin infection, general care), but no link to each centre's Google reviews. Don't mark your own testimonials up as review stars; Google ignores self-serving review markup for businesses.
- **Patient education:** there is none, despite large informational demand (psoriasis 10K–100K) and an Instagram team already producing doctor-led explainers (PDRN, Korean skincare routines, myth-busting). These could become articles with the video embedded.

---

## 4. Local SEO: closing the Indiranagar gap

The Local Competitor Analysis shows the brand can rank:
- **Ramamurthy Nagar** is **#1** for acne and pigmentation treatment, and **#2** for laser hair removal, PRP and hair loss.
- **Indiranagar** sits between **#12 (GFC)** and **#84 (laser hair removal)** for all nine keywords.

Authority doesn't transfer between Google profiles, and today the website gives the Indiranagar profile nothing to point to.

Each centre needs its own page with:
- **Heading and contact details:** an H1 such as "Skin & Hair Clinic in Indiranagar, Bangalore", and the name, address and phone exactly as on its Google profile.
- **Getting there:** map, directions, landmarks and parking; hours (open 7 days, 10am–8pm).
- **Doctors** who consult there, and when, with links to their pages.
- **Treatments offered**, linked to their treatment pages. For Indiranagar, order them in the competitor report's layers:
  1. Dermatologist and Skin Clinic
  2. Acne and Pigmentation
  3. Hair clinic, hair loss, PRP and GFC
  4. Hair transplant and Laser hair removal
- **Photos and reviews:** real photos of that centre, and reviews from that centre's profile.
- **Booking:** a button pre-set to the centre.
- **Schema:** MedicalClinic with geo co-ordinates and opening hours.
- **Google profile link:** point each profile's website link at its own centre page, tagged with UTM parameters (e.g. `?utm_source=google&utm_medium=organic&utm_campaign=gbp-indiranagar`), so enquiries can be attributed to each profile.

---

## 5. Conversion and measurement

Today a patient can:
- tap a header call button that fails;
- read, but not tap, a centre phone number;
- WhatsApp the Indiranagar number;
- or fill a short form ("How can we help you?", name, phone) that continues on WhatsApp.

There is no way to pick a centre, a doctor or a time.

The Growth Assessment's Phase 1 goal is to learn which treatments, messages, centres, audiences and landing pages produce appointments. That needs these events:

| Event | When it fires | Parameters |
|---|---|---|
| `click_call` | any tel: link | centre, page |
| `click_whatsapp` | any WhatsApp link | centre, page |
| `generate_lead` | enquiry form sent | concern, centre, page |
| `booking_start` / `booking_step` | booking opened / each step completed | step, centre, treatment |
| `book_appointment` | booking confirmed | treatment, centre, doctor |

It also needs:
- **Tags:** Google Tag Manager; GA4 key events; Google Ads conversions with enhanced conversions; Meta Pixel with the Conversions API.
- **Consent:** a consent banner, as required under India's DPDP Act.
- **Attribution:** UTM, `gclid` and `fbclid` stored with every lead and booking, so the clinic's own records show which page and campaign produced each patient.
- **Mobile actions:** a sticky bar on every page with **Call · WhatsApp · Book**.

---

## 6. Brand and design: the website should feel like the clinic

### 6.1 What RUA looks like in real life

- **Façade:** deep cocoa vertical wood slats, walnut signboards with cream lettering, and bilingual Kannada/English signage.
- **Inside:** cream and ivory walls, light-oak panelling, beige drapes and a brushed-gold 3D RUA logo wall. Premium equipment is on show (HydraFacial, Q-switched laser), and there is a dedicated hair-transplant theatre.
- **People:** doctors in white coats and RUA-embroidered black or teal scrubs, photographed at work.
- **Instagram (@ruaskinandhair, verified):**
  - **Look:** cocoa and warm-greige backgrounds, gold uppercase headlines and the cream logo.
  - **Positioning:** the bio reads "3 Expert Dermatologists | Doctor-Led · Dermatology · Cosmetology · Lasers · Hair Transplants".
  - **Content:** doctor-led education reels and procedure videos. The highlights are Procedures, HydraFacial, Microneedling, Skin Boosters and Testimonials.

### 6.2 How the website compares

| | Clinic and Instagram | Website today |
|---|---|---|
| Colour | Cocoa, walnut, cream, gold | The base matches: cocoa `#592F24` (logo `#592F23`), walnut `#8E5430`, taupe `#8B7355`, cream `#FFEFE2`. The gold accent is missing. |
| Type | Bold gold uppercase headlines | Display face "Tan Mon Cheri" with Geist: elegant, but a different voice from Instagram |
| Photography | Real doctors, rooms and procedures | Stock models (hero, service cards, machine photos) and placeholder centre interiors |
| Positioning | "3 Expert Dermatologists · Doctor-Led" | "Restore . Unfold . Awaken" (with spaced full stops); the doctor-led message is not above the fold |
| Proof | Procedures, testimonials, education | Credentials and research sit low on About; no ratings or consented results |

### 6.3 Design direction for the rebuild

- **Palette:**
  - **Cocoa `#592F23`:** header, footer and primary buttons.
  - **Walnut `#8E5430`:** secondary colour.
  - **Cream `#FFEFE2` and ivory:** backgrounds.
  - **Gold:** accents. Take the exact value from RUA's brand files (the logo wall and Instagram headlines).
  - **Body text:** a near-black brown.
  - **Contrast:** cocoa on cream measures about 10:1. Taupe `#8B7355` on cream is about 4.0:1, below the 4.5:1 WCAG AA minimum for body text, so keep taupe for large text and borders.
- **Type:** one display face shared with Instagram (confirm the web licence for Tan Mon Cheri, or adopt the Instagram headline face), a clean sans-serif for body text, and gold uppercase eyebrow labels.
- **Motif:** the façade's vertical wood slats as the recurring graphic (hero frame, section dividers); the leaf-drop mark from the logo as the icon; gold hairlines like the logo wall.
- **Photography:** replace every stock image. Shoot list:
  - both façades with legible signage;
  - reception and the logo wall;
  - each procedure room with its equipment, and the hair-transplant theatre;
  - each doctor, as a formal portrait and at work in scrubs;
  - a team photo;
  - consented patient moments, with faces blurred.
- **Video:** embed the matching Instagram reels on treatment and doctor pages, each with a short transcript.
- **Voice:** expert, warm, plain English. Lead with credentials, and keep "the Artisan / the Jack / the Anchor" as the second line.

### 6.4 Positioning as Bengaluru's leading skin and hair centre

The ambition — to be the top-ranked skin and hair brand in Bengaluru — should shape the whole site. But the site shouldn't *claim* "No. 1" or "best" without current, independent evidence. Indian rules restrict this: the medical-ethics regulations limit how doctors may promote themselves, and the ASCI advertising code requires superlatives such as "No. 1" or "best" to be substantiated. The Growth Assessment itself notes that no one can guarantee a #1 position.

Show leadership through proof instead:
- three MD (DVL) dermatologists with fellowships;
- peer-reviewed publications;
- a dedicated hair-transplant theatre;
- triple-wavelength diode, Q-switched Nd:YAG, CO₂, MNRF and HydraFacial equipment;
- two centres, open 7 days, 10am–8pm;
- the live Google rating for each centre, linked to its reviews.

---

## 7. Blueprint for the next build: services, doctors and booking

### 7.1 URL structure

Keep today's URLs (`/services`, `/centers`, `/about-us`, `/contact`) so nothing needs redirecting, and add:

```
/services                                    Services hub
/services/medical-dermatology                cluster page
    /acne-scar-treatment  /pigmentation-melasma-treatment  /psoriasis-treatment
    /eczema-treatment  /rosacea-treatment  /fungal-infection-treatment  /paediatric-dermatology
/services/dermatosurgery
    /wart-removal  /skin-tag-removal  /mole-removal  /cyst-lipoma-removal
    /scar-revision  /vitiligo-surgery  /earlobe-repair  /ingrown-nail-surgery
/services/aesthetic-dermatology
    /hydrafacial  /chemical-peel  /mnrf-microneedling  /botox-fillers
    /skin-boosters (PDRN, NCTF, exosome)  /hifu-skin-tightening  /bridal-packages
/services/laser-treatments
    /laser-hair-reduction  /tattoo-removal  /laser-toning  /carbon-laser-peel  /co2-laser-resurfacing
/services/hair-treatments
    /hair-loss-treatment  /prp-hair-treatment  /gfc-hair-treatment
    /exosome-hair-treatment  /qr678-hair-treatment  /scalp-micropigmentation
/services/hair-transplant
    /fue-hair-transplant  /dhi-hair-transplant  /hair-transplant-cost  /beard-eyebrow-transplant
/doctors                                     Doctors hub
    /dr-jatin-k-reddy  /dr-eshritha-c  /dr-jeevith-c-reddy
/centers                                     Bengaluru hub (stays)
    /indiranagar  /ramamurthy-nagar
/book-appointment
```

This mirrors the Search Volume Audit's recommended architecture. Services without enough demand for their own page (e.g. leprosy, circumcision, IV drips) stay as described items on their cluster page.

### 7.2 Phase 1 pages, in priority order

Rankings are from the Local Competitor Analysis: RN = Ramamurthy Nagar, IN = Indiranagar.

| Page | Main Bengaluru searches (monthly) | RUA today (RN / IN) |
|---|---|---|
| Hair transplant (cluster) + cost page | hair transplant 2,900 · hair transplant cost 2,900 · in Bangalore 1K–10K | #4 / #52 |
| FUE, DHI | FUE hair transplant 260 · DHI hair transplant Bangalore 100–1K | — |
| Hair loss treatment | hair loss treatment 4,400 · dermatologist for hair loss 1,300 | #2 / — |
| PRP hair treatment | PRP hair treatment 1,900 · cost 320 | #2 / #51 |
| GFC hair treatment | GFC treatment for hair 1,900 | — / #12 |
| Laser hair reduction | laser hair removal 4,400 · facial hair removal 4,400 · near me 1,300 | #2 / #84 |
| HydraFacial | HydraFacial 6,600 · near me 3,600 · price 1,600 | — |
| Chemical peel | chemical peel 2,400 · chemical face peel 1,300 | — |
| Acne & acne scars | acne, pimple 1K–10K | #1 / #29 |
| Pigmentation & melasma | pigmentation, melasma 1K–10K | #1 / #38 |
| Psoriasis | psoriasis 10K–100K | — |
| Tattoo removal | tattoo removal near me 1K–10K | — |
| Wart removal, skin tag removal | 1K–10K each | — |
| 3 doctor pages | hair doctor Bangalore 1K–10K · best hair doctor in Bangalore 1K–10K · searches for the doctors' names | — |
| 2 centre pages | dermatologist / skin clinic / hair clinic in [area] | #4–#6 / #21–#39 |

The remaining pages in 7.1 follow in Phase 2 (months 3–6), together with the hair-loss article cluster outlined in the Growth Assessment.

### 7.3 Page templates

**Treatment page** (e.g. PRP Hair Treatment)

1. Breadcrumb: Home › Services › Hair Treatments › PRP Hair Treatment.
2. H1 "PRP Hair Treatment in Bangalore", then a two-to-three sentence plain answer: what it is, who it suits and who performs it at RUA. AI assistants quote passages like this.
3. Book (with the treatment pre-selected), Call and WhatsApp buttons, and a trust strip: MD dermatologists · 2 centres · open 7 days · EMI available.
4. Key facts: session length, typical number of sessions, downtime, when results appear, who performs it, and price guidance ("from ₹…" or "quoted after consultation").
5. Who it's for, and how it works at RUA (steps, with a photo of the real equipment).
6. Results: consented before/after photos, labelled "individual results vary".
7. Cost: what changes the price, typical ranges, EMI options.
8. The doctor(s) who perform it and both centres, each linking to their own page.
9. FAQs (5–8, taken from real searches: cost, sessions, pain, side effects, PRP vs GFC).
10. Related treatments in the same cluster, an article and an Instagram reel.
11. "Medically reviewed by Dr. …, MBBS MD (DVL) · Updated {date}". The named doctor must actually review the page.

**Cluster page** (e.g. Hair Treatments)

- H1 "Hair Loss & Hair Treatments in Bangalore", an overview, and every treatment in the cluster (linked where a page exists).
- Conditions treated, doctors, centres, FAQs and booking.

**Services hub**

- H1 "Skin, Hair & Laser Treatments in Bangalore" and the six clusters.
- A "What would you like help with?" shortcut (hair fall, acne scars, pigmentation, unwanted hair…) that leads to the right treatment.
- Popular treatments and trust signals.

**Doctor page**

- H1 with the doctor's name, then a role line such as "Consultant Dermatologist & Hair Transplant Surgeon in Bangalore".
- Credentials: degrees, fellowship, KMC registration number, years in practice, languages.
- Where and when they consult, with "Book with Dr. …" pre-selected.
- Areas of expertise linking to treatment pages, and a bio (persona line second).
- Publications (title, journal, year, link), videos, and reviews that mention them.

**Booking page** (`/book-appointment`)

- **Steps:** centre → what you need help with (cluster or treatment) → doctor (or "first available") → date and live time slots → details → confirmation with a booking reference, calendar invite and directions.
- **Details collected:** name and mobile/WhatsApp number required; email optional, because most patients here prefer phone or WhatsApp; a consent checkbox.
- **Pre-filled from context:** e.g. `/book-appointment?centre=indiranagar&treatment=prp-hair-treatment&doctor=dr-jatin-k-reddy`.
- **Stored with each booking:** centre, treatment, doctor, landing page, referrer, UTM parameters and `gclid`/`fbclid`.
- **After booking:** the front desk confirms, reschedules or cancels, with WhatsApp/SMS and email notices and reminders.
- **Always visible:** Call and WhatsApp for the selected centre.
- **Indexing:** the confirmation step is `noindex`.

### 7.4 Titles, descriptions and headings

| Page type | Title pattern (≤ 60 characters) | Example |
|---|---|---|
| Treatment | {Treatment} in Bangalore – {qualifier} \| RUA | PRP Hair Treatment in Bangalore – Sessions & Cost \| RUA |
| Cluster | {Cluster} in Bangalore – {top treatments} \| RUA | Hair Transplant in Bangalore – FUE, DHI & Cost \| RUA |
| Doctor | Dr. {Name} – {Role}, Bangalore \| RUA | Dr. Jatin K Reddy – Hair Transplant Surgeon, Bangalore \| RUA |
| Centre | Skin & Hair Clinic in {Area}, Bangalore \| RUA | Skin & Hair Clinic in Indiranagar, Bangalore \| RUA |
| Booking | Book a Dermatologist Appointment in Bangalore \| RUA | — |

- **Descriptions:** what + where + one proof point + call to action, about 150 characters. Example: *"Dermatologist-led PRP for hair fall at RUA Skin & Hair Center, Indiranagar & Ramamurthy Nagar. Who it suits, sessions, results and cost. Book online."*
- **Bangalore vs Bengaluru:** use "Bangalore" in titles and H1s (the spelling patients search with) and "Bengaluru" in addresses and schema.
- **Headings:** one H1 per page, and an H2 for each section.

### 7.5 Structured data

Use one linked graph so Google and AI assistants can connect brand → doctors → centres → treatments:

- **Organization** (RUA Skin & Hair Center: logo; `sameAs` Instagram, Facebook, YouTube), linking to its two **MedicalClinic** entries.
- **MedicalClinic**, one per centre: address, geo, telephone, opening hours, medical specialty Dermatology, and `parentOrganization` pointing to the Organization.
- **Physician**, one per doctor: name, image, medical specialty, credentials, `worksFor` the centres, and `sameAs` their personal profiles.
- **MedicalWebPage**, one per treatment page, about a **MedicalProcedure**, with `reviewedBy` and `lastReviewed`.
- **BreadcrumbList** on every page, and **FAQPage** where a page has FAQs. Since August 2023 Google shows FAQ rich results only for well-known, authoritative government and health sites, so the value here is machine understanding rather than extra search-result space.
- **No self-review star markup.**

### 7.6 Internal linking rules

- Every treatment links to its cluster, 2–4 related treatments, its doctors, both centres and booking.
- Every doctor links to their treatments and centres; every centre links to its doctors and top treatments.
- Main navigation: Services (clusters), Doctors, Centres, About, Book. The footer lists all clusters and both centres.

### 7.7 Technical requirements

- **Complete HTML:** every public URL ships its full HTML (server-rendered or pre-rendered). WhatsApp and Facebook link previews, and most AI crawlers, don't run JavaScript.
- **Per-page tags:** a unique title and description, a self-referencing canonical and Open Graph tags on every page, all on `https://www.ruaskinandhair.com`.
- **Sitemap:** an XML sitemap generated from the content (all treatments, doctors and centres) with real `lastmod` dates; robots.txt points to it.
- **Images and caching:** AVIF/WebP images at display size, the LCP image preloaded, and caching switched on (static generation or ISR).
- **Redirects, language and accessibility:** one-hop permanent redirects, `lang="en-IN"`, and WCAG AA contrast.
- **Measurement:** Tag Manager with the event plan in section 5, plus a consent banner.

---

## 8. Readiness of the new platform (this repository)

| Area | Status |
|---|---|
| Booking engine: real-time slots, double-booking protection, triage queue, confirmation/cancellation emails with calendar invites | Ready |
| Admin: doctors, services, articles, consent-gated before/after gallery, theme | Ready |
| AI assistant with medical-safety guardrails | Ready; needs RUA content |
| RUA colours and logo | Applied in this repository; not yet committed |
| Rendering | **Gap.** Pages render client-side only (`createRoot`), so titles, canonicals and schema exist only after JavaScript runs, and `index.html` still carries Cedarline's title and schema. This would be a step back from the live Next.js site. Decide first: pre-render with React Router 7's framework mode (the project is already on v7), or build the public pages in Next.js on top of this API. |
| Data model | **Gap.** Single location only, and the departments are Cedarline's (General, Dental, Skin, Hair, Paediatrics). It needs centres, RUA's six clusters, and links between doctors and treatments and between doctors and centres. |
| Pages | **Gap.** No treatment pages (services are list items), no doctor pages (profiles open in a pop-up), no centre pages. |
| Booking fields | **Gap.** Email is mandatory; there is no centre choice and no UTM or landing-page attribution. |
| Tracking | **Gap.** No Tag Manager, GA4 or Pixel. |
| Sitemap | **Gap.** A hard-coded list of 18 Cedarline routes. |

---

## 9. Action plan

| Priority | Action | Where |
|---|---|---|
| P0 — this week | Fix the canonical/og/schema/sitemap/robots domain; self-referencing canonicals; header call button; unique titles and descriptions; sitemap paths; one-hop redirects | Live site (Next.js) |
| P0 — this week | Fix the Services page errors, the LinkedIn link, tappable phone numbers, link labels and H1s | Live site |
| P1 — months 0–3 | Rendering decision; data model (centres, clusters, doctor links); services hub, six cluster pages and the Phase 1 treatment pages; 3 doctor pages; 2 centre pages; booking with attribution; Tag Manager and events; schema; real photography; Google profiles linked to their centre pages | New build |
| P2 — months 3–6 | Remaining treatment pages; cost pages; hair-loss article cluster; consented results; a review programme for each centre; citations | New build + marketing |

---

## 10. What we need from RUA

- **Doctors:**
  - KMC registration numbers, education (institutions, years), years in practice and languages.
  - Which doctor consults at which centre, on which days and hours.
  - The authors and titles of each published paper.
- **Prices:** consultation fees, and price ranges (or a "from" price) for the Phase 1 treatments — or a decision to show cost factors only.
- **Google profiles:** the Business Profile URL for each centre, with confirmation of the exact name, address and phone on each (including "Akashaya" vs "Akshaya" Nagar).
- **Photos:** real photography of both centres, the rooms, equipment and doctors (shoot list in 6.3). The clinic photos shared in chat need to be supplied as files.
- **Brand files:** the logo as SVG, font licences, and the exact gold colour.
- **Contact and social:** a patient-facing email address for booking confirmations, the LinkedIn page URL, and permission to embed Instagram reels.
- **Medical review:** sign-off from the relevant doctor on each treatment page before it goes live.

---

## Appendix: raw checks (2 November 2026)

| URL | Title | Canonical | H1s | JSON-LD |
|---|---|---|---|---|
| / | shared 144-character title | https://ruaskinandhaircenter.com | 2 | Organization, WebSite |
| /services | shared | https://ruaskinandhaircenter.com | 2 | Organization, WebSite |
| /centers | shared | https://ruaskinandhaircenter.com | 1 | Organization, WebSite |
| /about-us | shared | https://ruaskinandhaircenter.com | 7 | Organization, WebSite |
| /contact | Contact Us - RUA Skin & Hair Center | https://ruaskinandhaircenter.com/contact | 0 | Organization, WebSite |

```
robots.txt
  User-Agent: *
  Allow: /
  Sitemap: https://ruaskinandhaircenter.com/sitemap.xml

sitemap.xml   5 URLs, all on ruaskinandhaircenter.com: /, /about, /services, /centers, /contact (lastmod 2025-12-20)
DNS           ruaskinandhaircenter.com -> non-existent domain
Status        /about 404 · /about-us 200 · /services/hair-transplant 404 · /services/prp-hair-treatment 404 · /doctors 404
Redirects     https://ruaskinandhair.com -> 307 -> https://www.ruaskinandhair.com/
              http://ruaskinandhair.com  -> 308 -> https://ruaskinandhair.com/ -> 307 -> https://www.ruaskinandhair.com/
Headers       Server: Vercel · X-Powered-By: Next.js · Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate · X-Vercel-Cache: MISS
Tracking      GA4 G-XQXYNQCWV4 on all pages; no GTM, Meta Pixel or Search Console meta tag
tel: links    tel:+1234567890 x2 on every page; tel:+91 70199 76689 on Services and About only
```
