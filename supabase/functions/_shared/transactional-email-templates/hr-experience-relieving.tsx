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
  kind?: 'experience' | 'relieving'
  designation?: string
  joiningDate?: string
  lastWorkingDay?: string
  docNumber?: string
  downloadUrl?: string
}

const ExperienceRelievingEmail = ({
  name, kind = 'experience', designation, joiningDate, lastWorkingDay, docNumber, downloadUrl,
}: Props) => {
  const isRelieving = kind === 'relieving'
  const title = isRelieving ? 'Your Relieving Letter' : 'Your Experience Letter'
  const intro = isRelieving
    ? `It's been a pleasure having you on the ${SITE_NAME} team. Please find your relieving letter below — all dues are settled and you are formally released from your duties.`
    : `Thank you for your contributions to ${SITE_NAME}. Please find your experience letter below — it certifies your tenure and service with us.`

  return (
    <Html lang="en" dir="ltr">
      <Head><BrandHeaderStyle /></Head>
      <Preview>{title} from {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{title}</Heading>
          <Text style={text}>{name ? `${name.split(' ')[0]}, ` : ''}{intro}</Text>

          <Section style={summaryBox}>
            <Text style={summaryTitle}>Tenure</Text>
            {designation && <Text style={row}><span style={lbl}>Role:</span> <span style={val}>{designation}</span></Text>}
            {joiningDate && <Text style={row}><span style={lbl}>Joined:</span> <span style={val}>{joiningDate}</span></Text>}
            {lastWorkingDay && <Text style={row}><span style={lbl}>Last working day:</span> <span style={val}>{lastWorkingDay}</span></Text>}
            {docNumber && <Text style={row}><span style={lbl}>Reference:</span> <span style={val}>{docNumber}</span></Text>}
          </Section>

          {downloadUrl && (
            <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
              <Button href={downloadUrl} style={button}>Download letter (PDF)</Button>
            </Section>
          )}

          <Text style={text}>We wish you the very best in everything that comes next.</Text>

          <Hr style={hr} />
          <Text style={footer}>— The {SITE_NAME} HR Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ExperienceRelievingEmail,
  subject: (d: Record<string, any>) => {
    const title = d?.kind === 'relieving' ? 'Relieving Letter' : 'Experience Letter'
    return `${title}${d?.docNumber ? ` — ${d.docNumber}` : ''}`
  },
  displayName: 'HR — Experience / Relieving Letter',
  previewData: {
    name: 'Jane Doe', kind: 'experience', designation: 'Senior Developer',
    joiningDate: '2024-01-15', lastWorkingDay: '2026-05-31',
    docNumber: 'EXP-2026-00012', downloadUrl: 'https://example.com/letter.pdf',
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
