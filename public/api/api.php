<?php

$data_dir = __DIR__ . '/../data';

echo "<pre>";
echo "__DIR__: " . __DIR__ . PHP_EOL;
echo "data_dir: " . $data_dir . PHP_EOL;
echo "realpath: " . realpath($data_dir) . PHP_EOL;
echo "is_dir: ";
var_dump(is_dir($data_dir));
echo "is_writable: ";
var_dump(is_writable($data_dir));
exit;