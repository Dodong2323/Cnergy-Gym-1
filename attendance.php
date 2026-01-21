<?php
// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

session_start();
require 'activity_logger.php';

// Helper function to get staff_id from multiple sources
function getStaffIdFromRequest($data = null)
{
    // First, try from request data
    if ($data && isset($data['staff_id']) && !empty($data['staff_id'])) {
        return $data['staff_id'];
    }

    // Second, try from session
    if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
        return $_SESSION['user_id'];
    }

    // Third, try from GET parameters
    if (isset($_GET['staff_id']) && !empty($_GET['staff_id'])) {
        return $_GET['staff_id'];
    }

    // Fourth, try from POST parameters
    if (isset($_POST['staff_id']) && !empty($_POST['staff_id'])) {
        return $_POST['staff_id'];
    }

    // Last resort: return null (will be logged as system)
    return null;
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

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
    // Set MySQL timezone to Philippines to match PHP timezone
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Handle method override for servers that don't properly detect HTTP methods
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Read the raw input once and store it
$rawInput = file_get_contents('php://input');

// Check for POST data in multiple ways (server compatibility)
$hasPostData = !empty($rawInput) ||
    !empty($_POST) ||
    isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false ||
    isset($_SERVER['HTTP_CONTENT_TYPE']) && strpos($_SERVER['HTTP_CONTENT_TYPE'], 'application/json') !== false;

// If we have POST data, treat as POST regardless of detected method
if ($hasPostData) {
    $method = 'POST';
}

// Handle method override headers
if (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
    $method = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'];
} elseif (isset($_POST['_method'])) {
    $method = $_POST['_method'];
} elseif (isset($_GET['_method'])) {
    $method = $_GET['_method'];
}

$action = $_GET['action'] ?? '';

error_log("Request method: " . $method);
error_log("Request action: " . $action);
error_log("SERVER REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
error_log("SERVER CONTENT_TYPE: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
error_log("SERVER HTTP_METHOD: " . ($_SERVER['HTTP_METHOD'] ?? 'not set'));

try {
    // Workaround for server that doesn't properly handle HTTP methods
    // Check if we have POST data first
    if ($hasPostData) {
        handlePostRequest($pdo, $rawInput);
    } else {
        // Handle as GET request
        handleGetRequest($pdo, $action);
    }
} catch (Throwable $e) {
    error_log("Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}

function handleGetRequest(PDO $pdo, string $action): void
{
    switch ($action) {
        case 'members':
            getMembers($pdo);
            break;
        case 'attendance':
            getAttendance($pdo);
            break;
        case 'denied_logs':
            getDeniedLogs($pdo);
            break;
        case 'qr_scan':
            // Handle QR scan via GET as workaround for server issues
            $qrData = $_GET['qr_data'] ?? '';
            if (empty($qrData)) {
                http_response_code(400);
                echo json_encode(['error' => 'QR data is required']);
                return;
            }
            handleQRScan($pdo, ['qr_data' => $qrData]);
            break;
        default:
            if (isset($_GET['members'])) {
                getMembers($pdo);
            } elseif (isset($_GET['view']) && $_GET['view'] === 'attendance') {
                getAttendance($pdo);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
            }
    }
}

function handlePostRequest(PDO $pdo, string $rawInput = ''): void
{
    // Use the raw input passed from main function, or read it if not provided
    if (empty($rawInput)) {
        $rawInput = file_get_contents('php://input');
    }

    error_log("Raw POST input: " . $rawInput);

    $input = json_decode($rawInput, true);
    if (!is_array($input)) {
        error_log("JSON decode failed: " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON input', 'raw_input' => $rawInput]);
        return;
    }

    $action = $input['action'] ?? 'checkin';
    error_log("POST action: " . $action);

    switch ($action) {
        case 'checkin':
            recordAttendance($pdo, $input);
            break;
        case 'checkout':
            checkoutAttendance($pdo, $input);
            break;
        case 'guest_checkout':
            checkoutGuestSession($pdo, $input);
            break;
        case 'qr_scan':
            handleQRScan($pdo, $input);
            break;
        default:
            if (isset($input['id']) || isset($input['user_id'])) {
                $input['user_id'] = $input['user_id'] ?? $input['id'];
                recordAttendance($pdo, $input);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action or missing user_id']);
            }
    }
}

function getMembers(PDO $pdo): void
{
    $sql = "SELECT u.id, u.fname, u.lname, u.email, ut.type_name AS user_type
            FROM `user` u
            JOIN `usertype` ut ON u.user_type_id = ut.id
            WHERE u.user_type_id IN (3, 4)
            ORDER BY u.fname, u.lname";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $members = $stmt->fetchAll();

    echo json_encode($members ?: []);
}

function getAttendance(PDO $pdo): void
{
    try {
        // Get date filter if provided
        $dateFilter = $_GET['date'] ?? '';
        $whereClause = '';
        $params = [];

        if (!empty($dateFilter)) {
            $whereClause = "WHERE DATE(a.check_in) = ?";
            $params[] = $dateFilter;
        }

        // Check if attendance table has subscription_id column
        $checkSubscriptionId = $pdo->query("SHOW COLUMNS FROM attendance LIKE 'subscription_id'");
        $hasSubscriptionId = $checkSubscriptionId->rowCount() > 0;

        // Get regular member attendance with plan information
        // Only users with monthly access (plan_id 2, 3, 5, 6) can have attendance
        if ($hasSubscriptionId) {
            // Use subscription_id if available to get the exact plan for this attendance
            // For subscription_id lookup, get plan regardless of status/expiration (we want the plan that was active when attendance was recorded)
            // For fallback, use current active subscription
            $memberSql = "SELECT a.id, a.user_id, a.check_in, a.check_out,
                                 CONCAT(u.fname, ' ', u.lname) AS name,
                                 u.email,
                                 'member' AS user_type,
                                 COALESCE(
                                     (SELECT p.plan_name 
                                      FROM subscription s
                                      JOIN member_subscription_plan p ON s.plan_id = p.id
                                      WHERE s.id = a.subscription_id
                                      LIMIT 1),
                                     (SELECT p.plan_name 
                                      FROM subscription s
                                      JOIN member_subscription_plan p ON s.plan_id = p.id
                                      WHERE s.user_id = u.id 
                                      AND s.status_id = 2 
                                      AND DATE(s.start_date) <= DATE(a.check_in)
                                      AND (s.end_date >= a.check_in OR DATE(s.end_date) >= DATE(a.check_in))
                                      AND s.plan_id IN (2, 3, 5, 6)
                                      ORDER BY 
                                        CASE 
                                            WHEN s.plan_id = 2 THEN 0  -- Premium (highest priority)
                                            WHEN s.plan_id = 3 THEN 1  -- Standard
                                            WHEN s.plan_id = 5 THEN 2  -- Other monthly plans
                                            WHEN s.plan_id = 6 THEN 3  -- Session (lowest priority)
                                            ELSE 4
                                        END,
                                        s.end_date DESC
                                      LIMIT 1)
                                 ) AS plan_name,
                                 COALESCE(
                                     (SELECT s.plan_id 
                                      FROM subscription s
                                      WHERE s.id = a.subscription_id
                                      LIMIT 1),
                                     (SELECT s.plan_id 
                                      FROM subscription s
                                      WHERE s.user_id = u.id 
                                      AND s.status_id = 2 
                                      AND DATE(s.start_date) <= DATE(a.check_in)
                                      AND (s.end_date >= a.check_in OR DATE(s.end_date) >= DATE(a.check_in))
                                      AND s.plan_id IN (2, 3, 5, 6)
                                      ORDER BY 
                                        CASE 
                                            WHEN s.plan_id = 2 THEN 0  -- Premium (highest priority)
                                            WHEN s.plan_id = 3 THEN 1  -- Standard
                                            WHEN s.plan_id = 5 THEN 2  -- Other monthly plans
                                            WHEN s.plan_id = 6 THEN 3  -- Session (lowest priority)
                                            ELSE 4
                                        END,
                                        s.end_date DESC
                                      LIMIT 1)
                                 ) AS plan_id,
                                 CASE WHEN a.check_out IS NOT NULL
                                      THEN TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out)
                                      ELSE NULL
                                 END AS duration_minutes
                          FROM `attendance` a
                          JOIN `user` u ON a.user_id = u.id
                          " . $whereClause . "
                          ORDER BY a.check_in DESC
                          LIMIT 50";
        } else {
            // Fallback to subscription that was active at check-in time (or currently active)
            // This ensures we get the correct plan even if it has expired
            $memberSql = "SELECT a.id, a.user_id, a.check_in, a.check_out,
                                 CONCAT(u.fname, ' ', u.lname) AS name,
                                 u.email,
                                 'member' AS user_type,
                                 (SELECT p.plan_name 
                                  FROM subscription s
                                  JOIN member_subscription_plan p ON s.plan_id = p.id
                                  WHERE s.user_id = u.id 
                                  AND s.status_id = 2 
                                  AND DATE(s.start_date) <= DATE(a.check_in)
                                  AND (s.end_date >= a.check_in OR DATE(s.end_date) >= DATE(a.check_in))
                                  AND s.plan_id IN (2, 3, 5, 6)
                                  ORDER BY 
                                    CASE 
                                        WHEN s.plan_id = 2 THEN 0  -- Premium (highest priority)
                                        WHEN s.plan_id = 3 THEN 1  -- Standard
                                        WHEN s.plan_id = 5 THEN 2  -- Other monthly plans
                                        WHEN s.plan_id = 6 THEN 3  -- Session (lowest priority)
                                        ELSE 4
                                    END,
                                    s.end_date DESC
                                  LIMIT 1) AS plan_name,
                                 (SELECT s.plan_id 
                                  FROM subscription s
                                  WHERE s.user_id = u.id 
                                  AND s.status_id = 2 
                                  AND DATE(s.start_date) <= DATE(a.check_in)
                                  AND (s.end_date >= a.check_in OR DATE(s.end_date) >= DATE(a.check_in))
                                  AND s.plan_id IN (2, 3, 5, 6)
                                  ORDER BY 
                                    CASE 
                                        WHEN s.plan_id = 2 THEN 0  -- Premium (highest priority)
                                        WHEN s.plan_id = 3 THEN 1  -- Standard
                                        WHEN s.plan_id = 5 THEN 2  -- Other monthly plans
                                        WHEN s.plan_id = 6 THEN 3  -- Session (lowest priority)
                                        ELSE 4
                                    END,
                                    s.end_date DESC
                                  LIMIT 1) AS plan_id,
                                 CASE WHEN a.check_out IS NOT NULL
                                      THEN TIMESTAMPDIFF(MINUTE, a.check_in, a.check_out)
                                      ELSE NULL
                                 END AS duration_minutes
                          FROM `attendance` a
                          JOIN `user` u ON a.user_id = u.id
                          " . $whereClause . "
                          ORDER BY a.check_in DESC
                          LIMIT 50";
        }

        $stmt = $pdo->prepare($memberSql);
        $stmt->execute($params);
        $memberAttendance = $stmt->fetchAll();

        // Debug: Log what we got from the query
        error_log("DEBUG - Member attendance count: " . count($memberAttendance));
        foreach (array_slice($memberAttendance, 0, 5) as $idx => $att) {
            error_log("DEBUG - Attendance $idx: User: " . ($att['name'] ?? 'N/A') . ", Plan ID: " . ($att['plan_id'] ?? 'NULL') . ", Plan Name: " . ($att['plan_name'] ?? 'NULL'));
        }

        // Auto-checkout expired guest sessions (valid_until < NOW() and checkout_time IS NULL)
        autoCheckoutExpiredGuests($pdo);

        // Get guest session attendance (approved and paid guests)
        // Check if checkout_time column exists in guest_session table
        $checkCheckoutTimeColumn = $pdo->query("SHOW COLUMNS FROM guest_session LIKE 'checkout_time'");
        $hasCheckoutTimeColumn = $checkCheckoutTimeColumn->rowCount() > 0;

        $guestWhereClause = "WHERE gs.status = 'approved' AND gs.paid = 1";
        $guestParams = [];

        if (!empty($dateFilter)) {
            $guestWhereClause .= " AND DATE(gs.created_at) = ?";
            $guestParams[] = $dateFilter;
        }

        // Use checkout_time if available, otherwise use valid_until for expired sessions
        if ($hasCheckoutTimeColumn) {
            $guestSql = "SELECT gs.id, gs.id AS user_id, gs.created_at AS check_in, 
                            COALESCE(gs.checkout_time, 
                                CASE WHEN gs.valid_until < NOW() THEN gs.valid_until ELSE NULL END
                            ) AS check_out,
                            gs.checkout_time AS actual_checkout_time,
                            gs.guest_name AS name,
                            CONCAT(gs.guest_name, ' (', gs.guest_type, ')') AS email,
                            'guest' AS user_type,
                            'Session' AS plan_name,
                            6 AS plan_id,
                            CASE 
                                WHEN gs.checkout_time IS NOT NULL 
                                THEN ABS(TIMESTAMPDIFF(MINUTE, gs.created_at, gs.checkout_time))
                                WHEN gs.valid_until < NOW() 
                                THEN ABS(TIMESTAMPDIFF(MINUTE, gs.created_at, gs.valid_until))
                                ELSE NULL
                            END AS duration_minutes
                     FROM `guest_session` gs
                     " . $guestWhereClause . "
                     ORDER BY gs.created_at DESC
                     LIMIT 50";
        } else {
            // Fallback if checkout_time column doesn't exist yet
            $guestSql = "SELECT gs.id, gs.id AS user_id, gs.created_at AS check_in, 
                            CASE WHEN gs.valid_until < NOW() THEN gs.valid_until ELSE NULL END AS check_out,
                            NULL AS actual_checkout_time,
                            gs.guest_name AS name,
                            CONCAT(gs.guest_name, ' (', gs.guest_type, ')') AS email,
                            'guest' AS user_type,
                            'Session' AS plan_name,
                            6 AS plan_id,
                            CASE WHEN gs.valid_until < NOW()
                                 THEN ABS(TIMESTAMPDIFF(MINUTE, gs.created_at, gs.valid_until))
                                 ELSE NULL
                            END AS duration_minutes
                     FROM `guest_session` gs
                     " . $guestWhereClause . "
                     ORDER BY gs.created_at DESC
                     LIMIT 50";
        }

        $stmt = $pdo->prepare($guestSql);
        $stmt->execute($guestParams);
        $guestAttendance = $stmt->fetchAll();

        // Combine and format all attendance
        $allAttendance = array_merge($memberAttendance, $guestAttendance);

        // Sort by check_in time (most recent first)
        usort($allAttendance, function ($a, $b) {
            return strtotime($b['check_in']) - strtotime($a['check_in']);
        });

        $formatted = array_map(function ($r) {
            $duration = null;
            if ($r['duration_minutes'] !== null) {
                // Ensure duration is always positive
                $durationMinutes = abs((int) $r['duration_minutes']);
                $hours = floor($durationMinutes / 60);
                $mins = $durationMinutes % 60;
                $duration = $hours > 0 ? "{$hours}h {$mins}m" : "{$mins}m";
            }

            // Helper function to format datetime from database (already in PH timezone)
            $formatDateTime = function ($datetimeStr) {
                if (!$datetimeStr || $datetimeStr === '0000-00-00 00:00:00') {
                    return null;
                }
                // Create DateTime object, treating the database value as PH timezone
                $dt = new DateTime($datetimeStr, new DateTimeZone('Asia/Manila'));
                return $dt->format('M j, Y g:i A');
            };

            $checkOut = null;
            if ($r['user_type'] === 'guest') {
                // For guests, check if they have checked out
                // Use actual_checkout_time if available (from checkout_time column), otherwise use check_out
                $actualCheckout = $r['actual_checkout_time'] ?? $r['check_out'];

                if ($actualCheckout) {
                    // Guest has checked out - show the checkout time
                    $checkOut = $formatDateTime($actualCheckout);
                } else {
                    // Guest hasn't checked out yet - check if session expired
                    if ($r['check_out']) {
                        $checkOutTime = new DateTime($r['check_out'], new DateTimeZone('Asia/Manila'));
                        if ($checkOutTime->getTimestamp() < time()) {
                            $checkOut = $formatDateTime($r['check_out']) . ' (Expired)';
                        } else {
                            $checkOut = "Still in gym (Guest)";
                        }
                    } else {
                        $checkOut = "Still in gym (Guest)";
                    }
                }
            } else {
                $checkOut = $r['check_out'] ? $formatDateTime($r['check_out']) : "Still in gym";
            }

            // Determine user type based on plan_name or plan_id
            // Plan ID 2 = Monthly with membership (Premium)
            // Plan ID 3 = Monthly standalone (Standard)
            // Plan IDs 5, 6 = Other monthly access plans (check plan_name)
            $planName = $r['plan_name'] ?? '';
            $planId = $r['plan_id'] ?? null;
            $planNameLower = strtolower($planName);

            // Debug logging for attendance type detection
            error_log("DEBUG Attendance Type Detection - User: " . ($r['name'] ?? 'N/A') . ", Plan ID: " . ($planId ?? 'NULL') . ", Plan Name: " . ($planName ?? 'NULL'));

            // Determine if premium, standard, or session
            $isPremium = false;
            $isStandard = false;
            $isSession = false;

            // Convert plan_id to integer for comparison
            $planIdInt = is_numeric($planId) ? intval($planId) : null;

            // Check if this is a Gym Session/Day Pass plan first (check plan_id first, then plan_name)
            if (
                $planIdInt === 6 ||
                strpos($planNameLower, 'walk in') !== false ||
                strpos($planNameLower, 'day pass') !== false ||
                strpos($planNameLower, 'gym session') !== false ||
                (strpos($planNameLower, 'session') !== false && $planIdInt !== 2 && $planIdInt !== 3)
            ) {
                $isSession = true;
                error_log("DEBUG - Set isSession = true for User: " . ($r['name'] ?? 'N/A') . ", Plan ID: $planIdInt, Plan Name: $planName");
            } elseif ($planIdInt === 2) {
                // Plan ID 2 is always premium (Monthly with membership)
                $isPremium = true;
                error_log("DEBUG - Set isPremium = true for User: " . ($r['name'] ?? 'N/A') . ", Plan ID: $planIdInt");
            } elseif ($planIdInt === 3) {
                // Plan ID 3 is always standard (Monthly standalone)
                $isStandard = true;
                error_log("DEBUG - Set isStandard = true for User: " . ($r['name'] ?? 'N/A') . ", Plan ID: $planIdInt");
            } elseif (!empty($planName)) {
                // For other plans (5, etc.), check plan_name
                // But make sure we don't override session detection
                if (!$isSession) {
                    if (strpos($planNameLower, 'premium') !== false) {
                        $isPremium = true;
                    } elseif (strpos($planNameLower, 'standard') !== false) {
                        $isStandard = true;
                    } else {
                        // Default: if plan_name contains "monthly" or "access", check if it has "with membership" (premium) or not (standard)
                        if (strpos($planNameLower, 'monthly') !== false || strpos($planNameLower, 'access') !== false) {
                            if (strpos($planNameLower, 'with membership') !== false || strpos($planNameLower, 'membership') !== false) {
                                $isPremium = true;
                            } else {
                                $isStandard = true;
                            }
                        }
                    }
                }
            }

            $result = [
                'id' => $r['id'],
                'name' => $r['name'],
                'check_in' => $r['check_in'] ? $formatDateTime($r['check_in']) : null,
                'check_out' => $checkOut,
                'user_id' => $r['user_id'],
                'email' => $r['email'],
                'duration' => $duration,
                'user_type' => $r['user_type'],
                'plan_name' => $planName,
                'plan_id' => $planId,
                'is_premium' => $isPremium,
                'is_standard' => $isStandard,
                'is_session' => $isSession,
            ];

            // Final debug log
            error_log("DEBUG - Final flags for User: " . ($r['name'] ?? 'N/A') . " - isSession: " . ($isSession ? 'true' : 'false') . ", isPremium: " . ($isPremium ? 'true' : 'false') . ", isStandard: " . ($isStandard ? 'true' : 'false'));

            return $result;
        }, $allAttendance);

        echo json_encode($formatted ?: []);
    } catch (Exception $e) {
        error_log('Error in getAttendance: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch attendance data: ' . $e->getMessage()]);
    }
}

function getDeniedLogs(PDO $pdo): void
{
    try {
        // Check if table exists
        try {
            $tableCheck = $pdo->query("SHOW TABLES LIKE 'attendance_denied_log'");
            if ($tableCheck && $tableCheck->rowCount() == 0) {
                // Table doesn't exist yet, return empty array
                echo json_encode([]);
                return;
            }
        } catch (Exception $e) {
            error_log("Error checking table existence: " . $e->getMessage());
            // Continue anyway - try to query the table
        }

        // Get date filter if provided
        $dateFilter = $_GET['date'] ?? '';
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100; // Default to 100 most recent
        
        // Ensure limit is positive and reasonable
        if ($limit < 1 || $limit > 1000) {
            $limit = 100;
        }
        
        $whereClause = '';
        $params = [];

        if (!empty($dateFilter)) {
            $whereClause = "WHERE DATE(adl.attempted_at) = ?";
            $params[] = $dateFilter;
        }

        // Fetch denied logs with user names - handle NULL values properly
        $sql = "
            SELECT 
                adl.id,
                adl.user_id,
                adl.guest_session_id,
                adl.denial_reason,
                adl.attempted_at,
                adl.expired_date,
                adl.plan_name,
                adl.message,
                adl.entry_method,
                CASE 
                    WHEN u.fname IS NOT NULL AND u.lname IS NOT NULL THEN CONCAT(COALESCE(u.fname, ''), ' ', COALESCE(u.lname, ''))
                    WHEN u.fname IS NOT NULL THEN COALESCE(u.fname, '')
                    WHEN u.lname IS NOT NULL THEN COALESCE(u.lname, '')
                    ELSE NULL
                END AS user_name
            FROM attendance_denied_log adl
            LEFT JOIN `user` u ON adl.user_id = u.id
            " . $whereClause . "
            ORDER BY adl.attempted_at DESC
            LIMIT " . (int)$limit . "
        ";

        $stmt = $pdo->prepare($sql);
        if (!empty($params)) {
            $stmt->execute($params);
        } else {
            $stmt->execute();
        }
        $logs = $stmt->fetchAll();

        // Format the response to match frontend expectations
        $formatted = [];
        foreach ($logs as $log) {
            // Use user_name from database, or fallback to extracting from message
            $memberName = $log['user_name'] ?? null;
            if (empty($memberName) || trim($memberName) === '') {
                // Try to extract name from message
                if (!empty($log['message']) && preg_match('/❌\s*([^-]+)\s*-/', $log['message'], $matches)) {
                    $memberName = trim($matches[1]);
                } elseif (!empty($log['user_id'])) {
                    $memberName = "Member ID: " . $log['user_id'];
                } else {
                    $memberName = 'Unknown';
                }
            }

            // Format message - remove emoji and clean up
            $message = $log['message'] ?? '';
            $message = str_replace('❌', '', $message);
            $message = trim($message);

            $formatted[] = [
                'id' => $log['id'] ?? null,
                'user_id' => $log['user_id'] ?? null,
                'timestamp' => $log['attempted_at'] ?? null,
                'type' => $log['denial_reason'] ?? 'unknown',
                'message' => $message,
                'memberName' => $memberName,
                'entryMethod' => $log['entry_method'] ?? 'unknown',
                'expired_date' => $log['expired_date'] ?? null,
                'plan_name' => $log['plan_name'] ?? null
            ];
        }

        echo json_encode($formatted);
    } catch (Exception $e) {
        error_log('Error in getDeniedLogs: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        error_log('File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch denied logs: ' . $e->getMessage()]);
    } catch (Throwable $e) {
        error_log('Fatal error in getDeniedLogs: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
        error_log('File: ' . $e->getFile() . ' Line: ' . $e->getLine());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch denied logs: ' . $e->getMessage()]);
    }
}

// Helper function to log denied attendance attempts
function logDeniedAttendance(PDO $pdo, int $userId, string $denialReason, array $extraData = [], string $entryMethod = 'unknown'): void
{
    try {
        // Check if table exists, if not create it
        $tableCheck = $pdo->query("SHOW TABLES LIKE 'attendance_denied_log'");
        if ($tableCheck->rowCount() == 0) {
            // Table doesn't exist, try to create it
            $createTableSql = "
                CREATE TABLE IF NOT EXISTS `attendance_denied_log` (
                  `id` int(11) NOT NULL AUTO_INCREMENT,
                  `user_id` int(11) DEFAULT NULL,
                  `guest_session_id` int(11) DEFAULT NULL,
                  `denial_reason` varchar(50) NOT NULL,
                  `attempted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  `expired_date` date DEFAULT NULL,
                  `plan_name` varchar(255) DEFAULT NULL,
                  `message` text DEFAULT NULL,
                  `entry_method` enum('qr','manual','unknown') DEFAULT 'unknown',
                  PRIMARY KEY (`id`),
                  KEY `idx_user_id` (`user_id`),
                  KEY `idx_denial_reason` (`denial_reason`),
                  KEY `idx_attempted_at` (`attempted_at`)
                ) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci
            ";
            $pdo->exec($createTableSql);
        }

        // Prepare data for insertion
        $expiredDate = null;
        $planName = null;
        $message = $extraData['message'] ?? null;

        if (isset($extraData['expired_date'])) {
            // Convert formatted date back to MySQL date format
            $expiredDateStr = $extraData['expired_date'];
            if ($expiredDateStr) {
                $dateObj = DateTime::createFromFormat('M j, Y', $expiredDateStr);
                if ($dateObj === false) {
                    // Try other formats
                    $dateObj = DateTime::createFromFormat('Y-m-d', $expiredDateStr);
                }
                if ($dateObj !== false) {
                    $expiredDate = $dateObj->format('Y-m-d');
                }
            }
        }

        if (isset($extraData['expired_date_db'])) {
            // Already in MySQL date format
            $expiredDate = $extraData['expired_date_db'];
        }

        $planName = $extraData['plan_name'] ?? null;

        // Insert log entry
        $logStmt = $pdo->prepare("
            INSERT INTO `attendance_denied_log` 
            (user_id, denial_reason, attempted_at, expired_date, plan_name, message, entry_method)
            VALUES (?, ?, NOW(), ?, ?, ?, ?)
        ");

        $logStmt->execute([
            $userId,
            $denialReason,
            $expiredDate,
            $planName,
            $message,
            $entryMethod
        ]);

        error_log("✅ Denied attendance logged: User ID {$userId}, Reason: {$denialReason}");
    } catch (Exception $e) {
        error_log("ERROR logging denied attendance: " . $e->getMessage());
        // Don't throw - logging failure shouldn't break the main flow
    }
}

function handleQRScan(PDO $pdo, array $input): void
{
    $qrData = $input['qr_data'] ?? $input['scanned_data'] ?? '';
    if ($qrData === '') {
        echo json_encode(['success' => false, 'message' => 'QR data is required']);
        return;
    }

    // Debug logging removed

    // Guest QR scanning removed - guests will be handled through admin approval workflow

    $userId = null;
    if (strpos($qrData, 'CNERGY_ATTENDANCE:') === 0) {
        $userId = str_replace('CNERGY_ATTENDANCE:', '', $qrData);
    } elseif (is_numeric($qrData)) {
        $userId = $qrData;
    } elseif (strpos($qrData, '|') !== false) {
        $userId = explode('|', $qrData)[0];
    } else {
        // Use the already decoded JSON if available, otherwise decode again
        if (!isset($decoded)) {
            $decoded = json_decode($qrData, true);
        }
        if (is_array($decoded)) {
            // Only extract user_id if it's not a guest session
            if (!isset($decoded['session_id']) && !isset($decoded['qr_token'])) {
                $userId = $decoded['id'] ?? $decoded['user_id'] ?? null;
            }
        }
    }

    if (!$userId || !is_numeric($userId)) {
        echo json_encode(['success' => false, 'message' => 'Invalid QR code format']);
        return;
    }

    $userStmt = $pdo->prepare("SELECT id, fname, lname FROM `user` WHERE id = ?");
    $userStmt->execute([(int) $userId]);
    $user = $userStmt->fetch();

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'User not found']);
        return;
    }

    // Check if user has an active gym access plan (IDs 2, 3, 5, 6)
    try {
        $planStmt = $pdo->prepare("
            SELECT s.id, s.plan_id, s.start_date, s.end_date, s.status_id,
                   p.plan_name, p.duration_months, p.duration_days
            FROM subscription s
            JOIN member_subscription_plan p ON s.plan_id = p.id
            WHERE s.user_id = ? 
            AND s.plan_id IN (2, 3, 5, 6)
            AND s.status_id = 2
            AND s.end_date > NOW()
            ORDER BY s.end_date DESC
            LIMIT 1
        ");
        $planStmt->execute([(int) $userId]);
        $activePlan = $planStmt->fetch();

        // Debug logging
        error_log("DEBUG: User ID: " . (int) $userId);
        error_log("DEBUG: Active plan found: " . ($activePlan ? 'YES' : 'NO'));
        if ($activePlan) {
            error_log("DEBUG: Plan details - ID: " . $activePlan['id'] . ", Plan ID: " . $activePlan['plan_id'] . ", Status: " . $activePlan['status_id'] . ", End Date: " . $activePlan['end_date']);
        }
    } catch (Exception $e) {
        error_log("ERROR in plan validation query: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Database error during plan validation: ' . $e->getMessage()]);
        return;
    }

    if (!$activePlan) {
        // Check if user has any expired plans to show expiration info
        try {
            $expiredPlanStmt = $pdo->prepare("
                SELECT s.end_date, p.plan_name
                FROM subscription s
                JOIN member_subscription_plan p ON s.plan_id = p.id
                WHERE s.user_id = ? 
                AND s.plan_id IN (2, 3, 5, 6)
                AND s.status_id = 2
                ORDER BY s.end_date DESC
                LIMIT 1
            ");
            $expiredPlanStmt->execute([(int) $userId]);
            $expiredPlan = $expiredPlanStmt->fetch();
        } catch (Exception $e) {
            error_log("ERROR in expired plan query: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => 'Database error during expired plan check']);
            return;
        }

        // Determine entry method (qr_scan is always QR, others are manual)
        $entryMethod = isset($input['action']) && $input['action'] === 'qr_scan' ? 'qr' : 'manual';

        if ($expiredPlan) {
            $expiredDate = date('M j, Y', strtotime($expiredPlan['end_date']));
            $denialMessage = "❌ {$user['fname']} {$user['lname']} - Gym access expired on {$expiredDate}";
            
            // Log denied attendance
            logDeniedAttendance($pdo, (int) $userId, 'expired_plan', [
                'message' => $denialMessage,
                'expired_date' => $expiredDate,
                'expired_date_db' => $expiredPlan['end_date'],
                'plan_name' => $expiredPlan['plan_name']
            ], $entryMethod);
            
            echo json_encode([
                'success' => false,
                'message' => $denialMessage,
                'type' => 'expired_plan',
                'user_name' => $user['fname'] . ' ' . $user['lname'],
                'expired_date' => $expiredDate,
                'plan_name' => $expiredPlan['plan_name']
            ]);
        } else {
            $denialMessage = "❌ {$user['fname']} {$user['lname']} - No active gym access plan found";
            
            // Log denied attendance
            logDeniedAttendance($pdo, (int) $userId, 'no_plan', [
                'message' => $denialMessage
            ], $entryMethod);
            
            echo json_encode([
                'success' => false,
                'message' => $denialMessage,
                'type' => 'no_plan',
                'user_name' => $user['fname'] . ' ' . $user['lname']
            ]);
        }
        return;
    }

    // First, check for any active sessions and clean up duplicates
    $allActiveStmt = $pdo->prepare("SELECT id, check_in FROM `attendance` WHERE user_id = ? AND check_out IS NULL ORDER BY check_in DESC");
    $allActiveStmt->execute([(int) $userId]);
    $allActiveSessions = $allActiveStmt->fetchAll();

    error_log("DEBUG: Found " . count($allActiveSessions) . " active sessions for user " . $userId);

    // If multiple active sessions exist, close all but the most recent one
    if (count($allActiveSessions) > 1) {
        error_log("DEBUG: Multiple active sessions found, cleaning up duplicates");
        $mostRecentSession = $allActiveSessions[0]; // Most recent is first due to ORDER BY check_in DESC

        // Close all sessions except the most recent one
        for ($i = 1; $i < count($allActiveSessions); $i++) {
            $duplicateId = $allActiveSessions[$i]['id'];
            // Use PHP date() to ensure correct timezone (Asia/Manila)
            $currentDateTime = date('Y-m-d H:i:s');
            $closeStmt = $pdo->prepare("UPDATE `attendance` SET check_out = ? WHERE id = ?");
            $closeStmt->execute([$currentDateTime, $duplicateId]);
            error_log("DEBUG: Closed duplicate session ID: " . $duplicateId);
        }

        $activeSession = $mostRecentSession;
    } elseif (count($allActiveSessions) == 1) {
        $activeSession = $allActiveSessions[0];
    } else {
        $activeSession = null;
    }

    // Also clean up any completed duplicate records (same check-in time)
    if ($activeSession) {
        $sessionTime = $activeSession['check_in'];
        $cleanupStmt = $pdo->prepare("
            SELECT id FROM `attendance` 
            WHERE user_id = ? 
            AND check_in = ? 
            AND check_out IS NOT NULL 
            AND id != ?
            ORDER BY id ASC
        ");
        $cleanupStmt->execute([(int) $userId, $sessionTime, $activeSession['id']]);
        $duplicateCompleted = $cleanupStmt->fetchAll();

        if (count($duplicateCompleted) > 0) {
            error_log("DEBUG: Found " . count($duplicateCompleted) . " completed duplicate records, cleaning up");
            foreach ($duplicateCompleted as $dup) {
                $deleteStmt = $pdo->prepare("DELETE FROM `attendance` WHERE id = ?");
                $deleteStmt->execute([$dup['id']]);
                error_log("DEBUG: Deleted duplicate completed record ID: " . $dup['id']);
            }
        }
    }

    // Debug logging
    error_log("DEBUG: Active session found: " . ($activeSession ? 'YES' : 'NO'));
    if ($activeSession) {
        error_log("DEBUG: Active session ID: " . $activeSession['id'] . ", Check-in: " . $activeSession['check_in']);
    }

    if ($activeSession) {
        $sessionDate = date('Y-m-d', strtotime($activeSession['check_in']));
        $currentDate = date('Y-m-d');
        $checkInTime = strtotime($activeSession['check_in']);
        $currentTime = time();
        $timeDifference = $currentTime - $checkInTime;

        error_log("DEBUG: Session date: " . $sessionDate . ", Current date: " . $currentDate);
        error_log("DEBUG: Session date < current date: " . ($sessionDate < $currentDate ? 'YES' : 'NO'));
        error_log("DEBUG: Time since check-in: " . $timeDifference . " seconds");

        if ($sessionDate < $currentDate) {
            // Auto checkout old session only (don't create new checkin)
            $updateStmt = $pdo->prepare("UPDATE `attendance` SET check_out = ? WHERE id = ?");
            $oldCheckoutTime = date('Y-m-d 23:59:59', strtotime($sessionDate));
            $updateStmt->execute([$oldCheckoutTime, $activeSession['id']]);

            $durationStmt = $pdo->prepare("SELECT TIMESTAMPDIFF(MINUTE, check_in, check_out) AS duration_minutes FROM `attendance` WHERE id = ?");
            $durationStmt->execute([$activeSession['id']]);
            $durationResult = $durationStmt->fetch();
            $minsTotal = (int) $durationResult['duration_minutes'];
            $duration_hours = floor($minsTotal / 60);
            $duration_mins = $minsTotal % 60;
            $formatted_duration = $duration_hours > 0 ? "{$duration_hours}h {$duration_mins}m" : "{$duration_mins}m";

            // Log activity using centralized logger (same as monitor_subscription.php)
            $staffId = getStaffIdFromRequest($input);
            logStaffActivity($pdo, $staffId, "Auto Checkout", "Member {$user['fname']} {$user['lname']} auto checked out from " . date('M j', strtotime($sessionDate)) . " ({$formatted_duration})", "Attendance");

            echo json_encode([
                'success' => true,
                'action' => 'auto_checkout',
                'message' => $user['fname'] . ' ' . $user['lname'] . ' - Auto checked out from ' . date('M j', strtotime($sessionDate)) . ' (' . $formatted_duration . '). Please scan again to check in for today.',
                'user_name' => $user['fname'] . ' ' . $user['lname'],
                'old_session_date' => date('M j, Y', strtotime($sessionDate)),
                'old_session_duration' => $formatted_duration,
                'plan_info' => [
                    'plan_name' => $activePlan['plan_name'],
                    'expires_on' => date('M j, Y', strtotime($activePlan['end_date'])),
                    'days_remaining' => max(0, floor((strtotime($activePlan['end_date']) - time()) / (60 * 60 * 24)))
                ]
            ]);
        } else {
            // Check 30-second cooldown for checkout
            if ($timeDifference < 30) {
                $remainingTime = 30 - $timeDifference;
                error_log("DEBUG: Checkout cooldown active - " . $remainingTime . " seconds remaining");
                echo json_encode([
                    'success' => false,
                    'message' => "⏰ Please wait {$remainingTime} seconds before checking out",
                    'type' => 'cooldown',
                    'remaining_seconds' => $remainingTime
                ]);
                return;
            }

            error_log("DEBUG: Performing checkout for today's session");
            // Use PHP date() to ensure correct timezone (Asia/Manila) - capture before update
            $currentDateTime = date('Y-m-d H:i:s');
            $checkoutTimeFormatted = date('M j, Y g:i A');

            $updateStmt = $pdo->prepare("UPDATE `attendance` SET check_out = ? WHERE id = ?");
            $updateStmt->execute([$currentDateTime, $activeSession['id']]);

            $durationStmt = $pdo->prepare("SELECT TIMESTAMPDIFF(MINUTE, check_in, check_out) AS duration_minutes FROM `attendance` WHERE id = ?");
            $durationStmt->execute([$activeSession['id']]);
            $durationResult = $durationStmt->fetch();
            $minsTotal = (int) $durationResult['duration_minutes'];
            $duration_hours = floor($minsTotal / 60);
            $duration_mins = $minsTotal % 60;
            $formatted_duration = $duration_hours > 0 ? "{$duration_hours}h {$duration_mins}m" : "{$duration_mins}m";

            // Log activity using centralized logger (same as monitor_subscription.php)
            $staffId = getStaffIdFromRequest($input);
            logStaffActivity($pdo, $staffId, "Member Checkout", "Member {$user['fname']} {$user['lname']} checked out successfully! Session: {$formatted_duration}", "Attendance");

            echo json_encode([
                'success' => true,
                'action' => 'auto_checkout',
                'message' => $user['fname'] . ' ' . $user['lname'] . ' checked out successfully! Session: ' . $formatted_duration,
                'user_name' => $user['fname'] . ' ' . $user['lname'],
                'check_out' => $checkoutTimeFormatted,
                'check_out_time' => $checkoutTimeFormatted,
                'checkout_time' => $checkoutTimeFormatted,
                'duration' => $formatted_duration,
                'plan_info' => [
                    'plan_name' => $activePlan['plan_name'],
                    'expires_on' => date('M j, Y', strtotime($activePlan['end_date'])),
                    'days_remaining' => max(0, floor((strtotime($activePlan['end_date']) - time()) / (60 * 60 * 24)))
                ]
            ]);
        }
    } else {
        error_log("DEBUG: No active session found, checking if user already attended today");

        // Check if user already has attendance record for today (one per day limit)
        $todayAttendanceStmt = $pdo->prepare("
            SELECT id, check_in, check_out 
            FROM `attendance` 
            WHERE user_id = ? 
            AND DATE(check_in) = CURDATE()
            ORDER BY check_in DESC 
            LIMIT 1
        ");
        $todayAttendanceStmt->execute([(int) $userId]);
        $todayAttendance = $todayAttendanceStmt->fetch();

        if ($todayAttendance) {
            if ($todayAttendance['check_out'] === null) {
                // User has active session for today but it wasn't detected above (race condition)
                error_log("DEBUG: User has active session for today but wasn't detected, aborting");
                echo json_encode([
                    'success' => false,
                    'message' => 'You already have an active session for today',
                    'type' => 'already_checked_in'
                ]);
                return;
            } else {
                // User already completed attendance for today
                $checkOutTime = date('M j, Y g:i A', strtotime($todayAttendance['check_out']));
                error_log("DEBUG: User already attended today, completed at: " . $checkOutTime);
                echo json_encode([
                    'success' => false,
                    'message' => "You have already completed your attendance for today (checked out at {$checkOutTime})",
                    'type' => 'already_attended_today',
                    'check_out_time' => $checkOutTime
                ]);
                return;
            }
        }

        // Double-check that no active session exists (race condition protection)
        $finalCheckStmt = $pdo->prepare("SELECT id FROM `attendance` WHERE user_id = ? AND check_out IS NULL LIMIT 1");
        $finalCheckStmt->execute([(int) $userId]);
        $finalCheck = $finalCheckStmt->fetch();

        if ($finalCheck) {
            error_log("DEBUG: Race condition detected - active session found during final check, aborting new checkin");
            echo json_encode([
                'success' => false,
                'message' => 'Session conflict detected. Please try again.',
                'type' => 'session_conflict'
            ]);
            return;
        }

        // Use PHP date() to ensure correct timezone (Asia/Manila)
        $currentDateTime = date('Y-m-d H:i:s');
        
        // Check if attendance table has subscription_id column
        $checkSubscriptionId = $pdo->query("SHOW COLUMNS FROM attendance LIKE 'subscription_id'");
        $hasSubscriptionId = $checkSubscriptionId->rowCount() > 0;
        
        // Store subscription_id if available to ensure correct plan type detection
        if ($hasSubscriptionId && isset($activePlan['id'])) {
            $insertStmt = $pdo->prepare("INSERT INTO `attendance` (user_id, check_in, subscription_id) VALUES (?, ?, ?)");
            $insertStmt->execute([(int) $userId, $currentDateTime, (int) $activePlan['id']]);
        } else {
            $insertStmt = $pdo->prepare("INSERT INTO `attendance` (user_id, check_in) VALUES (?, ?)");
            $insertStmt->execute([(int) $userId, $currentDateTime]);
        }
        $attendanceId = $pdo->lastInsertId();

        // Log activity using centralized logger (same as monitor_subscription.php)
        $staffId = getStaffIdFromRequest($input);
        logStaffActivity($pdo, $staffId, "Member Checkin", "Member {$user['fname']} {$user['lname']} checked in successfully!", "Attendance");

        echo json_encode([
            'success' => true,
            'action' => 'checkin',
            'message' => $user['fname'] . ' ' . $user['lname'] . ' checked in successfully!',
            'attendance_id' => $attendanceId,
            'user_name' => $user['fname'] . ' ' . $user['lname'],
            'check_in' => date('M j, Y g:i A'),
            'plan_info' => [
                'plan_name' => $activePlan['plan_name'],
                'expires_on' => date('M j, Y', strtotime($activePlan['end_date'])),
                'days_remaining' => max(0, floor((strtotime($activePlan['end_date']) - time()) / (60 * 60 * 24)))
            ]
        ]);
    }
}

function recordAttendance(PDO $pdo, array $input): void
{
    $userId = $input['user_id'] ?? null;
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        return;
    }

    $userStmt = $pdo->prepare("SELECT id, fname, lname FROM `user` WHERE id = ?");
    $userStmt->execute([(int) $userId]);
    $user = $userStmt->fetch();
    if (!$user) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User not found']);
        return;
    }

    $activeStmt = $pdo->prepare("SELECT id FROM `attendance` WHERE user_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1");
    $activeStmt->execute([(int) $userId]);
    if ($activeStmt->fetch()) {
        echo json_encode(['success' => false, 'message' => $user['fname'] . ' ' . $user['lname'] . ' is already checked in']);
        return;
    }

    // Get active subscription to store subscription_id for correct plan type detection
    $activePlan = null;
    try {
        $planStmt = $pdo->prepare("
            SELECT s.id, s.plan_id, s.start_date, s.end_date, s.status_id,
                   p.plan_name
            FROM subscription s
            JOIN member_subscription_plan p ON s.plan_id = p.id
            WHERE s.user_id = ? 
            AND s.plan_id IN (2, 3, 5, 6)
            AND s.status_id = 2
            AND s.end_date > NOW()
            ORDER BY s.end_date DESC
            LIMIT 1
        ");
        $planStmt->execute([(int) $userId]);
        $activePlan = $planStmt->fetch();
    } catch (Exception $e) {
        error_log("ERROR in plan lookup for manual attendance: " . $e->getMessage());
        // Continue without subscription_id if lookup fails
    }

    // Use PHP date() to ensure correct timezone (Asia/Manila)
    $currentDateTime = date('Y-m-d H:i:s');
    
    // Check if attendance table has subscription_id column
    $checkSubscriptionId = $pdo->query("SHOW COLUMNS FROM attendance LIKE 'subscription_id'");
    $hasSubscriptionId = $checkSubscriptionId->rowCount() > 0;
    
    // Store subscription_id if available to ensure correct plan type detection
    if ($hasSubscriptionId && $activePlan && isset($activePlan['id'])) {
        $insertStmt = $pdo->prepare("INSERT INTO `attendance` (user_id, check_in, subscription_id) VALUES (?, ?, ?)");
        $insertStmt->execute([(int) $userId, $currentDateTime, (int) $activePlan['id']]);
    } else {
        $insertStmt = $pdo->prepare("INSERT INTO `attendance` (user_id, check_in) VALUES (?, ?)");
        $insertStmt->execute([(int) $userId, $currentDateTime]);
    }
    $attendanceId = $pdo->lastInsertId();

    // Log activity using centralized logger (same as monitor_subscription.php)
    $staffId = getStaffIdFromRequest($input);
    logStaffActivity($pdo, $staffId, "Record Attendance", "Attendance recorded for member {$user['fname']} {$user['lname']}", "Attendance");

    echo json_encode([
        'success' => true,
        'message' => 'Attendance recorded successfully',
        'attendance_id' => $attendanceId,
        'user_name' => $user['fname'] . ' ' . $user['lname'],
        'check_in' => date('M j, Y g:i A')
    ]);
}

function checkoutAttendance(PDO $pdo, array $input): void
{
    $userId = $input['user_id'] ?? null;
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'User ID is required']);
        return;
    }

    $activeStmt = $pdo->prepare("SELECT id FROM `attendance` WHERE user_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1");
    $activeStmt->execute([(int) $userId]);
    $activeSession = $activeStmt->fetch();
    if (!$activeSession) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'No active session found for this user']);
        return;
    }

    // Use PHP date() to ensure correct timezone (Asia/Manila) - capture before update
    $currentDateTime = date('Y-m-d H:i:s');
    $checkoutTimeFormatted = date('M j, Y g:i A');

    $updateStmt = $pdo->prepare("UPDATE `attendance` SET check_out = ? WHERE id = ?");
    $updateStmt->execute([$currentDateTime, $activeSession['id']]);

    $userStmt = $pdo->prepare("SELECT fname, lname FROM `user` WHERE id = ?");
    $userStmt->execute([(int) $userId]);
    $user = $userStmt->fetch();

    // Log activity using centralized logger (same as monitor_subscription.php)
    $staffId = getStaffIdFromRequest($input);
    logStaffActivity($pdo, $staffId, "Record Checkout", "Checkout recorded for member {$user['fname']} {$user['lname']}", "Attendance");

    echo json_encode([
        'success' => true,
        'message' => 'Checkout recorded successfully',
        'user_name' => $user['fname'] . ' ' . $user['lname'],
        'check_out' => $checkoutTimeFormatted,
        'check_out_time' => $checkoutTimeFormatted,
        'checkout_time' => $checkoutTimeFormatted
    ]);
}

function checkoutGuestSession(PDO $pdo, array $input): void
{
    $sessionId = $input['session_id'] ?? $input['guest_session_id'] ?? null;
    if (!$sessionId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Guest session ID is required']);
        return;
    }

    // Check if checkout_time column exists, if not, add it
    $checkCheckoutTimeColumn = $pdo->query("SHOW COLUMNS FROM guest_session LIKE 'checkout_time'");
    $hasCheckoutTimeColumn = $checkCheckoutTimeColumn->rowCount() > 0;

    if (!$hasCheckoutTimeColumn) {
        try {
            $pdo->exec("ALTER TABLE `guest_session` ADD COLUMN `checkout_time` DATETIME NULL AFTER `valid_until`");
            error_log("Added checkout_time column to guest_session table");
        } catch (Exception $e) {
            error_log("Failed to add checkout_time column: " . $e->getMessage());
        }
    }

    // Get guest session details
    $sessionStmt = $pdo->prepare("SELECT id, guest_name, created_at, checkout_time FROM `guest_session` WHERE id = ? AND status = 'approved' AND paid = 1");
    $sessionStmt->execute([(int) $sessionId]);
    $session = $sessionStmt->fetch();

    if (!$session) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Guest session not found or not active']);
        return;
    }

    // Check if already checked out
    if ($session['checkout_time']) {
        $checkoutTimeFormatted = date('M j, Y g:i A', strtotime($session['checkout_time']));
        echo json_encode([
            'success' => false,
            'message' => 'Guest session already checked out',
            'checkout_time' => $checkoutTimeFormatted
        ]);
        return;
    }

    // Use PHP date() to ensure correct timezone (Asia/Manila)
    $currentDateTime = date('Y-m-d H:i:s');
    $checkoutTimeFormatted = date('M j, Y g:i A');

    // Update guest session with checkout time
    $updateStmt = $pdo->prepare("UPDATE `guest_session` SET checkout_time = ? WHERE id = ?");
    $updateStmt->execute([$currentDateTime, (int) $sessionId]);

    // Calculate duration
    $checkInTime = new DateTime($session['created_at'], new DateTimeZone('Asia/Manila'));
    $checkOutTime = new DateTime($currentDateTime, new DateTimeZone('Asia/Manila'));
    $duration = $checkInTime->diff($checkOutTime);
    $totalMinutes = ($duration->days * 24 * 60) + ($duration->h * 60) + $duration->i;
    $hours = floor($totalMinutes / 60);
    $mins = $totalMinutes % 60;
    $formattedDuration = $hours > 0 ? "{$hours}h {$mins}m" : "{$mins}m";

    // Log activity using centralized logger
    $staffId = getStaffIdFromRequest($input);
    logStaffActivity($pdo, $staffId, "Guest Checkout", "Guest session checkout: {$session['guest_name']} (ID: $sessionId) - Duration: {$formattedDuration}", "Attendance");

    echo json_encode([
        'success' => true,
        'message' => 'Guest checkout recorded successfully',
        'guest_name' => $session['guest_name'],
        'check_out' => $checkoutTimeFormatted,
        'check_out_time' => $checkoutTimeFormatted,
        'checkout_time' => $checkoutTimeFormatted,
        'duration' => $formattedDuration,
        'duration_minutes' => $totalMinutes
    ]);
}

// Auto-checkout expired guest sessions at 9 PM PH time
function autoCheckoutExpiredGuests(PDO $pdo): void
{
    try {
        // Check if checkout_time column exists, if not, add it
        $checkCheckoutTimeColumn = $pdo->query("SHOW COLUMNS FROM guest_session LIKE 'checkout_time'");
        $hasCheckoutTimeColumn = $checkCheckoutTimeColumn->rowCount() > 0;

        if (!$hasCheckoutTimeColumn) {
            try {
                $pdo->exec("ALTER TABLE `guest_session` ADD COLUMN `checkout_time` DATETIME NULL AFTER `valid_until`");
                error_log("Added checkout_time column to guest_session table");
            } catch (Exception $e) {
                error_log("Failed to add checkout_time column: " . $e->getMessage());
                return; // Can't proceed without the column
            }
        }

        // Find all expired guest sessions that haven't been checked out yet
        // Check if it's past 9 PM on the day of creation (regardless of valid_until)
        // This handles old sessions that were created with +24 hours instead of 9 PM same day
        // A guest session expires at 9 PM on the day it was created
        $stmt = $pdo->prepare("
            SELECT id, guest_name, valid_until, created_at, checkout_time
            FROM `guest_session`
            WHERE status = 'approved' 
            AND paid = 1
            AND checkout_time IS NULL
            AND (
                -- If created today and it's past 9 PM
                (DATE(created_at) = CURDATE() AND TIME(NOW()) >= '21:00:00')
                OR
                -- If created on a previous day, it's definitely expired
                (DATE(created_at) < CURDATE())
                OR
                -- Also check valid_until as fallback
                (valid_until < NOW())
            )
        ");
        $stmt->execute();
        $expiredSessions = $stmt->fetchAll();

        if (empty($expiredSessions)) {
            error_log("autoCheckoutExpiredGuests: No expired sessions found");
            return; // No expired sessions to check out
        }

        error_log("autoCheckoutExpiredGuests: Found " . count($expiredSessions) . " expired session(s) to check out");

        $checkedOutCount = 0;

        foreach ($expiredSessions as $session) {
            // Calculate the correct checkout time (9 PM on the day of creation)
            $createdAt = new DateTime($session['created_at'], new DateTimeZone('Asia/Manila'));
            $checkoutTimeObj = clone $createdAt;
            $checkoutTimeObj->setTime(21, 0, 0); // Set to 9 PM (21:00)
            
            // If created after 9 PM, it should expire at 9 PM next day
            if ($createdAt->format('H:i') >= '21:00') {
                $checkoutTimeObj->modify('+1 day');
            }
            
            $checkoutTime = $checkoutTimeObj->format('Y-m-d H:i:s');
            
            error_log("autoCheckoutExpiredGuests: Checking out guest {$session['guest_name']} (ID: {$session['id']}) - Created: {$session['created_at']}, Checkout: {$checkoutTime}");

            // Update guest_session checkout_time
            $updateStmt = $pdo->prepare("
                UPDATE `guest_session` 
                SET checkout_time = ? 
                WHERE id = ?
            ");
            $updateStmt->execute([$checkoutTime, $session['id']]);

            // Also update attendance table if there's an active attendance record
            // Find attendance records for this guest session (using guest_session id as user_id)
            $attendanceStmt = $pdo->prepare("
                UPDATE `attendance`
                SET check_out = ?
                WHERE user_id = ?
                AND check_out IS NULL
                AND DATE(check_in) = DATE(?)
            ");
            $attendanceStmt->execute([$checkoutTime, $session['id'], $session['created_at']]);

            $checkedOutCount++;

            // Log activity
            $checkInTime = new DateTime($session['created_at'], new DateTimeZone('Asia/Manila'));
            $checkOutTimeObj = new DateTime($checkoutTime, new DateTimeZone('Asia/Manila'));
            $duration = $checkInTime->diff($checkOutTimeObj);
            $totalMinutes = ($duration->days * 24 * 60) + ($duration->h * 60) + $duration->i;
            $hours = floor($totalMinutes / 60);
            $mins = $totalMinutes % 60;
            $formattedDuration = $hours > 0 ? "{$hours}h {$mins}m" : "{$mins}m";

            logStaffActivity($pdo, null, "Auto Checkout", "Guest session auto checked out: {$session['guest_name']} (ID: {$session['id']}) - Expired at 9 PM - Duration: {$formattedDuration}", "Attendance");
        }

        if ($checkedOutCount > 0) {
            error_log("Auto-checked out {$checkedOutCount} expired guest session(s)");
        }

    } catch (Exception $e) {
        error_log("Error in autoCheckoutExpiredGuests: " . $e->getMessage());
    }
}

// Guest session QR scanning function removed - guests will be handled through admin approval workflow
Ay6ttttttttt;l