/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from './_components.tsx'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader, BrandHeaderStyle } from './brand-header.tsx'

const SITE_NAME = 'Dynime'

interface Props {
  name?: string
  designation?: string
  department?: string
  joiningDate?: string
  grossSalary?: string
  docNumber?: string
  downloadUrl?: string
  validityDate?: string
}

const OfferLetterEmail = ({
  name, designation, department, joiningDate, grossSalary, docNumber, downloadUrl, validityDate,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head><BrandHeaderStyle /></Head>
    <Preview>Your offer of employment at {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>
          {name ? `Welcome aboard, ${name.split(' ')[0]}!` : 'Welcome aboard!'}
        </Heading>
        <Text style={text}>
          We are delighted to offer you the position of{' '}
          <strong>{designation || '—'}</strong>
          {department ? ` in the ${department} team` : ''} at {SITE_NAME}.
        </Text>

        <Section style={summaryBox}>
          <Text style={summaryTitle}>Offer Summary</Text>
          {designation && <Text style={row}><span style={lbl}>Position:</span> <span style={val}>{designation}</span></Text>}
          {joiningDate && <Text style={row}><span style={lbl}>Joining date:</span> <span style={val}>{joiningDate}</span></Text>}
          {grossSalary && <Text style={row}><span style={lbl}>Gross salary:</span> <span style={val}>{grossSalary}</span></Text>}
          {docNumber && <Text style={row}><span style={lbl}>Reference:</span> <span style={val}>{docNumber}</span></Text>}
        </Section>

        {validityDate && (
          <Text style={text}>
            Please review and respond by <strong>{validityDate}</strong>.
          </Text>
        )}

        {downloadUrl && (
          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={downloadUrl} style={button}>Download offer letter (PDF)</Button>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={text}>
          Have questions about your offer? Simply reply to this email and our HR team will help.
        </Text>
        <Text style={footer}>— The {SITE_NAME} HR Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OfferLetterEmail,
  subject: (d: Record<string, any>) =>
    `Your offer of employment${d?.docNumber ? ` — ${d.docNumber}` : ''}`,
  displayName: 'HR — Offer Letter',
  previewData: {
    name: 'Jane Doe', designation: 'Senior Developer', department: 'Engineering',
    joiningDate: '2026-06-01', grossSalary: 'USD 4,500.00 / month',
    docNumber: 'OFR-2026-00012', validityDate: '2026-05-31',
    downloadUrl: 'https://example.com/offer.pdf',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0 }
const container = { padding: '44px 40px 36px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#1a1f36', margin: '0 0 20px', letterSpacing: '-0.01em', lineHeight: '1.3' }
const text = { fontSize: '16px', color: '#3c4257', lineHeight: '1.65', margin: '0 0 18px' }
const summaryBox = { backgroundColor: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '8px', padding: '22px 24px', margin: '20px 0 28px' }
const summaryTitle = { fontSize: '11px', fontWeight: 600, color: '#635bff', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 14px' }
const row = { fontSize: '14px', color: '#3c4257', margin: '8px 0', lineHeight: '1.5' }
const lbl = { color: '#697386', fontWeight: 400 }
const val = { color: '#1a1f36', fontWeight: 600 }
const button = { backgroundColor: '#635bff', color: '#ffffff', padding: '13px 28px', borderRadius: '6px', fontSize: '15px', fontWeight: 500, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e3e8ee', margin: '32px 0 24px' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '24px 0 0', lineHeight: '1.5' }
