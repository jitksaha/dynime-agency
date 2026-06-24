<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\CustomAgreement;

return new class extends Migration {
    public function up(): void {
        // Clean existing
        CustomAgreement::whereIn('reference', ['DYN-06/26–0126', 'DYN-06/26-0126'])->delete();

        $data = [
            'title' => 'Service Agreement',
            'effective_date' => '2026-06-24',
            'client_name' => 'Farhan Ahmed',
            'client_company' => 'Dew Butterflies',
            'client_phone' => '+97154 498 4230',
            'scope' => "Services Included\nCustom Website Design & Development\nFrontend Development (JavaScript-Based)\nBackend Development & Database Setup\nAdmin Panel & Order Management System (OMS)\nPoint of Sale (POS) Integration\nResponsive Design (Desktop, Tablet & Mobile)\nCloud Storage Integration (S3 Compatible, if required)\nCDN Setup & Configuration\nPerformance Optimization & Speed Enhancement\nSecurity & SSL Configuration\nTesting, Deployment & Go-Live Support\nHostinger KVM 8 VPS Hosting (2 Years)\nPerformance Target\nFast-loading website architecture\nOptimized Core Web Vitals\nPageSpeed Performance Target: 90+ Desktop",
            'term' => 'This Agreement shall remain in effect until all project deliverables have been completed, reviewed, approved, and accepted by the Client.',
            'payment_terms' => "100% advance payment is required before project commencement.\nAny additional features, integrations, modifications, or change requests outside the agreed scope will be billed separately based on work, it can be free also.\nHosting, domain registration, third-party software licenses, plugins, APIs, and external service subscriptions are non-refundable once purchased.\nDelayed payments may result in project suspension until outstanding balances are settled.\nFinal source code, deployment credentials, and project ownership transfer will be provided after full payment has been received.",
            'jurisdiction' => 'Bangladesh',
            'currency' => 'BDT',
            'total' => 200000.00,
            'clauses' => [
                'Confidentiality: Both parties agree to keep all shared information confidential.',
                'Intellectual Property: All deliverables transfer to the Client upon full payment.',
                'Termination: Either party may terminate this agreement with 14 days written notice.'
            ],
            'items' => [
                ['name' => 'Custom Website Design & Development', 'price' => 0, 'quantity' => 1],
                ['name' => 'Frontend Development (JavaScript-Based)', 'price' => 0, 'quantity' => 1],
                ['name' => 'Backend Development & Database Setup', 'price' => 0, 'quantity' => 1],
                ['name' => 'Admin Panel & Order Management System (OMS)', 'price' => 0, 'quantity' => 1],
                ['name' => 'Point of Sale (POS) Integration', 'price' => 0, 'quantity' => 1],
                ['name' => 'Responsive Design (Desktop, Tablet & Mobile)', 'price' => 0, 'quantity' => 1],
                ['name' => 'Cloud Storage Integration (S3 Compatible, if required)', 'price' => 0, 'quantity' => 1],
                ['name' => 'CDN Setup & Configuration', 'price' => 0, 'quantity' => 1],
                ['name' => 'Performance Optimization & Speed Enhancement', 'price' => 0, 'quantity' => 1],
                ['name' => 'Security & SSL Configuration', 'price' => 0, 'quantity' => 1],
                ['name' => 'Testing, Deployment & Go-Live Support', 'price' => 0, 'quantity' => 1],
                ['name' => 'Hostinger KVM 8 VPS Hosting (2 Years)', 'price' => 0, 'quantity' => 1],
                ['name' => 'Performance Target', 'price' => 0, 'quantity' => 1],
                ['name' => 'Fast-loading website architecture', 'price' => 0, 'quantity' => 1],
                ['name' => 'Optimized Core Web Vitals', 'price' => 0, 'quantity' => 1],
                ['name' => 'PageSpeed Performance Target: 90+ Desktop', 'price' => 0, 'quantity' => 1]
            ],
            'client_signer' => 'X',
            'provider_signed_date' => '2026-06-24',
            'created_by' => 'admin'
        ];

        CustomAgreement::create(array_merge($data, ['reference' => 'DYN-06/26–0126']));
        CustomAgreement::create(array_merge($data, ['reference' => 'DYN-06/26-0126']));
    }

    public function down(): void {
        CustomAgreement::whereIn('reference', ['DYN-06/26–0126', 'DYN-06/26-0126'])->delete();
    }
};
