<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WhatsAppService
{
    /**
     * Sends a template or custom text message via WhatsApp Business Cloud API.
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

        $token = $config['access_token'] ?? env('WHATSAPP_ACCESS_TOKEN');
        $phoneId = $config['phone_number_id'] ?? env('WHATSAPP_PHONE_NUMBER_ID');
        $enabled = filter_var($config['enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);

        if (!$enabled) {
            return ['success' => false, 'error' => 'WhatsApp service is disabled in settings.'];
        }

        if (empty($token) || empty($phoneId)) {
            return ['success' => false, 'error' => 'WhatsApp Cloud API token or Phone Number ID is missing.'];
        }

        // Clean phone number (keep digits only)
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        if (empty($cleanPhone)) {
            return ['success' => false, 'error' => 'Invalid phone number format.'];
        }

        $messageId = 'wa-' . Str::uuid()->toString();

        // 2. Prepare payload
        $isTemplate = ($templateName !== 'custom');
        $payload = [];

        if ($isTemplate) {
            $components = [];
            if (!empty($vars)) {
                $parameters = [];
                foreach ($vars as $v) {
                    $parameters[] = ['type' => 'text', 'text' => (string)$v];
                }
                $components[] = [
                    'type' => 'body',
                    'parameters' => $parameters
                ];
            }

            $payload = [
                'messaging_product' => 'whatsapp',
                'to' => $cleanPhone,
                'type' => 'template',
                'template' => [
                    'name' => $templateName,
                    'language' => ['code' => 'en_US'],
                    'components' => $components
                ]
            ];
        } else {
            $payload = [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $cleanPhone,
                'type' => 'text',
                'text' => [
                    'preview_url' => false,
                    'body' => $templateOrMessage
                ]
            ];
        }

        // 3. Dispatch HTTP Post Request to Meta Graph API
        try {
            $url = "https://graph.facebook.com/v19.0/{$phoneId}/messages";
            $response = Http::withToken($token)
                ->timeout(15)
                ->post($url, $payload);

            if ($response->successful()) {
                $resData = $response->json();
                $waMsgId = $resData['messages'][0]['id'] ?? $messageId;
                
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
                Log::error("WhatsApp Cloud API failed. Response: " . $errorMsg);
                
                DB::table('whatsapp_send_log')->insert([
                    'id' => Str::uuid()->toString(),
                    'message_id' => $messageId,
                    'template_name' => $templateName,
                    'recipient_phone' => $cleanPhone,
                    'status' => 'failed',
                    'error_message' => $errorMsg,
                    'metadata' => json_encode(['payload' => $payload, 'response' => $response->json()]),
                    'created_at' => now()
                ]);

                return ['success' => false, 'error' => $errorMsg];
            }
        } catch (\Exception $e) {
            Log::error("WhatsApp delivery exception: " . $e->getMessage());

            DB::table('whatsapp_send_log')->insert([
                'id' => Str::uuid()->toString(),
                'message_id' => $messageId,
                'template_name' => $templateName,
                'recipient_phone' => $cleanPhone,
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'metadata' => json_encode(['payload' => $payload, 'trace' => $e->getTraceAsString()]),
                'created_at' => now()
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
