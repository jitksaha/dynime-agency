/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from './_components.tsx'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader, BrandHeaderStyle } from './brand-header.tsx'

const SITE_NAME = 'Dynime FlexPay'

interface Props {
  name?: string
  referenceNo?: string
  documents?: Array<{ label: string; description?: string }>
  uploadUrl?: string
  adminNote?: string
}

const FlexPayDocumentRequestEmail = ({
  name,
  referenceNo,
  documents = [],
  uploadUrl,
  adminNote,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head><BrandHeaderStyle /></Head>
    <Preview>Action required — upload supporting documents for your FlexPay application</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>
          {name ? `Hi ${name},` : 'Hi,'}
        </Heading>
        <Text style={text}>
          We need a few supporting documents to continue reviewing your FlexPay
          credit application{referenceNo ? ` (${referenceNo})` : ''}. Please upload
          them from your account dashboard at your earliest convenience.
        </Text>

        {documents.length > 0 && (
          <Section style={summaryBox}>
            <Text style={summaryTitle}>Documents requested</Text>
            {documents.map((d, i) => (
              <Section key={i} style={{ marginBottom: 10 }}>
                <Text style={docLabel}>{i + 1}. {d.label}</Text>
                {d.description && <Text style={docDesc}>{d.description}</Text>}
              </Section>
            ))}
          </Section>
        )}

        {adminNote && (
          <Section style={noteBox}>
            <Text style={summaryTitle}>Note from our team</Text>
            <Text style={text}>{adminNote}</Text>
          </Section>
        )}

        {uploadUrl && (
          <Section style={{ textAlign: 'center' as const, margin: '28px 0 8px' }}>
            <Button href={uploadUrl} style={cta}>Upload documents</Button>
          </Section>
        )}

        <Hr style={hr} />
        <Text style={text}>
          Your application stays paused until we receive and verify these documents.
          Once uploaded, our team typically reviews within 1–2 business days.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: FlexPayDocumentRequestEmail,
  subject: (d: Record<string, any>) =>
    `Action required: upload documents for your FlexPay application${d?.referenceNo ? ` (${d.referenceNo})` : ''}`,
  displayName: 'FlexPay document request',
  previewData: {
    name: 'Jane Doe',
    referenceNo: 'FPA-2026-00012',
    documents: [
      { label: 'Government ID (passport / driving licence)', description: 'Clear photo of both sides if applicable' },
      { label: 'Proof of address', description: 'Utility bill or bank statement, not older than 3 months' },
      { label: 'Proof of profession', description: 'Employment letter or business registration' },
    ],
    uploadUrl: 'https://dynime.com/account/flexpay',
    adminNote: 'Please ensure your name on the ID matches the application.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0 }
const container = { padding: '44px 40px 36px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#1a1f36', margin: '0 0 18px', letterSpacing: '-0.01em', lineHeight: '1.3' }
const text = { fontSize: '16px', color: '#3c4257', lineHeight: '1.65', margin: '0 0 16px' }
const summaryBox = {
  backgroundColor: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '8px', padding: '20px 22px', margin: '18px 0 24px',
}
const noteBox = {
  backgroundColor: '#fff8e1', border: '1px solid #fde68a', borderRadius: '8px', padding: '16px 18px', margin: '18px 0 0',
}
const summaryTitle = { fontSize: '11px', fontWeight: 600, color: '#635bff', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 14px' }
const docLabel = { fontSize: '15px', color: '#1a1f36', fontWeight: 600, margin: '0 0 4px' }
const docDesc = { fontSize: '13px', color: '#697386', margin: '0', lineHeight: '1.5' }
const cta = { backgroundColor: '#635bff', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e3e8ee', margin: '28px 0 20px' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '18px 0 0', lineHeight: '1.5' }
