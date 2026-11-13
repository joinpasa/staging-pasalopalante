/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Text } from 'npm:@react-email/components@0.0.22'
import { code } from './_styles.ts'

// Mail apps on phones (iOS Mail, Gmail) see a 6-8 digit code and turn it into
// a tappable phone number, so tapping it offers to *call* instead of letting
// you copy it. Email can't run JS, so true tap-to-copy isn't possible; what we
// can do is stop the phone-number detection and make one tap/long-press select
// the whole code so "Copy" is right there.
//
// - <OtpHead/> adds format-detection meta (Apple Mail / iOS) and neutralises
//   any links Apple's data detectors still add.
// - <OtpCode/> puts an invisible zero-width non-joiner between digits, which
//   breaks the digit run that phone-number detectors (incl. Gmail's) look for.
//   Every code input in the apps strips non-digits on input
//   (`replace(/\D/g, "")`), so a pasted code still works as-is.

const ZWNJ = '‌'

export const OtpHead = () => (
  <>
    <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
    <meta name="x-apple-disable-message-reformatting" />
    <style>{`
      a[x-apple-data-detectors], .otp-code a {
        color: inherit !important; text-decoration: none !important;
        font: inherit !important; pointer-events: none !important;
      }
    `}</style>
  </>
)

export const OtpCode = ({ token }: { token: string }) => (
  <Text
    className="otp-code"
    style={{ ...code, userSelect: 'all', WebkitUserSelect: 'all' } as React.CSSProperties}
  >
    {token.split('').join(ZWNJ)}
  </Text>
)
