/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from './_components.tsx'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader, BrandHeaderStyle } from './brand-header.tsx'

const SITE_NAME = 'Dynime'
const SITE_URL = 'https://dynime.com'

interface Props {
  name?: string
  serviceName?: string
  renewalDate?: string
  daysRemaining?: number
  amount?: string
  cycle?: string
  manageUrl?: string
}

const ServiceRenewalReminder: React.FC<Props> = ({
  name = 'there',
  serviceName = 'Your service',
  renewalDate = '',
  daysRemaining = 7,
  amount = '',
  cycle = '',
  manageUrl = `${SITE_URL}/account/services/recurring`,
}) => (
  <Html>
    <Head><BrandHeaderStyle /></Head>
    <Preview>{`${serviceName} renews in ${daysRemaining} days`}</Preview>
    <Body style={{ background: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', padding: '24px 0', margin: 0 }}>
      <Container style={{ background: '#ffffff', maxWidth: 600, margin: '0 auto', padding: '44px 40px 36px' }}>
        <BrandHeader />
        <Heading style={{ fontSize: 26, fontWeight: 600, color: '#1a1f36', letterSpacing: '-0.01em', lineHeight: '1.3', margin: '0 0 20px' }}>Renewal coming up</Heading>
        <Text>Hi {name},</Text>
        <Text>
          Your subscription to <strong>{serviceName}</strong> is up for renewal
          {renewalDate ? ` on ${renewalDate}` : ''} ({daysRemaining} day{daysRemaining === 1 ? '' : 's'} from now).
        </Text>
        {amount && (
          <Section style={{ background: '#ffffff', border: '1px solid #e3e8ee', padding: '22px 24px', borderRadius: 8, margin: '20px 0 28px' }}>
            <Text style={{ margin: 0 }}>Amount: <strong>{amount}</strong>{cycle ? ` / ${cycle}` : ''}</Text>
          </Section>
        )}
        <Text>To keep your service active without interruption, please complete the renewal payment before the renewal date.</Text>
        <Button href={manageUrl} style={{ background: '#635bff', color: '#ffffff', padding: '13px 28px', borderRadius: 6, textDecoration: 'none', fontSize: 15, fontWeight: 500, display: 'inline-block' }}>
          Renew now
        </Button>
        <Text style={{ color: '#8898aa', fontSize: 13, marginTop: 32, lineHeight: 1.5 }}>— The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
)

export const template: TemplateEntry = {
  component: ServiceRenewalReminder,
  subject: (d) => `Renewal reminder: ${d.serviceName || 'your service'}`,
  displayName: 'Service Renewal Reminder',
  previewData: {
    name: 'Alex',
    serviceName: 'USA LLC Annual Compliance',
    renewalDate: 'May 20, 2026',
    daysRemaining: 7,
    amount: '$199.00',
    cycle: 'yearly',
  },
}
