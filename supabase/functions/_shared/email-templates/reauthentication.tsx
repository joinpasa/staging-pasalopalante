/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import {
  BRAND_NAME, BRAND_NAME_ES, LOGO_ALT, LOGO_URL, LOGO_WIDTH, TEAM_NAME, accentRule, container, footer, h1, logoImg,
  main, signature, text, textEs,
} from './_styles.ts'
import { OtpCode, OtpHead } from './_code.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head><OtpHead /></Head>
    <Preview>Your {BRAND_NAME} verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={LOGO_ALT} width={LOGO_WIDTH} style={logoImg} />
        <Hr style={accentRule} />
        <Heading style={h1}>Confirm it's you</Heading>
        <Text style={text}>
          Use the code below to confirm your identity on {BRAND_NAME}.
        </Text>
        <OtpCode token={token} />
        <Text style={textEs}>
          Usa el código de arriba para confirmar tu identidad en {BRAND_NAME_ES}.
        </Text>
        <Text style={signature}>With love, the {TEAM_NAME} team</Text>
        <Text style={footer}>
          This code expires shortly. If you didn't request this, you can safely
          ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail
