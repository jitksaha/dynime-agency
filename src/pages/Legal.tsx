import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { usePageSEO } from "@/hooks/use-page-seo";
import { db } from "@/integrations/db/client";
import {
  ChevronRight,
  FileText,
  Shield,
  RefreshCw,
  Cookie,
  ScrollText,
  CreditCard,
  LifeBuoy,
  AlertTriangle,
} from "lucide-react";

type LegalKey =
  | "privacy"
  | "terms"
  | "refund"
  | "cookies"
  | "aml"
  | "payments"
  | "support"
  | "acceptable-use";

type Block =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; tone?: "info" | "warning"; text: string }
  | { type: "dynamic-countries"; mode: "blocked" | "review"; fallback: string[] };

type Section = { heading: string; blocks: Block[] };

type LegalDoc = {
  key: LegalKey;
  title: string;
  subtitle: string;
  icon: typeof Shield;
  sections: Section[];
};

const COMPANY = {
  name: "Dynime Inc.",
  brand: "Dynime",
  email: "contact@dynime.com",
  supportEmail: "support@dynime.com",
  legalEmail: "legal@dynime.com",
  domain: "dynime.com",
  jurisdiction: "United States (primary)",
};

const LAST_UPDATED = "May 4, 2026";
const EFFECTIVE_DATE = "May 4, 2026";

// ---------- Helper builders ----------
const p = (text: string): Block => ({ type: "p", text });
const list = (items: string[]): Block => ({ type: "list", items });
const callout = (text: string, tone: "info" | "warning" = "info"): Block => ({
  type: "callout",
  tone,
  text,
});

const DOCS: Record<LegalKey, LegalDoc> = {
  // -------------------- TERMS --------------------
  terms: {
    key: "terms",
    title: "Terms of Service",
    subtitle:
      "The legally binding agreement between you and Dynime when you access or use any of our services, software, websites, APIs, or platforms.",
    icon: ScrollText,
    sections: [
      {
        heading: "1. Overview & Acceptance",
        blocks: [
          p(
            `These Terms of Service (the "Agreement") govern your access to and use of all services, software, websites, APIs, dashboards, and platforms operated by ${COMPANY.name} ("Dynime", "we", "us", or "our").`,
          ),
          p(
            `By accessing or using any of our services, you ("Client", "User", or "you") confirm that you have read, understood, and agree to be legally bound by this Agreement and our Privacy Policy. If you do not agree, you must not use our services.`,
          ),
        ],
      },
      {
        heading: "2. Company Information",
        blocks: [
          list([
            `Legal entity: ${COMPANY.name}`,
            `Primary jurisdiction: ${COMPANY.jurisdiction}`,
            `Operations: Global, remote-first model`,
            `General contact: ${COMPANY.email}`,
            `Legal & compliance: ${COMPANY.legalEmail}`,
          ]),
        ],
      },
      {
        heading: "3. Eligibility",
        blocks: [
          p("To use our services you must:"),
          list([
            "Be at least 18 years of age (or the age of majority in your jurisdiction);",
            "Have the legal capacity to enter into a binding contract;",
            "Not be located in, or acting on behalf of any party located in, a sanctioned or restricted jurisdiction;",
            "Not be on any government list of prohibited or restricted persons.",
          ]),
          p(
            "We reserve the right to refuse, suspend, or terminate service in any region presenting regulatory conflict, sanctions exposure, or high-risk financial-compliance issues.",
          ),
        ],
      },
      {
        heading: "4. Scope of Services",
        blocks: [
          p("Dynime provides:"),
          list([
            "SaaS (Software-as-a-Service) products and platforms;",
            "Digital services including web design, development, marketing, and consulting;",
            "Business formation and incorporation assistance (USA, UK, and other supported jurisdictions);",
            "Payment infrastructure setup and integrations.",
          ]),
          p(
            "Specific deliverables, timelines, and fees for any custom engagement are defined in a separate written proposal, statement of work, or order confirmation. We reserve the right to add, modify, suspend, or discontinue features and services at any time, with reasonable notice when material changes occur.",
          ),
        ],
      },
      {
        heading: "5. Account Responsibility",
        blocks: [
          p("You are solely responsible for:"),
          list([
            "Maintaining the confidentiality of your account credentials and API keys;",
            "All activities and transactions that occur under your account;",
            "Providing accurate, current, and lawful information at all times;",
            "Promptly notifying us of any unauthorized access or suspected breach.",
          ]),
          p(
            "Dynime is not liable for losses arising from unauthorized account access caused by your failure to safeguard credentials.",
          ),
        ],
      },
      {
        heading: "6. Payment Terms",
        blocks: [
          list([
            "All fees are due in advance unless agreed otherwise in writing.",
            "Pricing may vary by region, service tier, currency, or applicable taxes.",
            "Payments are processed through trusted third-party gateways such as Stripe and Paddle.",
            "Invoices not paid by the due date may incur interest, suspension, or termination of the related service.",
          ]),
          p(
            "Government, gateway, and currency-conversion fees are pass-through costs and are non-refundable.",
          ),
        ],
      },
      {
        heading: "7. Prohibited Activities",
        blocks: [
          p("You agree not to use Dynime services to:"),
          list([
            "Violate any applicable law, regulation, sanctions program, or third-party right;",
            "Engage in fraud, deception, phishing, or impersonation;",
            "Attempt to compromise, reverse-engineer, or interfere with our systems or other users;",
            "Facilitate money laundering, terrorist financing, or any other restricted financial activity;",
            "Distribute malware, spam, or unsolicited bulk communications.",
          ]),
        ],
      },
      {
        heading: "8. Intellectual Property",
        blocks: [
          p(
            `All Dynime platforms, software, branding, designs, documentation, and underlying systems are the exclusive property of ${COMPANY.name} and are protected by copyright, trademark, and other intellectual-property laws.`,
          ),
          list([
            "You may not copy, modify, resell, sublicense, or redistribute any part of our services without prior written permission.",
            "You retain ownership of content you submit to our services and grant us a limited, worldwide license to host, process, and display it solely as needed to deliver the service.",
            "On full payment for a custom project, ownership of agreed-upon final deliverables transfers to you, except for our pre-existing tools, frameworks, and reusable components.",
          ]),
        ],
      },
      {
        heading: "9. Termination",
        blocks: [
          p("We may suspend or terminate your access immediately, without refund, if:"),
          list([
            "You materially breach this Agreement;",
            "We detect fraud, abuse, or risk to other users or our platform;",
            "Continued service would create legal, regulatory, or compliance exposure;",
            "Required by court order or competent authority.",
          ]),
          p(
            "You may terminate your account at any time by written notice. Fees for services rendered up to the termination date remain payable.",
          ),
        ],
      },
      {
        heading: "10. Disclaimers & Limitation of Liability",
        blocks: [
          p(
            `Services are provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, express or implied, to the maximum extent permitted by law.`,
          ),
          p("To the fullest extent permitted by law, Dynime shall not be liable for:"),
          list([
            "Indirect, incidental, special, consequential, or punitive damages;",
            "Loss of profits, revenue, data, goodwill, or business opportunity;",
            "Failures of third-party services, networks, or integrations;",
            "Any aggregate liability exceeding the fees paid by you to Dynime for the specific service giving rise to the claim in the 12 months preceding the event.",
          ]),
        ],
      },
      {
        heading: "11. Indemnification",
        blocks: [
          p(
            "You agree to indemnify, defend, and hold harmless Dynime, its affiliates, officers, employees, and partners from any claim, loss, liability, or expense (including reasonable legal fees) arising out of your breach of this Agreement, your misuse of the services, or your violation of any law or third-party right.",
          ),
        ],
      },
      {
        heading: "12. Governing Law & Dispute Resolution",
        blocks: [
          p(
            "This Agreement is governed by the laws of the United States, without regard to conflict-of-law principles. The parties will first attempt to resolve any dispute in good faith through direct negotiation. Unresolved disputes shall be submitted to binding arbitration or to courts of competent jurisdiction in our primary place of business.",
          ),
        ],
      },
      {
        heading: "13. Changes to These Terms",
        blocks: [
          p(
            "We may update this Agreement from time to time. Material changes will be communicated through our website and, where practical, by email. Continued use of the services after changes take effect constitutes acceptance of the revised Agreement.",
          ),
        ],
      },
      {
        heading: "14. Contact",
        blocks: [p(`For questions about these Terms, contact ${COMPANY.legalEmail}.`)],
      },
    ],
  },

  // -------------------- PRIVACY --------------------
  privacy: {
    key: "privacy",
    title: "Privacy Policy",
    subtitle:
      "How we collect, use, share, and protect your personal information across our services and websites.",
    icon: Shield,
    sections: [
      {
        heading: "1. Introduction",
        blocks: [
          p(
            `${COMPANY.name} ("Dynime", "we", "us", or "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, share, and safeguard information when you use our websites, products, and services.`,
          ),
        ],
      },
      {
        heading: "2. Information We Collect",
        blocks: [
          p("We collect the following categories of information:"),
          list([
            "Personal information you provide: name, email, phone, country, and project details;",
            "Business information: company name, registration documents, billing address, and tax identifiers;",
            "Payment-related data: handled by PCI-compliant third-party processors — we do not store full card numbers;",
            "Usage and technical data: IP address, device, browser, language, referrer, and pages visited;",
            "Communications: support tickets, chat messages, and emails you send us.",
          ]),
        ],
      },
      {
        heading: "3. How We Use Your Information",
        blocks: [
          p("We use your information to:"),
          list([
            "Provide, operate, secure, and improve our services;",
            "Process orders, payments, refunds, and invoices;",
            "Communicate transactional, security, and account-related messages;",
            "Comply with legal, tax, accounting, and regulatory obligations;",
            "Prevent fraud, abuse, and unauthorized access;",
            "Send marketing communications when you have opted in (you can unsubscribe at any time).",
          ]),
        ],
      },
      {
        heading: "4. Legal Bases for Processing (GDPR)",
        blocks: [
          list([
            "Performance of a contract — to deliver services you have requested;",
            "Legal obligation — to meet tax, accounting, AML/KYC, and reporting requirements;",
            "Legitimate interests — to secure our platform, prevent fraud, and improve our offerings;",
            "Consent — for optional marketing emails and non-essential cookies (you may withdraw at any time).",
          ]),
        ],
      },
      {
        heading: "5. Sharing & Disclosure",
        blocks: [
          p("We share data only when necessary, with:"),
          list([
            "Payment processors (e.g., Stripe, Paddle, regional providers) to complete transactions;",
            "Infrastructure and analytics providers under strict data-processing agreements;",
            "Legal, tax, or regulatory authorities when required by law or court order;",
            "Successor entities in the event of a merger, acquisition, or restructuring.",
          ]),
          callout("We do not sell your personal data."),
        ],
      },
      {
        heading: "6. International Data Transfers",
        blocks: [
          p(
            "We operate globally. Your information may be transferred to, stored in, or processed in countries other than your own. Where required, we rely on Standard Contractual Clauses or other approved mechanisms to ensure an adequate level of protection.",
          ),
        ],
      },
      {
        heading: "7. Data Retention",
        blocks: [
          p(
            "We retain personal data only for as long as necessary to fulfil the purposes described in this Policy, comply with our legal obligations (such as tax and AML record-keeping), resolve disputes, and enforce our agreements. When data is no longer needed, it is securely deleted or anonymized.",
          ),
        ],
      },
      {
        heading: "8. Your Rights",
        blocks: [
          p(
            "Depending on your jurisdiction (including under the GDPR and CCPA), you may have the right to:",
          ),
          list([
            "Access the personal data we hold about you;",
            "Request correction of inaccurate or incomplete data;",
            "Request deletion of your data, subject to legal retention requirements;",
            "Request portability of data you have provided;",
            "Object to or restrict certain processing;",
            "Withdraw consent at any time, where processing is based on consent;",
            "Lodge a complaint with your local data-protection authority.",
          ]),
          p(`To exercise any of these rights, email ${COMPANY.legalEmail}.`),
        ],
      },
      {
        heading: "9. Security",
        blocks: [
          p("We implement industry-standard safeguards including:"),
          list([
            "TLS/HTTPS encryption in transit and at-rest encryption for sensitive data;",
            "Role-based access controls and the principle of least privilege;",
            "Continuous monitoring, regular vulnerability scans, and patching;",
            "Vendor due-diligence and signed data-processing agreements.",
          ]),
          callout(
            "No system is 100% secure. While we work hard to protect your data, we cannot guarantee absolute security.",
            "warning",
          ),
        ],
      },
      {
        heading: "10. Children's Privacy",
        blocks: [
          p(
            "Our services are not directed to children under the age of 16, and we do not knowingly collect personal data from minors. If you believe a child has provided us data, please contact us so we can remove it.",
          ),
        ],
      },
      {
        heading: "11. Updates to This Policy",
        blocks: [
          p(
            "We may update this Policy from time to time. We will post the updated version on this page and revise the “Last updated” date. Material changes will be communicated where required by law.",
          ),
        ],
      },
      {
        heading: "12. Contact",
        blocks: [
          p(
            `For privacy questions or to exercise your rights, contact ${COMPANY.legalEmail}.`,
          ),
        ],
      },
    ],
  },

  // -------------------- REFUND --------------------
  refund: {
    key: "refund",
    title: "Refund Policy",
    subtitle:
      "When refunds are available, when they are not, and how to request one for digital and service-based products.",
    icon: RefreshCw,
    sections: [
      {
        heading: "1. General Policy",
        blocks: [
          p(
            "Because Dynime delivers digital and service-based products that consume time and infrastructure from the moment work begins, refunds are limited and granted only in specific cases described below.",
          ),
        ],
      },
      {
        heading: "2. Eligible Refund Cases",
        blocks: [
          p("A refund may be granted if:"),
          list([
            "The agreed service was not delivered and we are unable to deliver it;",
            "A duplicate payment was charged in error;",
            "A verifiable technical failure on our side prevented use of the service;",
            "Required by applicable consumer-protection law in your jurisdiction.",
          ]),
        ],
      },
      {
        heading: "3. Non-Refundable Cases",
        blocks: [
          p("Refunds are not available for:"),
          list([
            "Services already delivered in full or in substantial part;",
            "Change of mind or scope changes after work has started;",
            "Delays caused by missing client input, approvals, or assets;",
            "Third-party fees (government, registrar, payment-gateway, currency-conversion);",
            "Custom design, code, or content already produced and shared.",
          ]),
        ],
      },
      {
        heading: "4. Order Cancellation by Customer",
        blocks: [
          p(
            "You can cancel an order yourself from your account dashboard (My Orders → Cancel order) while the order is still in an early stage:",
          ),
          list([
            "Pending — payment or admin confirmation has not yet completed.",
            "Confirmed — order is acknowledged but work has not started.",
          ]),
          p(
            "Once an order moves to Processing (work in progress), Completed, Delivered, Cancelled, or Refunded, the self-serve cancel button is disabled. At that point any cancellation or refund request must be sent to support and will be evaluated under sections 2 and 3 of this policy.",
          ),
          p(
            "If a payment was already captured for a self-cancelled order, eligibility for a refund still follows the rules in sections 2 (Eligible) and 3 (Non-Refundable).",
          ),
        ],
      },
      {
        heading: "5. Subscriptions",
        blocks: [
          p(
            "You may cancel any recurring subscription at any time. Cancellations take effect at the end of the current billing period. We do not pro-rate partial periods unless required by law.",
          ),
        ],
      },
      {
        heading: "6. How to Request a Refund",
        blocks: [
          p(
            `Email ${COMPANY.email} within 7 days of purchase with your order or invoice number, the email used at checkout, and a brief explanation. Our team will respond within 3 business days.`,
          ),
        ],
      },
      {
        heading: "7. Processing Time",
        blocks: [
          p(
            "Approved refunds are issued to the original payment method within 7–14 business days. Your bank or card issuer may take additional time to post the funds.",
          ),
        ],
      },
      {
        heading: "8. Chargebacks",
        blocks: [
          p(
            "Please contact us before initiating a chargeback. We work in good faith to resolve disputes quickly. Chargebacks filed without first contacting us may result in account suspension and recovery of the disputed amount and any associated fees.",
          ),
        ],
      },
    ],
  },

  // -------------------- COOKIES --------------------
  cookies: {
    key: "cookies",
    title: "Cookie Policy",
    subtitle: "How we use cookies and similar technologies on our websites.",
    icon: Cookie,
    sections: [
      {
        heading: "1. What Are Cookies?",
        blocks: [
          p(
            "Cookies are small text files placed on your device when you visit a website. They allow the site to remember your preferences and understand how you interact with it. Similar technologies include local storage, pixels, and SDKs.",
          ),
        ],
      },
      {
        heading: "2. Why We Use Cookies",
        blocks: [
          list([
            "Keep you signed in and remember your settings (theme, language, currency);",
            "Power core functionality such as cart, checkout, and forms;",
            "Measure performance and improve user experience;",
            "Help us understand how features are used so we can improve them;",
            "Deliver, with your consent, relevant marketing content.",
          ]),
        ],
      },
      {
        heading: "3. Types of Cookies We Use",
        blocks: [
          list([
            "Essential cookies — required for the site to function and cannot be disabled;",
            "Preference cookies — remember settings such as theme, language, and currency;",
            "Analytics cookies — help us understand how the site is used;",
            "Marketing cookies — set only when you have given consent.",
          ]),
        ],
      },
      {
        heading: "4. Managing Cookies",
        blocks: [
          p(
            "You can control cookies through your browser settings — block all, accept only first-party, or delete existing cookies. Disabling essential cookies may break parts of the site.",
          ),
          p("You may also withdraw consent for non-essential cookies at any time."),
        ],
      },
      {
        heading: "5. Third-Party Cookies",
        blocks: [
          p(
            "We use trusted third-party services (analytics, payments, embedded content) that may set their own cookies. Their use is governed by their own privacy and cookie policies.",
          ),
        ],
      },
      {
        heading: "6. Updates",
        blocks: [
          p(
            "We may update this Policy from time to time. The latest version will always be available on this page.",
          ),
        ],
      },
    ],
  },

  // -------------------- AML & COMPLIANCE --------------------
  aml: {
    key: "aml",
    title: "AML & Compliance Policy",
    subtitle:
      "Our anti-money-laundering, counter-terrorist-financing, and KYC commitments — required for banking, payment, and incorporation services.",
    icon: AlertTriangle,
    sections: [
      {
        heading: "1. Our Commitment",
        blocks: [
          p(
            `${COMPANY.name} is committed to the highest standards of anti-money-laundering ("AML") and counter-terrorist-financing ("CTF") compliance. We comply with international standards, including those issued by the FATF, OFAC, FinCEN, and the EU AML Directives.`,
          ),
          p("We strictly prohibit any use of our services for:"),
          list([
            "Money laundering or layering of illicit funds;",
            "Terrorist financing or support of designated entities;",
            "Sanctions evasion or transactions with prohibited persons;",
            "Fraud, bribery, corruption, or any unlawful financial activity.",
          ]),
        ],
      },
      {
        heading: "2. Know Your Customer (KYC)",
        blocks: [
          p("Depending on the service, we may require:"),
          list([
            "Government-issued photo identification;",
            "Proof of address dated within the last 3 months;",
            "Business documents (certificate of incorporation, register of directors, ownership structure);",
            "Source-of-funds and beneficial-ownership declarations;",
            "Tax identification numbers (e.g., EIN, VAT, TIN).",
          ]),
          p(
            "Failure to provide complete and accurate information may result in account suspension, refusal of service, and reporting to competent authorities.",
          ),
        ],
      },
      {
        heading: "3. Customer Due Diligence",
        blocks: [
          p(
            "We perform risk-based due diligence on every client. Higher-risk clients — including politically exposed persons (PEPs), high-risk industries, or complex ownership structures — are subject to enhanced due diligence, including independent verification and ongoing monitoring.",
          ),
        ],
      },
      {
        heading: "4. Restricted & Sanctioned Regions",
        blocks: [
          p("Dynime does not provide services to users located in, or acting on behalf of:"),
          list([
            "Countries subject to comprehensive international sanctions (e.g., OFAC SDN, EU, UN, UK programs);",
            "Jurisdictions on the FATF blacklist or actively listed for serious AML/CTF deficiencies;",
            "Regions experiencing active armed conflict or severe geopolitical instability that prevents safe service delivery;",
            "Territories with material restrictions on digital services or cross-border payments that we cannot lawfully service.",
          ]),
          callout(
            "Our supported-country list is reviewed regularly and may change without notice as sanctions regimes and risk classifications evolve.",
            "warning",
          ),
        ],
      },
      {
        heading: "5. Monitoring & Reporting",
        blocks: [
          list([
            "All transactions are screened against international sanctions and watchlists;",
            "Suspicious activity is investigated and, where required, reported to the appropriate financial intelligence unit;",
            "We maintain audit logs and KYC records in line with applicable retention rules (typically 5 years after the end of the business relationship).",
          ]),
        ],
      },
      {
        heading: "6. Cooperation with Authorities",
        blocks: [
          p(
            "We cooperate fully with law-enforcement, regulatory, and tax authorities when presented with valid legal requests. Where lawfully permitted, we will notify the affected user.",
          ),
        ],
      },
      {
        heading: "7. Reporting Concerns",
        blocks: [
          p(
            `Suspected violations or AML concerns can be reported confidentially to ${COMPANY.legalEmail}.`,
          ),
        ],
      },
    ],
  },

  // -------------------- PAYMENTS --------------------
  payments: {
    key: "payments",
    title: "Payment & Financial Policy",
    subtitle:
      "Accepted payment methods, currency handling, taxes, and our financial-compliance practices.",
    icon: CreditCard,
    sections: [
      {
        heading: "1. Accepted Payment Methods",
        blocks: [
          p("We accept payments through trusted gateways, including:"),
          list([
            "Stripe (credit/debit cards, Apple Pay, Google Pay, regional methods);",
            "Paddle (Merchant of Record for global SaaS billing);",
            "Selected regional providers where available (e.g., bKash, SSLCommerz);",
            "Bank transfer for invoices above certain thresholds, by prior agreement.",
          ]),
        ],
      },
      {
        heading: "2. Currency Handling",
        blocks: [
          list([
            "Multi-currency pricing is supported for most services;",
            "Exchange rates are sourced from our payment processors at the time of checkout;",
            "Your bank or card issuer may charge currency-conversion or cross-border fees that are outside our control.",
          ]),
        ],
      },
      {
        heading: "3. Taxes & Invoicing",
        blocks: [
          p(
            "Where applicable, sales tax, VAT, GST, or similar levies will be added at checkout based on your billing location and the service purchased. Invoices are issued automatically and made available in your account.",
          ),
        ],
      },
      {
        heading: "4. Late or Failed Payments",
        blocks: [
          list([
            "Failed payments will be retried automatically by our gateways;",
            "Repeated failure may result in suspension of access until the balance is settled;",
            "Outstanding amounts may be referred to a collections partner where reasonable attempts to reach you have failed.",
          ]),
        ],
      },
      {
        heading: "5. Financial Compliance",
        blocks: [
          p("All transactions must comply with:"),
          list([
            "International financial regulations and sanctions programs;",
            "Anti-fraud screening rules applied by our payment partners;",
            "Our AML & Compliance Policy.",
          ]),
        ],
      },
    ],
  },

  // -------------------- SUPPORT / SLA --------------------
  support: {
    key: "support",
    title: "Service Level & Support Policy",
    subtitle:
      "How to reach our team, expected response times, and our service-availability commitments.",
    icon: LifeBuoy,
    sections: [
      {
        heading: "1. Support Channels",
        blocks: [
          list([
            `Email: ${COMPANY.supportEmail}`,
            "In-app live chat (where available);",
            "Ticket system through your client dashboard;",
            "Scheduled video calls for paid project clients.",
          ]),
        ],
      },
      {
        heading: "2. Response Times",
        blocks: [
          p("Our typical response targets during business days are:"),
          list([
            "Critical (service down): under 4 hours;",
            "High (major impact): 4–12 hours;",
            "Normal (general questions): 24–48 hours;",
            "Low (informational): within 72 hours.",
          ]),
          p(
            "Targets are measured from receipt during business hours and exclude time waiting on client input.",
          ),
        ],
      },
      {
        heading: "3. Service Availability",
        blocks: [
          p(
            "We aim for high uptime and continuously improve our infrastructure. Planned maintenance is communicated in advance whenever possible. We do not guarantee uninterrupted, error-free, or fully secure service, and excluded events include force majeure, third-party outages, and customer-side issues.",
          ),
        ],
      },
      {
        heading: "4. Scope of Support",
        blocks: [
          p("Standard support covers:"),
          list([
            "Configuration and usage of features included in your plan;",
            "Troubleshooting incidents on our platform;",
            "Guidance on documented best practices.",
          ]),
          p(
            "Custom development, design changes, third-party integrations, or training beyond the documented scope are billable engagements.",
          ),
        ],
      },
    ],
  },

  // -------------------- ACCEPTABLE USE --------------------
  "acceptable-use": {
    key: "acceptable-use",
    title: "Acceptable Use Policy",
    subtitle:
      "Behaviour and content that is not allowed when using Dynime services.",
    icon: FileText,
    sections: [
      {
        heading: "1. Purpose",
        blocks: [
          p(
            "This Acceptable Use Policy supplements our Terms of Service. It exists to keep our platform safe, reliable, and lawful for everyone.",
          ),
        ],
      },
      {
        heading: "2. Prohibited Content",
        blocks: [
          p("You may not use Dynime services to host, distribute, or transmit:"),
          list([
            "Content that infringes intellectual-property or privacy rights;",
            "Child sexual abuse material or content that exploits minors;",
            "Content promoting violence, terrorism, or hate against protected groups;",
            "Sexually explicit content where prohibited by law;",
            "Malware, exploits, phishing kits, or other malicious code.",
          ]),
        ],
      },
      {
        heading: "3. Prohibited Conduct",
        blocks: [
          list([
            "Unauthorized access to systems, accounts, or data;",
            "Sending spam, unsolicited bulk communications, or scraping at scale without permission;",
            "Interfering with or degrading our service or any other user's use of it;",
            "Bypassing rate limits, quotas, or other technical restrictions;",
            "Using our services to facilitate illegal goods or services.",
          ]),
        ],
      },
      {
        heading: "4. Enforcement",
        blocks: [
          p("Violations may result in any of the following, at our sole discretion:"),
          list([
            "Removal of offending content;",
            "Throttling, suspension, or termination of accounts;",
            "Reporting to law enforcement and competent authorities;",
            "Recovery of damages, costs, and legal fees.",
          ]),
        ],
      },
      {
        heading: "5. Restricted Countries & Regions",
        blocks: [
          p(
            "We do not onboard customers from, or provide services into, the following countries and regions due to FATF blacklisting, OFAC comprehensive sanctions, active conflict, or severe payment/digital restrictions:",
          ),
          {
            type: "dynamic-countries",
            mode: "blocked",
            fallback: [
              "Afghanistan — Active conflict zone",
              "Belarus — Severe payment / digital restrictions",
              "Crimea Region — OFAC comprehensive sanctions",
              "Cuba — OFAC comprehensive sanctions",
              "Donetsk Region — OFAC comprehensive sanctions",
              "Iran — FATF blacklist",
              "Libya — Active conflict zone",
              "Luhansk Region — OFAC comprehensive sanctions",
              "Myanmar (Burma) — FATF blacklist",
              "North Korea (DPRK) — FATF blacklist",
              "Russia — Severe payment / digital restrictions",
              "Somalia — Active conflict zone",
              "South Sudan — Active conflict zone",
              "Sudan — Active conflict zone",
              "Syria — OFAC comprehensive sanctions",
              "Venezuela — Severe payment / digital restrictions",
              "Yemen — Active conflict zone",
            ],
          },
          p(
            "The following countries are subject to enhanced review (additional KYC/AML, longer onboarding times, and limited service scope):",
          ),
          {
            type: "dynamic-countries",
            mode: "review",
            fallback: ["Iraq", "Lebanon", "Nigeria", "Pakistan", "Zimbabwe"],
          },
          p(
            "This list is reviewed regularly and may change without notice. For the live, up-to-date status of any country, use our Country Eligibility Checker on the Contact page.",
          ),
        ],
      },
      {
        heading: "6. Reporting Abuse",
        blocks: [p(`Report abuse to ${COMPANY.legalEmail}. We investigate every report.`)],
      },
    ],
  },
};

const ROUTE_TO_KEY: Record<string, LegalKey> = {
  privacy: "privacy",
  terms: "terms",
  refund: "refund",
  cookies: "cookies",
  aml: "aml",
  compliance: "aml",
  payments: "payments",
  support: "support",
  sla: "support",
  "acceptable-use": "acceptable-use",
};

function useDynamicCountries(mode: "blocked" | "review", fallback: string[]) {
  const [items, setItems] = useState<string[]>(fallback);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await db
        .from("country_eligibility")
        .select("name,reason,status,sort_order")
        .eq("is_active", true)
        .eq("status", mode)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled || !data) return;
      setItems(
        data.map((r: any) =>
          mode === "blocked" && r.reason ? `${r.name} — ${r.reason}` : r.name,
        ),
      );
    };
    load();
    const channel = db
      .channel(`legal-countries-${mode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "country_eligibility" },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      db.removeChannel(channel);
    };
  }, [mode]);
  return items;
}

const DynamicCountryList = ({
  mode,
  fallback,
}: {
  mode: "blocked" | "review";
  fallback: string[];
}) => {
  const items = useDynamicCountries(mode, fallback);
  return (
    <ul className="space-y-1.5 list-disc pl-5 text-sm md:text-base text-muted-foreground leading-relaxed marker:text-primary/70">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
};

const Block = ({ block }: { block: Block }) => {
  if (block.type === "p") {
    return (
      <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
        {block.text}
      </p>
    );
  }
  if (block.type === "list") {
    return (
      <ul className="space-y-1.5 list-disc pl-5 text-sm md:text-base text-muted-foreground leading-relaxed marker:text-primary/70">
        {block.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "dynamic-countries") {
    return <DynamicCountryList mode={block.mode} fallback={block.fallback} />;
  }
  // callout
  const tone = block.tone ?? "info";
  const cls =
    tone === "warning"
      ? "border-amber-500/30 bg-amber-500/5 text-foreground"
      : "border-primary/30 bg-primary/5 text-foreground";
  return (
    <div className={`rounded-lg border ${cls} px-4 py-3 text-sm leading-relaxed`}>
      {block.text}
    </div>
  );
};

const Legal = ({ docKey }: { docKey?: LegalKey }) => {
  const params = useParams<{ slug?: string }>();
  const key = docKey ?? (params.slug && ROUTE_TO_KEY[params.slug]);

  if (!key) return <Navigate to="/" replace />;

  const doc = DOCS[key];
  const Icon = doc.icon;

  usePageSEO(`legal:${key}`, {
    title: `${doc.title} | ${COMPANY.brand}`,
    description: doc.subtitle,
  });

  const otherDocs = useMemo(
    () => (Object.values(DOCS) as LegalDoc[]).filter((d) => d.key !== key),
    [key],
  );

  return (
    <Layout>
      <article className="mx-auto max-w-[920px] px-6 lg:px-8 py-9 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">{doc.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-10 pb-8 border-b border-border/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Legal
            </span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            {doc.title}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">{doc.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span>Effective: {EFFECTIVE_DATE}</span>
            <span>Last updated: {LAST_UPDATED}</span>
            <span>Entity: {COMPANY.name}</span>
          </div>
        </header>

        {/* TOC */}
        <aside className="mb-10 rounded-xl border border-border/50 bg-card/30 p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground mb-3">
            On this page
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
            {doc.sections.map((s, i) => (
              <li key={i}>
                <a
                  href={`#sec-${i}`}
                  className="hover:text-primary transition-colors"
                >
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        {/* Content */}
        <div className="space-y-10">
          {doc.sections.map((s, i) => (
            <section key={s.heading} id={`sec-${i}`} className="scroll-mt-24">
              <h2 className="font-heading text-lg md:text-xl font-semibold text-foreground mb-3">
                {s.heading}
              </h2>
              <div className="space-y-3">
                {s.blocks.map((b, bi) => (
                  <Block key={bi} block={b} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Related */}
        <div className="mt-16 pt-10 border-t border-border/40">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground mb-4">
            Related Policies
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherDocs.map((d) => {
              const DIcon = d.icon;
              return (
                <Link
                  key={d.key}
                  to={`/${d.key}`}
                  className="group flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-4 hover:border-primary/40 hover:bg-card/70 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <DIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {d.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default Legal;
