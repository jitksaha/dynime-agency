/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Section, Text, Link } from './_components.tsx'
import { BRAND_NAME, BRAND_SITE_URL } from './brand-header.tsx'

/**
 * Cloudflare-style transactional email footer.
 * Auto-appended to every email by send-transactional-email.
 * HQ address is fetched at send time from contact_info (lowest sort_order address).
 */

export interface BrandFooterProps {
  hqAddress?: string
  websiteUrl?: string
  communityUrl?: string
  socials?: {
    facebook?: string
    twitter?: string
    linkedin?: string
    instagram?: string
  }
}

const SOCIAL_ICON_BASE =
  'https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons@master/images/svg'

export const BrandFooter: React.FC<BrandFooterProps> = ({
  hqAddress,
  websiteUrl = BRAND_SITE_URL,
  communityUrl,
  socials = {},
}) => {
  const year = new Date().getFullYear()
  const cleanWebsite = (websiteUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '')

  const socialItems: Array<{ name: string; href: string; icon: string }> = []
  if (socials.facebook) socialItems.push({ name: 'Facebook', href: socials.facebook, icon: `${SOCIAL_ICON_BASE}/facebook.svg` })
  if (socials.twitter) socialItems.push({ name: 'X', href: socials.twitter, icon: `${SOCIAL_ICON_BASE}/twitter.svg` })
  if (socials.linkedin) socialItems.push({ name: 'LinkedIn', href: socials.linkedin, icon: `${SOCIAL_ICON_BASE}/linkedin.svg` })
  if (socials.instagram) socialItems.push({ name: 'Instagram', href: socials.instagram, icon: `${SOCIAL_ICON_BASE}/instagram.svg` })

  return (
    <Section style={wrap}>
      <Text style={copyright}>
        Copyright © {year} {BRAND_NAME}.
      </Text>
      {hqAddress ? <Text style={addressLine}>{hqAddress}</Text> : null}

      <Text style={linksLine}>
        <Link href={websiteUrl} style={linkStyle}>{cleanWebsite}</Link>
        {communityUrl ? (
          <>
            <span style={sep}>{'  |  '}</span>
            <Link href={communityUrl} style={linkStyle}>Community</Link>
          </>
        ) : null}
      </Text>

      {socialItems.length > 0 ? (
        <Section style={socialRow}>
          {socialItems.map((s) => (
            <Link key={s.name} href={s.href} style={socialLinkStyle}>
              <img
                src={s.icon}
                alt={s.name}
                width={28}
                height={28}
                style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 6px', opacity: 0.7 }}
              />
            </Link>
          ))}
        </Section>
      ) : null}
    </Section>
  )
}

const wrap = {
  textAlign: 'center' as const,
  padding: '32px 24px 28px',
  borderTop: '1px solid #eceef5',
  marginTop: '24px',
  color: '#9b9bab',
  fontFamily: 'Inter, Arial, sans-serif',
}
const copyright = { fontSize: '13px', color: '#9b9bab', margin: '0 0 4px', lineHeight: '1.5' }
const addressLine = { fontSize: '13px', color: '#9b9bab', margin: '0 0 16px', lineHeight: '1.5' }
const linksLine = { fontSize: '13px', color: '#9b9bab', margin: '0 0 14px' }
const linkStyle = { color: '#9b9bab', textDecoration: 'none' }
const sep = { color: '#cfcfd8' }
const socialRow = { textAlign: 'center' as const, margin: '6px 0 0' }
const socialLinkStyle = { textDecoration: 'none', display: 'inline-block' }

/** Plain-text variant of the footer for the text/plain MIME part. */
export function renderBrandFooterText(props: BrandFooterProps): string {
  const year = new Date().getFullYear()
  const lines: string[] = ['', '---', `Copyright © ${year} ${BRAND_NAME}.`]
  if (props.hqAddress) lines.push(props.hqAddress)
  const linkParts: string[] = []
  if (props.websiteUrl) linkParts.push(props.websiteUrl)
  if (props.communityUrl) linkParts.push(`Community: ${props.communityUrl}`)
  if (linkParts.length) lines.push(linkParts.join('  |  '))
  return lines.join('\n')
}
