/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import {
  BRAND_NAME, LOGO_URL, accentRule, button, buttonWrap, container, footer,
  h1, logoImg, main, signature, text, textEs,
} from './_styles.ts'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to {BRAND_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={BRAND_NAME} style={logoImg} />
        <Hr style={accentRule} />
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          You've been invited to join {BRAND_NAME} — a worldwide movement
          of everyday acts of kindness. Accept your invitation and create your
          account below.
        </Text>
        <div style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>Accept invitation</Button>
        </div>
        <Text style={textEs}>
          Te invitaron a unirte a {BRAND_NAME}. Acepta la invitación para
          crear tu cuenta.
        </Text>
        <Text style={signature}>With love, the {BRAND_NAME} team</Text>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail
