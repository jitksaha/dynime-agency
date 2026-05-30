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
  effectiveDate?: string
  docNumber?: string
  downloadUrl?: string
}

const EmploymentAgreementEmail = ({ name, designation, effectiveDate, docNumber, downloadUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head><BrandHeaderStyle /></Head>
    <Preview>Your employment agreement with {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Your Employment Agreement</Heading>
        <Text style={text}>
          {name ? `Hi ${name.split(' ')[0]},` : 'Hello,'} please find attached your formal employment agreement with {SITE_NAME}.
          Take a moment to review the terms — they cover your role, compensation, confidentiality and code of conduct.
        </Text>

        <Section style={summaryBox}>
          <Text style={summaryTitle}>Agreement Details</Text>
          {designation && <Text style={row}><span style={lbl}>Role:</span> <span style={val}>{designation}</span></Text>}
          {effectiveDate && <Text style={row}><span style={lbl}>Effective from:</span> <span style={val}>{effectiveDate}</span></Text>}
          {docNumber && <Text style={row}><span style={lbl}>Agreement #:</span> <span style={val}>{docNumber}</span></Text>}
        </Section>

        {downloadUrl && (
          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={downloadUrl} style={button}>Download agreement (PDF)</Button>
          </Section>
        )}

        <Text style={text}>
          Once reviewed, please sign the printed copy and return it to HR. If you have questions about any clause,
          just reply to this email.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>— The {SITE_NAME} HR Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EmploymentAgreementEmail,
  subject: (d: Record<string, any>) => `Your employment agreement${d?.docNumber ? ` — ${d.docNumber}` : ''}`,
  displayName: 'HR — Employment Agreement',
  previewData: {
    name: 'Jane Doe', designation: 'Senior Developer', effectiveDate: '2026-06-01',
    docNumber: 'AGR-2026-00012', downloadUrl: 'https://example.com/agreement.pdf',
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
