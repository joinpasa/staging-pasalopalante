// Shared brand styles for Pásalo Pa'lante auth emails.
// Inline styles only — email clients don't support external CSS.

export const LOGO_URL =
  'https://tipfbleltjexofsjffwb.supabase.co/storage/v1/object/public/email-assets/logo-ppl.png'

export const BRAND_NAME = "Pásalo Pa'lante"

const fontStack =
  "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
const serifStack =
  "'DM Serif Display', Georgia, 'Times New Roman', serif"

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: fontStack,
  margin: 0,
  padding: '32px 16px',
  color: '#2c2622',
}

export const container = {
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#fbf7f0',
  border: '1px solid #ece2d3',
  borderRadius: '16px',
  padding: '40px 36px',
}

export const logoImg = {
  display: 'block',
  margin: '0 auto 28px',
  height: '44px',
  width: 'auto',
}

export const accentRule = {
  width: '48px',
  height: '3px',
  backgroundColor: '#efbf4a',
  border: 'none',
  borderRadius: '2px',
  margin: '0 auto 24px',
}

export const h1 = {
  fontFamily: serifStack,
  fontSize: '30px',
  fontWeight: 400 as const,
  lineHeight: '1.15',
  color: '#2c2622',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}

export const text = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: '#5b4f47',
  margin: '0 0 18px',
  textAlign: 'center' as const,
}

export const textEs = {
  ...text,
  fontStyle: 'italic' as const,
  color: '#8a7b6f',
  fontSize: '14px',
}

export const buttonWrap = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

export const button = {
  backgroundColor: '#d96a3f',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const link = { color: '#d96a3f', textDecoration: 'underline' }

export const code = {
  fontFamily: "'DM Mono', 'Courier New', monospace",
  fontSize: '28px',
  fontWeight: 600 as const,
  letterSpacing: '8px',
  color: '#2c2622',
  textAlign: 'center' as const,
  backgroundColor: '#ffffff',
  border: '1px solid #ece2d3',
  borderRadius: '12px',
  padding: '18px',
  margin: '8px 0 28px',
}

export const footer = {
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#a89c8e',
  textAlign: 'center' as const,
  margin: '32px 0 0',
}

export const signature = {
  fontFamily: serifStack,
  fontSize: '15px',
  color: '#2c2622',
  textAlign: 'center' as const,
  margin: '24px 0 0',
}
