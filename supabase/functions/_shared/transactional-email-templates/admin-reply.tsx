/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from './_components.tsx'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader, BrandHeaderStyle } from './brand-header.tsx'

const SITE_NAME = 'Dynime'

interface Props {
  recipientName?: string
  subject?: string
  body?: string
  agentName?: string
  agentTitle?: string
  agentEmail?: string
  context?: string // short reference like "Re: your investor enquiry"
}

const paragraphs = (body: string) =>
  body.split(/\r?\n\r?\n/).map((p) => p.trim()).filter(Boolean)

const AdminReplyEmail = ({
  recipientName,
  subject = 'A reply from the Dynime team',
  body = '',
  agentName = 'The Dynime team',
  agentTitle,
  agentEmail,
  context,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head><BrandHeaderStyle /></Head>
    <Preview>{subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        {context && <Text style={badge}>{context.toUpperCase()}</Text>}
        <Heading style={h1}>
          {recipientName ? `Hi ${recipientName},` : 'Hi there,'}
        </Heading>

        <Section style={messageBox}>
          {paragraphs(body).map((p, i) => (
            <Text key={i} style={para}>{p}</Text>
          ))}
          {!body && <Text style={para}>(no message body)</Text>}
        </Section>

        <Text style={signoff}>
          Best regards,
          <br />
          <span style={agent}>{agentName}</span>
          {agentTitle && <><br /><span style={agentMeta}>{agentTitle}</span></>}
          {agentEmail && (
            <><br /><a href={`mailto:${agentEmail}`} style={link}>{agentEmail}</a></>
          )}
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          This message was sent by {SITE_NAME}. Reply directly to this email to continue the conversation.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminReplyEmail,
  subject: (d: Record<string, any>) => d?.subject || `A reply from the ${SITE_NAME} team`,
  displayName: 'Admin reply to lead',
  previewData: {
    recipientName: 'Jane Doe',
    subject: 'Re: Your investor enquiry',
    body:
      'Thanks for reaching out about our investor program.\n\nI\'ve attached the agreement and onboarding link. Let me know a good time for a quick call this week.',
    agentName: 'Investor Relations',
    agentTitle: 'Dynime Investor Relations',
    agentEmail: 'investors@dynime.com',
    context: 'Re: investor enquiry',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0 }
const container = { padding: '32px 28px', maxWidth: '600px', margin: '0 auto' }
const badge = {
  display: 'inline-block',
  backgroundColor: '#f0eeff', color: '#635bff',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  padding: '4px 10px',
  borderRadius: '999px',
  margin: '0 0 14px',
}
const h1 = { fontSize: '20px', fontWeight: 700, color: '#1a1f36', margin: '0 0 12px', lineHeight: '1.3' }
const messageBox = { margin: '8px 0 20px' }
const para = { fontSize: '15px', color: '#3c4257', lineHeight: '1.7', margin: '0 0 14px', whiteSpace: 'pre-wrap' as const }
const signoff = { fontSize: '15px', color: '#3c4257', lineHeight: '1.6', margin: '20px 0 0' }
const agent = { fontWeight: 700, color: '#1a1f36' }
const agentMeta = { color: '#697386', fontSize: '13px' }
const link = { color: '#635bff', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }
const hr = { borderColor: '#e3e8ee', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#8898aa', margin: 0 }
