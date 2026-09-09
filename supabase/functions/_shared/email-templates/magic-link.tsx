/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import {
  BRAND_NAME, LOGO_URL, accentRule, button, buttonWrap, code, container,
  footer, h1, logoImg, main, signature, text, textEs,
} from './_styles.ts'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token: string
}

export const MagicLinkEmail = ({ confirmationUrl, token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in link for {BRAND_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={BRAND_NAME} style={logoImg} />
        <Hr style={accentRule} />
        <Heading style={h1}>Your sign-in link</Heading>
        <Text style={text}>
          Click the button below to sign in to {BRAND_NAME}. This link expires
          shortly for your security.
        </Text>
        <div style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>Sign in</Button>
        </div>
        {/* Same reasoning as the signup email: the button opens your regular
            browser, which on iPhone can't share sign-in with an
            already-installed home-screen app. This code, typed directly
            into the app, avoids that. */}
        <Text style={text}>Already have the app open? Enter this code there instead:</Text>
        <Text style={code}>{token}</Text>
        <Text style={textEs}>
          Haz clic en el botón para iniciar sesión en {BRAND_NAME}. Este enlace
          caduca pronto por seguridad.
        </Text>
        <Text style={signature}>With love, the {BRAND_NAME} team</Text>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail
