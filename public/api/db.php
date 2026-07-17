<?php
// api/db.php
// Sicherer PDO-Verbindungsaufbau. Lädt Zugangsdaten aus .env (nie im Git!).

if (basename($_SERVER['PHP_SELF']) == basename(__FILE__)) {
    http_response_code(403);
    exit('Direkter Zugriff verboten.');
}

require_once __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$dotenv->required(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS']);

$host     = $_ENV['DB_HOST'];
$dbname   = $_ENV['DB_NAME'];
$username = $_ENV['DB_USER'];
$password = $_ENV['DB_PASS'];
$charset  = $_ENV['DB_CHARSET'] ?? 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$dbname;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (\PDOException $e) {
    error_log('DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => "Datenbankverbindung fehlgeschlagen. Bitte Admin kontaktieren."
    ]);
    exit;
}