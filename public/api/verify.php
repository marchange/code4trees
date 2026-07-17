<?php
// api/verify.php
// Nimmt den Bestätigungslink aus der E-Mail entgegen und aktiviert den Account.

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$token = $_GET['token'] ?? '';

function showResult(string $title, string $message, bool $success): void {
    header('Content-Type: text/html; charset=UTF-8');
    $color = $success ? '#A7C957' : '#FF5F56';
    echo <<<HTML
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <title>{$title}</title>
      <style>
        body { background:#050a07; color:#EAF0E4; font-family: system-ui, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; }
        .card { max-width: 420px; padding: 40px; }
        h1 { color: {$color}; }
        a { color: #A7C957; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>{$title}</h1>
        <p>{$message}</p>
        <p><a href="https://dev.code4trees.org/">Zurück zu code4trees</a></p>
      </div>
    </body>
    </html>
    HTML;
    exit;
}

if ($token === '') {
    showResult('Ungültiger Link', 'Es wurde kein Bestätigungs-Token übergeben.', false);
}

$stmt = $pdo->prepare('SELECT id, email_verified, verification_token_expires FROM users WHERE verification_token = ?');
$stmt->execute([$token]);
$user = $stmt->fetch();

if (!$user) {
    showResult('Ungültiger Link', 'Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.', false);
}

if ((int)$user['email_verified'] === 1) {
    showResult('Bereits bestätigt', 'Diese E-Mail-Adresse wurde bereits bestätigt. Du kannst dich jetzt einloggen.', true);
}

if (strtotime($user['verification_token_expires']) < time()) {
    showResult('Link abgelaufen', 'Dieser Bestätigungslink ist abgelaufen. Bitte registriere dich erneut oder fordere einen neuen Link an.', false);
}

$updateStmt = $pdo->prepare(
    'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?'
);
$updateStmt->execute([$user['id']]);

showResult('E-Mail bestätigt!', 'Deine E-Mail-Adresse wurde erfolgreich bestätigt. Du kannst dich jetzt einloggen.', true);