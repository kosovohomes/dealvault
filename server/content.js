/**
 * DealVault project catalogue — public briefs and confidential libraries.
 *
 * Public fields (title, tagline, sector, stage, geography, ticket, summary,
 * story, metrics, highlights) are served to any registered, verified investor.
 * Documents are CONFIDENTIAL: they are only ever serialised into a response
 * for a session with an approved access request for that specific project.
 *
 * All financial figures are illustrative planning cases, not forecasts.
 */

const figure = (value, label, note = '') => ({ value, label, note });

/* HTML variant used inside document section templates (metrics stay objects). */
const figHtml = (value, label, note = '') =>
  `<div class="figure"><strong>${value}</strong><small>${label}${note ? ` · ${note}` : ''}</small></div>`;

export const projects = [
  {
    slug: 'cafepass-amman',
    title: 'CafePass',
    tagline: 'One membership. A city of independent coffee.',
    sector: 'Consumer · Membership',
    stage: 'Pre-seed',
    geography: 'Amman, Jordan',
    ticket: 'US$500K',
    currency: 'JOD',
    status: 'open',
    updated: '2026-10-14',
    summary:
      'A specialty-coffee membership that gives one person a daily coffee habit across an entire city of independent cafés — and gives those cafés a predictable, high-frequency channel to new customers.',
    story: [
      'Amman has a mature specialty-coffee culture and a fragmented loyalty layer. A committed coffee drinker might visit six venues in a month; every one of them rewards only its own regulars. The most repeated purchase in urban life is still sold one venue at a time.',
      'CafePass is built and deliberately unlaunched. The member app, staff scanner, owner dashboard and platform admin all exist in a working build. What does not yet exist is proof: café participation, member demand, and the economics that follow. This raise funds that proof, not more software.',
      'The model is deliberately simple. Members pay a fixed monthly fee. Participating cafés honour an agreed perk. CafePass collects the subscription; cafés fund the perk, not the platform. The member gets variety and value, the café pays a variable cost only when a new customer walks in, and the platform keeps a software-like margin on the subscription.',
    ],
    metrics: [
      figure('US$500K', 'Pre-seed raise', '18-month runway'),
      figure('JOD 19', 'Blended revenue / member / month', 'Illustrative mix'),
      figure('74%', 'Target contribution margin', 'At 4,000 members'),
      figure('3 gates', 'Validation milestones', 'Capital released on evidence'),
    ],
    highlights: [
      'US$500K pre-seed, 18-month plan, three explicit validation gates.',
      'Member subscriptions with café-funded perks — 74% target contribution.',
      'Amman-first density, then selective GCC expansion.',
    ],
    documents: [
      {
        slug: 'cp-investment-memo',
        title: 'Investment Memorandum',
        subtitle: 'The thesis, the model and the terms of engagement',
        category: 'Thesis',
        sensitivity: 'Confidential',
        version: '3.2',
        updated: '2026-10-14',
        pages: 10,
        minutes: 16,
        summary:
          'Why a single-city coffee membership can become a durable subscription business, and what the first eighteen months are designed to prove.',
        highlights: [
          'Member subscriptions with café-funded perks — no per-redemption settlement.',
          'Three validation gates with explicit kill criteria.',
          'Use of funds weighted toward demand validation, not headcount.',
        ],
        sections: [
          {
            id: 'proposal',
            title: '1. The proposal',
            html: `
          <p class="lede">CafePass is a membership that gives one person a daily coffee habit across an entire city of independent cafés — and gives those cafés a predictable, high-frequency channel to new customers.</p>
          <p>Members pay a monthly fee and redeem specialty-coffee perks at any participating venue through a QR pass. Cafés fund the perk, not the platform. That single design choice is what makes the model work: the member receives variety and value, the café pays a variable cost only when a new customer walks in, and CafePass keeps a software-like margin on the subscription.</p>
          <div class="figures">
            ${figHtml('US$500K', 'Pre-seed raise', '18-month runway')}
            ${figHtml('JOD 19', 'Blended revenue / member / month', 'Illustrative mix')}
            ${figHtml('74%', 'Target contribution margin', 'At 4,000 members')}
          </div>
          <p>We are not raising to build more software. The product exists. We are raising to buy the only asset that matters at this stage: <strong>evidence that a city will pay for a shared coffee membership, and that cafés will renew</strong>.</p>
          <div class="callout"><span class="callout__label">Read this first</span><p>Every financial figure in this library is an illustrative planning case prepared by the founders. It is not a forecast, a guarantee, or an offer of securities. Definitions, sources and the base-case assumptions are set out in the Unit Economics document and subject to diligence.</p></div>
        `,
            expected: 130,
          },
          {
            id: 'problem',
            title: '2. The problem worth owning',
            html: `
          <p>Amman has a mature specialty-coffee culture and a fragmented loyalty layer. A committed coffee drinker might visit six venues in a month; every one of them rewards only its own regulars. The result is a strange gap: the most repeated purchase in urban life is still sold one venue at a time.</p>
          <p>For cafés, the problem is not demand. It is <em>discovery without discounting</em>. Independent operators cannot afford broad brand campaigns, and blanket discounting trains customers to wait for offers. What they want is a new customer at a known cost, on a day that would otherwise be quiet.</p>
          <p>For members, the problem is that a single-venue loyalty card is a commitment to monotony. Variety is the actual product. Nobody wants a free coffee at the place they already go to every day; they want permission to explore without paying full price at every new venue.</p>
          <blockquote>Coffee is not an occasional purchase. It is a daily ritual with unusually high tolerance for a subscription.</blockquote>
          <p>That frequency is the asset. A member who already spends JOD 60–90 a month on coffee does not need to be persuaded to drink more. They need a better way to spend what they already spend.</p>
        `,
            expected: 150,
          },
          {
            id: 'model',
            title: '3. Why the model works',
            html: `
          <p>The architecture is deliberately simple. A member pays a fixed monthly fee. Participating cafés honour an agreed perk. CafePass collects the subscription and settles no per-redemption fee to the café.</p>
          <table class="data-table">
            <thead><tr><th>Layer</th><th>Who pays</th><th>What they get</th><th>Why it holds</th></tr></thead>
            <tbody>
              <tr><td>Subscription</td><td>Member</td><td>8–20 perks a month across the network</td><td>Priced below the value of the coffee alone</td></tr>
              <tr><td>Perk cost</td><td>Café</td><td>New and returning footfall at ~JOD 1 per visit</td><td>Variable cost, only paid on a visit</td></tr>
              <tr><td>Gross contribution</td><td>CafePass</td><td>~74% of net subscription revenue</td><td>Software margin, no inventory, no leases</td></tr>
            </tbody>
          </table>
          <p>The critical assumption is that cafés treat the perk as acquisition spend rather than as a discount to existing regulars. The product is designed around that: venue caps, time-of-day rules and new-member weighting. If cafés conclude they are subsidising people who would have come anyway, renewal collapses. That is the single most important thing the pilot must measure.</p>
          <p>At a blended JOD 19 per member per month, 74% contribution and a 7% monthly churn rate, modelled member lifetime value is JOD 202 against a target CAC of JOD 26 — roughly 7.8× and a 1.8-month payback. Those are targets, not observed results.</p>
          <div class="callout callout--quiet"><span class="callout__label">Sensitivity</span><p>At 10% monthly churn and JOD 35 CAC, LTV/CAC compresses to 4.3× and payback to 2.4 months. The model still works, but the margin for operating error narrows sharply. See the Unit Economics document §6.</p></div>
        `,
            expected: 180,
          },
          {
            id: 'plan',
            title: '4. The plan and the ask',
            html: `
          <p>We are raising <strong>US$500,000</strong> to fund an 18-month validation plan across three gates. Capital is released against evidence, not calendar time.</p>
          <table class="data-table">
            <thead><tr><th>Gate</th><th>Window</th><th>What must be true</th></tr></thead>
            <tbody>
              <tr><td>G1 — Proof of use</td><td>Months 0–3</td><td>25 cafés live, 400 paying members, first-redemption rate above 60%, CAC at or below JOD 35</td></tr>
              <tr><td>G2 — Proof of repeat</td><td>Months 4–9</td><td>65 cafés, 1,900 members, month-three retention above 90%, contribution above 65%</td></tr>
              <tr><td>G3 — Proof of repeatability</td><td>Months 10–18</td><td>110 cafés, 4,000 members, CAC payback under 3 months, Series A metrics evidenced</td></tr>
            </tbody>
          </table>
          <p>Use of funds is weighted toward demand validation, not headcount: 26% member growth and research, 20% product and data, 18% café network, 14% operations, 8% legal and licensing, 14% reserve.</p>
          <p>The round is sized to reach G3 with a buffer, not to reach profitability. Base-case break-even occurs around month 30 and assumes a follow-on round. Investors should underwrite the gates, not the terminal state.</p>
        `,
            expected: 160,
          },
          {
            id: 'must-be-true',
            title: '5. What must be true',
            html: `
          <p>Five conditions determine whether this becomes a business. We would rather state them than bury them.</p>
          <ol>
            <li><strong>Frequency.</strong> Target members visit specialty cafés at least weekly and value variety enough to pay monthly.</li>
            <li><strong>Café renewal.</strong> At least 70% of launch cafés renew after three months because redemptions produce incremental visits.</li>
            <li><strong>Discipline.</strong> Perk rules keep redemption cost per café below the value of an acquired customer.</li>
            <li><strong>Acquisition.</strong> Blended CAC stays under JOD 30 without relying on founder-led selling.</li>
            <li><strong>Retention.</strong> Monthly churn settles below 8% by month nine; otherwise the model requires materially higher pricing.</li>
          </ol>
          <p>If three or more of these fail at G2, the correct decision is to narrow the product or return capital — not to expand. The Risk Register sets out explicit kill criteria.</p>
          <p class="note">Prepared October 2026 · Version 3.2 · CafePass Technologies, Amman · Confidential</p>
        `,
            expected: 130,
          },
        ],
      },
      {
        slug: 'cp-market-study',
        title: 'Amman Market Study',
        subtitle: 'Bottom-up sizing, segments and the competitive gap',
        category: 'Market',
        sensitivity: 'Confidential',
        version: '2.0',
        updated: '2026-10-08',
        pages: 8,
        minutes: 12,
        summary:
          'A bottom-up view of the Amman specialty-coffee occasion: who drinks, where the venues cluster, what the membership is worth, and who else is trying.',
        highlights: [
          'Bottom-up sizing from venue counts and observed ticket data.',
          'Four addressable member segments, ranked by frequency.',
          'The loyalty gap: nothing sold today bundles variety across venues.',
        ],
        sections: [
          {
            id: 'method',
            title: '1. Method and boundaries',
            html: `
          <p class="lede">This study sizes the Amman specialty-coffee occasion from the ground up — venue counts, observed tickets and visit frequency — rather than from top-down category reports.</p>
          <p>The boundary is deliberate. We count only <strong>specialty and independent cafés</strong>: venues where the coffee itself is the product, prepared with intent, priced above the QSR baseline. Food-first cafés, chain kiosks and hotel outlets are excluded even where they serve good coffee, because the membership promise — variety across a city of real coffee shops — depends on it.</p>
          <p>All figures are illustrative planning estimates prepared for diligence, assembled from field counts, public listings and operator interviews. They are ranges with assumptions attached, not audited data. Sources and confidence notes are available on request.</p>
        `,
            expected: 120,
          },
          {
            id: 'sizing',
            title: '2. Bottom-up sizing',
            html: `
          <div class="figures">
            ${figHtml('180–220', 'Specialty venues in Greater Amman', 'Field-mapped')}
            ${figHtml('~35', 'Venues in the initial West Amman launch corridor', 'Dense, walkable')}
            ${figHtml('JOD 2.4–3.2', 'Average specialty ticket', 'Excludes food-first visits')}
          </div>
          <p>The venue base is growing and visibly polarising: a long tail of independents and a small set of strong local chains. The independent tail is exactly the segment the membership serves — good coffee, thin marketing budgets, and no loyalty infrastructure of their own.</p>
          <p>On the demand side, we model the addressable member as a professional under 40 living or working within the launch corridor, visiting specialty cafés at least four times a month. At conservative penetration of that segment, the pilot target of 400 members in three months is achievable with founder-led acquisition alone; the 4,000-member G3 target requires the referral loop to work.</p>
        `,
            expected: 160,
          },
          {
            id: 'segments',
            title: '3. Who the member actually is',
            html: `
          <table class="data-table">
            <thead><tr><th>Segment</th><th>Frequency</th><th>What wins them</th></tr></thead>
            <tbody>
              <tr><td>The daily regular</td><td>15+ visits / month</td><td>Variety without losing their home base — the pass subsidises exploration</td></tr>
              <tr><td>The laptop nomad</td><td>8–14 visits / month</td><td>Permission to move venues; predictable spend</td></tr>
              <tr><td>The social drinker</td><td>4–8 visits / month</td><td>Taking a friend without splitting the bill logic</td></tr>
              <tr><td>The weekend explorer</td><td>2–4 visits / month</td><td>Discovery as leisure; price sensitivity highest</td></tr>
            </tbody>
          </table>
          <p>The first two segments carry the model. Their existing spend already exceeds the membership price; the pass changes where the money goes, not how much. The risk to manage is the social drinker treating the pass as a coupon — venue caps and perk rules exist for exactly that reason.</p>
        `,
            expected: 140,
          },
          {
            id: 'competition',
            title: '4. The competitive gap',
            html: `
          <p>Three substitute behaviours compete for the same wallet: single-venue loyalty stamps, delivery-app coffee discounts, and buying nothing special at all. None of them bundles <em>variety</em>. That is the gap: nothing sold in Amman today lets one subscription travel across venues.</p>
          <p>The defensive question is what happens if a delivery super-app copies the mechanic. Our answer is unglamorous but real: the asset is not the coupon, it is the café network and the operating trust built venue by venue. An app can copy a perk in a week; it cannot retrofit relationships with 110 independent operators, nor would it want the per-redemption settlement cost. The pilot is designed to prove that network effects compound faster than copy-cats can respond.</p>
          <p class="note">Bottom-up estimates · Confidence: medium · Full source log available in diligence</p>
        `,
            expected: 130,
          },
        ],
      },
      {
        slug: 'cp-unit-economics',
        title: 'Business Model & Unit Economics',
        subtitle: 'Plan design, contribution, café economics and guardrails',
        category: 'Model',
        sensitivity: 'Confidential',
        version: '2.3',
        updated: '2026-10-12',
        pages: 7,
        minutes: 11,
        summary:
          'How the membership is priced, what a member is worth, what a café earns, and the guardrails that keep the two-sided loop honest.',
        highlights: [
          'Full contribution waterfall from gross subscription to operating margin.',
          'Café-side economics: the perk as acquisition spend at ~JOD 1 per new visit.',
          'Sensitivity table across price, churn and CAC.',
        ],
        sections: [
          {
            id: 'revenue',
            title: '1. Revenue architecture',
            html: `
          <p class="lede">One revenue line — the subscription — with every cost either fixed platform cost or café-funded perk cost. There is no per-redemption settlement, no commission, no inventory.</p>
          <p>The plan is priced at JOD 19–29 monthly depending on tier, with perks drawn from a shared pool across venues. Blended revenue per member lands near JOD 19 after tier mix and student pricing. Payment processing runs ~3% through local acquirers.</p>
          <div class="figures">
            ${figHtml('JOD 19', 'Blended revenue / member / month')}
            ${figHtml('3%', 'Payment processing')}
            ${figHtml('74%', 'Target contribution margin')}
          </div>
        `,
            expected: 120,
          },
          {
            id: 'member',
            title: '2. Member contribution',
            html: `
          <table class="data-table">
            <thead><tr><th>Line</th><th>Monthly, per member</th><th>Note</th></tr></thead>
            <tbody>
              <tr><td>Blended subscription</td><td>JOD 19.00</td><td>Tier mix at target</td></tr>
              <tr><td>Processing (3%)</td><td>(JOD 0.57)</td><td>Local acquirer</td></tr>
              <tr><td>Support & service</td><td>(JOD 0.40)</td><td>Blended across self-serve and human</td></tr>
              <tr><td><strong>Contribution</strong></td><td><strong>JOD 18.03</strong></td><td>94.9% of gross</td></tr>
            </tbody>
          </table>
          <p>At a 7% monthly churn, modelled lifetime value is JOD 202 per member. Against a target CAC of JOD 26 that is 7.8× LTV/CAC with a 1.8-month payback. At 10% churn and JOD 35 CAC the ratio compresses to 4.3× — still workable, but the operating error margin narrows sharply.</p>
        `,
            expected: 150,
          },
          {
            id: 'cafe',
            title: '3. Café economics',
            html: `
          <p>The café funds the perk: a drink valued at JOD 2.6–3.2 costs the venue JOD 0.9–1.2 in inputs. The perk only redeems when a member walks in, so the cost is strictly variable — acquisition spend, not a standing discount.</p>
          <p>The honest risk is <em>subsidised regulars</em>: members who would have visited anyway redeeming at their home base. Mitigations live in product rules — new-member weighting, per-venue caps, time-of-day windows — and in the owner dashboard, which shows each café exactly which visits were incremental. Renewal is the vote that matters: the model requires 70% of launch cafés renewing at month three.</p>
          <div class="callout"><span class="callout__label">Guardrail</span><p>If a café's redemptions exceed 40% from members who visited that venue in the prior month, the account is flagged and the perk mix is re-weighted. Guardrails like this are why the platform, not a paper coupon, is the product.</p></div>
        `,
            expected: 150,
          },
          {
            id: 'sensitivity',
            title: '4. Sensitivity and guardrails',
            html: `
          <table class="data-table">
            <thead><tr><th>Case</th><th>Price</th><th>Churn</th><th>CAC</th><th>LTV/CAC</th><th>Payback</th></tr></thead>
            <tbody>
              <tr><td>Base</td><td>JOD 19</td><td>7%</td><td>JOD 26</td><td>7.8×</td><td>1.8 mo</td></tr>
              <tr><td>Soft</td><td>JOD 19</td><td>10%</td><td>JOD 35</td><td>4.3×</td><td>2.4 mo</td></tr>
              <tr><td>Stress</td><td>JOD 15</td><td>12%</td><td>JOD 40</td><td>2.5×</td><td>3.6 mo</td></tr>
            </tbody>
          </table>
          <p>The stress case is the honest one: at 2.5× the model is a lifestyle business, not a venture business. That is why the gates exist — G2 measures retention and contribution before scale capital is spent, and the risk register defines the kill criteria in writing.</p>
          <p class="note">All cases illustrative · Assumptions listed in the model workbook · October 2026</p>
        `,
            expected: 140,
          },
        ],
      },
    ],
  },

  {
    slug: 'sakan',
    title: 'Sakan',
    tagline: 'Verified mid-term rentals for the Gulf\u2019s relocating professionals.',
    sector: 'Proptech · Marketplace',
    stage: 'Seed',
    geography: 'Dubai, UAE',
    ticket: 'US$1.2M',
    currency: 'AED',
    status: 'open',
    updated: '2026-10-21',
    summary:
      'A mid-term rental marketplace built for the 30-day-to-6-month stay: verified landlords, move-in-ready units, and one contract that survives a visa renewal cycle.',
    story: [
      'Dubai adds tens of thousands of relocating professionals a year, and none of them fit the housing stock cleanly. Annual leases demand upfront cheques and Ejari registration for a person who may not finish probation. Nightly platforms price at three to five times the monthly equivalent. The mid-term gap — one to six months, furnished, verified, single contract — is served today by WhatsApp groups and luck.',
      'Sakan exists to make that stay boring, in the best way: a listed unit that matches its photos, a landlord who answers, a contract aligned to the actual length of the assignment, and a price that scales with duration instead of punishing it.',
      'The company is post-launch with a small live inventory in Dubai Marina, Business Bay and JLT. The raise funds inventory depth in three more corridors, the landlord verification layer, and the corporate housing pilot with two relocation agencies already in discussion.',
    ],
    metrics: [
      figure('US$1.2M', 'Seed raise', '18-month plan'),
      figure('142', 'Live units', 'Three Dubai corridors'),
      figure('AED 1,240', 'Blended gross booking', 'Illustrative, per stay'),
      figure('11.5%', 'Take rate target', 'Landlord-funded'),
    ],
    highlights: [
      'Filling the gap between annual leases and nightly platforms.',
      'Landlord-funded take rate — guests pay no booking fee.',
      'Corporate housing pilot with two relocation agencies in discussion.',
    ],
    documents: [
      {
        slug: 'sk-investment-thesis',
        title: 'Investment Thesis',
        subtitle: 'The mid-term gap, the supply play and the round',
        category: 'Thesis',
        sensitivity: 'Confidential',
        version: '1.4',
        updated: '2026-10-21',
        pages: 8,
        minutes: 13,
        summary:
          'Why the 30-day-to-6-month stay is a structurally underserved market in Dubai, and why supply-side curation is the defensible asset.',
        highlights: [
          'Structural demand from relocation, probation cycles and project work.',
          'Curation and verification as the moat, not the listing feed.',
          'US$1.2M to deepen inventory and open the corporate channel.',
        ],
        sections: [
          {
            id: 'gap',
            title: '1. The mid-term gap',
            html: `
          <p class="lede">Dubai\u2019s rental market is built for two customers: the annual tenant and the tourist. Everyone in between improvises.</p>
          <p>The in-between guest is now a structural segment, not a niche: new hires serving out probation, consultants on project assignments, families between villas, remote professionals doing 90-day stints. Their options are poor and well understood — sign an annual lease they must break, or pay nightly platform prices at three to five times the monthly equivalent, often for units that do not match their photographs.</p>
          <div class="figures">
            ${figHtml('3–5×', 'Nightly platform premium vs monthly equivalent', 'Illustrative')}
            ${figHtml('30d–6mo', 'The underserved stay length')}
            ${figHtml('142', 'Live Sakan units today')}
          </div>
          <p>The demand is not the hard part. Supply is: finding, verifying and keeping landlords willing to let furnished units on flexible terms is an operations problem, and that is exactly what makes it defensible.</p>
        `,
            expected: 140,
          },
          {
            id: 'supply',
            title: '2. Why supply-side curation wins',
            html: `
          <p>Listing marketplaces win on liquidity, and mid-term liquidity in Dubai is thin on both sides. Sakan\u2019s approach is deliberately supply-first: recruit small landlords and boutique operators in chosen corridors, verify every unit in person, standardise furnishing and checkout, and guarantee response times.</p>
          <p>Verification is the product. Every unit carries an inspection record, current photographs and a landlord track record. Guests pay no booking fee — the landlord funds an 11.5% take rate — because the guest\u2019s real cost is the risk of a bad unit, and the platform absorbs it with re-location guarantees.</p>
          <p>Competitors face an unpleasant choice copying this: verify units unit-by-unit at real cost, or list unverified inventory and inherit the trust problem that created the gap in the first place.</p>
          <blockquote>The moat is not the app. It is two hundred landlords who trust one operator with their keys.</blockquote>
        `,
            expected: 160,
          },
          {
            id: 'model',
            title: '3. Model and economics',
            html: `
          <p>Revenue is a landlord-funded take rate on confirmed bookings: 11.5% at target, blended across standard and corporate inventory. A blended gross booking value of AED 1,240 per stay yields roughly AED 142 of revenue. Contribution after payment processing, verification amortisation and guest support targets 61% at current cost structure.</p>
          <table class="data-table">
            <thead><tr><th>Line</th><th>Per booking</th><th>Note</th></tr></thead>
            <tbody>
              <tr><td>Gross booking value</td><td>AED 1,240</td><td>Blended stay length 2.7 months</td></tr>
              <tr><td>Take rate (11.5%)</td><td>AED 142</td><td>Landlord-funded</td></tr>
              <tr><td>Processing + ops</td><td>(AED 55)</td><td>Includes inspection amortisation</td></tr>
              <tr><td><strong>Contribution</strong></td><td><strong>AED 87</strong></td><td>61% of revenue</td></tr>
            </tbody>
          </table>
          <p>Repeat and referral behaviour is the early proof point: 34% of completed guests book again or refer within 90 days, which pulls CAC from AED 210 toward a blended AED 140. Corporate accounts, once signed, are multi-booking by construction.</p>
        `,
            expected: 150,
          },
          {
            id: 'round',
            title: '4. The round',
            html: `
          <p>The US$1.2M seed funds an 18-month plan: inventory from 142 to 500 units across five corridors, the verification layer productised, and the corporate housing pilot converted to three signed accounts. Roughly 45% goes to supply operations, 25% to product, 15% to demand, 15% reserve and compliance.</p>
          <p>Success is measured, not asserted: occupancy above 78% in mature corridors, take rate held above 11%, and corporate contracts covering 25% of booked nights by month 15. The downside case — Dubai demand shock — is a slower inventory build, not a broken model, because the cost base is largely variable.</p>
          <p class="note">Illustrative figures · AED unless stated · Sakan Holdings FZ-LLC · October 2026</p>
        `,
            expected: 120,
          },
        ],
      },
      {
        slug: 'sk-market-primer',
        title: 'Dubai Mid-Term Market Primer',
        subtitle: 'Sizing the in-between stay, corridor by corridor',
        category: 'Market',
        sensitivity: 'Confidential',
        version: '1.1',
        updated: '2026-10-16',
        pages: 6,
        minutes: 9,
        summary:
          'A corridor-level view of mid-term demand in Dubai: who the guest is, what they pay today, and where the 500-unit plan lands.',
        highlights: [
          'Five corridors ranked by demand depth and landlord receptivity.',
          'Guest segments mapped to stay length and payment behaviour.',
          'Corporate housing demand quantified from relocation-agency interviews.',
        ],
        sections: [
          {
            id: 'demand',
            title: '1. Demand shape',
            html: `
          <p class="lede">Mid-term demand in Dubai tracks the employment cycle, not the tourism calendar. It peaks with onboarding waves, project kickoffs and the school year.</p>
          <p>Three guest archetypes dominate: the relocating professional (2–4 months, employer-adjacent budget), the project consultant (1–3 months, repeatable), and the transitional family (3–6 months, price-sensitive but quality-first). Each buys differently — the consultant books fast and expenseable, the family negotiates — and inventory mix has to reflect that.</p>
          <div class="figures">
            ${figHtml('~48k', 'New residence visas / year, skilled categories', 'Public data, illustrative')}
            ${figHtml('2.7 mo', 'Observed Sakan stay length')}
            ${figHtml('34%', 'Repeat or referral within 90 days')}
          </div>
        `,
            expected: 130,
          },
          {
            id: 'corridors',
            title: '2. Corridor map',
            html: `
          <table class="data-table">
            <thead><tr><th>Corridor</th><th>Demand</th><th>Landlord receptivity</th><th>Plan</th></tr></thead>
            <tbody>
              <tr><td>Dubai Marina / JBR</td><td>Deep, tourist-adjacent</td><td>Medium — holiday-home competition</td><td>Consolidate</td></tr>
              <tr><td>Business Bay / Downtown</td><td>Deep, corporate</td><td>High</td><td>Expand</td></tr>
              <tr><td>JLT</td><td>Strong value fit</td><td>High</td><td>Expand</td></tr>
              <tr><td>DIFC / Satwa fringe</td><td>Corporate niche</td><td>Medium</td><td>Pilot</td></tr>
              <tr><td>Dubai Hills / MBR City</td><td>Family transitional</td><td>Medium</td><td>Pilot</td></tr>
            </tbody>
          </table>
          <p>Corridor selection is the operating strategy. Density in a corridor compresses operations — one inspector covers many units, key handovers cluster, and landlord referrals compound. The 500-unit plan follows the table above, not opportunity sprawl.</p>
        `,
            expected: 140,
          },
          {
            id: 'corporate',
            title: '3. The corporate channel',
            html: `
          <p>Relocation agencies, HR teams and project firms are the highest-value channel: multi-booking, lower CAC, and standards they enforce on our behalf. Two agencies are in active discussion with pilot terms drafted; a third requested exclusivity we declined.</p>
          <p>The corporate product is small but real: consolidated invoicing, a verified-unit guarantee, and 30-day replacement cover. The primer\u2019s honest caveat: corporate cycles are slow, and the direct channel must carry the plan while the channel matures.</p>
          <p class="note">Interview-based estimates · 14 operator conversations · October 2026</p>
        `,
            expected: 120,
          },
        ],
      },
      {
        slug: 'sk-early-metrics',
        title: 'Early Metrics & Operations Pack',
        subtitle: 'What the first 142 units actually did',
        category: 'Traction',
        sensitivity: 'Confidential',
        version: '1.0',
        updated: '2026-10-19',
        pages: 5,
        minutes: 8,
        summary:
          'Occupancy, take rate, unit economics and operational incident data from the live inventory — including what went wrong.',
        highlights: [
          'Nine months of operating data from three corridors.',
          'Occupancy, contribution and incident rates reported without smoothing.',
          'The three operational failures and their fixes.',
        ],
        sections: [
          {
            id: 'occupancy',
            title: '1. Occupancy and rate',
            html: `
          <div class="figures">
            ${figHtml('71%', 'Occupancy, trailing 90 days', 'Mature units')}
            ${figHtml('AED 6,850', 'Median monthly equivalent rate')}
            ${figHtml('9 mo', 'Operating history')}
          </div>
          <p>Occupancy in the mature Marina and JLT cohorts settled at 71% after the summer dip, against an 78% target for the raise. The gap is concentrated in first-month units awaiting reviews — units with 3+ reviews run 9 points higher, which is the strongest argument for the verification layer surfacing trust sooner.</p>
        `,
            expected: 120,
          },
          {
            id: 'incidents',
            title: '2. What went wrong',
            html: `
          <p>Three failures worth the investor\u2019s time, reported as they happened. One week in July, two units had air-conditioning failures during a heatwave — both guests were re-located within 24 hours at platform cost, and the preventive maintenance checklist exists because of it. A landlord attempted an off-platform redirect mid-stay — contract amended, unit delisted, deposit enforced. A fraudulent guest booking with a stolen card was caught at verification, and the fraud rule that caught it is now standard.</p>
          <p>The pattern across all three: the cost of the guarantee model is real but bounded (under 1.8% of revenue), and each failure produced a permanent control. That is what early operations data is for.</p>
        `,
            expected: 130,
          },
          {
            id: 'economics',
            title: '3. Unit economics as run',
            html: `
          <table class="data-table">
            <thead><tr><th>Metric</th><th>Actual</th><th>Target</th></tr></thead>
            <tbody>
              <tr><td>Blended take rate</td><td>10.8%</td><td>11.5%</td></tr>
              <tr><td>Contribution margin</td><td>58%</td><td>61%</td></tr>
              <tr><td>Blended CAC</td><td>AED 210</td><td>AED 140 with repeat</td></tr>
              <tr><td>Re-location guarantee cost</td><td>1.8% of revenue</td><td>&lt; 1.5%</td></tr>
            </tbody>
          </table>
          <p>The deltas to target are understood and small: take rate mix (two corporate contracts at discount), and CAC still carrying launch spend. Nothing in the actuals contradicts the thesis; nothing yet proves it at scale, which is what the raise is for.</p>
          <p class="note">Operating data through September 2026 · Unaudited · Illustrative for diligence</p>
        `,
            expected: 130,
          },
        ],
      },
    ],
  },
  {
    slug: 'nakhlah',
    title: 'Nakhlah',
    tagline: 'Vertical-farming greens for the Gulf\u2019s hospitality kitchens.',
    sector: 'Agritech · Hardware + Ops',
    stage: 'Pre-seed',
    geography: 'Riyadh, Saudi Arabia',
    ticket: 'US$750K',
    currency: 'SAR',
    status: 'open',
    updated: '2026-10-25',
    summary:
      'Container-grown culinary greens grown inside Riyadh\u2019s food-service district, sold to hotel and restaurant kitchens on weekly standing orders — fresher than imports, priced to compete.',
    story: [
      'Saudi hospitality kitchens import the majority of their premium greens. Air-freighted lettuce travels two to five days, loses shelf life at every step, and prices swing with fuel and season. Chefs plan menus around spoilage, not flavour.',
      'Nakhlah grows those greens twenty minutes from the kitchens that use them, in retrofitted containers sited inside the food-service district itself. Standing weekly orders replace ad-hoc purchasing; harvest-to-kitchen is same-day. The farm is deliberately small and the economics deliberately boring: prove the unit, then replicate it.',
      'The pilot container is operating with a local hotel group. The raise funds three more containers, the standing-order platform, and the food-safety certification that unlocks the hotel chains.',
    ],
    metrics: [
      figure('US$750K', 'Pre-seed raise', '14-month plan'),
      figure('1', 'Container live', 'Hotel group pilot'),
      figure('SAR 41/kg', 'Blended selling price', 'Illustrative'),
      figure('Same-day', 'Harvest to kitchen'),
    ],
    highlights: [
      'Grow-site inside the food-service district — logistics as the moat.',
      'Weekly standing orders smooth demand and de-risk harvest planning.',
      'Certification-led expansion into hotel chains.',
    ],
    documents: [
      {
        slug: 'nk-pilot-plan',
        title: 'Concept & Pilot Plan',
        subtitle: 'The container unit, the kitchen buyer and the first year',
        category: 'Thesis',
        sensitivity: 'Confidential',
        version: '0.9',
        updated: '2026-10-25',
        pages: 6,
        minutes: 10,
        summary:
          'What one container produces, who buys it, and what the pilot with a Riyadh hotel group is designed to prove.',
        highlights: [
          'Container unit economics sketched from live pilot data.',
          'Standing-order demand model with hotel and restaurant buyers.',
          'Certification and food-safety path mapped.',
        ],
        sections: [
          {
            id: 'concept',
            title: '1. The concept',
            html: `
          <p class="lede">Nakhlah grows premium culinary greens — micro herbs, baby leaf, edible flowers — in retrofitted containers sited inside Riyadh\u2019s food-service districts, sold on weekly standing orders to hotel and restaurant kitchens.</p>
          <p>The insight is siting, not agronomy. Container farming is a known technology; the unsolved problem in the Gulf is distribution and freshness economics. By placing the grow-site inside the district where the buyers are, harvest-to-kitchen drops to hours, cold-chain cost collapses, and the chef gets a product imports physically cannot match.</p>
          <div class="figures">
            ${figHtml('Same-day', 'Harvest to kitchen')}
            ${figHtml('~140 kg', 'Weekly output per container', 'Mix-dependent')}
            ${figHtml('SAR 41/kg', 'Blended selling price', 'Illustrative')}
          </div>
        `,
            expected: 120,
          },
          {
            id: 'buyer',
            title: '2. The kitchen buyer',
            html: `
          <p>Hotel and restaurant kitchens buy on four things: freshness, consistency, price and paperwork. Imports win price benchmarks on commodity leaf but lose on freshness and spoilage; local specialty farms win freshness but sit far from the city. Nakhlah\u2019s standing-order model targets consistency — the same mix, same day weekly, with a named contact — which is what executive chefs actually complain about.</p>
          <p>The pilot with a Riyadh hotel group covers two outlets on a weekly order. Their feedback has shaped the mix toward high-turn items (micro basil, coriander cress, baby rocket) and the packaging toward 250g sealed punnets that survive a busy service line.</p>
          <blockquote>Chefs do not want a farm. They want Thursday to be identical to last Thursday.</blockquote>
        `,
            expected: 140,
          },
          {
            id: 'plan',
            title: '3. The first-year plan',
            html: `
          <p>The US$750K pre-seed funds three more containers (site works, retrofit, seed stock), the standing-order platform, working capital and the food-safety certification track — SFDA licensing first, then the hotel-group supplier audits that unlock chain contracts.</p>
          <p>The plan\u2019s discipline is replication gates: container two is only sited after container one runs 10 consecutive weeks above 85% order fulfilment at target gross margin. Each container is a proven unit before the next is built; the raise covers four containers plus platform, not a speculative farm build-out.</p>
          <p class="note">Pre-seed planning case · Figures illustrative · Nakhlah Agricultural Co. (under formation) · October 2026</p>
        `,
            expected: 120,
          },
        ],
      },
      {
        slug: 'nk-unit-economics',
        title: 'Container Unit Economics',
        subtitle: 'Yield, cost and margin for one proven unit',
        category: 'Model',
        sensitivity: 'Confidential',
        version: '0.7',
        updated: '2026-10-24',
        pages: 4,
        minutes: 7,
        summary:
          'The per-container P&L sketch: yield, energy, labour and the standing-order revenue it must support.',
        highlights: [
          'Per-container weekly P&L from live pilot readings.',
          'Energy as the dominant cost — and the siting answer to it.',
          'Break-even container count for the operating company.',
        ],
        sections: [
          {
            id: 'yield',
            title: '1. Yield and revenue',
            html: `
          <table class="data-table">
            <thead><tr><th>Line</th><th>Weekly, per container</th><th>Note</th></tr></thead>
            <tbody>
              <tr><td>Harvest output</td><td>~140 kg</td><td>Mix: cress, micro herbs, baby leaf</td></tr>
              <tr><td>Blended price</td><td>SAR 41/kg</td><td>Standing-order mix</td></tr>
              <tr><td><strong>Revenue</strong></td><td><strong>SAR 5,740</strong></td><td>At 100% fulfilment</td></tr>
            </tbody>
          </table>
          <p>Output varies with mix; revenue assumes the standing orders absorb it. Fulfilment risk is the model\u2019s honest soft spot — a failed tray is lost revenue with no substitute, which is why the replication gate demands ten weeks of proven fulfilment before the next container is sited.</p>
        `,
            expected: 120,
          },
          {
            id: 'cost',
            title: '2. Cost and margin',
            html: `
          <table class="data-table">
            <thead><tr><th>Line</th><th>Weekly, per container</th><th>Share</th></tr></thead>
            <tbody>
              <tr><td>Energy (electricity)</td><td>(SAR 1,180)</td><td>41% of cost</td></tr>
              <tr><td>Labour (shared site team)</td><td>(SAR 690)</td><td>24%</td></tr>
              <tr><td>Consumables (seed, media, packaging)</td><td>(SAR 480)</td><td>17%</td></tr>
              <tr><td>Maintenance + other</td><td>(SAR 300)</td><td>10%</td></tr>
              <tr><td><strong>Contribution</strong></td><td><strong>SAR 3,090</strong></td><td>~54% of revenue</td></tr>
            </tbody>
          </table>
          <p>Energy dominates, which is why siting inside existing food-service facilities (shared cooling, stable grid, no land cost) matters more than any agronomic optimisation. Four containers at these figures cover the operating company\u2019s fixed base — the platform team, certification and sales — with the raise bridging the path there.</p>
          <p class="note">Pilot readings, weeks 6–14 · SAR · Illustrative and unaudited</p>
        `,
            expected: 130,
          },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Public catalogue views                                              */
/*                                                                      */
/* Built-in projects are code-defined above. Projects imported through  */
/* the operator console (PRD v2.1 §7.8) live in the store and are       */
/* merged here at request time, so a fresh import is visible without    */
/* a redeploy. Imported projects carry brief metadata only — no         */
/* confidential documents — until the upload pipeline lands.            */
/* ------------------------------------------------------------------ */

import { db } from './store.js';

const storedProjects = () => (Array.isArray(db().projects) ? db().projects : []);
export const allProjects = () => [...projects, ...storedProjects()];

const docMeta = (doc) => ({
  slug: doc.slug,
  title: doc.title,
  subtitle: doc.subtitle,
  category: doc.category,
  pages: doc.pages,
  minutes: doc.minutes,
  version: doc.version,
  updated: doc.updated,
  sections: doc.sections.map((section) => ({ id: section.id, title: section.title })),
});

/* Public index served to registered investors — no document content. */
export const indexProject = (project) => ({
  slug: project.slug,
  title: project.title,
  tagline: project.tagline || '',
  sector: project.sector,
  stage: project.stage,
  geography: project.geography,
  ticket: project.ticket,
  status: project.status,
  updated: project.updated,
  summary: project.summary,
  story: project.story || [],
  metrics: project.metrics || [],
  highlights: project.highlights || [],
  tags: project.tags || [],
  link: project.link || '',
  source: project.source || 'builtin',
  documents: (project.documents || []).map(docMeta),
});

export const projectIndex = () => allProjects().map(indexProject);

export const getProject = (slug) => allProjects().find((project) => project.slug === slug) || null;

export const getDocument = (projectSlug, docSlug) => {
  const project = getProject(projectSlug);
  if (!project) return null;
  return (project.documents || []).find((doc) => doc.slug === docSlug) || null;
};

export const catalogue = () => {
  const all = allProjects();
  return {
    projects: all.length,
    imported: storedProjects().length,
    documents: all.reduce((sum, project) => sum + (project.documents || []).length, 0),
    pages: all.reduce(
      (sum, project) => sum + (project.documents || []).reduce((inner, doc) => inner + (doc.pages || 0), 0),
      0,
    ),
    minutes: all.reduce(
      (sum, project) => sum + (project.documents || []).reduce((inner, doc) => inner + (doc.minutes || 0), 0),
      0,
    ),
  };
};

export const sectors = [...new Set(projects.map((project) => project.sector))];
export const stages = [...new Set(projects.map((project) => project.stage))];
export const geographies = [...new Set(projects.map((project) => project.geography))];

export function sectionTitle(doc, sectionId) {
  if (!doc) return sectionId || 'Section';
  const section = doc.sections.find((item) => item.id === sectionId);
  return section ? section.title : sectionId || 'Section';
}
