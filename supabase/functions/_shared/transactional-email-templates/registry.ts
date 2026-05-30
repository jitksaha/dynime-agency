/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as adminNewSubmission } from './admin-new-submission.tsx'
import { template as orderStatusUpdate } from './order-status-update.tsx'
import { template as serviceRenewalReminder } from './service-renewal-reminder.tsx'
import { template as adminReply } from './admin-reply.tsx'
import { template as hrOfferLetter } from './hr-offer-letter.tsx'
import { template as hrEmploymentAgreement } from './hr-employment-agreement.tsx'
import { template as hrPayslip } from './hr-payslip.tsx'
import { template as hrExperienceRelieving } from './hr-experience-relieving.tsx'
import { template as jobApplicationReceived } from './job-application-received.tsx'
import { template as jobApplicationStatusUpdate } from './job-application-status-update.tsx'
import { template as flexpayDocumentRequest } from './flexpay-document-request.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contact-confirmation': contactConfirmation,
  'admin-new-submission': adminNewSubmission,
  'order-status-update': orderStatusUpdate,
  'service-renewal-reminder': serviceRenewalReminder,
  'admin-reply': adminReply,
  'hr-offer-letter': hrOfferLetter,
  'hr-employment-agreement': hrEmploymentAgreement,
  'hr-payslip': hrPayslip,
  'hr-experience-relieving': hrExperienceRelieving,
  'job-application-received': jobApplicationReceived,
  'job-application-status-update': jobApplicationStatusUpdate,
  'flexpay-document-request': flexpayDocumentRequest,
}
