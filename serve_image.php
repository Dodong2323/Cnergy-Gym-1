<?php
// Image serving script with CORS headers
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    'https://www.cnergy.site',
    'https://cnergy.site',
    'https://api.cnergy.site',
    'http://localhost:3000',
    'http://localhost:53262',
    'http://127.0.0.1:53262',
    'http://localhost:56395', // Flutter web development port
    'http://127.0.0.1:56395',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
];

if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    // Fallback for development
    header("Access-Control-Allow-Origin: *");
}

header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400'); // Cache preflight for 24 hours

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Get the image path from query parameter
$imagePath = $_GET['path'] ?? '';

if (empty($imagePath)) {
    http_response_code(400);
    echo json_encode(['error' => 'Image path is required']);
    exit;
}

// Decode URL-encoded path (handles paths like uploads%2Fprofile%2Ffile.jpg)
$decodedPath = urldecode($imagePath);
// Normalize path separators
$decodedPath = str_replace('\\', '/', $decodedPath);

// Security: Only allow images from uploads directory
$allowedDirectories = [
    'uploads/merchandise/',
    'uploads/announcements/',
    'uploads/promotions/',
    'uploads/avatars/',  // Allow profile photos (avatars)
    'uploads/profile/',  // Allow profile photos (profile directory)
    'uploads/consents/'  // Allow parent consent documents
];
$isAllowed = false;

foreach ($allowedDirectories as $dir) {
    if (strpos($decodedPath, $dir) === 0) {
        $isAllowed = true;
        break;
    }
}

if (!$isAllowed) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied to this directory', 'path' => $decodedPath]);
    exit;
}

// Prevent directory traversal attacks
if (strpos($decodedPath, '..') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

// Construct full file path
$fullPath = __DIR__ . '/' . $decodedPath;

// Check if file exists
if (!file_exists($fullPath)) {
    http_response_code(404);
    echo json_encode(['error' => 'Image not found']);
    exit;
}

// Get file info
$fileInfo = pathinfo($fullPath);
$extension = strtolower($fileInfo['extension'] ?? '');

// Only allow image files
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
if (!in_array($extension, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type']);
    exit;
}

// Set appropriate content type
$contentTypes = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'gif' => 'image/gif',
    'webp' => 'image/webp'
];

$contentType = $contentTypes[$extension] ?? 'application/octet-stream';
header('Content-Type: ' . $contentType);

// Set cache headers for better performance
header('Cache-Control: public, max-age=31536000'); // Cache for 1 year
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT');

// Output the file
readfile($fullPath);
?>