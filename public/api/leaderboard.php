<?php
// api/leaderboard.php
// Liefert zwei Ranglisten: Top-Universitäten und Top-Einzelpersonen
// nach Anzahl gepflanzter Bäume ("Semester-Fight").

declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/db.php'; // stellt $pdo bereit

try {
    // --- Uni-Leaderboard ---
    // LEFT JOIN, damit Unis ohne Bäume mit 0 auftauchen (nicht ganz aus der Liste fallen).
    $uniStmt = $pdo->query(
        'SELECT u.name AS university_name, COUNT(t.id) AS tree_count
         FROM universities u
         LEFT JOIN tree_records t ON t.university_id = u.id
         GROUP BY u.id, u.name
         ORDER BY tree_count DESC, u.name ASC
         LIMIT 10'
    );
    $universityLeaderboard = array_map(function (array $row): array {
        return [
            'university_name' => $row['university_name'],
            'tree_count'      => (int)$row['tree_count'],
        ];
    }, $uniStmt->fetchAll());

    // --- User-Leaderboard ---
    // INNER JOIN bewusst: nur User mit mindestens einem Baum tauchen auf
    // (eine Rangliste mit hunderten 0-Bäumen wäre nicht sinnvoll lesbar).
    $userStmt = $pdo->query(
        'SELECT us.username AS username, un.name AS university_name, COUNT(t.id) AS tree_count
         FROM tree_records t
         INNER JOIN users us ON us.id = t.user_id
         LEFT JOIN universities un ON un.id = us.university_id
         GROUP BY us.id, us.username, un.name
         ORDER BY tree_count DESC, us.username ASC
         LIMIT 10'
    );
    $userLeaderboard = array_map(function (array $row): array {
        return [
            'username'        => $row['username'],
            'university_name' => $row['university_name'], // kann null sein (z.B. Testkonten ohne Uni)
            'tree_count'      => (int)$row['tree_count'],
        ];
    }, $userStmt->fetchAll());

    echo json_encode([
        'status'       => 'success',
        'leaderboard'  => $universityLeaderboard, // Alt-Feldname, für Abwärtskompatibilität beibehalten
        'universities' => $universityLeaderboard,
        'users'        => $userLeaderboard,
    ], JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    error_log('leaderboard.php error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Leaderboard konnte nicht geladen werden.']);
}