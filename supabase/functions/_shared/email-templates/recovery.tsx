/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import {
  BRAND_NAME, LOGO_URL, accentRule, button, buttonWrap, container, footer,
  h1, logoImg, main, signature, text, textEs,
} from './_styles.ts'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {BRAND_NAME} password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={BRAND_NAME} style={logoImg} />
        <Hr style={accentRule} />
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset the password for your {BRAND_NAME}
          account. Click below to choose a new one.
        </Text>
        <div style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>Reset password</Button>
        </div>
        <Text style={textEs}>
          Recibimos una solicitud para restablecer tu contraseña de
          {' '}{BRAND_NAME}. Haz clic para elegir una nueva.
        </Text>
        <Text style={signature}>With love, the {BRAND_NAME} team</Text>
        <Text style={footer}>
          If you didn't request a reset, you can safely ignore this email — your
          password will not change.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail
