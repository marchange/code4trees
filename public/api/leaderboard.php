<?php
// api/leaderboard.php
// Liefert die Top-Universitäten nach Anzahl gepflanzter Bäume ("Semester-Fight").

declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/db.php'; // stellt $pdo bereit

try {
    // LEFT JOIN, damit Unis ohne Bäume mit 0 auftauchen (nicht ganz aus der Liste fallen).
    $stmt = $pdo->query(
        'SELECT u.name AS university_name, COUNT(t.id) AS tree_count
         FROM universities u
         LEFT JOIN tree_records t ON t.university_id = u.id
         GROUP BY u.id, u.name
         ORDER BY tree_count DESC, u.name ASC
         LIMIT 10'
    );
    $leaderboard = $stmt->fetchAll();

    // Typsicherheit: COUNT() kommt als String aus PDO zurück, für sauberes JSON in int wandeln.
    $leaderboard = array_map(function (array $row): array {
        return [
            'university_name' => $row['university_name'],
            'tree_count'       => (int)$row['tree_count'],
        ];
    }, $leaderboard);

    echo json_encode([
        'status'      => 'success',
        'leaderboard' => $leaderboard,
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('leaderboard.php error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Leaderboard konnte nicht geladen werden.']);
}