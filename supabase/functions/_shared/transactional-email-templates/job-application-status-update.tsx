/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from './_components.tsx'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader, BrandHeaderStyle } from './brand-header.tsx'

const SITE_NAME = 'Dynime'

const STATUS_LABELS: Record<string, string> = {
  new: 'Received',
  reviewing: 'Under review',
  shortlisted: 'Shortlisted',
  interview: 'Interview stage',
  offer: 'Offer stage',
  hired: 'Hired',
  rejected: 'Not selected',
}

const STATUS_BODY: Record<string, string> = {
  new: 'Your application has been received by our hiring team.',
  reviewing: 'Our hiring team is currently reviewing your application.',
  shortlisted: 'Good news — your profile has been shortlisted for the next step.',
  interview: 'Your application has moved to the interview stage. Our team will contact you with details.',
  offer: 'Your application has moved to the offer stage. Our team will contact you with the next steps.',
  hired: 'Congratulations — your application has been marked as hired. Our team will contact you with onboarding details.',
  rejected: 'Thank you for your interest. After review, we are not moving forward with this application at this time.',
}

interface Props {
  name?: string
  role?: string
  status?: string
  updatedAt?: string
  note?: string
}

const titleCaseStatus = (status?: string) =>
  STATUS_LABELS[status || ''] || String(status || 'Updated').replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())

const formatUpdatedAt = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(d) + ' UTC'
  } catch {
    return d.toUTCString()
  }
}

const JobApplicationStatusUpdateEmail = ({ name, role, status = 'reviewing', updatedAt, note }: Props) => {
  const statusLabel = titleCaseStatus(status)
  const body = STATUS_BODY[status] || `Your application status has been updated to ${statusLabel}.`
  const updatedAtLabel = formatUpdatedAt(updatedAt)
  const trimmedNote = (note || '').trim()

  return (
    <Html lang="en" dir="ltr">
      <Head><BrandHeaderStyle /></Head>
      <Preview>Your application status is now {statusLabel}.</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader tagline="Careers" />
          <Heading style={h1}>{name ? `${name}, your application was updated` : 'Your application was updated'}</Heading>
          <Text style={text}>{body}</Text>

          <Section style={summaryBox}>
            <Text style={summaryTitle}>Latest update</Text>
            {role && (
              <Text style={summaryRow}>
                <span style={labelStyle}>Role:</span>{' '}
                <span style={valueStyle}>{role}</span>
              </Text>
            )}
            <Text style={summaryRow}>
              <span style={labelStyle}>Status:</span>{' '}
              <span style={valueStyle}>{statusLabel}</span>
            </Text>
            {updatedAtLabel && (
              <Text style={summaryRow}>
                <span style={labelStyle}>Updated:</span>{' '}
                <span style={valueStyle}>{updatedAtLabel}</span>
              </Text>
            )}
          </Section>

          {trimmedNote && (
            <Section style={noteBox}>
              <Text style={noteTitle}>A note from our team</Text>
              <Text style={noteText}>{trimmedNote}</Text>
            </Section>
          )}

          <Hr style={hr} />
          <Text style={text}>If there is a next step, our team will contact you directly by email.</Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}


export const template = {
  component: JobApplicationStatusUpdateEmail,
  subject: (d: Record<string, any>) => `Application status update: ${titleCaseStatus(d?.status)}`,
  displayName: 'Job application status update',
  previewData: {
    name: 'Jane Doe',
    role: 'Frontend Engineer',
    status: 'interview',
    updatedAt: new Date().toISOString(),
    note: 'Great profile! We would love to schedule a 30-minute intro call next week — please reply with your availability.',
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
const noteBox = { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '18px 22px', margin: '0 0 28px' }
const noteTitle = { fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 10px' }
const noteText = { fontSize: '14px', color: '#3c4257', lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap' as const }
const hr = { borderColor: '#e3e8ee', margin: '32px 0 24px' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '24px 0 0', lineHeight: '1.5' }