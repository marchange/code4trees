<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$file = '../tree_count.txt';

if (!file_exists($file)) {
    file_put_contents($file, '0');
}

// 1. Read mode: Just fetch the number (No locking needed, fast response)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($_GET)) {
    echo json_encode(['trees' => (int)file_get_contents($file)]);
    exit;
}

// 2. Write mode: Handle random adds or zip uploads securely
$fp = fopen($file, 'c+');

if ($fp && flock($fp, LOCK_EX)) {
    $count = (int)stream_get_contents($fp);

    $input = json_decode(file_get_contents('php://input'), true);

    // Scenario A: Random POST increment from the JS background loop
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($input['add'])) {
        $count += (int)$input['add'];
    } 
    // Scenario B: Real student Zip Upload
    elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['zipfile'])) {
        sleep(2); // Simulate AI
        $count += 1; 
    } 
    // Scenario C: Old GET fallback (?add=1)
    elseif (isset($_GET['add'])) {
        $count += (int)$_GET['add'];
    }

    // Save
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, (string)$count);
    fflush($fp);
    
    flock($fp, LOCK_UN);
    fclose($fp);

    echo json_encode(["status" => "success", "trees" => $count, "newCount" => $count]);
    exit;
}

echo json_encode(["status" => "error", "message" => "Server busy."]);
?>