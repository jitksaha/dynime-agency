/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from './_components.tsx'
import type { TemplateEntry } from './registry.ts'
import { BrandHeader, BrandHeaderStyle } from './brand-header.tsx'

const SITE_NAME = 'Dynime'

interface PayLine { label: string; amount: string }
interface Props {
  name?: string
  periodLabel?: string
  docNumber?: string
  netPay?: string
  gross?: string
  totalDeductions?: string
  earnings?: PayLine[]
  deductions?: PayLine[]
  downloadUrl?: string
}

const PayslipEmail = ({
  name, periodLabel, docNumber, netPay, gross, totalDeductions,
  earnings = [], deductions = [], downloadUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head><BrandHeaderStyle /></Head>
    <Preview>Your payslip for {periodLabel || 'this period'} is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <BrandHeader />
        <Heading style={h1}>Your payslip is ready</Heading>
        <Text style={text}>
          {name ? `Hi ${name.split(' ')[0]}, ` : ''}your payslip for{' '}
          <strong>{periodLabel || 'this period'}</strong> has been issued.
        </Text>

        {netPay && (
          <Section style={netBox}>
            <Text style={netLabel}>NET PAY</Text>
            <Text style={netAmount}>{netPay}</Text>
            {periodLabel && <Text style={netPeriod}>{periodLabel}</Text>}
          </Section>
        )}

        {(earnings.length > 0 || deductions.length > 0) && (
          <Section style={summaryBox}>
            {earnings.length > 0 && (
              <>
                <Text style={summaryTitle}>Earnings</Text>
                {earnings.map((e, i) => (
                  <Text key={`e${i}`} style={row}><span style={lbl}>{e.label}</span> <span style={val}>{e.amount}</span></Text>
                ))}
                {gross && <Text style={rowTotal}><span style={lbl}>Gross</span> <span style={val}>{gross}</span></Text>}
              </>
            )}
            {deductions.length > 0 && (
              <>
                <Text style={{ ...summaryTitle, marginTop: '14px' }}>Deductions</Text>
                {deductions.map((d, i) => (
                  <Text key={`d${i}`} style={row}><span style={lbl}>{d.label}</span> <span style={val}>{d.amount}</span></Text>
                ))}
                {totalDeductions && <Text style={rowTotal}><span style={lbl}>Total deductions</span> <span style={val}>{totalDeductions}</span></Text>}
              </>
            )}
          </Section>
        )}

        {downloadUrl && (
          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={downloadUrl} style={button}>Download payslip (PDF)</Button>
          </Section>
        )}

        {docNumber && (
          <Text style={meta}>Reference: {docNumber}</Text>
        )}

        <Hr style={hr} />
        <Text style={text}>
          Spotted something off? Reply to this email and our HR team will take a look.
        </Text>
        <Text style={footer}>— The {SITE_NAME} HR Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PayslipEmail,
  subject: (d: Record<string, any>) =>
    `Payslip${d?.periodLabel ? ` — ${d.periodLabel}` : ''}${d?.docNumber ? ` (${d.docNumber})` : ''}`,
  displayName: 'HR — Payslip',
  previewData: {
    name: 'Jane Doe', periodLabel: 'May 2026', docNumber: 'PSL-202605-00012',
    netPay: 'USD 4,120.00', gross: 'USD 4,500.00', totalDeductions: 'USD 380.00',
    earnings: [
      { label: 'Basic Salary', amount: 'USD 4,000.00' },
      { label: 'House Rent', amount: 'USD 500.00' },
    ],
    deductions: [
      { label: 'Income Tax', amount: 'USD 300.00' },
      { label: 'Provident Fund', amount: 'USD 80.00' },
    ],
    downloadUrl: 'https://example.com/payslip.pdf',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0 }
const container = { padding: '44px 40px 36px', maxWidth: '600px', margin: '0 auto' }
const h1 = { fontSize: '26px', fontWeight: 600, color: '#1a1f36', margin: '0 0 20px', letterSpacing: '-0.01em', lineHeight: '1.3' }
const text = { fontSize: '16px', color: '#3c4257', lineHeight: '1.65', margin: '0 0 18px' }
const netBox = { backgroundColor: '#1a1f36', borderRadius: '14px', padding: '24px 20px', margin: '16px 0 24px', textAlign: 'center' as const }
const netLabel = { fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.12em', margin: '0 0 6px' }
const netAmount = { fontSize: '32px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }
const netPeriod = { fontSize: '12px', color: '#9ca3af', margin: 0 }
const summaryBox = { backgroundColor: '#f6f9fc', borderRadius: '12px', padding: '18px 20px', margin: '0 0 24px' }
const summaryTitle = { fontSize: '11px', fontWeight: 600, color: '#635bff', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 14px' }
const row = { fontSize: '14px', color: '#3c4257', margin: '8px 0', lineHeight: '1.5', display: 'flex' as const, justifyContent: 'space-between' as const }
const rowTotal = { ...row, borderTop: '1px solid #e6e6ee', marginTop: '8px', paddingTop: '8px', fontWeight: 700 }
const lbl = { color: '#697386', fontWeight: 400 }
const val = { color: '#1a1f36', fontWeight: 600 }
const button = { backgroundColor: '#635bff', color: '#ffffff', padding: '13px 28px', borderRadius: '6px', fontSize: '15px', fontWeight: 500, textDecoration: 'none', display: 'inline-block' }
const meta = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: '8px 0 0' }
const hr = { borderColor: '#e3e8ee', margin: '32px 0 24px' }
const footer = { fontSize: '13px', color: '#8898aa', margin: '24px 0 0', lineHeight: '1.5' }
