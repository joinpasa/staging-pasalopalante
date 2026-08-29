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
}

const FOOTER = `
<footer style="margin-top:3rem;padding-top:2rem;border-top:1px solid #ddd;font-size:0.9rem;color:#555">
  <p>
    <strong>Pásalo Pa'lante is a global kindness movement and sister
    initiative of Te Amo PR, an IRS-recognized 501(c)(3) nonprofit
    organization based in Puerto Rico.</strong><br />
    Te Amo PR: <a href="https://teamopr.org">teamopr.org</a> ·
    Pásalo Pa'lante: <a href="https://pasalopalante.com">pasalopalante.com</a><br />
    Email: <a href="mailto:info@teamopr.org">info@teamopr.org</a> ·
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
    title: "About Pásalo Pa'lante | Sister Initiative of Te Amo PR",
    description:
      "Learn about Pásalo Pa'lante, a global kindness movement connected to Te Amo PR, a 501(c)(3) nonprofit organization based in Puerto Rico.",
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
    title: "How Pásalo Pa'lante Works | Pass Kindness Forward",
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
    title: "Programs & How It Works — Pásalo Pa'lante",
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
    title: "Get Involved | Pásalo Pa'lante",
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
    title: "Donate | Support Pásalo Pa'lante and Te Amo PR",
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
        <li><strong>ACH / wire / sponsorship</strong> — email <a href="mailto:info@teamopr.org">info@teamopr.org</a> for banking instructions and a sponsorship deck.</li>
      </ul>
      <p>For donation questions, contact <a href="mailto:info@teamopr.org">info@teamopr.org</a> or call (787) 705-0778. Donation inquiries may also be submitted through the <a href="/contact">Contact page</a>.</p>
      <h2>Donation Disclaimer</h2>
      <p>Donations are processed through Te Amo PR or its authorized donation providers. Pásalo Pa'lante is the movement platform and sister initiative connected to Te Amo PR. Tax receipts are emailed by Te Amo PR with EIN 66-0975633 and donation details, suitable for U.S. tax purposes. Please consult your tax advisor regarding tax deductibility.</p>
    `,
  },
  {
    path: "/contact",
    title: "Contact | Pásalo Pa'lante and Te Amo PR",
    description:
      "Contact Pásalo Pa'lante and Te Amo PR for partnerships, schools, donations, media, legal, privacy, or general inquiries.",
    body: `
      <h1>Contact us</h1>
      ${SISTER}
      <p>For questions about Pásalo Pa'lante, Te Amo PR, partnerships, schools, ambassadors, donations, media, or privacy requests, please contact us.</p>
      <ul>
        <li>Email: <a href="mailto:info@teamopr.org">info@teamopr.org</a></li>
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
    title: "Privacy Policy | Pásalo Pa'lante",
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
      <h2>Cookies, analytics &amp; Google Ad Grants</h2>
      <p>We may use cookies, Google Analytics, Google Ads, Google Ad Grants, and similar tools to understand website traffic, measure campaign effectiveness, prevent misuse, and support mission-related outreach. We do not use these tools to sell personal information.</p>
      <h2>Sharing</h2>
      <p>We may share information with Te Amo PR team members, authorized volunteers, contractors, website providers, email platforms, donation processors, analytics providers, legal or accounting professionals, and partners involved in fulfilling user-requested activities, or when required by law.</p>
      <h2>Children's privacy</h2>
      <p>We do not knowingly collect personal information from children under the age required by applicable law without appropriate parent, guardian, school, or institutional consent.</p>
      <h2>Data security &amp; retention</h2>
      <p>We use reasonable administrative, technical, and organizational safeguards. We keep personal information only as long as reasonably necessary for the purposes described in this policy.</p>
      <h2>Your choices</h2>
      <p>Request access, correction, or deletion by emailing <a href="mailto:info@teamopr.org">info@teamopr.org</a>.</p>
      <h2>Contact</h2>
      <p>Email: <a href="mailto:info@teamopr.org">info@teamopr.org</a> · Phone: (787) 705-0778 · Address: 550 Av. de la Constitución #905, San Juan, PR.</p>
    `,
  },
  {
    path: "/terms",
    title: "Terms & Legal Information | Pásalo Pa'lante",
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
      <h2>Contact</h2>
      <p>Email: <a href="mailto:info@teamopr.org">info@teamopr.org</a> · Phone: (787) 705-0778 · Address: 550 Av. de la Constitución #905, San Juan, PR.</p>
    `,
  },
  {
    path: "/community-guidelines",
    title: "Community Guidelines | Pásalo Pa'lante",
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
        <li>Report concerns to <a href="mailto:info@teamopr.org">info@teamopr.org</a>.</li>
      </ul>
      <p>Pásalo Pa'lante may remove, decline, or report content that violates these guidelines or harms the integrity of the movement.</p>
    `,
  },
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderShell(route: Route): string {
  const url = `${SITE}${route.path}`;
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

  // Replace #root contents with route-specific visible HTML
  const rootBlock = `<div id="root"><main>${route.body}${FOOTER}</main></div>`;
  html = html.replace(/<div id="root">[\s\S]*?<\/div>\s*(?=<noscript|<script)/, `${rootBlock}\n    `);

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
