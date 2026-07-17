<?php
// api/auth.php
// Registrierung / Login / Logout / Session-Check für code4trees.
// Nutzt die zentrale, sichere PDO-Verbindung aus db.php (keine zweite DB-Config!).

declare(strict_types=1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Sessions müssen VOR jedem Output gestartet werden.
session_start();

require_once __DIR__ . '/db.php'; // stellt $pdo bereit (siehe db.php)

// Preflight-Requests (falls Frontend jemals von anderer Origin läuft)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
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

        $username   = trim((string)($_POST['username'] ?? ''));
        $email      = trim((string)($_POST['email'] ?? ''));
        $password   = (string)($_POST['password'] ?? '');
        $uniId      = (int)($_POST['university_id'] ?? 0);
        $facultyId  = (int)($_POST['faculty_id'] ?? 0);

        // --- Validierung ---
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

        // Fakultät muss wirklich zur gewählten Uni gehören (Server-seitig prüfen,
        // nicht blind aufs Frontend-Dropdown vertrauen).
        $checkStmt = $pdo->prepare('SELECT id FROM faculties WHERE id = ? AND university_id = ?');
        $checkStmt->execute([$facultyId, $uniId]);
        if (!$checkStmt->fetch()) {
            respond(400, ['status' => 'error', 'message' => 'Diese Fakultät gehört nicht zur gewählten Universität.']);
        }

        $passwordHash = password_hash($password, PASSWORD_ARGON2ID);

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO users (university_id, faculty_id, username, email, password_hash)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$uniId, $facultyId, $username, $email, $passwordHash]);

            respond(201, ['status' => 'success', 'message' => 'Registrierung erfolgreich! Du kannst dich jetzt einloggen.']);
        } catch (PDOException $e) {
            // 23000 = Integrity constraint violation (z.B. UNIQUE auf username/email)
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

        $email    = trim((string)($_POST['email'] ?? ''));
        $password = (string)($_POST['password'] ?? '');

        if ($email === '' || $password === '') {
            respond(400, ['status' => 'error', 'message' => 'E-Mail und Passwort sind erforderlich.']);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Bewusst dieselbe Fehlermeldung für "User existiert nicht" und
        // "Passwort falsch" -- verhindert User-Enumeration.
        if (!$user || !password_verify($password, $user['password_hash'])) {
            respond(401, ['status' => 'error', 'message' => 'E-Mail oder Passwort ist falsch.']);
        }

        // Session-Fixation vermeiden: neue Session-ID nach erfolgreichem Login.
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