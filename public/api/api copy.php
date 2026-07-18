<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// AUTOMATISCHE PFAD-ERKENNUNG (Damit es lokal UND auf Dev ohne Änderungen läuft!)
if (file_exists(__DIR__ . '/../data')) {
    // Falls ein data-Ordner direkt auf der gleichen Ebene liegt (z.B. lokal)
    $data_dir = __DIR__ . '/../data';
} elseif (file_exists(__DIR__ . '/../../data')) {
    // Falls der data-Ordner zwei Ebenen drüber liegt (deine Dev-Umgebung!)
    $data_dir = __DIR__ . '/../../data';
} else {
    // Fallback: Wenn nirgends einer existiert, erstelle ihn einfach direkt im api-Ordner
    $data_dir = __DIR__;
}

$file = $data_dir . '/tree_count.txt';
$rate_limit_file = $data_dir . '/rate_limits.json';
$recordFile = $data_dir . '/records.json';

$count = 0; 

// Dateien erstellen, falls sie noch nicht da sind
if (!file_exists($file)) file_put_contents($file, '0');
if (!file_exists($rate_limit_file)) file_put_contents($rate_limit_file, json_encode([]));
if (!file_exists($recordFile)) file_put_contents($recordFile, json_encode([]));

// Konfiguration
$max_requests_per_hour = 1000; 
$current_ip = $_SERVER['REMOTE_ADDR'];
$current_hour = date('Y-m-d-H'); 

function check_rate_limit($ip, $hour, $max_requests, $rate_limit_file) {
    $fp = fopen($rate_limit_file, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        $content = stream_get_contents($fp);
        $limits = json_decode($content, true) ?: [];
        $ip_hour_key = "{$ip}:{$hour}";
        $current_count = $limits[$ip_hour_key] ?? 0;
        
        if ($current_count >= $max_requests) {
            flock($fp, LOCK_UN);
            fclose($fp);
            return false;
        }
        
        $limits[$ip_hour_key] = $current_count + 1;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($limits));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
    return true; 
}

// Read mode
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['add'])) {
    $count = (int)file_get_contents($file);
    echo json_encode(['trees' => $count]);
    exit;
}

// Rate Limit Check
if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['add'])) {
    if (!check_rate_limit($current_ip, $current_hour, $max_requests_per_hour, $rate_limit_file)) {
        http_response_code(429);
        echo json_encode(["status" => "error", "message" => "Rate limit exceeded."]);
        exit;
    }
}

// Write mode
$fp = fopen($file, 'c+');
if ($fp && flock($fp, LOCK_EX)) {
    $count = (int)stream_get_contents($fp);
    
    $responseData = [];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        sleep(2); // KI-Prüfung simulieren
        $count += 1; 

        $treeId = "TREE-" . strtoupper(bin2hex(random_bytes(4))) . "-" . strtoupper(bin2hex(random_bytes(3)));
        $existingRecords = [];
        
        if (file_exists($recordFile)) {
            $fileData = file_get_contents($recordFile);
            $existingRecords = json_decode($fileData, true) ?? [];
        }
        
        $userName = isset($_POST['name']) ? htmlspecialchars($_POST['name'], ENT_QUOTES, 'UTF-8') : 'Anonymous';
        $projectName = isset($_POST['project']) ? htmlspecialchars($_POST['project'], ENT_QUOTES, 'UTF-8') : 'Project';
        
        $newRecord = [
            'tree_id' => $treeId,
            'name'    => $userName,
            'project' => $projectName,
            'date'    => date('Y-m-d H:i:s')
        ];
        
        $existingRecords[] = $newRecord;
        file_put_contents($recordFile, json_encode($existingRecords, JSON_PRETTY_PRINT));

        // Full response including the Tree ID for the frontend success state
        $responseData = [
            "status" => "success", 
            "success" => true,
            "message" => "Project validated! Tree planted.",
            "trees" => $count,
            "newCount" => $count,
            "treeId" => $treeId
        ];

    } elseif (isset($_GET['add'])) {
        $count += (int)$_GET['add'];
        
        // Simple response for background increments
        $responseData = [
            "status" => "success", 
            "success" => true,
            "trees" => $count,
            "newCount" => $count
        ];
    }

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, (string)$count);
    fflush($fp);
    
    flock($fp, LOCK_UN);
    fclose($fp);

    echo json_encode($responseData);
    exit;
}
echo json_encode(["status" => "error", "message" => "Server Dateisystem gesperrt."]);
?>