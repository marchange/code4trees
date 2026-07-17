<?php
// api/get_setup_data.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Zentrale DB-Verbindung laden
require_once __DIR__ . '/db.php';

try {
    // 1. Alle Universitäten holen
    $uniStmt = $pdo->query("SELECT id, name FROM universities ORDER BY name ASC");
    $universities = $uniStmt->fetchAll();

    // 2. Alle Fakultäten holen
    $facStmt = $pdo->query("SELECT id, university_id, name FROM faculties ORDER BY name ASC");
    $faculties = $facStmt->fetchAll();

    echo json_encode([
        "status" => "success",
        "universities" => $universities,
        "faculties" => $faculties
    ]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Fehler beim Laden der Stammdaten."]);
}