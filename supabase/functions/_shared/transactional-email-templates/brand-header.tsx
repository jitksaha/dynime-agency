/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Img, Link, Section, Text } from './_components.tsx'

/**
 * Stripe-style minimal brand header.
 * - Thin brand-color strip at the very top (rendered via inline border on Body wrapper isn't reliable
 *   across clients, so we draw it as a 3px Section here).
 * - Left-aligned wordmark + small logo.
 * - Optional uppercase tagline acting as a section eyebrow.
 * - Hairline divider beneath, generous spacing below.
 */
export const BRAND_LOGO = 'https://dynime.com/apple-touch-icon.png'
export const BRAND_SITE_URL = 'https://dynime.com'
export const BRAND_NAME = 'Dynime'
export const BRAND_ACCENT = '#635bff'

// Kept as a no-op export for backwards compatibility with existing templates.
export const BrandHeaderStyle: React.FC = () => null

export const BrandHeader: React.FC<{ tagline?: string }> = ({ tagline }) => (
  <>
    <Section style={accentStrip} />
    <Section style={wrap}>
      <Link href={BRAND_SITE_URL} style={link}>
        <Img
          src={BRAND_LOGO}
          alt={`${BRAND_NAME} logo`}
          width="28"
          height="28"
          style={logo}
        />
        <Text style={wordmark}>{BRAND_NAME}</Text>
      </Link>
      {tagline ? <Text style={taglineStyle}>{tagline}</Text> : null}
    </Section>
  </>
)

const accentStrip = {
  height: '3px',
  lineHeight: '3px',
  fontSize: '0',
  backgroundColor: BRAND_ACCENT,
}
const wrap = {
  padding: '28px 0 22px',
  textAlign: 'left' as const,
  borderBottom: '1px solid #e3e8ee',
  marginBottom: '28px',
}
const link = { textDecoration: 'none', color: '#1a1f36', display: 'inline-block' }
const logo = {
  verticalAlign: 'middle',
  borderRadius: '6px',
  display: 'inline-block',
}
const wordmark = {
  display: 'inline-block',
  verticalAlign: 'middle',
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: '17px',
  fontWeight: 600,
  margin: '0 0 0 10px',
  letterSpacing: '-0.01em',
  color: '#1a1f36',
}
const taglineStyle = {
  fontFamily: 'Inter, Arial, sans-serif',
  fontSize: '11px',
  color: BRAND_ACCENT,
  margin: '14px 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  fontWeight: 600,
}
