<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ZohoCrmService
{
    /**
     * Sync a local CrmLead to Zoho CRM.
     *
     * @param \App\Models\CrmLead $lead
     * @return array
     * @throws \Exception
     */
    public function syncLead($lead)
    {
        $creds = SiteSetting::get('zoho_credentials');
        if (is_string($creds)) {
            $creds = json_decode($creds, true);
        }

        if (!$creds || empty($creds['client_id']) || empty($creds['client_secret']) || empty($creds['refresh_token'])) {
            throw new \Exception("Zoho CRM credentials (client_id, client_secret, refresh_token) are not configured in Site Settings.");
        }

        $accessToken = $this->getOrRefreshAccessToken($creds);

        $apiDomain = $creds['api_domain'] ?? 'https://www.zohoapis.com';
        $endpoint = rtrim($apiDomain, '/') . '/crm/v6/Leads/upsert';

        // Split Full Name into First and Last names
        $names = explode(' ', trim($lead->full_name), 2);
        $firstName = count($names) > 1 ? $names[0] : '';
        $lastName = count($names) > 1 ? $names[1] : $names[0];

        if (empty($lastName)) {
            $lastName = 'Lead';
        }

        // Map status
        $statusMapping = [
            'new' => 'New Lead',
            'working' => 'Contacted',
            'qualified' => 'Qualified',
            'unqualified' => 'Junk Lead',
            'converted' => 'Lost Lead', // or Contacted depending on Zoho pipeline
        ];
        $zohoStatus = $statusMapping[$lead->status] ?? 'New Lead';

        $leadData = [
            'First_Name' => $firstName,
            'Last_Name' => $lastName,
            'Email' => $lead->email,
            'Phone' => $lead->phone,
            'Company' => $lead->company ?: 'Individual',
            'Lead_Source' => ucfirst($lead->source),
            'Description' => $lead->message,
            'Lead_Status' => $zohoStatus,
        ];

        // If we already have a zoho_id, include it to force an update on that specific record
        if ($lead->zoho_id) {
            $leadData['id'] = $lead->zoho_id;
        }

        $payload = [
            'data' => [$leadData],
            'duplicate_check_fields' => ['Email', 'Phone']
        ];

        Log::info("Zoho CRM Sync: Sending upsert payload to $endpoint", ['payload' => $payload]);

        $response = Http::withHeaders([
            'Authorization' => 'Zoho-oauthtoken ' . $accessToken,
            'Content-Type' => 'application/json',
        ])->post($endpoint, $payload);

        if ($response->failed()) {
            throw new \Exception("Zoho API call failed with status {$response->status()}: " . $response->body());
        }

        $resBody = $response->json();

        if (empty($resBody['data'][0])) {
            throw new \Exception("Zoho API responded with invalid data: " . json_encode($resBody));
        }

        $result = $resBody['data'][0];

        if ($result['status'] === 'error') {
            throw new \Exception("Zoho Lead upsert error: " . ($result['message'] ?? 'Unknown Zoho API Error') . " Detail: " . json_encode($result['details'] ?? []));
        }

        return [
            'zoho_id' => $result['details']['id'] ?? null,
            'action' => $result['action'] ?? 'upsert',
            'message' => $result['message'] ?? 'Success',
        ];
    }

    /**
     * Get the active access token, refreshing it if expired or missing.
     *
     * @param array $creds
     * @return string
     * @throws \Exception
     */
    protected function getOrRefreshAccessToken(array &$creds)
    {
        $now = now();
        
        // If access token is valid (expiry is in the future, with 5 minutes buffer)
        if (!empty($creds['access_token']) && !empty($creds['expires_at']) && $now->timestamp < ($creds['expires_at'] - 300)) {
            return $creds['access_token'];
        }

        Log::info("Zoho CRM: Access token expired or missing. Requesting a refresh.");

        $accountsDomain = $creds['accounts_domain'] ?? 'https://accounts.zoho.com';
        $tokenUrl = rtrim($accountsDomain, '/') . '/oauth/v2/token';

        $response = Http::asForm()->post($tokenUrl, [
            'refresh_token' => $creds['refresh_token'],
            'client_id' => $creds['client_id'],
            'client_secret' => $creds['client_secret'],
            'grant_type' => 'refresh_token',
        ]);

        if ($response->failed()) {
            throw new \Exception("Failed to refresh Zoho Access Token: " . $response->body());
        }

        $data = $response->json();

        if (empty($data['access_token'])) {
            throw new \Exception("Failed to refresh Zoho Access Token. Zoho Response: " . json_encode($data));
        }

        $creds['access_token'] = $data['access_token'];
        
        // Set expiry timestamp
        $expiresIn = $data['expires_in'] ?? 3600;
        $creds['expires_at'] = now()->timestamp + $expiresIn;

        // If Zoho returns a new API domain in refresh token response, update it
        if (!empty($data['api_domain'])) {
            $creds['api_domain'] = $data['api_domain'];
        }

        // Save back to settings table
        SiteSetting::set('zoho_credentials', $creds, 'zoho');

        return $creds['access_token'];
    }
}
