<?php
// api/cron_update_planting_status.php
// Von einem echten IONOS-Cronjob aufgerufen, NICHT von einem Browser.
// Bewegt tree_records zeitbasiert durch submitted -> sourcing -> planted.

declare(strict_types=1);

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    echo "Dieses Skript ist nur als Cronjob (CLI) ausführbar, nicht über den Browser.\n";
    exit(1);
}

require_once __DIR__ . '/db.php';

const DAYS_SUBMITTED_TO_SOURCING = 3;
const DAYS_SOURCING_TO_PLANTED   = 14;

$now = date('Y-m-d H:i:s');

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        "UPDATE tree_records
         SET planting_status = 'sourcing', status_updated_at = ?
         WHERE planting_status = 'submitted'
           AND status_updated_at <= (NOW() - INTERVAL ? DAY)"
    );
    $stmt->execute([$now, DAYS_SUBMITTED_TO_SOURCING]);
    $movedToSourcing = $stmt->rowCount();

    $stmt = $pdo->prepare(
        "UPDATE tree_records
         SET planting_status = 'planted', status_updated_at = ?
         WHERE planting_status = 'sourcing'
           AND status_updated_at <= (NOW() - INTERVAL ? DAY)"
    );
    $stmt->execute([$now, DAYS_SOURCING_TO_PLANTED]);
    $movedToPlanted = $stmt->rowCount();

    $pdo->commit();

    echo "[" . date('Y-m-d H:i:s') . "] OK -- {$movedToSourcing} Bäume auf 'sourcing', {$movedToPlanted} Bäume auf 'planted' gesetzt.\n";
} catch (PDOException $e) {
    $pdo->rollBack();
    error_log('cron_update_planting_status.php error: ' . $e->getMessage());
    echo "[" . date('Y-m-d H:i:s') . "] FEHLER -- siehe error_log.\n";
    exit(1);
}