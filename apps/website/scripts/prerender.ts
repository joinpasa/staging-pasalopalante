/**
 * Postbuild prerender step.
 *
 * Reads dist/index.html (the SPA shell) and writes a per-route
 * dist/<route>/index.html with route-specific <title>, <meta name="description">,
 * canonical/og URLs, and full visible HTML content inside #root.
 *
 * Lovable hosting serves the matching static file first (so crawlers and
 * non-JS clients see real content per URL) and then the SPA fallback covers
 * any other path. React mounts with createRoot(), which replaces the
 * server-rendered #root content cleanly (no hydration mismatch warnings).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SITE = "https://pasalopalante.com";
const DIST = resolve("dist");
const SHELL_PATH = resolve(DIST, "index.html");

if (!existsSync(SHELL_PATH)) {
  console.warn("[prerender] dist/index.html not found; skipping.");
  process.exit(0);
}

const shell = readFileSync(SHELL_PATH, "utf8");

interface Route {
  path: string;
  title: string;
  description: string;
  body: string; // HTML injected into #root
  /** Canonical origin override — see JoinPage.tsx's SEO `siteUrl` prop for why. */
  siteUrl?: string;
  /** JSON-LD object(s) to embed as <script type="application/ld+json"> in <head>. */
  jsonLd?: object | object[];
}

const FOOTER = `
<footer style="margin-top:3rem;padding-top:2rem;border-top:1px solid #ddd;font-size:0.9rem;color:#555">
  <p>
    <strong>Pásalo Pa'lante is a global kindness movement and sister
    initiative of Te Amo PR, an IRS-recognized 501(c)(3) nonprofit
    organization based in Puerto Rico.</strong><br />
    Pass Kindness Forward is an initiative of Te Amo PR.<br />
    Te Amo PR: <a href="https://teamopr.org">teamopr.org</a> ·
    Pásalo Pa'lante: <a href="https://pasalopalante.com">pasalopalante.com</a><br />
    Email: <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a> ·
    Phone: (787) 705-0778<br />
    EIN: 66-0975633 · 550 Av. de la Constitución #905, San Juan, PR<br />
    © 2026 Te Amo PR / Pásalo Pa'lante. All rights reserved.
  </p>
  <p>
    <a href="/about">About</a> ·
    <a href="/how-it-works">How it works</a> ·
    <a href="/programs">Programs</a> ·
    <a href="/get-involved">Get involved</a> ·
    <a href="/donate">Donate</a> ·
    <a href="/contact">Contact</a> ·
    <a href="/privacy">Privacy</a> ·
    <a href="/terms">Terms</a> ·
    <a href="/community-guidelines">Community Guidelines</a>
  </p>
</footer>`;

const SISTER = `<p><strong>Pásalo Pa'lante is a sister initiative of Te Amo PR</strong>, an IRS-recognized 501(c)(3) nonprofit organization based in Puerto Rico (EIN 66-0975633). The legal nonprofit behind this movement is Te Amo PR.</p>`;

const routes: Route[] = [
  {
    path: "/about",
    title: "About Kindness Forward | An Initiative of Te Amo PR",
    description:
      "Learn about Pásalo Pa'lante, a global kindness movement connected to Te Amo PR, a 501(c)(3) nonprofit organization based in Puerto Rico.",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "NGO",
      name: "Pásalo Pa'lante",
      url: "https://pasalopalante.com",
      description: "Puerto Rico's kindness movement, which set a record of 1,135,096 acts of kindness in 5 days in November 2025.",
      areaServed: "Puerto Rico",
      parentOrganization: {
        "@type": "NGO",
        name: "Te Amo PR",
        taxID: "66-0975633",
        address: "550 Av. de la Constitución #905, San Juan, PR",
        url: "https://teamopr.org",
      },
    },
    body: `
      <h1>About Pásalo Pa'lante</h1>
      <p>Pásalo Pa'lante is a global kindness movement and sister initiative of Te Amo PR, an IRS-recognized 501(c)(3) nonprofit organization based in Puerto Rico (EIN 66-0975633). The phrase "Pásalo Pa'lante" means "pass it forward," and the movement is built around a simple belief: kindness grows when it is practiced, shared, and passed from person to person.</p>
      <p>Born from Puerto Rico and built for the world, Pásalo Pa'lante invites individuals, families, schools, nonprofits, businesses, municipalities, artists, athletes, faith communities, civic leaders, and institutions to make kindness visible through everyday action.</p>
      <h2>Relationship to Te Amo PR</h2>
      <p>Te Amo PR is the legal nonprofit organization behind Pásalo Pa'lante. While <a href="https://teamopr.org">teamopr.org</a> serves as the primary organizational website for Te Amo PR, <a href="https://pasalopalante.com">pasalopalante.com</a> serves as the dedicated movement platform for Pásalo Pa'lante.</p>
      <p>Pásalo Pa'lante is not a separate legal nonprofit entity unless otherwise stated in official legal documentation. Donations, partnerships, and nonprofit verification are connected to Te Amo PR.</p>
      <h2>Why Puerto Rico</h2>
      <p>Pásalo Pa'lante was born in Puerto Rico, a place known for resilience, warmth, generosity, cultural pride, and community spirit. The movement carries that spirit outward, inviting the world to experience kindness not as a slogan, but as a daily practice.</p>
      <h2>Our Mission</h2>
      <p>Our mission is to inspire and mobilize acts of kindness across communities, schools, organizations, and countries by encouraging people to pass kindness forward through practical, sincere action.</p>
      <h2>Our Vision</h2>
      <p>We envision a world where kindness becomes part of everyday culture: in homes, classrooms, workplaces, neighborhoods, cities, and public life.</p>
      <h2>Our Values</h2>
      <ul>
        <li>Kindness</li><li>Gratitude</li><li>Unity</li><li>Service</li>
        <li>Dignity</li><li>Inclusion</li><li>Trust</li><li>Community</li>
      </ul>
      <h2>Who Can Participate</h2>
      <p>Anyone can participate. Pásalo Pa'lante welcomes individuals, families, students, educators, community leaders, nonprofit organizations, companies, municipalities, artists, athletes, media partners, sponsors, and institutions that want to help create a more compassionate world.</p>
      <h2>How the Movement Grows</h2>
      <p>The movement grows through simple acts of kindness, community participation, school and youth activations, ambassador leadership, nonprofit partnerships, institutional support, storytelling, and shared public commitment.</p>
    `,
  },
  {
    path: "/how-it-works",
    title: "How It Works | Kindness Forward",
    description:
      "Discover how individuals, schools, organizations, cities, and ambassadors can participate in the Pásalo Pa'lante kindness movement.",
    body: `
      <h1>How Pásalo Pa'lante works</h1>
      ${SISTER}
      <p>Pásalo Pa'lante begins with a simple act of kindness. A person helps, encourages, serves, gives, thanks, forgives, listens, supports, or uplifts someone else. Then they invite that person to pass kindness forward.</p>
      <p>The movement is designed to be simple enough for anyone to join and structured enough for schools, organizations, companies, municipalities, churches, nonprofits, and community leaders to activate at scale.</p>
      <h2>Ways to participate</h2>
      <ul>
        <li><strong>Individuals</strong> — do and share acts of kindness.</li>
        <li><strong>Schools</strong> — kindness challenges, classroom activities, student leadership, service projects.</li>
        <li><strong>Organizations</strong> — volunteer activations, workplace kindness campaigns, community partnerships.</li>
        <li><strong>Cities &amp; institutions</strong> — civic kindness, public service, community engagement.</li>
        <li><strong>Ambassadors</strong> — organize, invite, document, and expand the movement.</li>
      </ul>
      <p>See <a href="/programs">/programs</a> for the full program list and <a href="/get-involved">/get-involved</a> to join.</p>
    `,
  },
  {
    path: "/programs",
    title: "Programs & How It Works — Kindness Forward",
    description:
      "Pledges, volunteers, ambassadors, schools, partners, and kindness acts — how Pásalo Pa'lante and Te Amo PR mobilize a global kindness movement.",
    body: `
      <h1>Programs</h1>
      ${SISTER}
      <h2>The Pledge</h2>
      <p>Anyone can pledge to perform acts of kindness during the Kindness Season (Nov 1 – Jan 31). <a href="/commit">Make your pledge</a>.</p>
      <h2>Volunteers</h2>
      <p>Volunteers coordinate local activations, document acts of kindness, and bring the campaign into their neighborhoods.</p>
      <h2>Ambassadors</h2>
      <p>Community leaders, creators, and organizers who champion Pásalo Pa'lante in their region, school, workplace, or network.</p>
      <h2>Schools</h2>
      <p>K-12 and universities can participate with age-appropriate kindness prompts and classroom activities.</p>
      <h2>Partners</h2>
      <p>Nonprofits, municipalities, companies, and faith communities can co-host activations and sponsor kindness initiatives.</p>
      <h2>Acts of Kindness</h2>
      <p>Anyone can log an act they did, received, or witnessed. <a href="/share">Share an act</a>.</p>
    `,
  },
  {
    path: "/get-involved",
    title: "Get Involved | Kindness Forward",
    description:
      "Join Pásalo Pa'lante as an individual, school, organization, ambassador, partner, or supporter.",
    body: `
      <h1>Get involved</h1>
      ${SISTER}
      <p>There is no single way to pass kindness forward. Pásalo Pa'lante welcomes individuals, families, students, educators, nonprofits, businesses, civic leaders, artists, athletes, media partners, and institutions that want to help build a more compassionate world.</p>
      <ul>
        <li><a href="/commit">Become a participant / make your pledge</a></li>
        <li><a href="/contact">Bring Pásalo Pa'lante to your school</a></li>
        <li><a href="/commit">Become an ambassador</a></li>
        <li><a href="/contact">Partner with us</a></li>
        <li><a href="/donate">Support the movement</a></li>
      </ul>
    `,
  },
  {
    path: "/donate",
    title: "Donate | Support Kindness Forward and Te Amo PR",
    description:
      "Support Pásalo Pa'lante through Te Amo PR, an IRS-recognized 501(c)(3) nonprofit (EIN 66-0975633). Donations are tax-deductible to the fullest extent allowed by U.S. law.",
    body: `
      <h1>Support Pásalo Pa'lante</h1>
      <p>Pásalo Pa'lante is a sister initiative of Te Amo PR, an IRS-recognized 501(c)(3) nonprofit organization based in Puerto Rico (EIN 66-0975633). Donations connected to Pásalo Pa'lante support Te Amo PR's mission-related work, including kindness campaigns, community activations, school and youth engagement, volunteer coordination, ambassador support, storytelling, outreach, and movement infrastructure.</p>
      <p>Te Amo PR is the legal nonprofit organization associated with Pásalo Pa'lante. Donations may be tax-deductible to the extent allowed by law.</p>
      <h2>Donation Options</h2>
      <p><a href="https://www.paypal.com/ncp/payment/LQT3G3GLS8SWS" rel="noopener noreferrer" style="display:inline-block;background:#c45a3b;color:#fff;padding:0.75rem 1.5rem;border-radius:0.5rem;text-decoration:none;font-weight:600">Donate Securely Through Te Amo PR</a></p>
      <p>Secure transaction processed by PayPal; we never see or store your card details.</p>
      <h3>Other ways to give</h3>
      <ul>
        <li><strong>By check</strong> — payable to <em>Te Amo PR</em>, mailed to 550 Av. de la Constitución #905, San Juan, PR.</li>
        <li><strong>ACH / wire / sponsorship</strong> — email <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a> for banking instructions and a sponsorship deck.</li>
      </ul>
      <p>For donation questions, contact <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a> or call (787) 705-0778. Donation inquiries may also be submitted through the <a href="/contact">Contact page</a>.</p>
      <h2>Donation Disclaimer</h2>
      <p>Donations are processed through Te Amo PR or its authorized donation providers. Pásalo Pa'lante is the movement platform and sister initiative connected to Te Amo PR. Tax receipts are emailed by Te Amo PR with EIN 66-0975633 and donation details, suitable for U.S. tax purposes. Please consult your tax advisor regarding tax deductibility.</p>
    `,
  },
  {
    path: "/contact",
    title: "Contact | Kindness Forward and Te Amo PR",
    description:
      "Contact Pásalo Pa'lante and Te Amo PR for partnerships, schools, donations, media, legal, privacy, or general inquiries.",
    body: `
      <h1>Contact us</h1>
      ${SISTER}
      <p>For questions about Pásalo Pa'lante, Te Amo PR, partnerships, schools, ambassadors, donations, media, or privacy requests, please contact us.</p>
      <ul>
        <li>Email: <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a></li>
        <li>Phone: (787) 705-0778</li>
        <li>Website: <a href="https://teamopr.org">teamopr.org</a></li>
        <li>Movement website: <a href="https://pasalopalante.com">pasalopalante.com</a></li>
        <li>Mailing address: 550 Av. de la Constitución #905, San Juan, PR</li>
      </ul>
      <p>For privacy requests, include "Privacy Request" in the subject line. For partnership inquiries, include "Pásalo Pa'lante Partnership". For school participation, include "School Participation".</p>
    `,
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Kindness Forward",
    description:
      "Read the Privacy Policy for pasalopalante.com, the official movement website for Pásalo Pa'lante, a sister initiative of Te Amo PR.",
    body: `
      <h1>Privacy Policy</h1>
      ${SISTER}
      <p>Pásalo Pa'lante respects your privacy. This Privacy Policy explains how we collect, use, protect, and share information when you visit pasalopalante.com, contact us, submit a form, participate in a campaign, donate, volunteer, or engage with the movement.</p>
      <h2>Information we collect</h2>
      <p>Information you voluntarily provide (name, email, phone, city, country, organization, school, role, message content, participation interest, donation inquiry, volunteer interest, ambassador interest, submitted stories, photos, videos, or other information you choose to share) plus technical data (IP address, browser type, device type, pages visited, referring website, approximate location, date and time of visit, cookies, analytics data, website interaction data).</p>
      <h2>How we use information</h2>
      <p>To respond to inquiries, coordinate participation, manage ambassador or volunteer interest, provide updates, process donation inquiries, support campaigns, improve the website, measure outreach, protect security, prevent fraud or spam, comply with legal obligations, and communicate about Te Amo PR or Pásalo Pa'lante. <strong>We do not sell personal information.</strong></p>
      <h2>Donations</h2>
      <p>Donations are processed by secure third-party payment processors. We do not directly store full credit card numbers or full payment credentials on this website.</p>
      <h2 id="sms">SMS / Text Messaging</h2>
      <p>Pass Kindness Forward, an initiative of Te Amo PR, may send text messages to people who opt in, including event reminders, program updates, volunteer opportunities, and invitations to log acts of kindness.</p>
      <p><strong>Information we collect:</strong> When you opt in, we collect your mobile phone number and your consent to receive messages. We use it only to send you the messages you signed up for.</p>
      <p><strong>No sharing:</strong> We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes. Mobile information will not be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties. This excludes service providers that help us deliver messages, such as our messaging platform, who may use it only for that purpose.</p>
      <p><strong>Opting out:</strong> Reply STOP at any time to stop receiving messages. Reply HELP for help, or contact us at <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a>.</p>
      <h2>Cookies, analytics &amp; Google Ad Grants</h2>
      <p>We may use cookies, Google Analytics, Google Ads, Google Ad Grants, and similar tools to understand website traffic, measure campaign effectiveness, prevent misuse, and support mission-related outreach. We do not use these tools to sell personal information.</p>
      <h2>Sharing</h2>
      <p>We may share information with Te Amo PR team members, authorized volunteers, contractors, website providers, email platforms, donation processors, analytics providers, legal or accounting professionals, and partners involved in fulfilling user-requested activities, or when required by law.</p>
      <h2>Children's privacy</h2>
      <p>We do not knowingly collect personal information from children under the age required by applicable law without appropriate parent, guardian, school, or institutional consent.</p>
      <h2>Data security &amp; retention</h2>
      <p>We use reasonable administrative, technical, and organizational safeguards. We keep personal information only as long as reasonably necessary for the purposes described in this policy.</p>
      <h2>Your choices</h2>
      <p>Request access, correction, or deletion by emailing <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a>.</p>
      <h2>Contact</h2>
      <p>Email: <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a> · Phone: (787) 705-0778 · Address: 550 Av. de la Constitución #905, San Juan, PR.</p>
    `,
  },
  {
    path: "/terms",
    title: "Terms & Legal Information | Kindness Forward",
    description:
      "Read the Terms and Legal Information for pasalopalante.com, the movement website for Pásalo Pa'lante and Te Amo PR.",
    body: `
      <h1>Terms &amp; Legal Information</h1>
      ${SISTER}
      <p>Welcome to pasalopalante.com, the official movement website for Pásalo Pa'lante, a sister initiative of Te Amo PR, an IRS-recognized 501(c)(3) nonprofit organization based in Puerto Rico. By using this website, you agree to use it respectfully, lawfully, and in alignment with the mission of kindness, service, gratitude, and community impact.</p>
      <h2>Nonprofit relationship</h2>
      <p>Pásalo Pa'lante is not presented as a separate nonprofit entity. The legal nonprofit associated with this initiative is Te Amo PR. <a href="https://teamopr.org">teamopr.org</a> is the organizational website; pasalopalante.com is the movement platform.</p>
      <h2>Acceptable use</h2>
      <p>You agree not to misuse the website, submit false or harmful information, interfere with security, impersonate others, upload hateful or abusive content, misuse the Pásalo Pa'lante or Te Amo PR name, or imply official affiliation without permission.</p>
      <h2>Intellectual property</h2>
      <p>The Pásalo Pa'lante name, logo, messaging, campaign language, visuals, and website content may be protected by copyright, trademark, and other IP laws. Written permission is required for commercial use, merchandise, co-branded materials, or any use that suggests official partnership.</p>
      <h2>Donations</h2>
      <p>Donations support Te Amo PR's mission-related programming and/or Pásalo Pa'lante movement activities and may be tax-deductible to the extent allowed by law.</p>
      <h2>No guarantee of participation or partnership</h2>
      <p>Submitting a form, ambassador interest, partnership request, volunteer inquiry, donation inquiry, or story does not guarantee acceptance, approval, publication, recognition, partnership, funding, or official affiliation.</p>
      <h2>User-submitted content</h2>
      <p>By submitting stories, photos, videos, or testimonials, you confirm you have the right to submit them. We may review, edit, decline, or remove submitted content at our discretion.</p>
      <h2>Disclaimer &amp; limitation of liability</h2>
      <p>Website content is provided "as is" for general educational, inspirational, nonprofit, and community engagement purposes. To the fullest extent permitted by law, Pásalo Pa'lante, Te Amo PR, and their representatives are not liable for damages arising from use of this website or participation in activities promoted through it.</p>
      <h2 id="sms">SMS Terms</h2>
      <p><strong>Program:</strong> Pass Kindness Forward, an initiative of Te Amo PR, sends text messages about events (such as the Global Kindness Broadcast), program updates during Global Kindness Season, volunteer opportunities, and invitations to log acts of kindness.</p>
      <p><strong>How to opt in:</strong> Check the optional SMS consent box on our sign-up or Get Involved forms.</p>
      <p><strong>Frequency and cost:</strong> Message frequency varies. Message and data rates may apply.</p>
      <p><strong>Opting out:</strong> Reply STOP to cancel at any time. You will receive one confirmation message and no further texts. Reply START to rejoin.</p>
      <p><strong>Help:</strong> Reply HELP for help, or contact us at <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a>.</p>
      <p>Carriers are not liable for delayed or undelivered messages. Consent to receive text messages is not a condition of any purchase or participation.</p>
      <p>See our Privacy Policy at <a href="https://passkindnessforward.com/privacy#sms">https://passkindnessforward.com/privacy#sms</a>.</p>
      <h2>Contact</h2>
      <p>Email: <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a> · Phone: (787) 705-0778 · Address: 550 Av. de la Constitución #905, San Juan, PR.</p>
    `,
  },
  {
    path: "/community-guidelines",
    title: "Community Guidelines | Kindness Forward",
    description:
      "Review the community guidelines for participating in Pásalo Pa'lante with kindness, respect, safety, and integrity.",
    body: `
      <h1>Community guidelines</h1>
      ${SISTER}
      <p>Pásalo Pa'lante is built on kindness, dignity, gratitude, and trust. Everyone who participates in the movement is expected to treat others with respect and to represent the spirit of passing kindness forward.</p>
      <ul>
        <li>Be kind. Be truthful.</li>
        <li>Respect privacy. Get permission before sharing photos of others, especially children.</li>
        <li>Protect children and vulnerable people.</li>
        <li>Do not use the movement for hate, harassment, politics, exploitation, scams, or unauthorized fundraising.</li>
        <li>Use official branding responsibly.</li>
        <li>Report concerns to <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a>.</li>
      </ul>
      <p>Pásalo Pa'lante may remove, decline, or report content that violates these guidelines or harms the integrity of the movement.</p>
    `,
  },
  {
    path: "/partners",
    title: "Our Partners | Kindness Forward",
    description:
      "Meet the businesses, media, governments, nonprofits, and educators powering Pásalo Pa'lante and the global kindness movement.",
    body: `
      <h1>Our Partners</h1>
      ${SISTER}
      <p>Pásalo Pa'lante moves forward because of the organizations standing behind it. Our partners co-host activations, fund the movement, and carry kindness into every corner of their communities.</p>
      <p>The coalition includes businesses, media networks, faith communities, municipalities across Puerto Rico, nonprofits, and schools and ministries of education across the Caribbean and beyond, among them Caribbean Cinemas, WIPR, HeartMath Institute, Good Deeds Day, JA Worldwide, Kids for Peace, Salzburg Global, World Values Day, Rotary Club de Santurce, and the Departamento de Educación de Puerto Rico.</p>
      <h2>Become a partner</h2>
      <p>Join the movement and help us pass kindness forward. Tell us about your organization at <a href="/partners/apply">/partners/apply</a> and we'll follow up with next steps.</p>
    `,
  },
  {
    path: "/media",
    title: "In the Press | Kindness Forward",
    description:
      "1,135,096 acts of kindness, every municipality, millions of impressions. See the coverage, then join the next wave.",
    body: `
      <h1>In the Press</h1>
      <p>In November 2025, the kindness movement reached every corner of Puerto Rico — 1,135,096 acts of kindness in five days, across all 78 municipalities, with an estimated 12,500,000+ impressions and over $225,000 in earned media value. This is a sample of that coverage, not a complete record.</p>
      <h2>Digital news &amp; press</h2>
      <ul>
        <li><a href="https://wipr.pr/puerto-rico-logra-un-record-mundial-con-mas-de-1-millon-de-actos-de-bondad/">WIPR (Notiséis 360): Puerto Rico logra un récord mundial con más de 1 millón de actos de bondad</a></li>
        <li><a href="https://www.metro.pr/entretenimiento/2025/10/21/ola-de-amor-y-bondad-recorrera-toda-la-isla/">Metro Puerto Rico: Ola de amor y bondad recorrerá toda la isla</a></li>
        <li><a href="https://wapa.tv/programas/pegate/tommy-ramos-presenta-la-campa-a-p-salo-pa-lante/article_af1de326-c453-46b6-8385-bc55d27e6c5b.html">WAPA TV: Tommy Ramos presenta la campaña Pásalo Pa'lante</a></li>
      </ul>
      <h2>Video &amp; podcast</h2>
      <ul>
        <li><a href="https://www.youtube.com/watch?v=PAhOrMKwQ4M">Para Servirle Podcast: Buscan lograr 1,000,000 actos de bondad (interview with Javier De Nardo)</a></li>
        <li><a href="https://www.youtube.com/watch?v=-tnjbAAljVA">WIPR: "Te Amo PR" promotes acts of kindness in Puerto Rico</a></li>
      </ul>
      <h2>Broadcast &amp; radio</h2>
      <p>WIPR Radio &amp; TV, Telemundo, WAPA TV, Teleonce, and regional radio stations across the island — including Viva la Mañana, Waba Radio, Radio Gritos, Radio Universidad, Hoy Día Puerto Rico, El Circo de la Mega, El Poder del Pueblo, Noticentro al Amanecer, and La Calle Digital.</p>
      <h2>The next wave</h2>
      <p>Puerto Rico proved it's possible. Now it's the world's turn — join Global Kindness Season at <a href="/get-involved">/get-involved</a>, or reach out about press coverage at <a href="mailto:info@passkindnessforward.com">info@passkindnessforward.com</a>.</p>
    `,
  },
  {
    path: "/join",
    title: "How to Join 1 Billion Acts of Kindness | Pass Kindness Forward",
    description:
      "Pass Kindness Forward is mobilizing 1 billion acts of kindness worldwide during Kindness Season (Nov 1 – Jan 31). Here's how to join in 3 steps.",
    siteUrl: "https://passkindnessforward.com",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Pass Kindness Forward?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Pass Kindness Forward is the global movement mobilizing 1 billion acts of kindness worldwide. It grew out of Pásalo Pa'lante, the Puerto Rico kindness movement that already set a record of 1,135,096 acts of kindness in 5 days in November 2025. Both are initiatives of Te Amo PR, a U.S. 501(c)(3) nonprofit based in Puerto Rico (EIN 66-0975633).",
            },
          },
          {
            "@type": "Question",
            name: "What is Kindness Season, and when is it?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Kindness Season is the annual period from November 1 to January 31, when people, schools, companies, municipalities, and organizations worldwide are invited to do and log acts of kindness, as part of the drive toward 1 billion acts total.",
            },
          },
          {
            "@type": "Question",
            name: "How do I get involved?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Three steps: 1) Make your pledge at pasalopalante.com/commit (takes under a minute, free). 2) Do an act of kindness — big or small. 3) Share it so it counts toward the 1 billion goal.",
            },
          },
          {
            "@type": "Question",
            name: "Do I need to be in Puerto Rico to take part?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Pásalo Pa'lante is Puerto Rico–specific; Pass Kindness Forward is the global extension of the same movement, open to anyone, anywhere — individuals, schools, companies, or organizations.",
            },
          },
          {
            "@type": "Question",
            name: "Is this a real nonprofit?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. The legal nonprofit behind the movement is Te Amo PR, a U.S.-IRS-recognized 501(c)(3) (EIN 66-0975633), based at 550 Av. de la Constitución #905, San Juan, PR.",
            },
          },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "NGO",
        name: "Pass Kindness Forward",
        alternateName: "1 Billion Acts of Kindness",
        url: "https://passkindnessforward.com",
        description: "Global movement mobilizing 1 billion acts of kindness, born from Pásalo Pa'lante in Puerto Rico.",
        parentOrganization: {
          "@type": "NGO",
          name: "Te Amo PR",
          taxID: "66-0975633",
          address: "550 Av. de la Constitución #905, San Juan, PR",
          url: "https://teamopr.org",
        },
      },
    ],
    body: `
      <h1>How to Join 1 Billion Acts of Kindness</h1>
      <p><strong>Pass Kindness Forward</strong> is the global movement behind the drive to 1 billion acts of kindness, born from Pásalo Pa'lante in Puerto Rico. Both are initiatives of Te Amo PR, a U.S. 501(c)(3) nonprofit (EIN 66-0975633).</p>
      <h2>3 steps to join</h2>
      <ol>
        <li><strong>Pledge</strong> — make your pledge at <a href="/commit">/commit</a>, under a minute, free.</li>
        <li><strong>Do an act of kindness</strong> — big or small: help, listen, give, encourage, forgive.</li>
        <li><strong>Share it</strong> — log it so it counts toward the 1 billion goal.</li>
      </ol>
      <p><a href="/commit">Make your pledge now →</a></p>
      <h2>Frequently asked questions</h2>
      <h3>What is Pass Kindness Forward?</h3>
      <p>Pass Kindness Forward is the global movement mobilizing 1 billion acts of kindness worldwide. It grew out of Pásalo Pa'lante, the Puerto Rico kindness movement that already set a record of 1,135,096 acts of kindness in 5 days in November 2025. Both are initiatives of Te Amo PR, a U.S. 501(c)(3) nonprofit based in Puerto Rico (EIN 66-0975633).</p>
      <h3>What is Kindness Season, and when is it?</h3>
      <p>Kindness Season is the annual period from November 1 to January 31, when people, schools, companies, municipalities, and organizations worldwide are invited to do and log acts of kindness, as part of the drive toward 1 billion acts total.</p>
      <h3>How do I get involved?</h3>
      <p>Three steps: 1) Make your pledge at <a href="/commit">pasalopalante.com/commit</a> (takes under a minute, free). 2) Do an act of kindness — big or small. 3) Share it so it counts toward the 1 billion goal.</p>
      <h3>Do I need to be in Puerto Rico to take part?</h3>
      <p>No. Pásalo Pa'lante is Puerto Rico–specific; Pass Kindness Forward is the global extension of the same movement, open to anyone, anywhere — individuals, schools, companies, or organizations.</p>
      <h3>Is this a real nonprofit?</h3>
      <p>Yes. The legal nonprofit behind the movement is Te Amo PR, a U.S.-IRS-recognized 501(c)(3) (EIN 66-0975633), based at 550 Av. de la Constitución #905, San Juan, PR.</p>
    `,
  },
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderShell(route: Route): string {
  const url = `${route.siteUrl ?? SITE}${route.path}`;
  const escTitle = escapeHtml(route.title);
  const escDesc = escapeHtml(route.description);

  let html = shell;

  // Replace <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escTitle}</title>`);

  // Replace existing description / og / twitter / canonical meta tags
  html = html.replace(
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${escDesc}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"[^>]*>/,
    `<meta property="og:title" content="${escTitle}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"[^>]*>/,
    `<meta property="og:description" content="${escDesc}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"[^>]*>/,
    `<meta property="og:url" content="${url}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${escTitle}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${escDesc}" />`
  );

  // Inject/replace canonical
  if (/<link\s+rel="canonical"[^>]*>/.test(html)) {
    html = html.replace(/<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
  } else {
    html = html.replace(/<\/head>/, `    <link rel="canonical" href="${url}" />\n  </head>`);
  }

  // JSON-LD structured data (FAQPage, Organization, etc.) — baked into the
  // static HTML itself, not injected client-side, since the crawlers this
  // is actually for (AI answer engines) mostly don't execute JavaScript.
  // The </script> escape guards against a string field ever containing that
  // literal sequence and prematurely closing the tag.
  if (route.jsonLd) {
    const ldJson = JSON.stringify(route.jsonLd).replace(/<\/script/gi, "<\\/script");
    html = html.replace(/<\/head>/, `    <script type="application/ld+json">${ldJson}</script>\n  </head>`);
  }

  // Swap the route's own content into the crawler fallback. index.html keeps
  // that fallback in a <noscript> *inside* #root (after the boot splash), so
  // real browsers never flash it and only non-JS clients — search crawlers,
  // carrier/compliance reviewers' fetchers — read it. The old pattern looked
  // for #root closing before a <noscript>, which stopped matching once the
  // fallback moved inside #root, so every route silently fell back to the
  // generic homepage text. A function replacer so "$" in page copy is literal.
  const fallback = `<main>${route.body}${FOOTER}</main>`;
  const routeHtml = html.replace(
    /(<div id="root">[\s\S]*?<noscript>)[\s\S]*?(<\/noscript>)/,
    (_m, open: string, close: string) => `${open}\n      ${fallback}\n      ${close}`,
  );
  if (routeHtml === html) {
    throw new Error(`[prerender] couldn't find the #root <noscript> fallback to fill for ${route.path}`);
  }
  html = routeHtml;

  return html;
}

let written = 0;
for (const route of routes) {
  const outPath = resolve(DIST, route.path.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, renderShell(route), "utf8");
  written++;
  console.log(`[prerender] ${route.path} → ${outPath.replace(DIST + "/", "dist/")}`);
}
console.log(`[prerender] wrote ${written} static page${written === 1 ? "" : "s"}.`);
