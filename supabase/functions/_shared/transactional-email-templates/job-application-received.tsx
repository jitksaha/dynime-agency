/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from './_components.tsx'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader, BrandHeaderStyle } from './brand-header.tsx'

const SITE_NAME = 'Dynime'

interface Props {
  name?: string
  role?: string
}

const JobApplicationReceivedEmail = ({ name, role }: Props) => (
  <Html lang="en" dir="ltr">
    <Head><BrandHeaderStyle /></Head>
    <Preview>We received your application{role ? ` for ${role}` : ''}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader tagline="Careers" />
        <Heading style={h1}>{name ? `Thanks for applying, ${name}` : 'Thanks for applying'}</Heading>
        <Text style={text}>
          We received your job application{role ? ` for ${role}` : ''}. Our hiring team will review your details and contact you if your profile matches the role.
        </Text>

        <Section style={summaryBox}>
          <Text style={summaryTitle}>Application status</Text>
          {role && (
            <Text style={summaryRow}>
              <span style={labelStyle}>Role:</span>{' '}
              <span style={valueStyle}>{role}</span>
            </Text>
          )}
          <Text style={summaryRow}>
            <span style={labelStyle}>Status:</span>{' '}
            <span style={valueStyle}>Received</span>
          </Text>
        </Section>

        <Hr style={hr} />
        <Text style={text}>You do not need to submit the same application again. We will email you when there is an update.</Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: JobApplicationReceivedEmail,
  subject: (d: Record<string, any>) => `We received your application${d?.role ? ` for ${d.role}` : ''}`,
  displayName: 'Job application received',
  previewData: {
    name: 'Jane Doe',
    role: 'Frontend Engineer',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0 }
const container = { padding: '44px 40px 36px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#1a1f36', margin: '0 0 20px', letterSpacing: '-0.01em', lineHeight: '1.3' }
const text = { fontSize: '16px', color: '#3c4257', lineHeight: '1.65', margin: '0 0 18px' }
const summaryBox = { backgroundColor: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '8px', padding: '22px 24px', margin: '20px 0 28px' }
const summaryTitle = { fontSize: '11px', fontWeight: 600, color: '#635bff', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 14px' }
const summaryRow = { fontSize: '14px', color: '#3c4257', margin: '8px 0', lineHeight: '1.5' }
const labelStyle = { color: '#697386', fontWeight: 400 }
const valueStyle = { color: '#1a1f36', fontWeight: 600 }
const hr = { borderColor: '#e3e8ee', margin: '32px 0 24px' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '24px 0 0', lineHeight: '1.5' }