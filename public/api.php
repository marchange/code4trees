<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$file = 'tree_count.txt';
$count = 0; 

// Create file with 0 if it doesn't exist
if (!file_exists($file)) {
    file_put_contents($file, '0');
}

// Read mode: just fetch the number (prevents the loop)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['add'])) {
    $count = (int)file_get_contents($file);
    echo json_encode(['trees' => $count]);
    exit;
}

// Write mode: securely update the number
$fp = fopen($file, 'c+');

// Lock the file to prevent overwrite glitches
if ($fp && flock($fp, LOCK_EX)) {
    $count = (int)stream_get_contents($fp);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        sleep(2); // Simulate AI check
        $count += 1; 
    } elseif (isset($_GET['add'])) {
        $count += (int)$_GET['add'];
    }

    // Save the new count
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, (string)$count);
    fflush($fp);
    
    // Release the lock
    flock($fp, LOCK_UN);
    fclose($fp);

    echo json_encode([
        "status" => "success", 
        "message" => "Project validated! Tree planted.",
        "trees" => $count,
        "newCount" => $count
    ]);
    exit;
}

// Fallback error
echo json_encode(["status" => "error", "message" => "Server busy."]);
?>