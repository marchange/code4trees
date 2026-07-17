<?php
// api/auth.php
// Registrierung / Login / Logout / Session-Check für code4trees.
// Nutzt die zentrale, sichere PDO-Verbindung aus db.php (keine zweite DB-Config!).

declare(strict_types=1);

header('Content-Type: application/json');

// Sessions müssen VOR jedem Output gestartet werden.
session_start();

require_once __DIR__ . '/db.php'; // stellt $pdo bereit (siehe db.php)
require_once __DIR__ . '/rate_limit.php';
require_once __DIR__ . '/../../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../..');
$dotenv->load();

function sendVerificationEmail(string $toEmail, string $username, string $token): void {
    $resend = Resend::client($_ENV['RESEND_API_KEY']);

    $verifyLink = "https://dev.code4trees.org/api/verify.php?token=" . urlencode($token);

    $resend->emails->send([
        'from' => 'code4trees <onboarding@dev.code4trees.org>',
        'to' => [$toEmail],
        'subject' => 'Bestätige deine E-Mail-Adresse — code4trees',
        'html' => "
            <p>Hallo {$username},</p>
            <p>Danke für deine Registrierung bei code4trees! Bitte bestätige deine E-Mail-Adresse, um loszulegen:</p>
            <p><a href=\"{$verifyLink}\">E-Mail-Adresse bestätigen</a></p>
            <p>Dieser Link ist 24 Stunden gültig.</p>
        "
    ]);
}


$action = $_GET['action'] ?? '';

function respond(int $httpCode, array $payload): void {
    http_response_code($httpCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function currentUserPublic(array $user): array {
    // Nie password_hash oder andere sensible Felder nach außen geben.
    return [
        'id'            => (int)$user['id'],
        'username'      => $user['username'],
        'email'         => $user['email'],
        'university_id' => (int)$user['university_id'],
        'faculty_id'    => (int)$user['faculty_id'],
    ];
}

switch ($action) {

    // -----------------------------------------------------------------
    // REGISTER
    // -----------------------------------------------------------------
    case 'register': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
        }

        if (!checkRateLimit($pdo, 'register', 5, 15)) {
            respond(429, ['status' => 'error', 'message' => 'Zu viele Registrierungsversuche. Bitte in ein paar Minuten erneut versuchen.']);
        }

        // Honeypot: für Menschen unsichtbares Feld (per CSS versteckt). Echte Nutzer
        // lassen es leer, Bots füllen es aus. Bot bekommt eine "erfolgreiche"
        // Antwort, ohne dass tatsächlich etwas in der DB passiert.
        $honeypot = trim((string)($_POST['website'] ?? ''));
        if ($honeypot !== '') {
            error_log('Honeypot getriggert bei Registrierung, IP: ' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
            respond(201, [
                'status' => 'success',
                'message' => 'Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse über den Link, den wir dir geschickt haben.'
            ]);
        }

        $username   = trim((string)($_POST['username'] ?? ''));
        $email      = trim((string)($_POST['email'] ?? ''));
        $password   = (string)($_POST['password'] ?? '');
        $uniId      = (int)($_POST['university_id'] ?? 0);
        $facultyId  = (int)($_POST['faculty_id'] ?? 0);
    
        if ($username === '' || $email === '' || $password === '' || $uniId <= 0 || $facultyId <= 0) {
            respond(400, ['status' => 'error', 'message' => 'Bitte alle Pflichtfelder ausfüllen.']);
        }
        if (mb_strlen($username) < 3 || mb_strlen($username) > 50) {
            respond(400, ['status' => 'error', 'message' => 'Nickname muss zwischen 3 und 50 Zeichen lang sein.']);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(400, ['status' => 'error', 'message' => 'Bitte eine gültige E-Mail-Adresse angeben.']);
        }
        if (strlen($password) < 8) {
            respond(400, ['status' => 'error', 'message' => 'Passwort muss mindestens 8 Zeichen lang sein.']);
        }
    
        $checkStmt = $pdo->prepare('SELECT id FROM faculties WHERE id = ? AND university_id = ?');
        $checkStmt->execute([$facultyId, $uniId]);
        if (!$checkStmt->fetch()) {
            respond(400, ['status' => 'error', 'message' => 'Diese Fakultät gehört nicht zur gewählten Universität.']);
        }
    
        $passwordHash = password_hash($password, PASSWORD_ARGON2ID);
    
        // Verifizierungs-Token: kryptographisch zufällig, 24h gültig.
        $verificationToken = bin2hex(random_bytes(32));
        $tokenExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));
    
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO users (university_id, faculty_id, username, email, password_hash, email_verified, verification_token, verification_token_expires)
                 VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
            );
            $stmt->execute([$uniId, $facultyId, $username, $email, $passwordHash, $verificationToken, $tokenExpires]);

            http_response_code(201);
            echo json_encode([
                'status' => 'success',
                'message' => 'Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.'
            ], JSON_UNESCAPED_UNICODE);
            
            if (function_exists('fastcgi_finish_request')) {
                fastcgi_finish_request();
            }
            
            sendVerificationEmail($email, $username, $verificationToken);
            exit;
            
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                respond(409, ['status' => 'error', 'message' => 'Nickname oder E-Mail ist bereits vergeben.']);
            }
            error_log('auth.php register error: ' . $e->getMessage());
            respond(500, ['status' => 'error', 'message' => 'Registrierung fehlgeschlagen. Bitte später erneut versuchen.']);
        }
        break;
    }

    // -----------------------------------------------------------------
    // LOGIN
    // -----------------------------------------------------------------
    case 'login': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
        }

        if (!checkRateLimit($pdo, 'login', 10, 15)) {
            respond(429, ['status' => 'error', 'message' => 'Zu viele Login-Versuche. Bitte in ein paar Minuten erneut versuchen.']);
        }

        $email    = trim((string)($_POST['email'] ?? ''));
        $password = (string)($_POST['password'] ?? '');
    
        if ($email === '' || $password === '') {
            respond(400, ['status' => 'error', 'message' => 'E-Mail und Passwort sind erforderlich.']);
        }
    
        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
    
        if (!$user || !password_verify($password, $user['password_hash'])) {
            respond(401, ['status' => 'error', 'message' => 'E-Mail oder Passwort ist falsch.']);
        }
    
        if ((int)$user['email_verified'] !== 1) {
            respond(403, ['status' => 'error', 'message' => 'Bitte bestätige zuerst deine E-Mail-Adresse. Schau in dein Postfach.']);
        }
    
        session_regenerate_id(true);
    
        $_SESSION['user_id']       = (int)$user['id'];
        $_SESSION['username']      = $user['username'];
        $_SESSION['university_id'] = (int)$user['university_id'];
        $_SESSION['faculty_id']    = (int)$user['faculty_id'];
    
        respond(200, [
            'status'  => 'success',
            'message' => 'Login erfolgreich!',
            'user'    => currentUserPublic($user),
        ]);
        break;
    }

    // -----------------------------------------------------------------
    // LOGOUT
    // -----------------------------------------------------------------
    case 'logout': {
        $_SESSION = [];
        session_destroy();
        respond(200, ['status' => 'success', 'message' => 'Erfolgreich ausgeloggt.']);
        break;
    }

    // -----------------------------------------------------------------
    // ME (Session-Check, z.B. beim Seitenaufruf um Login-Status zu prüfen)
    // -----------------------------------------------------------------
    case 'me': {
        if (empty($_SESSION['user_id'])) {
            respond(200, ['status' => 'success', 'loggedIn' => false]);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user) {
            // Session zeigt auf gelöschten User -> Session aufräumen.
            $_SESSION = [];
            session_destroy();
            respond(200, ['status' => 'success', 'loggedIn' => false]);
        }

        respond(200, ['status' => 'success', 'loggedIn' => true, 'user' => currentUserPublic($user)]);
        break;
    }

    default:
        respond(400, ['status' => 'error', 'message' => 'Unbekannte Aktion.']);
}