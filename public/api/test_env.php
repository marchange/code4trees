<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo "1. PHP läuft.<br>";

$autoload = __DIR__ . '/../../vendor/autoload.php';
if (!file_exists($autoload)) {
    die("FEHLER: autoload.php nicht gefunden unter: $autoload");
}
require_once $autoload;
echo "2. autoload.php geladen.<br>";

if (!class_exists('Dotenv\Dotenv')) {
    die("FEHLER: Dotenv-Klasse nicht gefunden. phpdotenv fehlt im vendor-Ordner.");
}
echo "3. Dotenv-Klasse gefunden.<br>";

$envPath = __DIR__ . '/../..';
$envFile = $envPath . '/.env';
if (!file_exists($envFile)) {
    die("FEHLER: .env nicht gefunden unter: $envFile");
}
echo "4. .env-Datei existiert unter: $envFile<br>";

$dotenv = Dotenv\Dotenv::createImmutable($envPath);
$dotenv->load();
echo "5. .env geladen.<br>";

echo "6. DB_HOST = " . ($_ENV['DB_HOST'] ?? 'NICHT GESETZT') . "<br>";
echo "7. DB_NAME = " . ($_ENV['DB_NAME'] ?? 'NICHT GESETZT') . "<br>";
echo "8. DB_USER = " . ($_ENV['DB_USER'] ?? 'NICHT GESETZT') . "<br>";
echo "9. DB_PASS = " . (isset($_ENV['DB_PASS']) ? '(gesetzt, ' . strlen($_ENV['DB_PASS']) . ' Zeichen)' : 'NICHT GESETZT') . "<br>";

echo "10. Versuche DB-Verbindung...<br>";
try {
    $dsn = "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4";
    $pdo = new PDO($dsn, $_ENV['DB_USER'], $_ENV['DB_PASS']);
    echo "11. DB-Verbindung ERFOLGREICH!";
} catch (\PDOException $e) {
    echo "11. DB-Verbindung FEHLGESCHLAGEN: " . $e->getMessage();
}