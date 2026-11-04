// Shared brand styles for Kindness Forward / Pásalo Pa'lante auth emails.
// Inline styles only — email clients don't support external CSS.
// Colors match the website's Kindness Forward palette (navy, orange, gold,
// light grey-blue), see packages/shared/src/styles/index.css.

// Combined lockup: Kindness Forward (main) + Pásalo Pa'lante (sister mark),
// baked onto a white panel so it stays readable when a mail app renders the
// email in dark mode. Served from the live site (apps/website/public).
// One lockup for both audiences: sign-ups from passkindnessforward.com
// finish on pasalopalante.com, so the email can't tell which site someone
// came from.
export const LOGO_URL = 'https://pasalopalante.com/email-logo-kf-ppl.png'
export const LOGO_ALT = "Kindness Forward · Pásalo Pa'lante"
export const LOGO_WIDTH = 320

export const BRAND_NAME = 'Kindness Forward'
// Spanish lines are mostly read in Puerto Rico, where the movement is known
// as Pásalo Pa'lante.
export const BRAND_NAME_ES = "Kindness Forward · Pásalo Pa'lante"
export const TEAM_NAME = "Kindness Forward & Pásalo Pa'lante"

const fontStack =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const serifStack =
  "'DM Serif Display', Georgia, 'Times New Roman', serif"

export const main = {
  backgroundColor: '#f1f5f9',
  fontFamily: fontStack,
  margin: 0,
  padding: '32px 16px',
  color: '#0e234b',
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  border: '1px solid #d9e1ea',
  borderRadius: '16px',
  padding: '40px 36px',
}

export const logoImg = {
  display: 'block',
  margin: '0 auto 28px',
  width: '320px',
  maxWidth: '100%',
  height: 'auto',
}

export const accentRule = {
  width: '48px',
  height: '3px',
  backgroundColor: '#fbb813',
  border: 'none',
  borderRadius: '2px',
  margin: '0 auto 24px',
}

export const h1 = {
  fontFamily: serifStack,
  fontSize: '30px',
  fontWeight: 400 as const,
  lineHeight: '1.15',
  color: '#0e234b',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}

export const text = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#4b5d7a',
  margin: '0 0 18px',
  textAlign: 'center' as const,
}

export const textEs = {
  ...text,
  fontStyle: 'italic' as const,
  color: '#6b7a93',
  fontSize: '14px',
}

export const buttonWrap = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

export const button = {
  backgroundColor: '#f2701d',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const link = { color: '#f2701d', textDecoration: 'underline' }

export const code = {
  fontFamily: "'DM Mono', 'Courier New', monospace",
  fontSize: '28px',
  fontWeight: 600 as const,
  letterSpacing: '8px',
  color: '#0e234b',
  textAlign: 'center' as const,
  backgroundColor: '#f1f5f9',
  border: '1px solid #d9e1ea',
  borderRadius: '12px',
  padding: '18px',
  margin: '8px 0 28px',
}

export const footer = {
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#8a97ad',
  textAlign: 'center' as const,
  margin: '32px 0 0',
}

export const signature = {
  fontFamily: serifStack,
  fontSize: '15px',
  color: '#0e234b',
  textAlign: 'center' as const,
  margin: '24px 0 0',
}
