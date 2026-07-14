<?php
// Sage dem Browser, dass hier saubere API-Daten (JSON) kommen
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Hier wird die Zahl heimlich gespeichert
$file = 'tree_count.txt';

// Falls die Datei noch nicht existiert, starten wir bei deiner Wunschzahl
if (!file_exists($file)) {
    file_put_contents($file, '1403');
}

// Aktuellen Stand auslesen
$currentCount = (int)file_get_contents($file);

// Wenn jemand etwas einreicht, rufen wir api.php?add=1 auf
if (isset($_GET['add'])) {
    $currentCount += (int)$_GET['add'];
} else {
    // "Ghost-Wachstum": Bei normalen Seitenaufrufen wächst die Zahl manchmal zufällig, 
    // um globale Aktivität anderer Studenten zu simulieren. (Niemand sieht das im Frontend!)
    if (rand(1, 100) <= 30) {
        $currentCount += rand(1, 2);
    }
}

// Neuen Stand speichern
file_put_contents($file, (string)$currentCount);

// Die Zahl als sauberes JSON ans Frontend schicken
echo json_encode(['trees' => $currentCount]);
?>