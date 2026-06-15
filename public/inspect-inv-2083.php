<?php
$deployToken = 'deploy_token_7782';
if (!isset($_GET['token']) || $_GET['token'] !== $deployToken) {
    header('HTTP/1.1 403 Forbidden');
    echo "Access Denied";
    exit;
}

header('Content-Type: application/json');

try {
    $apiDir = dirname(__DIR__) . '/dynime-api';
    require $apiDir . '/vendor/autoload.php';
    $app = require_once $apiDir . '/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();

    $order = DB::table('orders')->where('invoice_number', 'INV-2083')->orWhere('id', 'INV-2083')->first();
    if ($order) {
        $order->items = json_decode($order->items, true);
        $order->service_brief = json_decode($order->service_brief, true);
        $order->billing_address = json_decode($order->billing_address, true);
        $order->payment_verification = json_decode($order->payment_verification, true);
        echo json_encode($order, JSON_PRETTY_PRINT);
    } else {
        echo json_encode(['error' => 'Order not found']);
    }
} catch (\Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
