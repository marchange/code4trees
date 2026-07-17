<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$data_dir = __DIR__ . '/../data';
$file = $data_dir . '/tree_count.txt';
$rate_limit_file = $data_dir . '/rate_limits.json';
$recordFile = $data_dir . '/records.json'; // Jetzt auch im Data-Ordner!

$count = 0; 

// 1. HARDCORE PERMISSION CHECK
// Wenn der Ordner nicht existiert oder nicht beschreibbar ist, sag es uns sofort!
if (!is_dir($data_dir) || !is_writable($data_dir)) {
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "SERVER-FEHLER: Der Ordner '../data/' existiert nicht oder hat keine Schreibrechte. Bitte setze per FTP CHMOD 777 auf den Ordner 'data'."
    ]);
    exit;
}

// Create files if they don't exist
if (!file_exists($file)) file_put_contents($file, '0');
if (!file_exists($rate_limit_file)) file_put_contents($rate_limit_file, json_encode([]));
if (!file_exists($recordFile)) file_put_contents($recordFile, json_encode([]));

// Rate limiting configuration
$max_requests_per_hour = 100; // Limit wieder hochgesetzt
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
        
        // Cleanup old entries
        $cutoff_time = time() - (24 * 3600);
        foreach ($limits as $key => $value) {
            if (strpos($key, ':') !== false) {
                list($stored_ip, $stored_hour) = explode(':', $key);
                $stored_timestamp = strtotime(str_replace('-', ' ', $stored_hour) . ':00');
                if ($stored_timestamp < $cutoff_time) unset($limits[$key]);
            }
        }
        
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($limits));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
    
    // Wenn fopen fehlschlägt, trotzdem durchlassen, damit die App nicht crasht
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
        echo json_encode([
            "status" => "error",
            "message" => "Rate limit exceeded. Maximum {$max_requests_per_hour} requests per hour per IP.",
            "retry_after" => 3600
        ]);
        exit;
    }
}

// Write mode
$fp = fopen($file, 'c+');

if ($fp && flock($fp, LOCK_EX)) {
    $count = (int)stream_get_contents($fp);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        sleep(2); 
        $count += 1; 
    } elseif (isset($_GET['add'])) {
        $count += (int)$_GET['add'];
    }

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, (string)$count);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    // --- ISSUE #11: DATEN SPEICHERN ---
    $treeId = "TREE-" . strtoupper(bin2hex(random_bytes(4))) . "-" . strtoupper(bin2hex(random_bytes(3)));
    
    $existingRecords = [];
    if (file_exists($recordFile)) {
        $fileData = file_get_contents($recordFile);
        $existingRecords = json_decode($fileData, true) ?? [];
    }
    
    $userName = isset($_REQUEST['name']) ? htmlspecialchars($_REQUEST['name'], ENT_QUOTES, 'UTF-8') : 'Anonymous';
    $projectName = isset($_REQUEST['project']) ? htmlspecialchars($_REQUEST['project'], ENT_QUOTES, 'UTF-8') : 'Project';
    
    $newRecord = [
        'tree_id' => $treeId,
        'name'    => $userName,
        'project' => $projectName,
        'date'    => date('Y-m-d H:i:s')
    ];
    
    $existingRecords[] = $newRecord;
    file_put_contents($recordFile, json_encode($existingRecords, JSON_PRETTY_PRINT));
    // ----------------------------------

    echo json_encode([
        "status" => "success", 
        "success" => true,
        "message" => "Project validated! Tree planted.",
        "trees" => $count,
        "newCount" => $count,
        "treeId" => $treeId
    ]);
    exit;
}

echo json_encode(["status" => "error", "message" => "Server Dateisystem gesperrt."]);
?>