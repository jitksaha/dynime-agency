/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from './_components.tsx'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader, BrandHeaderStyle } from './brand-header.tsx'

const SITE_NAME = 'Dynime'
const SITE_URL = 'https://dynime.com'

type StatusKey = 'received' | 'in_progress' | 'completed'

interface Props {
  name?: string
  status?: StatusKey
  orderNumber?: string
  invoiceNumber?: string
  total?: string
  primaryService?: string
  note?: string
}

const COPY: Record<StatusKey, { heading: string; preview: string; body: string; cta: string }> = {
  received: {
    heading: 'We received your order',
    preview: 'Payment confirmed — your project is now in our queue.',
    body: 'Thanks for choosing us. Your payment has been received and your order is now in our work queue. Our team will review your brief and reach out within 24 hours to kick things off.',
    cta: 'View my order',
  },
  in_progress: {
    heading: 'Your project is now in progress',
    preview: 'Good news — our team has started working on your order.',
    body: 'Our team has officially started working on your order. You\'ll receive updates from your project manager as we hit each milestone. If you have anything else to share, just reply to this email.',
    cta: 'Track progress',
  },
  completed: {
    heading: 'Your project is complete',
    preview: 'All done — your order has been delivered.',
    body: 'Your order has been completed and delivered. We hope you\'re thrilled with the result. If anything needs a tweak, just reply to this email — we\'re here to help.',
    cta: 'View final delivery',
  },
}

const OrderStatusUpdateEmail = ({
  name, status = 'received', orderNumber, invoiceNumber, total, primaryService, note,
}: Props) => {
  const copy = COPY[status] ?? COPY.received
  const ref = invoiceNumber || orderNumber
  const orderUrl = ref ? `${SITE_URL}/invoice/${ref}` : `${SITE_URL}/account`

  return (
    <Html lang="en" dir="ltr">
      <Head><BrandHeaderStyle /></Head>
      <Preview>{copy.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <BrandHeader />
          <Heading style={h1}>{name ? `${copy.heading}, ${name}` : copy.heading}</Heading>
          <Text style={text}>{copy.body}</Text>

          <Section style={summaryBox}>
            <Text style={summaryTitle}>Order details</Text>
            {invoiceNumber && (
              <Text style={summaryRow}>
                <span style={labelStyle}>Invoice:</span>{' '}
                <span style={valueStyle}>{invoiceNumber}</span>
              </Text>
            )}
            {orderNumber && !invoiceNumber && (
              <Text style={summaryRow}>
                <span style={labelStyle}>Order:</span>{' '}
                <span style={valueStyle}>{orderNumber}</span>
              </Text>
            )}
            {primaryService && (
              <Text style={summaryRow}>
                <span style={labelStyle}>Service:</span>{' '}
                <span style={valueStyle}>{primaryService}</span>
              </Text>
            )}
            {total && (
              <Text style={summaryRow}>
                <span style={labelStyle}>Total:</span>{' '}
                <span style={valueStyle}>{total}</span>
              </Text>
            )}
            <Text style={summaryRow}>
              <span style={labelStyle}>Status:</span>{' '}
              <span style={valueStyle}>{status === 'in_progress' ? 'In progress' : status === 'received' ? 'Received' : 'Completed'}</span>
            </Text>
          </Section>

          {note && (
            <Section style={noteBox}>
              <Text style={noteTitle}>A note from our team</Text>
              <Text style={noteText}>{note}</Text>
            </Section>
          )}

          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={orderUrl} style={button}>{copy.cta}</Button>
          </Section>

          <Hr style={hr} />
          <Text style={text}>
            Questions? Just reply to this email — a real person will get back to you.
          </Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

const SUBJECTS: Record<StatusKey, string> = {
  received: 'We received your order',
  in_progress: 'Your project is now in progress',
  completed: 'Your project is complete',
}

export const template = {
  component: OrderStatusUpdateEmail,
  subject: (d: Record<string, any>) => {
    const status = (d?.status as StatusKey) || 'received'
    const ref = d?.invoiceNumber || d?.orderNumber
    return `${SUBJECTS[status] || SUBJECTS.received}${ref ? ` — ${ref}` : ''}`
  },
  displayName: 'Order status update',
  previewData: {
    name: 'Jane Doe',
    status: 'in_progress',
    invoiceNumber: 'INV-2026-000123',
    primaryService: 'Web Design & Development',
    total: '$1,200.00',
    note: 'Our designer has started on the homepage mockups — expect a preview within 3 days.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0 }
const container = { padding: '44px 40px 36px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#1a1f36', margin: '0 0 20px', letterSpacing: '-0.01em', lineHeight: '1.3' }
const text = { fontSize: '16px', color: '#3c4257', lineHeight: '1.65', margin: '0 0 18px' }
const summaryBox = {
  backgroundColor: '#ffffff', border: '1px solid #e3e8ee', borderRadius: '8px', padding: '22px 24px', margin: '20px 0 28px'
}
const summaryTitle = { fontSize: '11px', fontWeight: 600, color: '#635bff', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 14px' }
const summaryRow = { fontSize: '14px', color: '#3c4257', margin: '8px 0', lineHeight: '1.5' }
const labelStyle = { color: '#697386', fontWeight: 400 }
const valueStyle = { color: '#1a1f36', fontWeight: 600 }
const noteBox = { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '18px 22px', margin: '0 0 28px' }
const noteTitle = { fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 10px' }
const noteText = { fontSize: '14px', color: '#3c4257', margin: 0, lineHeight: '1.65' }
const button = { backgroundColor: '#635bff', color: '#ffffff', padding: '13px 28px', borderRadius: '6px', fontSize: '15px', fontWeight: 500, textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e3e8ee', margin: '32px 0 24px' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '24px 0 0', lineHeight: '1.5' }
