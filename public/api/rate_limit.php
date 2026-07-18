<?php
// api/rate_limit.php
// Einfaches, DB-basiertes Rate-Limiting pro IP-Adresse + Aktion.
//
// EINMALIG in der DB ausführen, bevor das hier live geht:
//
// CREATE TABLE IF NOT EXISTS rate_limits (
//   id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
//   ip_hash CHAR(64) NOT NULL,
//   action VARCHAR(20) NOT NULL,
//   window_start DATETIME NOT NULL,
//   attempt_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
//   UNIQUE KEY uniq_ip_action_window (ip_hash, action, window_start)
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

declare(strict_types=1);

/**
 * Prüft und zählt Versuche für eine Aktion (z.B. "register", "login", "plant") pro IP,
 * innerhalb eines festen Zeitfensters.
 *
 * @return bool true = Request erlaubt, false = Limit erreicht (429 zurückgeben)
 */
function checkRateLimit(PDO $pdo, string $action, int $maxAttempts, int $windowMinutes): bool {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $ipHash = hash('sha256', $ip);

    $windowSeconds = $windowMinutes * 60;
    $windowStart = date('Y-m-d H:i:s', (int)(floor(time() / $windowSeconds) * $windowSeconds));

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO rate_limits (ip_hash, action, window_start, attempt_count)
             VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE attempt_count = attempt_count + 1'
        );
        $stmt->execute([$ipHash, $action, $windowStart]);

        $checkStmt = $pdo->prepare(
            'SELECT attempt_count FROM rate_limits WHERE ip_hash = ? AND action = ? AND window_start = ?'
        );
        $checkStmt->execute([$ipHash, $action, $windowStart]);
        $count = (int)($checkStmt->fetchColumn() ?: 0);

        return $count <= $maxAttempts;
    } catch (PDOException $e) {
        error_log('Rate-Limit-Check fehlgeschlagen: ' . $e->getMessage());
        return true;
    }
}