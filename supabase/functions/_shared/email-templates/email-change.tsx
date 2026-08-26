/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import {
  BRAND_NAME, LOGO_URL, accentRule, button, buttonWrap, container, footer,
  h1, link, logoImg, main, signature, text, textEs,
} from './_styles.ts'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your {BRAND_NAME} email change</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={BRAND_NAME} style={logoImg} />
        <Hr style={accentRule} />
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to change the email on your {BRAND_NAME} account from{' '}
          <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>{' '}
          to{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <div style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>Confirm email change</Button>
        </div>
        <Text style={textEs}>
          Solicitaste cambiar el correo de tu cuenta de {BRAND_NAME}. Haz
          clic para confirmar el cambio.
        </Text>
        <Text style={signature}>With love, the {BRAND_NAME} team</Text>
        <Text style={footer}>
          If you didn't request this change, please secure your account immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail
