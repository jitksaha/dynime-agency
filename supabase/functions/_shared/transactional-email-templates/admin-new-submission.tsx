/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from './_components.tsx'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader, BrandHeaderStyle } from './brand-header.tsx'

const SITE_NAME = 'Dynime'

interface Props {
  formType?: string
  customerName?: string
  customerEmail?: string
  submission?: Array<{ label: string; value: string }>
  adminUrl?: string
}

const AdminNewSubmissionEmail = ({
  formType = 'submission',
  customerName,
  customerEmail,
  submission = [],
  adminUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head><BrandHeaderStyle /></Head>
    <Preview>
      New {formType} from {customerName || customerEmail || 'a visitor'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader tagline="Admin notification" />
        <Text style={badge}>NEW {formType.toUpperCase()}</Text>
        <Heading style={h1}>
          {customerName ? `${customerName} just submitted a ${formType}` : `New ${formType} received`}
        </Heading>

        {customerEmail && (
          <Text style={text}>
            <span style={labelStyle}>Reply to:</span>{' '}
            <a href={`mailto:${customerEmail}`} style={link}>{customerEmail}</a>
          </Text>
        )}

        <Section style={summaryBox}>
          <Text style={summaryTitle}>Submission details</Text>
          {submission.map((item) => (
            <Text key={item.label} style={summaryRow}>
              <span style={labelStyle}>{item.label}:</span>{' '}
              <span style={valueStyle}>{item.value}</span>
            </Text>
          ))}
        </Section>

        {adminUrl && (
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={adminUrl} style={button}>
              View in admin panel
            </Button>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          {SITE_NAME} • Lead notification • Reply within 1 business day for best conversion.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminNewSubmissionEmail,
  subject: (d: Record<string, any>) => {
    const who = d?.customerName || d?.customerEmail || 'New visitor'
    return `🔔 New ${d?.formType || 'submission'} from ${who}`
  },
  displayName: 'Admin: new submission alert',
  previewData: {
    formType: 'quote request',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    submission: [
      { label: 'Service', value: 'Web Development' },
      { label: 'Budget', value: '$2,000 – $5,000' },
      { label: 'Timeline', value: '1–2 months' },
      { label: 'Message', value: 'Looking to redesign our company site.' },
    ],
    adminUrl: 'https://dynime.com/superadmin/submissions',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0 }
const container = { padding: '32px 28px', maxWidth: '600px', margin: '0 auto' }
const badge = {
  display: 'inline-block',
  backgroundColor: '#635bff',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  padding: '4px 10px',
  borderRadius: '999px',
  margin: '0 0 14px',
}
const h1 = { fontSize: '22px', fontWeight: 700, color: '#1a1f36', margin: '0 0 18px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#3c4257', lineHeight: '1.6', margin: '0 0 14px' }
const summaryBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '12px',
  padding: '18px 20px',
  margin: '16px 0 8px',
  borderLeft: '3px solid #3333ff',
}
const summaryTitle = { fontSize: '11px', fontWeight: 600, color: '#635bff', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 14px' }
const summaryRow = { fontSize: '14px', color: '#3c4257', margin: '4px 0', lineHeight: '1.6' }
const labelStyle = { color: '#697386', fontWeight: 400 }
const valueStyle = { color: '#1a1f36', fontWeight: 600 }
const link = { color: '#635bff', textDecoration: 'none', fontWeight: 600 }
const button = {
  backgroundColor: '#635bff',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '10px',
  textDecoration: 'none',
  fontWeight: 600,
  fontSize: '14px',
  display: 'inline-block',
}
const hr = { borderColor: '#e3e8ee', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#8898aa', margin: 0 }
