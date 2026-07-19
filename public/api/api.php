<?php
// api/api.php
// Baum-Einreichung: nimmt ein Zip-Projekt entgegen, prüft es serverseitig,
// legt bei Erfolg einen echten tree_records-Eintrag an.
//
// Login ist Pflicht: verhindert anonyme/gefälschte Einreichungen und wirkt
// gleichzeitig als natürliches Rate-Limit pro Account (Registrierung braucht
// eine bestätigte E-Mail-Adresse).
//
// Hinweis zur Ehrlichkeit: Die Prüfung unten ist eine STRUKTURELLE Prüfung
// (liegt im Archiv mindestens eine erkennbare Code-/README-Datei?), keine
// inhaltliche KI-Bewertung. Es findet aktuell keine echte KI-Analyse des
// eingereichten Codes statt.

declare(strict_types=1);

header('Content-Type: application/json');

session_start();

require_once __DIR__ . '/db.php';         // stellt $pdo bereit
require_once __DIR__ . '/rate_limit.php'; // stellt checkRateLimit() bereit

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB — deckt sich mit dem Hinweis im Frontend
const ALLOWED_PROJECT_EXTENSIONS = [
    'readme.md', '.js', '.py', '.html', '.css', '.java', '.cpp', '.c', '.cs', '.json'
];

function respond(int $httpCode, array $payload): void {
    http_response_code($httpCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function currentTreeCount(PDO $pdo): int {
    $stmt = $pdo->query('SELECT COUNT(*) FROM tree_records');
    return (int)$stmt->fetchColumn();
}

// -----------------------------------------------------------------
// GET: aktuellen Baum-Stand liefern (öffentlich, kein Login nötig —
// der Zähler auf der Startseite muss auch für ausgeloggte Besucher laufen).
// -----------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        respond(200, ['trees' => currentTreeCount($pdo)]);
    } catch (PDOException $e) {
        error_log('api.php GET error: ' . $e->getMessage());
        respond(500, ['status' => 'error', 'message' => 'Baum-Zähler konnte nicht geladen werden.']);
    }
}

// -----------------------------------------------------------------
// POST: neues Projekt einreichen -> Baum pflanzen
// -----------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

if (empty($_SESSION['user_id'])) {
    respond(401, ['status' => 'error', 'message' => 'Bitte logge dich ein, um ein Projekt einzureichen.']);
}

sleep(5);
// Zusätzliches IP-basiertes Rate-Limit oben drauf (gegen kompromittierte
// oder mehrfach registrierte Accounts vom selben Absender).
if (!checkRateLimit($pdo, 'plant', 15, 15)) {
    respond(429, ['status' => 'error', 'message' => 'Zu viele Einreichungen. Bitte in ein paar Minuten erneut versuchen.']);
}

$userId       = (int)$_SESSION['user_id'];
$universityId = $_SESSION['university_id'] ?? null;
$facultyId    = $_SESSION['faculty_id'] ?? null;

// Der Anzeigename kommt bewusst NICHT aus dem Formular, sondern aus der
// Session — sonst könnte sich ein eingeloggter User beim Submit als
// jemand anderes ausgeben. Nur der Projektname ist client-seitig frei.
$projectName = trim((string)($_POST['project'] ?? ''));
if ($projectName === '') {
    $projectName = 'Unbenanntes Projekt';
}
if (mb_strlen($projectName) > 255) {
    $projectName = mb_substr($projectName, 0, 255);
}

// --- Datei-Validierung (serverseitig — dem Client wird nicht vertraut) ---

if (!isset($_FILES['zipfile']) || $_FILES['zipfile']['error'] !== UPLOAD_ERR_OK) {
    $errorCode = $_FILES['zipfile']['error'] ?? UPLOAD_ERR_NO_FILE;
    $message = ($errorCode === UPLOAD_ERR_INI_SIZE || $errorCode === UPLOAD_ERR_FORM_SIZE)
        ? 'Die Datei ist zu groß.'
        : 'Es wurde keine gültige Datei hochgeladen.';
    respond(400, ['status' => 'error', 'message' => $message]);
}

$uploadedFile = $_FILES['zipfile'];

if ($uploadedFile['size'] > MAX_ZIP_BYTES) {
    respond(400, ['status' => 'error', 'message' => 'Die Datei überschreitet das Limit von 50 MB.']);
}

$originalName = (string)$uploadedFile['name'];
if (strtolower(pathinfo($originalName, PATHINFO_EXTENSION)) !== 'zip') {
    respond(400, ['status' => 'error', 'message' => 'Bitte eine .zip-Datei hochladen.']);
}

// MIME-Check zusätzlich zur Dateiendung (Endungen sind trivial fälschbar).
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detectedMime = $finfo ? finfo_file($finfo, $uploadedFile['tmp_name']) : false;
if ($finfo) {
    finfo_close($finfo);
}
$allowedMimes = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'];
if ($detectedMime !== false && !in_array($detectedMime, $allowedMimes, true)) {
    respond(400, ['status' => 'error', 'message' => 'Die Datei scheint kein gültiges Zip-Archiv zu sein.']);
}

$zip = new ZipArchive();
$openResult = $zip->open($uploadedFile['tmp_name']);
if ($openResult !== true) {
    respond(400, ['status' => 'error', 'message' => 'Das Zip-Archiv konnte nicht gelesen werden. Ist es beschädigt?']);
}

$hasValidProjectFile = false;
for ($i = 0; $i < $zip->numFiles; $i++) {
    $rawName = $zip->getNameIndex($i);
    if ($rawName === false || substr($rawName, -1) === '/') {
        continue; // kaputter Eintrag oder Verzeichnis
    }
    $entryName = strtolower($rawName);
    foreach (ALLOWED_PROJECT_EXTENSIONS as $ext) {
        if (substr($entryName, -strlen($ext)) === $ext) {
            $hasValidProjectFile = true;
            break 2;
        }
    }
}
$zip->close();

if (!$hasValidProjectFile) {
    respond(400, [
        'status'  => 'error',
        'message' => 'Kein gültiges Projekt gefunden. Das Archiv braucht mindestens eine Code- oder README-Datei.'
    ]);
}

// Duplicate check, same hash same project, no new tree
$contentHash = hash_file('sha256', $uploadedFile['tmp_name']);

$dupStmt = $pdo->prepare('SELECT tree_id FROM tree_records WHERE user_id = ? AND content_hash = ?');
$dupStmt->execute([$userId, $contentHash]);
if ($existingTreeId = $dupStmt->fetchColumn()) {
    respond(409, [
        'status'  => 'error',
        'message' => 'Dieses Projekt wurde bereits eingereicht (Baum-ID: ' . $existingTreeId . ').'
    ]);
}

// --- Baum-ID generieren & Datensatz anlegen ---

$maxAttempts = 3;
$treeId = null;

for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
    $candidateId = 'TREE-' . strtoupper(bin2hex(random_bytes(4))) . '-' . strtoupper(bin2hex(random_bytes(3)));

    try {
        $stmt = $pdo->prepare(
            'INSERT INTO tree_records (user_id, university_id, faculty_id, tree_id, project_name, content_hash)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $universityId, $facultyId, $candidateId, $projectName, $contentHash]);
        $treeId = $candidateId;
        break;
    } catch (PDOException $e) {
        // 23000 = Integrity constraint violation (z.B. tree_id-Kollision — bei 7 Byte
        // Zufall astronomisch unwahrscheinlich, aber wir behandeln es trotzdem sauber).
        if ($e->getCode() === '23000' && $attempt < $maxAttempts - 1) {
            continue;
        }
        error_log('api.php insert error: ' . $e->getMessage());
        respond(500, ['status' => 'error', 'message' => 'Baum konnte nicht gepflanzt werden. Bitte später erneut versuchen.']);
    }
}

if ($treeId === null) {
    respond(500, ['status' => 'error', 'message' => 'Baum konnte nicht gepflanzt werden. Bitte später erneut versuchen.']);
}

try {
    $newCount = currentTreeCount($pdo);
} catch (PDOException $e) {
    error_log('api.php count error: ' . $e->getMessage());
    $newCount = null; // Baum wurde trotzdem gepflanzt, nur die Anzeige hakt kurz.
}

respond(200, [
    'status'   => 'success',
    'success'  => true,
    'message'  => 'Projekt validiert! Baum gepflanzt.',
    'treeId'   => $treeId,
    'newCount' => $newCount,
    'trees'    => $newCount,
]);