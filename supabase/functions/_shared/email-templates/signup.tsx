/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import {
  BRAND_NAME, LOGO_URL, accentRule, button, buttonWrap, container, footer,
  h1, logoImg, main, signature, text, textEs,
} from './_styles.ts'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ confirmationUrl }: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {BRAND_NAME} — confirm your email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={BRAND_NAME} style={logoImg} />
        <Hr style={accentRule} />
        <Heading style={h1}>Welcome to {BRAND_NAME}</Heading>
        <Text style={text}>
          Thank you for joining a global movement of small acts and big-hearted
          people. Please confirm your email address to get started.
        </Text>
        <div style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>Confirm my email</Button>
        </div>
        <Text style={textEs}>
          Bienvenido a {BRAND_NAME}. Confirma tu correo para comenzar a
          compartir y recibir actos de bondad.
        </Text>
        <Text style={signature}>With love, the {BRAND_NAME} team</Text>
        <Text style={footer}>
          If you didn't sign up, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail
