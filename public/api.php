<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$file = '../tree_count.txt';
$rate_limit_file = '../rate_limits.json';
$count = 0; 

// Rate limiting configuration
$max_requests_per_hour = 10; // Max 10 requests per IP per hour danke alex 
$current_ip = $_SERVER['REMOTE_ADDR'];
$current_hour = date('Y-m-d-H'); // Hour identifier (e.g., "2024-01-15-14")

// Create file with 0 if it doesn't exist
if (!file_exists($file)) {
    file_put_contents($file, '0');
}

// Initialize rate limit file if it doesn't exist
if (!file_exists($rate_limit_file)) {
    file_put_contents($rate_limit_file, json_encode([]));
}

/**
 * Check and update rate limit for the current IP
 * Returns true if request is allowed, false if rate limit exceeded
 */
function check_rate_limit($ip, $hour, $max_requests, $rate_limit_file) {
    $fp = fopen($rate_limit_file, 'c+');
    
    if ($fp && flock($fp, LOCK_EX)) {
        $content = stream_get_contents($fp);
        $limits = json_decode($content, true) ?: [];
        
        $ip_hour_key = "{$ip}:{$hour}";
        
        // Get current count for this IP in this hour
        $current_count = $limits[$ip_hour_key] ?? 0;
        
        if ($current_count >= $max_requests) {
            // Rate limit exceeded
            flock($fp, LOCK_UN);
            fclose($fp);
            return false;
        }
        
        // Increment the count
        $limits[$ip_hour_key] = $current_count + 1;
        
        // Clean up old entries (older than 24 hours) to prevent unbounded growth
        $current_time = time();
        $cutoff_time = $current_time - (24 * 3600);
        foreach ($limits as $key => $value) {
            // Parse the timestamp if available, or use a simple cleanup
            if (strpos($key, ':') !== false) {
                list($stored_ip, $stored_hour) = explode(':', $key);
                $stored_timestamp = strtotime(str_replace('-', ' ', $stored_hour) . ':00');
                if ($stored_timestamp < $cutoff_time) {
                    unset($limits[$key]);
                }
            }
        }
        
        // Save updated limits
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($limits));
        fflush($fp);
        
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    }
    
    return false;
}

// Read mode: just fetch the number (prevents the loop)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['add'])) {
    $count = (int)file_get_contents($file);
    echo json_encode(['trees' => $count]);
    exit;
}

// Check rate limit before allowing write operations
if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['add'])) {
    if (!check_rate_limit($current_ip, $current_hour, $max_requests_per_hour, $rate_limit_file)) {
        http_response_code(429); // Too Many Requests
        echo json_encode([
            "status" => "error",
            "message" => "Rate limit exceeded. Maximum {$max_requests_per_hour} requests per hour per IP.",
            "retry_after" => 3600
        ]);
        exit;
    }
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
