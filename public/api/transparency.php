<?php
// api/transparency.php
// Liefert aggregierte Zahlen zum Planting-Status aller Bäume -- öffentlich,
// kein Login nötig.

declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/db.php';

try {
    $stmt = $pdo->query(
        "SELECT planting_status, COUNT(*) AS anzahl
         FROM tree_records
         GROUP BY planting_status"
    );
    $rows = $stmt->fetchAll();

    $counts = ['submitted' => 0, 'sourcing' => 0, 'planted' => 0];
    foreach ($rows as $row) {
        $counts[$row['planting_status']] = (int)$row['anzahl'];
    }

    $total = array_sum($counts);

    echo json_encode([
        'status' => 'success',
        'total'  => $total,
        'counts' => $counts,
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('transparency.php error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Transparenz-Daten konnten nicht geladen werden.']);
}