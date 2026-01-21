<?php
// Database configuration
$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    // Ensure proper UTF-8 encoding for special characters like peso sign
    $pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (PDOException $e) {
    error_log('Member Management Database connection failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit();
}

// Conditionally require activity logger if it exists
if (file_exists('activity_logger.php')) {
    require 'activity_logger.php';
}

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Ensure PDO throws exceptions so we can return proper JSON errors
if (isset($pdo) && $pdo instanceof PDO) {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
}

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond($payload, $code = 200)
{
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

/**
 * Cleanup function to manage account verification lifecycle
 * 1. Changes pending accounts older than 7 days to rejected
 * 2. Deletes rejected accounts older than 1 month
 */
function cleanupAccountVerifications($pdo)
{
    try {
        // Set timezone to Philippines
        date_default_timezone_set('Asia/Manila');
        $pdo->exec("SET time_zone = '+08:00'");

        // Step 1: Change pending accounts older than 3 days to rejected
        $updatePendingStmt = $pdo->prepare("
            UPDATE `user` 
            SET account_status = 'rejected' 
            WHERE account_status = 'pending' 
            AND user_type_id = 4 
            AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)
        ");
        $updatePendingStmt->execute();
        $pendingRejectedCount = $updatePendingStmt->rowCount();

        // Log activity if accounts were rejected
        if ($pendingRejectedCount > 0 && function_exists('logStaffActivity')) {
            logStaffActivity(
                $pdo,
                null,
                "Auto-Reject Pending Accounts",
                "Automatically rejected $pendingRejectedCount pending account(s) that were older than 3 days",
                "Account Cleanup"
            );
        }

        // Step 2: Delete rejected accounts older than 1 month
        // First, get member details for logging before deletion
        $getRejectedStmt = $pdo->prepare("
            SELECT id, fname, lname, email 
            FROM `user` 
            WHERE account_status = 'rejected' 
            AND user_type_id = 4 
            AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)
        ");
        $getRejectedStmt->execute();
        $rejectedMembers = $getRejectedStmt->fetchAll();
        $rejectedCount = count($rejectedMembers);

        if ($rejectedCount > 0) {
            $pdo->beginTransaction();
            try {
                // Disable foreign key checks temporarily
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

                // Delete all related records for each rejected member
                foreach ($rejectedMembers as $member) {
                    $memberId = $member['id'];

                    // Delete related records (same as manual deletion)
                    try {
                        $deleteCoachAssignments = $pdo->prepare("DELETE FROM coach_member_list WHERE member_id = ?");
                        $deleteCoachAssignments->execute([$memberId]);
                    } catch (PDOException $e) {
                        error_log("Warning: Could not delete coach assignments for member $memberId: " . $e->getMessage());
                    }

                    try {
                        $deleteNotifications = $pdo->prepare("DELETE FROM notification WHERE user_id = ?");
                        $deleteNotifications->execute([$memberId]);
                    } catch (PDOException $e) {
                        error_log("Warning: Could not delete notifications for member $memberId: " . $e->getMessage());
                    }

                    try {
                        $deleteAttendance = $pdo->prepare("DELETE FROM attendance WHERE user_id = ?");
                        $deleteAttendance->execute([$memberId]);
                    } catch (PDOException $e) {
                        error_log("Warning: Could not delete attendance for member $memberId: " . $e->getMessage());
                    }

                    try {
                        $deleteSubscriptions = $pdo->prepare("DELETE FROM subscriptions WHERE user_id = ?");
                        $deleteSubscriptions->execute([$memberId]);
                    } catch (PDOException $e) {
                        error_log("Warning: Could not delete subscriptions for member $memberId: " . $e->getMessage());
                    }

                    try {
                        $deleteSales = $pdo->prepare("DELETE FROM sales WHERE user_id = ?");
                        $deleteSales->execute([$memberId]);
                    } catch (PDOException $e) {
                        error_log("Warning: Could not delete sales for member $memberId: " . $e->getMessage());
                    }

                    try {
                        $deletePayments = $pdo->prepare("DELETE FROM payments WHERE user_id = ?");
                        $deletePayments->execute([$memberId]);
                    } catch (PDOException $e) {
                        error_log("Warning: Could not delete payments for member $memberId: " . $e->getMessage());
                    }

                    try {
                        $deleteSchedules = $pdo->prepare("DELETE FROM member_schedules WHERE user_id = ?");
                        $deleteSchedules->execute([$memberId]);
                    } catch (PDOException $e) {
                        error_log("Warning: Could not delete member schedules for member $memberId: " . $e->getMessage());
                    }

                    try {
                        $deleteSessions = $pdo->prepare("DELETE FROM member_sessions WHERE user_id = ?");
                        $deleteSessions->execute([$memberId]);
                    } catch (PDOException $e) {
                        error_log("Warning: Could not delete member sessions for member $memberId: " . $e->getMessage());
                    }

                    try {
                        $deleteMember = $pdo->prepare("DELETE FROM members WHERE user_id = ?");
                        $deleteMember->execute([$memberId]);
                    } catch (PDOException $e) {
                        error_log("Warning: Could not delete from members table for member $memberId: " . $e->getMessage());
                    }
                }

                // Delete rejected users
                $deleteRejectedStmt = $pdo->prepare("
                    DELETE FROM `user` 
                    WHERE account_status = 'rejected' 
                    AND user_type_id = 4 
                    AND created_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)
                ");
                $deleteRejectedStmt->execute();
                $deletedCount = $deleteRejectedStmt->rowCount();

                // Re-enable foreign key checks
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

                $pdo->commit();

                // Log activity if accounts were deleted
                if ($deletedCount > 0 && function_exists('logStaffActivity')) {
                    logStaffActivity(
                        $pdo,
                        null,
                        "Auto-Delete Rejected Accounts",
                        "Automatically deleted $deletedCount rejected account(s) that were older than 1 month",
                        "Account Cleanup"
                    );
                }

                return [
                    'pending_rejected' => $pendingRejectedCount,
                    'rejected_deleted' => $deletedCount
                ];
            } catch (PDOException $e) {
                $pdo->rollBack();
                error_log("Failed to cleanup rejected accounts: " . $e->getMessage());
                throw $e;
            }
        }

        return [
            'pending_rejected' => $pendingRejectedCount,
            'rejected_deleted' => 0
        ];
    } catch (Exception $e) {
        error_log("Failed to cleanup account verifications: " . $e->getMessage());
        return [
            'pending_rejected' => 0,
            'rejected_deleted' => 0,
            'error' => $e->getMessage()
        ];
    }
}

try {
    // GET: all members (user_type_id = 4)
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['id'])) {
        // Run cleanup automatically when fetching members
        // This ensures pending accounts are rejected and old rejected accounts are deleted
        cleanupAccountVerifications($pdo);

        // Check if deactivation_reason column exists
        $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `user` LIKE 'deactivation_reason'");
        $hasDeactivationReason = $checkColumnStmt->rowCount() > 0;

        // Check if parent_consent_file_url column exists
        $checkParentConsentStmt = $pdo->query("SHOW COLUMNS FROM `user` LIKE 'parent_consent_file_url'");
        $hasParentConsent = $checkParentConsentStmt->rowCount() > 0;

        if ($hasDeactivationReason && $hasParentConsent) {
            $stmt = $pdo->query('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at, profile_photo_url, deactivation_reason, parent_consent_file_url FROM `user` WHERE user_type_id = 4 ORDER BY id DESC');
        } else if ($hasDeactivationReason) {
            $stmt = $pdo->query('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at, profile_photo_url, deactivation_reason FROM `user` WHERE user_type_id = 4 ORDER BY id DESC');
        } else if ($hasParentConsent) {
            $stmt = $pdo->query('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at, profile_photo_url, parent_consent_file_url FROM `user` WHERE user_type_id = 4 ORDER BY id DESC');
        } else {
            $stmt = $pdo->query('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at, profile_photo_url FROM `user` WHERE user_type_id = 4 ORDER BY id DESC');
        }
        $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
        respond($members);
    }

    // GET: single member by id
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
        // Check if deactivation_reason column exists
        $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `user` LIKE 'deactivation_reason'");
        $hasDeactivationReason = $checkColumnStmt->rowCount() > 0;

        // Check if parent_consent_file_url column exists
        $checkParentConsentStmt = $pdo->query("SHOW COLUMNS FROM `user` LIKE 'parent_consent_file_url'");
        $hasParentConsent = $checkParentConsentStmt->rowCount() > 0;

        if ($hasDeactivationReason && $hasParentConsent) {
            $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at, profile_photo_url, deactivation_reason, parent_consent_file_url FROM `user` WHERE id = ?');
        } else if ($hasDeactivationReason) {
            $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at, profile_photo_url, deactivation_reason FROM `user` WHERE id = ?');
        } else if ($hasParentConsent) {
            $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at, profile_photo_url, parent_consent_file_url FROM `user` WHERE id = ?');
        } else {
            $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, gender_id, bday, user_type_id, account_status, created_at, profile_photo_url FROM `user` WHERE id = ?');
        }
        $stmt->execute([$_GET['id']]);
        $member = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$member) {
            respond(['error' => 'Member not found'], 404);
        }
        respond($member);
    }

    // POST: add new member
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        try {
            // Handle both JSON and FormData (for file uploads)
            $input = [];
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

            // Check if this is a multipart/form-data request (FormData with file upload)
            if (strpos($contentType, 'multipart/form-data') !== false || !empty($_FILES)) {
                // FormData request - get data from $_POST
                $input = $_POST;
                error_log("POST Member Add - Detected FormData request");
            } else {
                // JSON request
                $rawInput = file_get_contents('php://input');
                $input = json_decode($rawInput, true);
                if (!$input && $rawInput !== '') {
                    error_log("POST Member Add - Failed to parse JSON: " . substr($rawInput, 0, 200));
                    respond(['error' => 'Invalid JSON'], 400);
                }
                error_log("POST Member Add - Detected JSON request");
            }

            // Log the input for debugging
            error_log("POST Member Add - Input received: " . json_encode($input));

            // Check required fields (mname and gender_id are now optional)
            foreach (['fname', 'lname', 'email', 'password', 'bday'] as $k) {
                if (!isset($input[$k]) || trim($input[$k]) === '') {
                    respond(['error' => 'Missing required fields: ' . $k], 400);
                }
            }

            // CRITICAL: Check if email already exists across ALL user types
            $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, user_type_id FROM `user` WHERE LOWER(email) = LOWER(?)');
            $stmt->execute([$input['email']]);
            $existingEmail = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existingEmail) {
                $userTypes = [1 => 'Admin', 2 => 'Staff', 3 => 'Coach', 4 => 'Member'];
                $userTypeLabels = [1 => 'an Admin account', 2 => 'a Staff account', 3 => 'a Coach account', 4 => 'a Member account'];
                $existingUserType = $userTypes[$existingEmail['user_type_id']] ?? 'Unknown';
                $existingUserTypeLabel = $userTypeLabels[$existingEmail['user_type_id']] ?? 'an account';
                $fullName = trim($existingEmail['fname'] . ' ' . ($existingEmail['mname'] ?? '') . ' ' . $existingEmail['lname']);
                respond([
                    'error' => 'Duplicate User Detected',
                    'message' => "This email address is already registered as {$existingUserTypeLabel}. A user with the name '{$fullName}' is already using this email ({$existingEmail['email']}). Please use a different email address.",
                    'duplicate_type' => 'email',
                    'existing_user' => $existingEmail
                ], 409);
            }

            // CRITICAL: Check if first name and last name combination already exists (case-insensitive)
            // This prevents duplicate accounts with the same name but different emails - only check members (user_type_id = 4)
            $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, user_type_id FROM `user` WHERE LOWER(TRIM(fname)) = LOWER(TRIM(?)) AND LOWER(TRIM(lname)) = LOWER(TRIM(?)) AND user_type_id = 4');
            $stmt->execute([$input['fname'], $input['lname']]);
            $existingName = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existingName) {
                $fullName = trim($existingName['fname'] . ' ' . ($existingName['mname'] ?? '') . ' ' . $existingName['lname']);
                respond([
                    'error' => 'Duplicate Name Combination',
                    'message' => "A client with the same first name and last name combination already exists in the system. The existing client '{$fullName}' (Email: {$existingName['email']}) is currently using this name combination. Please use a different name combination to create a new account.",
                    'duplicate_type' => 'name',
                    'existing_user' => $existingName
                ], 409);
            }

            // Set defaults for optional fields
            // Don't set default gender_id - allow it to be NULL if not provided
            $gender_id = isset($input['gender_id']) && $input['gender_id'] !== '' && $input['gender_id'] !== null ? intval($input['gender_id']) : null;
            $account_status = isset($input['account_status']) ? $input['account_status'] : 'approved';

            // Handle middle name - convert null/empty to empty string (database doesn't allow NULL)
            $mname = '';
            if (array_key_exists('mname', $input) && $input['mname'] !== null && $input['mname'] !== '') {
                $trimmed = trim($input['mname']);
                if ($trimmed !== '') {
                    $mname = $trimmed;
                }
            }

            error_log("POST Member Add - Processed values - fname: {$input['fname']}, mname: '{$mname}', lname: {$input['lname']}, email: {$input['email']}, gender_id: {$gender_id}");

            // Handle parent consent file upload for users under 18
            $parentConsentFileUrl = null;
            try {
                if (isset($_FILES['parent_consent_file'])) {
                    $fileError = $_FILES['parent_consent_file']['error'];
                    error_log("Parent consent file upload - Error code: $fileError");

                    if ($fileError === UPLOAD_ERR_OK) {
                        // Calculate age to verify upload is needed
                        $birthDate = new DateTime($input['bday']);
                        $today = new DateTime();
                        $age = $today->diff($birthDate)->y;

                        if ($age < 18) {
                            $uploadDir = 'uploads/consents/';
                            // Create directory if it doesn't exist
                            if (!file_exists($uploadDir)) {
                                if (!mkdir($uploadDir, 0755, true)) {
                                    error_log("Failed to create upload directory: $uploadDir");
                                    respond([
                                        'error' => 'Server configuration error',
                                        'message' => 'Failed to create upload directory. Please contact administrator.'
                                    ], 500);
                                }
                            }

                            $file = $_FILES['parent_consent_file'];
                            $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];

                            if (!in_array($fileExtension, $allowedExtensions)) {
                                respond([
                                    'error' => 'Invalid file type',
                                    'message' => 'Parent consent file must be an image file (JPG, PNG, or GIF).'
                                ], 400);
                            }

                            // Validate file size (max 5MB)
                            if ($file['size'] > 5 * 1024 * 1024) {
                                respond([
                                    'error' => 'File too large',
                                    'message' => 'Parent consent file must be smaller than 5MB.'
                                ], 400);
                            }

                            // Generate unique filename
                            $uniqueFilename = 'consent_' . time() . '_' . uniqid() . '.' . $fileExtension;
                            $uploadPath = $uploadDir . $uniqueFilename;

                            // Move uploaded file
                            if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
                                $parentConsentFileUrl = $uploadPath;
                                error_log("Parent consent file uploaded successfully: $uploadPath");
                            } else {
                                error_log("Failed to move uploaded file: " . $file['tmp_name'] . " to " . $uploadPath);
                                error_log("Upload directory exists: " . (file_exists($uploadDir) ? 'yes' : 'no'));
                                error_log("Upload directory writable: " . (is_writable($uploadDir) ? 'yes' : 'no'));
                                respond([
                                    'error' => 'File upload failed',
                                    'message' => 'Failed to save parent consent file. Please try again.'
                                ], 500);
                            }
                        }
                    } else {
                        // Handle upload errors
                        $errorMessages = [
                            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize directive',
                            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE directive',
                            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                            UPLOAD_ERR_EXTENSION => 'File upload stopped by extension'
                        ];
                        $errorMsg = $errorMessages[$fileError] ?? 'Unknown upload error';
                        error_log("File upload error: $errorMsg (code: $fileError)");
                        respond([
                            'error' => 'File upload error',
                            'message' => $errorMsg
                        ], 400);
                    }
                } else {
                    // Check if consent file is required (user under 18)
                    if (isset($input['bday'])) {
                        $birthDate = new DateTime($input['bday']);
                        $today = new DateTime();
                        $age = $today->diff($birthDate)->y;

                        if ($age < 18 && $age >= 13) {
                            respond([
                                'error' => 'Parent consent required',
                                'message' => 'Parent consent letter/waiver is required for users under 18 years old.'
                            ], 400);
                        }
                    }
                }
            } catch (Exception $e) {
                error_log("Error handling parent consent file: " . $e->getMessage());
                error_log("Stack trace: " . $e->getTraceAsString());
                respond([
                    'error' => 'File processing error',
                    'message' => 'An error occurred while processing the parent consent file: ' . $e->getMessage()
                ], 500);
            }

            // Check if parent_consent_file_url column exists
            $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `user` LIKE 'parent_consent_file_url'");
            $columnExists = $checkColumnStmt->rowCount() > 0;

            if ($columnExists) {
                $stmt = $pdo->prepare('INSERT INTO `user` (user_type_id, fname, mname, lname, email, password, gender_id, bday, failed_attempt, account_status, parent_consent_file_url) 
                                       VALUES (4, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)');
                $stmt->execute([
                    trim($input['fname']),
                    $mname, // Empty string instead of null
                    trim($input['lname']),
                    trim($input['email']),
                    password_hash($input['password'], PASSWORD_DEFAULT),
                    $gender_id,
                    $input['bday'],
                    $account_status,
                    $parentConsentFileUrl
                ]);
            } else {
                $stmt = $pdo->prepare('INSERT INTO `user` (user_type_id, fname, mname, lname, email, password, gender_id, bday, failed_attempt, account_status) 
                                       VALUES (4, ?, ?, ?, ?, ?, ?, ?, 0, ?)');
                $stmt->execute([
                    trim($input['fname']),
                    $mname, // Empty string instead of null
                    trim($input['lname']),
                    trim($input['email']),
                    password_hash($input['password'], PASSWORD_DEFAULT),
                    $gender_id,
                    $input['bday'],
                    $account_status
                ]);
            }

            $newId = $pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, gender_id, bday, account_status, created_at FROM `user` WHERE id = ?');
            $stmt->execute([$newId]);
            $newMember = $stmt->fetch(PDO::FETCH_ASSOC);

            // Log activity using centralized logger (same as monitor_subscription.php)
            $staffId = $input['staff_id'] ?? null;
            error_log("DEBUG Member Add - staffId: " . ($staffId ?? 'NULL') . " from request data");
            if (function_exists('logStaffActivity')) {
                logStaffActivity($pdo, $staffId, "Add Member", "New member added - {$input['fname']} {$input['lname']} ({$input['email']})", "Member Management");
            }

            respond(['message' => 'Member added successfully', 'member' => $newMember], 201);
        } catch (PDOException $e) {
            error_log("Database error in member_management.php POST: " . $e->getMessage());
            error_log("Error code: " . $e->getCode());
            error_log("Error info: " . print_r($e->errorInfo, true));
            respond([
                'error' => 'Database error',
                'message' => 'Failed to add member: ' . $e->getMessage(),
                'details' => $e->getMessage()
            ], 500);
        } catch (Exception $e) {
            error_log("Error in member_management.php POST: " . $e->getMessage());
            respond([
                'error' => 'Server error',
                'message' => 'Failed to add member: ' . $e->getMessage(),
                'details' => $e->getMessage()
            ], 500);
        }
    }

    // PUT: update member (either status-only or full update)
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $rawInput = file_get_contents('php://input');
        error_log("Raw Input: " . $rawInput);
        $input = json_decode($rawInput, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            respond(['error' => 'Invalid JSON format', 'details' => json_last_error_msg()], 400);
        }

        // Status-only update
        if (isset($input['id'], $input['account_status']) && !isset($input['fname'], $input['mname'], $input['lname'], $input['email'], $input['gender_id'], $input['bday'])) {
            try {
                error_log("DEBUG: Status-only update detected for ID: " . $input['id'] . ", Status: " . $input['account_status']);

                // Get member details for logging
                $stmt = $pdo->prepare('SELECT fname, lname FROM `user` WHERE id = ?');
                $stmt->execute([$input['id']]);
                $member = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$member) {
                    respond(['error' => 'Member not found'], 404);
                }

                // Check if deactivation_reason column exists
                try {
                    $checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `user` LIKE 'deactivation_reason'");
                    $hasDeactivationReason = $checkColumnStmt->rowCount() > 0;
                    error_log("DEBUG: deactivation_reason column exists: " . ($hasDeactivationReason ? 'yes' : 'no'));
                } catch (PDOException $e) {
                    error_log("Error checking deactivation_reason column: " . $e->getMessage());
                    $hasDeactivationReason = false;
                }

                // Handle deactivation reason
                $deactivationReason = null;
                if (isset($input['deactivation_reason']) && $input['deactivation_reason'] !== null) {
                    $trimmed = trim($input['deactivation_reason']);
                    $deactivationReason = $trimmed !== '' ? $trimmed : null;
                }

                // If reactivating (status is not deactivated), clear the reason
                if ($input['account_status'] !== 'deactivated') {
                    $deactivationReason = null;
                }

                error_log("DEBUG: deactivation_reason value: " . ($deactivationReason ?? 'NULL'));
                error_log("DEBUG: account_status: " . $input['account_status']);

                if ($hasDeactivationReason) {
                    // Update both account_status and deactivation_reason
                    $stmt = $pdo->prepare('UPDATE `user` SET account_status = ?, deactivation_reason = ? WHERE id = ?');
                    if ($deactivationReason === null) {
                        $stmt->bindValue(1, $input['account_status'], PDO::PARAM_STR);
                        $stmt->bindValue(2, null, PDO::PARAM_NULL);
                        $stmt->bindValue(3, $input['id'], PDO::PARAM_INT);
                        $stmt->execute();
                    } else {
                        $stmt->execute([$input['account_status'], $deactivationReason, $input['id']]);
                    }
                } else {
                    // Column doesn't exist yet, only update account_status
                    $stmt = $pdo->prepare('UPDATE `user` SET account_status = ? WHERE id = ?');
                    $stmt->execute([$input['account_status'], $input['id']]);
                }

                // Log activity using centralized logger (same as monitor_subscription.php)
                $staffId = $input['staff_id'] ?? null;
                $logMessage = "Member account {$input['account_status']}: {$member['fname']} {$member['lname']} (ID: {$input['id']})";
                if ($deactivationReason && $input['account_status'] === 'deactivated') {
                    $logMessage .= " - Reason: {$deactivationReason}";
                }
                error_log("DEBUG Member Status Update - staffId: " . ($staffId ?? 'NULL') . " from request data");
                if (function_exists('logStaffActivity')) {
                    logStaffActivity($pdo, $staffId, "Update Member Status", $logMessage, "Member Management");
                }

                respond(['message' => 'Account status updated successfully']);
            } catch (PDOException $e) {
                error_log("Database error in status update: " . $e->getMessage());
                error_log("Error code: " . $e->getCode());
                error_log("Error info: " . print_r($e->errorInfo, true));
                respond([
                    'error' => 'Database error',
                    'message' => 'Failed to update account status: ' . $e->getMessage(),
                    'details' => $e->getMessage()
                ], 500);
            } catch (Exception $e) {
                error_log("Error in status update: " . $e->getMessage());
                respond([
                    'error' => 'Server error',
                    'message' => 'Failed to update account status: ' . $e->getMessage(),
                    'details' => $e->getMessage()
                ], 500);
            }
        }

        // Full update requires core fields (mname, gender_id and account_status are not editable by admin)
        error_log("DEBUG: Full update detected. Input keys: " . implode(', ', array_keys($input)));
        // Check required fields (mname is optional)
        foreach (['id', 'fname', 'lname', 'email', 'bday'] as $k) {
            if (!isset($input[$k]) || ($k !== 'id' && trim($input[$k]) === '')) {
                error_log("DEBUG: Missing required field: " . $k);
                respond(['error' => 'Missing required fields: ' . $k], 400);
            }
        }

        // Check if email already exists (excluding current user)
        $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, user_type_id FROM `user` WHERE LOWER(email) = LOWER(?) AND id != ?');
        $stmt->execute([$input['email'], $input['id']]);
        $existingEmail = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existingEmail) {
            $userTypes = [1 => 'Admin', 2 => 'Staff', 3 => 'Coach', 4 => 'Member'];
            $userTypeLabels = [1 => 'an Admin account', 2 => 'a Staff account', 3 => 'a Coach account', 4 => 'a Member account'];
            $existingUserType = $userTypes[$existingEmail['user_type_id']] ?? 'Unknown';
            $existingUserTypeLabel = $userTypeLabels[$existingEmail['user_type_id']] ?? 'an account';
            $fullName = trim($existingEmail['fname'] . ' ' . ($existingEmail['mname'] ?? '') . ' ' . $existingEmail['lname']);
            respond([
                'error' => 'Duplicate User Detected',
                'message' => "This email address is already registered as {$existingUserTypeLabel}. A user with the name '{$fullName}' is already using this email ({$existingEmail['email']}). Please use a different email address.",
                'duplicate_type' => 'email',
                'existing_user' => $existingEmail
            ], 409);
        }

        // Check if name combination already exists (excluding current user) - only check members
        $stmt = $pdo->prepare('SELECT id, fname, mname, lname, email, user_type_id FROM `user` WHERE LOWER(TRIM(fname)) = LOWER(TRIM(?)) AND LOWER(TRIM(lname)) = LOWER(TRIM(?)) AND id != ? AND user_type_id = 4');
        $stmt->execute([$input['fname'], $input['lname'], $input['id']]);
        $existingName = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existingName) {
            $fullName = trim($existingName['fname'] . ' ' . ($existingName['mname'] ?? '') . ' ' . $existingName['lname']);
            respond([
                'error' => 'Duplicate Name Combination',
                'message' => "A member with the same first name and last name already exists in the system. The existing member '{$fullName}' (Email: {$existingName['email']}) is using this name combination. Please use a different name combination.",
                'duplicate_type' => 'name',
                'existing_user' => $existingName
            ], 409);
        }

        // Get existing gender_id from database
        $stmt = $pdo->prepare('SELECT gender_id FROM `user` WHERE id = ?');
        $stmt->execute([$input['id']]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        $gender_id = $existing['gender_id']; // Keep existing gender

        // Handle optional middle name - convert null/empty to empty string (database doesn't allow NULL)
        $mname = '';
        if (isset($input['mname']) && $input['mname'] !== null && $input['mname'] !== '') {
            $trimmed = trim($input['mname']);
            if ($trimmed !== '') {
                $mname = $trimmed;
            }
        }

        if (!empty($input['password'])) {
            $stmt = $pdo->prepare('UPDATE `user` SET fname = ?, mname = ?, lname = ?, email = ?, bday = ?, password = ? WHERE id = ?');
            $stmt->execute([
                trim($input['fname']),
                $mname, // Empty string if not provided
                trim($input['lname']),
                trim($input['email']),
                $input['bday'],
                password_hash($input['password'], PASSWORD_DEFAULT),
                $input['id']
            ]);
        } else {
            $stmt = $pdo->prepare('UPDATE `user` SET fname = ?, mname = ?, lname = ?, email = ?, bday = ? WHERE id = ?');
            $stmt->execute([
                trim($input['fname']),
                $mname, // Empty string if not provided
                trim($input['lname']),
                trim($input['email']),
                $input['bday'],
                $input['id']
            ]);
        }

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = $input['staff_id'] ?? null;
        error_log("DEBUG Member Update - staffId: " . ($staffId ?? 'NULL') . " from request data");
        if (function_exists('logStaffActivity')) {
            logStaffActivity($pdo, $staffId, "Update Member", "Member updated - {$input['fname']} {$input['lname']} (ID: {$input['id']})", "Member Management");
        }

        respond(['message' => 'Member updated successfully']);
    }

    // DELETE: delete member with proper foreign key handling
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        try {
            error_log("DELETE request received");
            // Handle both URL parameter (?id=15) and JSON input
            $memberId = null;

            if (isset($_GET['id'])) {
                // URL parameter format: DELETE /member_management.php?id=15
                $memberId = $_GET['id'];
            } else {
                // JSON input format
                $input = json_decode(file_get_contents('php://input'), true);
                if ($input && isset($input['id'])) {
                    $memberId = $input['id'];
                }
            }

            if (!$memberId || !is_numeric($memberId)) {
                respond(['error' => 'Invalid or missing member ID'], 400);
            }

            // Get member details for logging before deletion
            $stmt = $pdo->prepare('SELECT fname, lname FROM `user` WHERE id = ?');
            $stmt->execute([$memberId]);
            $member = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$member) {
                respond(['error' => 'Member not found'], 404);
            }

            $pdo->beginTransaction();

            try {
                // Disable foreign key checks temporarily
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

                // Delete all related records first (in correct order to avoid foreign key constraints)
                // Use try-catch for each deletion to handle cases where tables don't exist

                // 1. Delete coach assignments (if member was assigned to coaches)
                try {
                    $deleteCoachAssignments = $pdo->prepare("DELETE FROM coach_member_list WHERE member_id = ?");
                    $deleteCoachAssignments->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete coach assignments: " . $e->getMessage());
                }

                // 2. Delete notifications
                try {
                    $deleteNotifications = $pdo->prepare("DELETE FROM notification WHERE user_id = ?");
                    $deleteNotifications->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete notifications: " . $e->getMessage());
                }

                // 3. Delete attendance records
                try {
                    $deleteAttendance = $pdo->prepare("DELETE FROM attendance WHERE user_id = ?");
                    $deleteAttendance->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete attendance: " . $e->getMessage());
                }

                // 4. Delete subscription records
                try {
                    $deleteSubscriptions = $pdo->prepare("DELETE FROM subscriptions WHERE user_id = ?");
                    $deleteSubscriptions->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete subscriptions: " . $e->getMessage());
                }

                // 5. Delete sales records (if member made purchases)
                try {
                    $deleteSales = $pdo->prepare("DELETE FROM sales WHERE user_id = ?");
                    $deleteSales->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete sales: " . $e->getMessage());
                }

                // 6. Delete payment records
                try {
                    $deletePayments = $pdo->prepare("DELETE FROM payments WHERE user_id = ?");
                    $deletePayments->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete payments: " . $e->getMessage());
                }

                // 7. Delete member schedules
                try {
                    $deleteSchedules = $pdo->prepare("DELETE FROM member_schedules WHERE user_id = ?");
                    $deleteSchedules->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete member schedules: " . $e->getMessage());
                }

                // 8. Delete member sessions
                try {
                    $deleteSessions = $pdo->prepare("DELETE FROM member_sessions WHERE user_id = ?");
                    $deleteSessions->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete member sessions: " . $e->getMessage());
                }

                // 9. Delete from Members table (if it exists)
                try {
                    $deleteMember = $pdo->prepare("DELETE FROM members WHERE user_id = ?");
                    $deleteMember->execute([$memberId]);
                } catch (PDOException $e) {
                    error_log("Warning: Could not delete from members table: " . $e->getMessage());
                }

                // 10. Finally delete from User table
                $stmt = $pdo->prepare('DELETE FROM `user` WHERE id = ? AND user_type_id = 4');
                $stmt->execute([$memberId]);

                // Re-enable foreign key checks
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

                $pdo->commit();

                // Log activity using centralized logger (same as monitor_subscription.php)
                $staffId = isset($input['staff_id']) ? $input['staff_id'] : null;
                error_log("DEBUG Member Delete - staffId: " . ($staffId ?? 'NULL') . " from request data");
                if (function_exists('logStaffActivity')) {
                    logStaffActivity($pdo, $staffId, "Delete Member", "Member deleted - {$member['fname']} {$member['lname']} (ID: {$memberId})", "Member Management");
                }

                respond(['message' => 'Member and all related data deleted successfully']);

            } catch (PDOException $e) {
                $pdo->rollBack();
                error_log('Member deletion error: ' . $e->getMessage());
                error_log('Member deletion error code: ' . $e->getCode());
                error_log('Member deletion error info: ' . print_r($e->errorInfo, true));

                // Provide more specific error message based on error code
                $errorMessage = 'Failed to delete member. ';
                if ($e->getCode() == 23000) {
                    $errorMessage .= 'This member has related data that prevents deletion. All related records have been attempted to be removed.';
                } else {
                    $errorMessage .= 'Database error occurred during deletion.';
                }

                respond([
                    'error' => 'Database error: ' . $e->getMessage(),
                    'message' => $errorMessage,
                    'error_code' => $e->getCode()
                ], 500);
            }
        } catch (Exception $e) {
            error_log('DELETE section error: ' . $e->getMessage());
            respond(['error' => 'Unexpected error: ' . $e->getMessage()], 500);
        }
    }

    // If we reach here, it means the request didn't match any of the expected patterns
    error_log("DEBUG: PUT request didn't match expected patterns. Input: " . json_encode($input));
    respond(['error' => 'Invalid request format'], 400);

    respond(['error' => 'Method not allowed'], 405);
} catch (Throwable $e) {
    error_log('API error: ' . $e->getMessage());
    respond(['error' => 'Server error'], 500);
}
?>