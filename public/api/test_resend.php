<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../vendor/autoload.php';

if (!class_exists('Resend')) {
    die("FEHLER: Resend-Klasse nicht gefunden. Paket fehlt im vendor-Ordner auf dem Server.");
}

echo "Resend-Klasse gefunden. Paket ist da.";