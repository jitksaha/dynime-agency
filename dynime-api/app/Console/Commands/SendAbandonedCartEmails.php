<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendAbandonedCartEmails extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:send-abandoned';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send automatic recovery emails to customers who abandoned checkout';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Checking for abandoned checkouts...');

        // Query checkouts older than 30 minutes that haven't been emailed yet
        $timeThreshold = now()->subMinutes(30);

        $abandoned = DB::table('abandoned_checkouts')
            ->where('status', 'abandoned')
            ->where('email_sent', false)
            ->where('last_active_at', '<=', $timeThreshold)
            ->get();

        if ($abandoned->isEmpty()) {
            $this->info('No abandoned checkouts found to process.');
            return Command::SUCCESS;
        }

        $this->info('Found ' . $abandoned->count() . ' abandoned checkouts to email.');

        try {
            \App\Services\MailConfigurator::configure('general');
        } catch (\Exception $e) {
            $this->error('Failed to configure mailer: ' . $e->getMessage());
            Log::error('[SendAbandonedCartEmails] Mail configuration error: ' . $e->getMessage());
            return Command::FAILURE;
        }

        foreach ($abandoned as $checkout) {
            $this->info("Sending recovery email to: {$checkout->email}");

            $cartData = json_decode($checkout->cart_data, true) ?: [];
            $name = $checkout->name ?: 'there';

            // Generate cart items HTML table
            $itemsHtml = '';
            $subtotal = 0;
            if (!empty($cartData)) {
                $itemsHtml .= '<div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-family: sans-serif;">';
                $itemsHtml .= '<table style="width: 100%; border-collapse: collapse;">';
                $itemsHtml .= '<tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left;">';
                $itemsHtml .= '<th style="padding: 12px; font-size: 14px; font-weight: 600; color: #475569;">Service</th>';
                $itemsHtml .= '<th style="padding: 12px; font-size: 14px; font-weight: 600; color: #475569; text-align: right;">Price</th>';
                $itemsHtml .= '</tr>';
                
                foreach ($cartData as $item) {
                    $price = doubleval($item['price'] ?? 0);
                    $qty = intval($item['quantity'] ?? 1);
                    $totalPrice = $price * $qty;
                    $subtotal += $totalPrice;

                    $itemsHtml .= '<tr style="border-bottom: 1px solid #f1f5f9;">';
                    $itemsHtml .= '<td style="padding: 12px; font-size: 14px; color: #334155;">' . htmlspecialchars($item['name'] ?? 'Custom Service') . ' <span style="color: #64748b; font-size: 12px;">(x' . $qty . ')</span></td>';
                    $itemsHtml .= '<td style="padding: 12px; font-size: 14px; color: #334155; text-align: right;">$' . number_format($totalPrice, 2) . '</td>';
                    $itemsHtml .= '</tr>';
                }
                
                $itemsHtml .= '<tr style="font-weight: bold; background-color: #f8fafc;">';
                $itemsHtml .= '<td style="padding: 12px; font-size: 14px; color: #1e293b;">Total Saved</td>';
                $itemsHtml .= '<td style="padding: 12px; font-size: 14px; color: #1e293b; text-align: right;">$' . number_format($subtotal, 2) . '</td>';
                $itemsHtml .= '</tr>';
                $itemsHtml .= '</table>';
                $itemsHtml .= '</div>';
            }

            // Build Checkout recovery URL
            $baseUrl = env('FRONTEND_URL', 'https://dynime.com');
            if (str_contains($baseUrl, 'dynime.com')) {
                $baseUrl = str_replace('http://', 'https://', $baseUrl);
            }
            $checkoutUrl = rtrim($baseUrl, '/') . '/checkout?recovered_email=' . urlencode($checkout->email);

            $htmlContent = '
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Complete Your Checkout</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #635bff; font-family: sans-serif;">
                                Dynime
                            </h1>
                            <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b; font-weight: 500;">Accelerating Digital Transformation</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center;">You left something behind!</h2>
                            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #334155;">Hi ' . htmlspecialchars($name) . ',</p>
                            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 24px; color: #334155;">We noticed you visited our checkout page but didn\'t finish placing your order. We wanted to let you know that we\'ve saved the items in your cart so you can easily complete your checkout when you\'re ready.</p>
                            
                            ' . $itemsHtml . '
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="' . htmlspecialchars($checkoutUrl) . '" style="background-color: #635bff; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 16px; font-weight: 700; border-radius: 8px; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 6px -1px rgba(99, 91, 255, 0.3);">
                                    Resume Your Checkout
                                </a>
                            </div>
                            
                            <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 22px; color: #64748b; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                                Need assistance with your order? Simply reply to this email, and our dedicated support team will be happy to help.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #f1f5f9;">
                            <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 18px;">
                                &copy; ' . date('Y') . ' Dynime Inc. All rights reserved.<br>
                                Dynime.com &bull; Dhaka, Bangladesh
                            </p>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            ';

            try {
                Mail::html($htmlContent, function ($message) use ($checkout) {
                    $message->to($checkout->email)
                        ->subject('Complete your order with Dynime');
                });

                DB::table('abandoned_checkouts')
                    ->where('id', $checkout->id)
                    ->update([
                        'email_sent' => true,
                        'updated_at' => now(),
                    ]);

                $this->info("Email sent successfully to {$checkout->email}");
            } catch (\Exception $e) {
                $this->error("Failed to send email to {$checkout->email}: " . $e->getMessage());
                Log::error("[SendAbandonedCartEmails] Email send failed to {$checkout->email}: " . $e->getMessage());
            }
        }

        return Command::SUCCESS;
    }
}
