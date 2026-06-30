<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WhatsAppService
{
    /**
     * Sends a text message via Twilio WhatsApp API.
     *
     * @param string $phone Target phone number
     * @param string $templateOrMessage Message content (or custom text if not a template)
     * @param array $vars Variable parameters for template (if template)
     * @param string $templateName Template code/identifier (e.g. order_update, payment_link)
     * @return array
     */
    public static function send(string $phone, string $templateOrMessage, array $vars = [], string $templateName = 'custom'): array
    {
        // 1. Load config from notification_settings
        $setting = DB::table('notification_settings')->where('key', 'whatsapp_config')->first();
        $config = [];
        if ($setting) {
            $decoded = json_decode($setting->value, true);
            if (is_array($decoded)) {
                $config = $decoded;
            }
        }

        $authToken = $config['access_token'] ?? env('WHATSAPP_ACCESS_TOKEN'); // Twilio Auth Token
        $accountSid = $config['phone_number_id'] ?? env('WHATSAPP_PHONE_NUMBER_ID'); // Twilio Account SID
        $fromNumber = $config['twilio_from'] ?? env('WHATSAPP_FROM_NUMBER') ?? 'whatsapp:+14155238886'; // Twilio Sender
        $enabled = filter_var($config['enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);

        if (!$enabled) {
            return ['success' => false, 'error' => 'WhatsApp service is disabled in settings.'];
        }

        if (empty($authToken) || empty($accountSid)) {
            return ['success' => false, 'error' => 'Twilio Auth Token or Account SID is missing.'];
        }

        // Clean phone number (keep digits only)
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        if (empty($cleanPhone)) {
            return ['success' => false, 'error' => 'Invalid phone number format.'];
        }

        $messageId = 'wa-' . Str::uuid()->toString();

        // 2. Compile message body locally if it is a template
        $messageBody = $templateOrMessage;
        if ($templateName !== 'custom') {
            if (!empty($vars)) {
                foreach ($vars as $idx => $v) {
                    $messageBody = str_replace('{{' . ($idx + 1) . '}}', $v, $messageBody);
                }
            }
        }

        // 3. Dispatch HTTP Post Request to Twilio API
        try {
            $url = "https://api.twilio.com/2010-04-01/Accounts/{$accountSid}/Messages.json";
            
            $response = Http::withBasicAuth($accountSid, $authToken)
                ->asForm()
                ->timeout(15)
                ->post($url, [
                    'To' => 'whatsapp:+' . $cleanPhone,
                    'From' => str_starts_with($fromNumber, 'whatsapp:') ? $fromNumber : 'whatsapp:' . $fromNumber,
                    'Body' => $messageBody
                ]);

            if ($response->successful()) {
                $resData = $response->json();
                $waMsgId = $resData['sid'] ?? $messageId;
                
                DB::table('whatsapp_send_log')->insert([
                    'id' => Str::uuid()->toString(),
                    'message_id' => $waMsgId,
                    'template_name' => $templateName,
                    'recipient_phone' => $cleanPhone,
                    'status' => 'sent',
                    'error_message' => null,
                    'metadata' => json_encode($resData),
                    'created_at' => now()
                ]);

                return ['success' => true, 'message_id' => $waMsgId];
            } else {
                $errorMsg = $response->body();
                Log::error("Twilio API failed. Response: " . $errorMsg);
                
                DB::table('whatsapp_send_log')->insert([
                    'id' => Str::uuid()->toString(),
                    'message_id' => $messageId,
                    'template_name' => $templateName,
                    'recipient_phone' => $cleanPhone,
                    'status' => 'failed',
                    'error_message' => $errorMsg,
                    'metadata' => json_encode(['payload' => ['To' => $cleanPhone, 'Body' => $messageBody], 'response' => $response->json()]),
                    'created_at' => now()
                ]);

                return ['success' => false, 'error' => $errorMsg];
            }
        } catch (\Exception $e) {
            Log::error("Twilio WhatsApp exception: " . $e->getMessage());

            DB::table('whatsapp_send_log')->insert([
                'id' => Str::uuid()->toString(),
                'message_id' => $messageId,
                'template_name' => $templateName,
                'recipient_phone' => $cleanPhone,
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'metadata' => json_encode(['payload' => ['To' => $cleanPhone, 'Body' => $messageBody], 'trace' => $e->getTraceAsString()]),
                'created_at' => now()
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
