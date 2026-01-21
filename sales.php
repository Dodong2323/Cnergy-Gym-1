<?php
// Set timezone to Philippines
date_default_timezone_set('Asia/Manila');

session_start();
require 'activity_logger.php';

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(204);
	exit;
}

$host = "localhost";
$dbname = "u773938685_cnergydb";
$username = "u773938685_archh29";
$password = "Gwapoko385@";

try {
	$pdo = new PDO(
		"mysql:host=$host;dbname=$dbname;charset=utf8mb4",
		$username,
		$password,
		[
			PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
			PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
		]
	);
	// Ensure proper UTF-8 encoding for special characters like peso sign
	$pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
	// Set MySQL timezone to Philippines
	$pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
	http_response_code(500);
	echo json_encode(["error" => "Database connection failed"]);
	exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

// Debug logging for staff_id
error_log("DEBUG Sales API - Method: $method, Action: $action");
error_log("DEBUG Sales API - GET staff_id: " . ($_GET['staff_id'] ?? 'NULL'));
error_log("DEBUG Sales API - POST data: " . json_encode($data));
error_log("DEBUG Sales API - data[staff_id]: " . ($data['staff_id'] ?? 'NULL'));

try {
	switch ($method) {
		case 'GET':
			handleGetRequest($pdo, $action);
			break;
		case 'POST':
			handlePostRequest($pdo, $action, $data);
			break;
		case 'PUT':
			handlePutRequest($pdo, $action, $data);
			break;
		case 'DELETE':
			handleDeleteRequest($pdo, $action, $data);
			break;
		default:
			http_response_code(405);
			echo json_encode(["error" => "Invalid request method"]);
			break;
	}
} catch (PDOException $e) {
	http_response_code(500);
	echo json_encode(["error" => "Database error occurred: " . $e->getMessage()]);
}

function handleGetRequest($pdo, $action)
{
	switch ($action) {
		case 'products':
			getProductsData($pdo);
			break;
		case 'sales':
			getSalesData($pdo);
			break;
		case 'analytics':
			getAnalyticsData($pdo);
			break;
		case 'coach_sales':
			getCoachSales($pdo);
			break;
		default:
			getAllData($pdo);
			break;
	}
}

function handlePostRequest($pdo, $action, $data)
{
	switch ($action) {
		case 'sale':
			createSale($pdo, $data);
			break;
		case 'product':
			addProduct($pdo, $data);
			break;
		case 'pos_sale':
			createPOSSale($pdo, $data);
			break;
		case 'confirm_transaction':
			confirmTransaction($pdo, $data);
			break;
		case 'edit_transaction':
			editTransaction($pdo, $data);
			break;
		default:
			http_response_code(400);
			echo json_encode(["error" => "Invalid action for POST request"]);
			break;
	}
}

function handlePutRequest($pdo, $action, $data)
{
	switch ($action) {
		case 'stock':
			updateProductStock($pdo, $data);
			break;
		case 'product':
			updateProduct($pdo, $data);
			break;
		case 'restore':
			restoreProduct($pdo, $data);
			break;
		default:
			http_response_code(400);
			echo json_encode(["error" => "Invalid action for PUT request"]);
			break;
	}
}

function handleDeleteRequest($pdo, $action, $data)
{
	switch ($action) {
		case 'product':
			archiveProduct($pdo, $data);
			break;
		default:
			http_response_code(400);
			echo json_encode(["error" => "Invalid action for DELETE request"]);
			break;
	}
}


function getProductsData($pdo)
{
	// Check if viewing archived products
	$showArchived = isset($_GET['archived']) && $_GET['archived'] == '1';

	// Check if is_archived column exists
	try {
		$checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `product` LIKE 'is_archived'");
		$hasArchivedColumn = $checkColumnStmt->rowCount() > 0;
	} catch (Exception $e) {
		$hasArchivedColumn = false;
	}

	if ($hasArchivedColumn) {
		if ($showArchived) {
			// Show only archived products
			$stmt = $pdo->prepare("
				SELECT id, name, price, stock, category, is_archived
				FROM product
				WHERE is_archived = 1
				ORDER BY category, name ASC
			");
		} else {
			// Show only non-archived products (default)
			$stmt = $pdo->prepare("
				SELECT id, name, price, stock, category, COALESCE(is_archived, 0) as is_archived
				FROM product
				WHERE COALESCE(is_archived, 0) = 0
				ORDER BY category, name ASC
			");
		}
		$stmt->execute();
		$products = $stmt->fetchAll(PDO::FETCH_ASSOC);
	} else {
		// If column doesn't exist yet, show all products
		$stmt = $pdo->query("
			SELECT id, name, price, stock, category, 0 as is_archived
			FROM product
			ORDER BY category, name ASC
		");
		$products = $stmt->fetchAll(PDO::FETCH_ASSOC);
	}

	// Convert to proper types
	foreach ($products as &$product) {
		$product['id'] = (int) $product['id'];
		$product['price'] = (float) $product['price'];
		$product['stock'] = (int) $product['stock'];
		$product['is_archived'] = isset($product['is_archived']) ? (int) $product['is_archived'] : 0;
	}

	echo json_encode(["products" => $products]);
}

function getSalesData($pdo)
{
	$saleType = $_GET['sale_type'] ?? '';
	$dateFilter = $_GET['date_filter'] ?? '';
	$month = $_GET['month'] ?? '';
	$year = $_GET['year'] ?? '';
	$customDate = $_GET['custom_date'] ?? '';
	$startDate = $_GET['start_date'] ?? '';
	$endDate = $_GET['end_date'] ?? '';

	// Build WHERE conditions
	$whereConditions = [];
	$params = [];

	if ($saleType && $saleType !== 'all') {
		$whereConditions[] = "s.sale_type = ?";
		$params[] = $saleType;
	}

	// Handle date range first (highest priority)
	if ($startDate || $endDate) {
		if ($startDate) {
			$whereConditions[] = "DATE(s.sale_date) >= ?";
			$params[] = $startDate;
		}
		if ($endDate) {
			$whereConditions[] = "DATE(s.sale_date) <= ?";
			$params[] = $endDate;
		}
	} elseif ($customDate) {
		// Handle custom date (single date)
		$whereConditions[] = "DATE(s.sale_date) = ?";
		$params[] = $customDate;
	} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
		// Specific month and year
		$whereConditions[] = "MONTH(s.sale_date) = ? AND YEAR(s.sale_date) = ?";
		$params[] = $month;
		$params[] = $year;
	} elseif ($month && $month !== 'all') {
		// Specific month (current year)
		$whereConditions[] = "MONTH(s.sale_date) = ? AND YEAR(s.sale_date) = YEAR(CURDATE())";
		$params[] = $month;
	} elseif ($year && $year !== 'all') {
		// Specific year
		$whereConditions[] = "YEAR(s.sale_date) = ?";
		$params[] = $year;
	} elseif ($dateFilter && $dateFilter !== 'all') {
		// Default date filters
		switch ($dateFilter) {
			case 'today':
				$whereConditions[] = "DATE(s.sale_date) = CURDATE()";
				break;
			case 'week':
				$whereConditions[] = "s.sale_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
				break;
			case 'month':
				$whereConditions[] = "MONTH(s.sale_date) = MONTH(CURDATE()) AND YEAR(s.sale_date) = YEAR(CURDATE())";
				break;
			case 'year':
				$whereConditions[] = "YEAR(s.sale_date) = YEAR(CURDATE())";
				break;
		}
	}

	$whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

	// CRITICAL: Get guest sessions directly from guest_session table (like monitoring subscription does)
	// Then match them with sales records OR create sales-like records from guest_session
	// ALWAYS include guest sales - they represent "Gym Session" plan sales and should appear
	// alongside subscription sales when filtering by plan
	$guestSalesData = [];
	// Always include guest sales - they are part of "Gym Session" plan sales
	$shouldIncludeGuestSales = true;

	error_log("DEBUG sales_api: shouldIncludeGuestSales = " . ($shouldIncludeGuestSales ? 'true' : 'false') . ", saleType = " . ($saleType ?: 'empty'));

	if ($shouldIncludeGuestSales) {
		try {
			// Build date conditions for guest_session query (same as sales filters)
			$guestDateConditions = [];
			$guestParams = [];

			// Handle date range first (highest priority)
			if ($startDate || $endDate) {
				if ($startDate) {
					$guestDateConditions[] = "DATE(gs.created_at) >= ?";
					$guestParams[] = $startDate;
				}
				if ($endDate) {
					$guestDateConditions[] = "DATE(gs.created_at) <= ?";
					$guestParams[] = $endDate;
				}
			} elseif ($customDate) {
				$guestDateConditions[] = "DATE(gs.created_at) = ?";
				$guestParams[] = $customDate;
			} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
				$guestDateConditions[] = "MONTH(gs.created_at) = ? AND YEAR(gs.created_at) = ?";
				$guestParams[] = $month;
				$guestParams[] = $year;
			} elseif ($month && $month !== 'all') {
				$guestDateConditions[] = "MONTH(gs.created_at) = ? AND YEAR(gs.created_at) = YEAR(CURDATE())";
				$guestParams[] = $month;
			} elseif ($year && $year !== 'all') {
				$guestDateConditions[] = "YEAR(gs.created_at) = ?";
				$guestParams[] = $year;
			} elseif ($dateFilter && $dateFilter !== 'all') {
				switch ($dateFilter) {
					case 'today':
						$guestDateConditions[] = "DATE(gs.created_at) = CURDATE()";
						break;
					case 'week':
						$guestDateConditions[] = "gs.created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
						break;
					case 'month':
						$guestDateConditions[] = "MONTH(gs.created_at) = MONTH(CURDATE()) AND YEAR(gs.created_at) = YEAR(CURDATE())";
						break;
					case 'year':
						$guestDateConditions[] = "YEAR(gs.created_at) = YEAR(CURDATE())";
						break;
				}
			}

			// Query guest sessions - only check if paid = 1
			// A sale is a sale if payment was received, regardless of status (approved, expired, etc.)
			// Excludes pending/pending_payment automatically (they have paid = 0)
			$guestWhereConditions = [
				"gs.paid = 1"
			];
			if (!empty($guestDateConditions)) {
				$guestWhereConditions = array_merge($guestWhereConditions, $guestDateConditions);
			}
			$guestWhereClause = "WHERE " . implode(" AND ", $guestWhereConditions);

			// Query ALL guest sessions where paid = 1 - they should ALL appear in sales
			// This ensures every guest session that was paid for shows up in sales, regardless of status
			$guestStmt = $pdo->prepare("
				SELECT 
					gs.id as guest_session_id,
					gs.guest_name,
					gs.amount_paid,
					gs.created_at,
					gs.receipt_number,
					gs.payment_method,
					gs.cashier_id,
					gs.change_given,
					gs.status,
					gs.paid,
					gs.reference_number,
					s.id as sale_id,
					s.sale_date,
					s.total_amount as sale_total_amount,
					s.transaction_status,
					s.notes,
					s.reference_number as sales_reference_number
				FROM guest_session gs
				LEFT JOIN sales s ON (
					s.receipt_number = gs.receipt_number 
					AND s.sale_type = 'Guest'
				)
				$guestWhereClause
				ORDER BY gs.created_at DESC
			");
			$guestStmt->execute($guestParams);
			$guestSessions = $guestStmt->fetchAll();

			error_log("DEBUG sales_api: Found " . count($guestSessions) . " guest sessions from database (status=approved, paid=1)");

			// Transform guest sessions into sales-like records
			// EVERY approved and paid guest session should appear as a sale
			foreach ($guestSessions as $guest) {
				// Use sale_date from sales table if exists, otherwise use created_at from guest_session
				$saleDate = $guest['sale_date'] ?? $guest['created_at'];
				// Use actual sale_id if exists, otherwise create a unique ID that won't conflict
				// Use negative ID to avoid conflicts with real sale IDs
				// Format: 999999999 - guest_session_id ensures uniqueness
				$saleId = $guest['sale_id'] ?? (999999999 - (int) $guest['guest_session_id']);
				$totalAmount = $guest['sale_total_amount'] ?? $guest['amount_paid'];

				// Ensure we have valid data - skip if missing critical info
				if (empty($guest['guest_name']) || empty($totalAmount) || $totalAmount <= 0) {
					error_log("DEBUG sales_api: Skipping invalid guest session ID " . $guest['guest_session_id'] . " - name: " . ($guest['guest_name'] ?? 'empty') . ", amount: " . ($totalAmount ?? 'empty'));
					continue;
				}

				// For guest sales, use "Guest Walk In" as plan name (not "Day Pass")
				// Guest sales should have plan_id = 6 to match subscription sales for filtering
				$gymSessionPlanName = 'Guest Walk In'; // Guest sales use this plan name
				$gymSessionPlanId = 6; // Use same plan_id as subscription sales for filtering
				$gymSessionPlanPrice = 150; // Default price

				// Get the price from database if available (for consistency)
				try {
					$planStmt = $pdo->prepare("
						SELECT id, plan_name, price
						FROM member_subscription_plan
						WHERE id = 6
						LIMIT 1
					");
					$planStmt->execute();
					$planResult = $planStmt->fetch();
					if ($planResult && !empty($planResult['price'])) {
						$gymSessionPlanPrice = (float) $planResult['price'];
					}
				} catch (Exception $e) {
					// Use default price if query fails
				}

				// Normalize payment method: digital -> gcash
				$paymentMethod = strtolower($guest['payment_method'] ?? 'cash');
				if ($paymentMethod === 'digital') {
					$paymentMethod = 'gcash';
				}

				// Get reference_number from sales table first, then fallback to guest_session
				$referenceNumber = $guest['sales_reference_number'] ?? $guest['reference_number'] ?? null;

				$guestSalesData[] = [
					'id' => $saleId,
					'user_id' => null,
					'total_amount' => (float) $totalAmount,
					'sale_date' => $saleDate,
					'sale_type' => 'Guest',
					'payment_method' => $paymentMethod,
					'transaction_status' => $guest['transaction_status'] ?? 'confirmed',
					'receipt_number' => $guest['receipt_number'],
					'reference_number' => $referenceNumber, // Include reference_number for GCash payments
					'cashier_id' => $guest['cashier_id'],
					'change_given' => (float) ($guest['change_given'] ?? 0),
					'notes' => $guest['notes'] ?? '',
					'detail_id' => null,
					'product_id' => null,
					'subscription_id' => null,
					'guest_session_id' => $guest['guest_session_id'],
					'quantity' => 1,
					'detail_price' => (float) $totalAmount,
					'product_name' => null,
					'product_price' => null,
					'product_category' => null,
					'plan_id' => $gymSessionPlanId, // Use plan_id = 6 to match subscription sales for filtering
					'subscription_user_id' => null,
					'subscription_amount_paid' => null,
					'subscription_discounted_price' => null,
					'subscription_payment_method' => null,
					'payment_table_payment_method' => null,
					'plan_name' => $gymSessionPlanName, // "Guest Walk In" for guest sales
					'plan_price' => $gymSessionPlanPrice, // Price from database or default
					'duration_months' => null,
					'member_fullname' => null,
					'subscription_member_fullname' => null,
					'coach_id' => null,
					'coach_fullname' => null,
					'guest_name' => trim($guest['guest_name']), // The typed full name from guest_session
					'user_name' => trim($guest['guest_name']) // Also set user_name for display (the typed full name)
				];
			}

			error_log("DEBUG sales_api: Found " . count($guestSalesData) . " guest sales from guest_session table");
			if (count($guestSalesData) > 0) {
				error_log("DEBUG sales_api: Sample guest sale: " . json_encode($guestSalesData[0]));
				// Log first 3 guest sales for debugging
				for ($i = 0; $i < min(3, count($guestSalesData)); $i++) {
					error_log("DEBUG sales_api: Guest sale #" . ($i + 1) . " - ID: " . $guestSalesData[$i]['id'] . ", Name: " . ($guestSalesData[$i]['guest_name'] ?? 'N/A') . ", Date: " . ($guestSalesData[$i]['sale_date'] ?? 'N/A'));
				}
			} else {
				// Debug: Check if any guest sessions exist at all (paid = 1)
				$testStmt = $pdo->query("SELECT COUNT(*) as cnt FROM guest_session WHERE paid = 1");
				$testResult = $testStmt->fetch();
				error_log("DEBUG sales_api: Total paid guest sessions in database (paid = 1): " . ($testResult['cnt'] ?? 0));
			}
		} catch (Exception $e) {
			error_log("Error querying guest sessions for sales: " . $e->getMessage());
			error_log("Error trace: " . $e->getTraceAsString());
			$guestSalesData = [];
		}
	}

	// Main query - EXCLUDE guest sales since we're handling them separately
	// But only if we're including guest sales separately
	$mainWhereConditions = [];
	$mainParams = [];

	if ($saleType && $saleType !== 'all' && strtolower($saleType) !== 'guest') {
		// Filtering by specific type (not guest), use original conditions
		$mainWhereConditions = $whereConditions;
		$mainParams = $params;
	} else {
		// Include all types except Guest (since we handle guest separately)
		// Copy date conditions but exclude sale_type condition
		foreach ($whereConditions as $idx => $condition) {
			if (strpos($condition, 's.sale_type') === false) {
				$mainWhereConditions[] = $condition;
				if (isset($params[$idx])) {
					$mainParams[] = $params[$idx];
				}
			}
		}
		// Add exclusion for guest sales
		$mainWhereConditions[] = "s.sale_type != 'Guest'";
	}

	$mainWhereClause = !empty($mainWhereConditions) ? "WHERE " . implode(" AND ", $mainWhereConditions) : "WHERE s.sale_type != 'Guest'";

	$stmt = $pdo->prepare("
		SELECT s.id, s.user_id, s.total_amount, s.sale_date, s.sale_type,
		       CASE 
		           WHEN s.sale_type = 'Subscription' AND pay.payment_method IS NOT NULL AND pay.payment_method != '' 
		               THEN pay.payment_method
		           WHEN s.sale_type = 'Subscription' AND sub.payment_method IS NOT NULL AND sub.payment_method != '' 
		               THEN sub.payment_method
		           WHEN s.payment_method IS NOT NULL AND s.payment_method != '' 
		               THEN s.payment_method
		           ELSE 'cash'
		       END AS payment_method, s.transaction_status, s.receipt_number, s.reference_number, s.cashier_id, s.change_given, s.notes,
		       sd.id AS detail_id, sd.product_id, sd.subscription_id, sd.guest_session_id, sd.quantity, sd.price AS detail_price,
		       p.name AS product_name, p.price AS product_price, p.category AS product_category,
		       sub.plan_id, sub.user_id AS subscription_user_id, sub.amount_paid AS subscription_amount_paid, sub.discounted_price AS subscription_discounted_price, sub.payment_method AS subscription_payment_method,
		       pay.payment_method AS payment_table_payment_method,
		       msp.plan_name, msp.price AS plan_price, msp.duration_months,
		       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS member_fullname,
		       CONCAT_WS(' ', u_sub.fname, u_sub.mname, u_sub.lname) AS subscription_member_fullname,
		       cml.coach_id,
		       CONCAT_WS(' ', u_coach.fname, u_coach.mname, u_coach.lname) AS coach_fullname,
		       gs.guest_name
		FROM `sales` s
		LEFT JOIN `sales_details` sd ON s.id = sd.sale_id
		LEFT JOIN `product` p ON sd.product_id = p.id
		LEFT JOIN `subscription` sub ON sd.subscription_id = sub.id
		LEFT JOIN `payment` pay ON (
			sub.id = pay.subscription_id 
			AND s.sale_type = 'Subscription'
			AND pay.id = (
				SELECT pay2.id 
				FROM `payment` pay2 
				WHERE pay2.subscription_id = sub.id 
				AND pay2.payment_method IS NOT NULL 
				AND pay2.payment_method != ''
				ORDER BY pay2.payment_date DESC, pay2.id DESC 
				LIMIT 1
			)
		)
		LEFT JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
		LEFT JOIN `user` u ON s.user_id = u.id
		LEFT JOIN `user` u_sub ON sub.user_id = u_sub.id
		LEFT JOIN `guest_session` gs ON (
			(sd.guest_session_id IS NOT NULL AND sd.guest_session_id = gs.id)
			OR (s.sale_type = 'Guest' AND s.receipt_number IS NOT NULL AND s.receipt_number != '' AND s.receipt_number = gs.receipt_number)
		)
		LEFT JOIN `coach_member_list` cml ON s.user_id = cml.member_id 
			AND s.sale_type = 'Coaching'
			AND cml.id = (
				SELECT cml2.id
				FROM `coach_member_list` cml2
				WHERE cml2.member_id = s.user_id
				ORDER BY 
					CASE 
						WHEN cml2.staff_approved_at IS NOT NULL AND DATE(cml2.staff_approved_at) <= DATE(s.sale_date) THEN 0
						WHEN cml2.requested_at IS NOT NULL AND DATE(cml2.requested_at) <= DATE(s.sale_date) THEN 1
						ELSE 2
					END,
					COALESCE(cml2.staff_approved_at, cml2.requested_at, '1970-01-01') DESC,
					cml2.id DESC
				LIMIT 1
			)
		LEFT JOIN `user` u_coach ON cml.coach_id = u_coach.id
		$mainWhereClause
		ORDER BY s.sale_date DESC
	");

	// Execute main query with params (already set above in $mainParams)
	try {
		$stmt->execute($mainParams);
		$salesData = $stmt->fetchAll();

		// Debug: Log coaching sales found
		$coachingSalesCount = 0;
		$coachingSalesWithoutCoach = 0;
		foreach ($salesData as $row) {
			if ($row['sale_type'] === 'Coaching') {
				$coachingSalesCount++;
				if ($coachingSalesCount <= 5) {
					error_log("DEBUG sales_api: Coaching sale found - ID: " . $row['id'] . ", user_id: " . ($row['user_id'] ?? 'NULL') . ", coach_id: " . ($row['coach_id'] ?? 'NULL') . ", coach_name: " . ($row['coach_fullname'] ?? 'NULL') . ", sale_date: " . ($row['sale_date'] ?? 'NULL'));
				}
				if (empty($row['coach_id']) && empty($row['coach_fullname'])) {
					$coachingSalesWithoutCoach++;
				}
			}
		}
		error_log("DEBUG sales_api: Total coaching sales found in query: " . $coachingSalesCount . ", Without coach info: " . $coachingSalesWithoutCoach);

		// Debug: Check if there are any coaching sales in the database at all
		if ($coachingSalesCount == 0) {
			$checkStmt = $pdo->query("SELECT COUNT(*) as cnt FROM sales WHERE sale_type = 'Coaching'");
			$checkResult = $checkStmt->fetch();
			error_log("DEBUG sales_api: Total coaching sales in database: " . ($checkResult['cnt'] ?? 0));
		}
	} catch (Exception $e) {
		error_log("ERROR sales_api: Failed to execute main sales query: " . $e->getMessage());
		error_log("ERROR sales_api: Query: " . $stmt->queryString);
		error_log("ERROR sales_api: Params: " . json_encode($mainParams));
		$salesData = [];
	}

	// Merge guest sales with main sales data
	$salesData = array_merge($salesData, $guestSalesData);

	error_log("DEBUG sales_api: Total sales after merge - Main: " . (count($salesData) - count($guestSalesData)) . ", Guest: " . count($guestSalesData) . ", Total: " . count($salesData));

	// Debug: Log guest sales IDs and details
	if (count($guestSalesData) > 0) {
		$guestIds = array_column($guestSalesData, 'id');
		error_log("DEBUG sales_api: Guest sale IDs being merged: " . implode(', ', $guestIds));
		// Log first 3 guest sales for debugging
		for ($i = 0; $i < min(3, count($guestSalesData)); $i++) {
			$gs = $guestSalesData[$i];
			error_log("DEBUG sales_api: Guest sale #" . ($i + 1) . " - ID: " . $gs['id'] . ", Name: " . ($gs['guest_name'] ?? 'N/A') . ", Date: " . ($gs['sale_date'] ?? 'N/A') . ", Plan: " . ($gs['plan_name'] ?? 'N/A'));
		}
	} else {
		error_log("DEBUG sales_api: WARNING - No guest sales data to merge! Check query conditions.");
	}

	$salesGrouped = [];

	foreach ($salesData as $row) {
		$saleId = $row['id'];

		// Debug: Log guest sales being processed
		if (isset($row['sale_type']) && $row['sale_type'] === 'Guest') {
			error_log("DEBUG sales_api: Processing guest sale ID: $saleId, Name: " . ($row['guest_name'] ?? $row['user_name'] ?? 'N/A') . ", Plan: " . ($row['plan_name'] ?? 'N/A'));
		}

		if (!isset($salesGrouped[$saleId])) {
			// Get member name - prefer from sales.user_id, fallback to subscription.user_id
			// For subscription sales, always prefer subscription.user_id since it's more reliable
			$memberName = null;
			if ($row['sale_type'] === 'Subscription' && !empty($row['subscription_member_fullname'])) {
				// For subscription sales, prefer subscription_member_fullname (from subscription.user_id)
				$memberName = trim($row['subscription_member_fullname']);
			} else if (!empty($row['member_fullname'])) {
				// For other sales, use member_fullname (from sales.user_id)
				$memberName = trim($row['member_fullname']);
			} else if (!empty($row['subscription_member_fullname'])) {
				// Fallback to subscription_member_fullname if member_fullname is empty
				$memberName = trim($row['subscription_member_fullname']);
			}

			// Get guest name for guest/walk-in sales
			$guestName = !empty($row['guest_name']) ? trim($row['guest_name']) : null;

			// Get user_id - prefer from sales, fallback to subscription
			$userId = $row['user_id'] ?? $row['subscription_user_id'] ?? null;

			// Get coach name for coaching sales
			$coachName = !empty($row['coach_fullname']) ? trim($row['coach_fullname']) : null;
			$coachId = !empty($row['coach_id']) ? (int) $row['coach_id'] : null;

			// For guest sales, use guest_name instead of user_name
			// Guest sales should always show the typed full name from guest_session.guest_name
			$displayName = null;
			if ($row['sale_type'] === 'Guest') {
				// For guest sales, prioritize guest_name (the typed full name)
				$displayName = $guestName ?: $memberName; // Fallback to memberName if guestName is empty
				// Debug log for guest sales
				if (empty($guestName)) {
					error_log("DEBUG sales_api: Guest sale (ID: $saleId) has no guest_name from JOIN. Receipt: " . ($row['receipt_number'] ?? 'N/A'));
				}
			} else {
				$displayName = $memberName;
			}

			// Get payment method - prioritize payment table (source of truth), then subscription table, then sales table
			$paymentMethod = null;
			if ($row['sale_type'] === 'Subscription') {
				// For subscription sales, prioritize payment table first (most accurate), then subscription table, then sales table
				if (!empty($row['payment_table_payment_method'])) {
					$paymentMethod = $row['payment_table_payment_method'];
				} else if (!empty($row['subscription_payment_method'])) {
					$paymentMethod = $row['subscription_payment_method'];
				} else if (!empty($row['payment_method'])) {
					// Fallback to sales table payment_method if payment and subscription tables don't have it
					$paymentMethod = $row['payment_method'];
				} else {
					$paymentMethod = 'cash';
				}
			} else if (!empty($row['payment_method'])) {
				// For other sales, use sales table payment_method
				$paymentMethod = $row['payment_method'];
			} else {
				// Fallback to cash
				$paymentMethod = 'cash';
			}

			// Normalize payment method: digital -> gcash, ensure lowercase
			$paymentMethod = strtolower(trim($paymentMethod));
			if ($paymentMethod === 'digital') {
				$paymentMethod = 'gcash';
			}
			// Log for debugging subscription sales
			if ($row['sale_type'] === 'Subscription') {
				$rawPaymentMethod = $row['payment_method'] ?? null;
				$subPaymentMethod = $row['subscription_payment_method'] ?? null;
				error_log("DEBUG sales_api: Sale ID {$row['id']}, Payment method from DB: " . var_export($rawPaymentMethod, true) . ", Subscription PM: " . var_export($subPaymentMethod, true) . ", Final normalized: '$paymentMethod', Receipt: " . ($row['receipt_number'] ?? 'N/A'));
			}

			$salesGrouped[$saleId] = [
				'id' => $row['id'],
				'total_amount' => (float) $row['total_amount'],
				'sale_date' => $row['sale_date'],
				'sale_type' => $row['sale_type'],
				'payment_method' => $paymentMethod, // Use normalized value
				'transaction_status' => $row['transaction_status'],
				'receipt_number' => $row['receipt_number'],
				'reference_number' => $row['reference_number'] ?? null, // Include reference_number for GCash payments
				'cashier_id' => $row['cashier_id'],
				'change_given' => (float) $row['change_given'],
				'notes' => $row['notes'],
				'user_id' => $userId,
				'user_name' => $displayName, // This will be guest_name for guest sales
				'guest_name' => $guestName, // Also store separately for clarity
				'coach_id' => $coachId,
				'coach_name' => $coachName,
				'sales_details' => []
			];

			// For subscription sales, store plan info at sale level even if no sales_details
			// NOTE: This is a temporary value - it will be overwritten later by subscription lookup to ensure accuracy
			if ($row['sale_type'] === 'Subscription' && !empty($row['plan_name'])) {
				$salesGrouped[$saleId]['plan_name'] = $row['plan_name'];
				$salesGrouped[$saleId]['plan_id'] = $row['plan_id'];
				$salesGrouped[$saleId]['plan_price'] = !empty($row['plan_price']) ? (float) $row['plan_price'] : null;
				$salesGrouped[$saleId]['duration_months'] = !empty($row['duration_months']) ? (int) $row['duration_months'] : null;
				$salesGrouped[$saleId]['duration_days'] = !empty($row['duration_days']) ? (int) $row['duration_days'] : null;
				$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($row['subscription_amount_paid']) ? (float) $row['subscription_amount_paid'] : null;
				$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($row['subscription_discounted_price']) ? (float) $row['subscription_discounted_price'] : null;
			}

			// For guest sales, store plan info at sale level (from guest sales data)
			if ($row['sale_type'] === 'Guest' && !empty($row['plan_name'])) {
				$salesGrouped[$saleId]['plan_name'] = $row['plan_name'];
				$salesGrouped[$saleId]['plan_id'] = $row['plan_id'] ?? 6;
				$salesGrouped[$saleId]['plan_price'] = !empty($row['plan_price']) ? (float) $row['plan_price'] : null;
			}
		} else {
			// If coach info wasn't set in first row but exists in this row, update it
			// For coaching sales, prioritize getting coach info
			if ($row['sale_type'] === 'Coaching') {
				if (empty($salesGrouped[$saleId]['coach_id']) && !empty($row['coach_id'])) {
					$salesGrouped[$saleId]['coach_id'] = (int) $row['coach_id'];
				}
				if (empty($salesGrouped[$saleId]['coach_name']) && !empty($row['coach_fullname'])) {
					$salesGrouped[$saleId]['coach_name'] = trim($row['coach_fullname']);
				}
			} else if (empty($salesGrouped[$saleId]['coach_name']) && !empty($row['coach_fullname'])) {
				$salesGrouped[$saleId]['coach_name'] = trim($row['coach_fullname']);
				$salesGrouped[$saleId]['coach_id'] = !empty($row['coach_id']) ? (int) $row['coach_id'] : null;
			}
			// If guest info wasn't set but exists in this row, update it
			if (empty($salesGrouped[$saleId]['guest_name']) && !empty($row['guest_name'])) {
				$salesGrouped[$saleId]['guest_name'] = trim($row['guest_name']);
				// Update user_name for guest sales
				if ($salesGrouped[$saleId]['sale_type'] === 'Guest') {
					$salesGrouped[$saleId]['user_name'] = trim($row['guest_name']);
				}
			}

			// For guest sales, if guest_name is still empty, try to fetch it directly from guest_session
			if ($salesGrouped[$saleId]['sale_type'] === 'Guest' && empty($salesGrouped[$saleId]['guest_name'])) {
				// Try to get guest_name from sales_details -> guest_session
				$guestSessionId = null;
				$salesDetails = $salesGrouped[$saleId]['sales_details'] ?? [];
				if (!empty($salesDetails) && is_array($salesDetails)) {
					foreach ($salesDetails as $detail) {
						if (!empty($detail['guest_session_id'])) {
							$guestSessionId = $detail['guest_session_id'];
							break;
						}
					}
				}

				// If we have guest_session_id, fetch guest_name directly
				if ($guestSessionId) {
					try {
						$gsStmt = $pdo->prepare("SELECT guest_name FROM guest_session WHERE id = ? LIMIT 1");
						$gsStmt->execute([$guestSessionId]);
						$guestSession = $gsStmt->fetch();
						if ($guestSession && !empty($guestSession['guest_name'])) {
							$salesGrouped[$saleId]['guest_name'] = trim($guestSession['guest_name']);
							$salesGrouped[$saleId]['user_name'] = trim($guestSession['guest_name']);
							error_log("DEBUG sales_api: ✅ Found guest_name by guest_session_id for sale $saleId: " . $guestSession['guest_name']);
						}
					} catch (Exception $e) {
						error_log("Failed to fetch guest_name for sale $saleId: " . $e->getMessage());
					}
				}

				// If still no guest_name, try matching by receipt_number
				if (empty($salesGrouped[$saleId]['guest_name']) && !empty($salesGrouped[$saleId]['receipt_number'])) {
					try {
						$gsStmt = $pdo->prepare("SELECT id, guest_name FROM guest_session WHERE receipt_number = ? LIMIT 1");
						$gsStmt->execute([$salesGrouped[$saleId]['receipt_number']]);
						$guestSession = $gsStmt->fetch();
						if ($guestSession && !empty($guestSession['guest_name'])) {
							$salesGrouped[$saleId]['guest_name'] = trim($guestSession['guest_name']);
							$salesGrouped[$saleId]['user_name'] = trim($guestSession['guest_name']);
							error_log("DEBUG sales_api: ✅ Found guest_name by receipt_number for sale $saleId: " . $guestSession['guest_name']);

							// Also try to create sales_details entry if it doesn't exist
							if (!empty($guestSession['id'])) {
								$checkDetailsStmt = $pdo->prepare("SELECT id FROM sales_details WHERE sale_id = ? AND guest_session_id = ? LIMIT 1");
								$checkDetailsStmt->execute([$saleId, $guestSession['id']]);
								$existingDetail = $checkDetailsStmt->fetch();
								if (!$existingDetail) {
									try {
										$createDetailsStmt = $pdo->prepare("INSERT INTO sales_details (sale_id, guest_session_id, quantity, price) VALUES (?, ?, 1, ?)");
										$createDetailsStmt->execute([$saleId, $guestSession['id'], $salesGrouped[$saleId]['total_amount']]);
										error_log("DEBUG sales_api: ✅ Created missing sales_details for sale $saleId, guest_session " . $guestSession['id']);
									} catch (Exception $e2) {
										error_log("DEBUG sales_api: Could not create sales_details (may already exist): " . $e2->getMessage());
									}
								}
							}
						} else {
							error_log("DEBUG sales_api: ❌ No guest_session found with receipt_number: " . $salesGrouped[$saleId]['receipt_number']);
						}
					} catch (Exception $e) {
						error_log("Failed to fetch guest_name by receipt_number for sale $saleId: " . $e->getMessage());
					}
				}
			}
			// For subscription sales, update plan info if not set and available in this row
			// NOTE: This will be overwritten later by the subscription lookup to ensure accuracy
			if ($salesGrouped[$saleId]['sale_type'] === 'Subscription' && empty($salesGrouped[$saleId]['plan_name']) && !empty($row['plan_name'])) {
				$salesGrouped[$saleId]['plan_name'] = $row['plan_name'];
				$salesGrouped[$saleId]['plan_id'] = $row['plan_id'];
				$salesGrouped[$saleId]['plan_price'] = !empty($row['plan_price']) ? (float) $row['plan_price'] : null;
				$salesGrouped[$saleId]['duration_months'] = !empty($row['duration_months']) ? (int) $row['duration_months'] : null;
				$salesGrouped[$saleId]['duration_days'] = !empty($row['duration_days']) ? (int) $row['duration_days'] : null;
				$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($row['subscription_amount_paid']) ? (float) $row['subscription_amount_paid'] : null;
				$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($row['subscription_discounted_price']) ? (float) $row['subscription_discounted_price'] : null;
			}
		}

		// For guest sales, create a sales_detail entry even if detail_id is null
		if ($row['sale_type'] === 'Guest' && empty($salesGrouped[$saleId]['sales_details'])) {
			// Create a sales_detail entry for guest sales
			$detail = [
				'id' => $row['detail_id'] ?? null,
				'quantity' => $row['quantity'] ?? 1,
				'price' => (float) ($row['detail_price'] ?? $row['total_amount'] ?? 0),
				'guest_session_id' => $row['guest_session_id'] ?? null
			];
			$salesGrouped[$saleId]['sales_details'][] = $detail;
		} else if ($row['sale_type'] === 'Coaching' && empty($salesGrouped[$saleId]['sales_details'])) {
			// For coaching sales, create a sales_detail entry with coach information
			$detail = [
				'id' => $row['detail_id'] ?? null,
				'quantity' => $row['quantity'] ?? 1,
				'price' => (float) ($row['detail_price'] ?? $row['total_amount'] ?? 0)
			];
			// Add coach information if available
			if (!empty($row['coach_id']) || !empty($row['coach_fullname'])) {
				$detail['coach'] = [
					'coach_id' => !empty($row['coach_id']) ? (int) $row['coach_id'] : null,
					'coach_name' => !empty($row['coach_fullname']) ? trim($row['coach_fullname']) : null
				];
			}
			$salesGrouped[$saleId]['sales_details'][] = $detail;
		} else if ($row['detail_id']) {
			$detail = [
				'id' => $row['detail_id'],
				'quantity' => $row['quantity'],
				'price' => (float) $row['detail_price']
			];

			if ($row['product_id']) {
				$detail['product_id'] = $row['product_id'];
				$detail['product'] = [
					'id' => $row['product_id'],
					'name' => $row['product_name'],
					'price' => (float) $row['product_price'],
					'category' => $row['product_category']
				];
			}

			if ($row['subscription_id']) {
				$detail['subscription_id'] = $row['subscription_id'];
				$detail['subscription'] = [
					'plan_id' => $row['plan_id'],
					'plan_name' => $row['plan_name'],
					'plan_price' => !empty($row['plan_price']) ? (float) $row['plan_price'] : null,
					'duration_months' => !empty($row['duration_months']) ? (int) $row['duration_months'] : null,
					'duration_days' => !empty($row['duration_days']) ? (int) $row['duration_days'] : null,
					'amount_paid' => !empty($row['subscription_amount_paid']) ? (float) $row['subscription_amount_paid'] : null,
					'discounted_price' => !empty($row['subscription_discounted_price']) ? (float) $row['subscription_discounted_price'] : null
				];
				// Also store plan info at sale level for easy access in frontend
				if (!isset($salesGrouped[$saleId]['plan_name']) && !empty($row['plan_name'])) {
					$salesGrouped[$saleId]['plan_name'] = $row['plan_name'];
					$salesGrouped[$saleId]['plan_id'] = $row['plan_id'];
					$salesGrouped[$saleId]['plan_price'] = !empty($row['plan_price']) ? (float) $row['plan_price'] : null;
					$salesGrouped[$saleId]['duration_months'] = !empty($row['duration_months']) ? (int) $row['duration_months'] : null;
					$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($row['subscription_amount_paid']) ? (float) $row['subscription_amount_paid'] : null;
					$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($row['subscription_discounted_price']) ? (float) $row['subscription_discounted_price'] : null;
				}
				// Also store quantity at sale level for easy access
				if (!isset($salesGrouped[$saleId]['quantity']) && !empty($row['quantity'])) {
					$salesGrouped[$saleId]['quantity'] = (int) $row['quantity'];
				} elseif (!isset($salesGrouped[$saleId]['quantity'])) {
					$salesGrouped[$saleId]['quantity'] = 1; // Default to 1 if not set
				}
			}

			// Include guest_session_id in detail if present
			if ($row['guest_session_id']) {
				$detail['guest_session_id'] = $row['guest_session_id'];
			}

			// For coaching sales, add coach information if detail doesn't have product/subscription/guest
			if ($row['sale_type'] === 'Coaching' && empty($detail['product_id']) && empty($detail['subscription_id']) && empty($detail['guest_session_id'])) {
				if (!empty($row['coach_id']) || !empty($row['coach_fullname'])) {
					$detail['coach'] = [
						'coach_id' => !empty($row['coach_id']) ? (int) $row['coach_id'] : null,
						'coach_name' => !empty($row['coach_fullname']) ? trim($row['coach_fullname']) : null
					];
				}
			}

			$salesGrouped[$saleId]['sales_details'][] = $detail;
		} else if (!$row['detail_id'] && $row['sale_type'] === 'Coaching' && empty($salesGrouped[$saleId]['sales_details'])) {
			// Handle coaching sales with no sales_details rows (detail_id is NULL)
			$detail = [
				'id' => null,
				'quantity' => 1,
				'price' => (float) $row['total_amount']
			];
			// Add coach information if available
			if (!empty($row['coach_id']) || !empty($row['coach_fullname'])) {
				$detail['coach'] = [
					'coach_id' => !empty($row['coach_id']) ? (int) $row['coach_id'] : null,
					'coach_name' => !empty($row['coach_fullname']) ? trim($row['coach_fullname']) : null
				];
			}
			$salesGrouped[$saleId]['sales_details'][] = $detail;
		}
	}

	// Final pass: Ensure all coaching sales have coach info and details
	foreach ($salesGrouped as $saleId => $sale) {
		if ($sale['sale_type'] === 'Coaching') {
			// If coach info is missing, try to fetch it directly from coach_member_list
			// For coaching sales, we need to find the coach assignment that was active at the time of sale
			if (empty($sale['coach_id']) && !empty($sale['user_id'])) {
				try {
					// First try: Find coach assignment that was active at the time of sale
					// Don't filter by current status - we want the assignment that was active when the sale happened
					$coachStmt = $pdo->prepare("
						SELECT cml.coach_id,
						       CONCAT_WS(' ', u_coach.fname, u_coach.mname, u_coach.lname) AS coach_fullname
						FROM coach_member_list cml
						LEFT JOIN user u_coach ON cml.coach_id = u_coach.id
						WHERE cml.member_id = ?
						  AND cml.coach_approval = 'approved'
						  AND cml.staff_approval = 'approved'
						  AND (
						  	-- Assignment was approved before or on sale date
						  	(cml.staff_approved_at IS NOT NULL AND DATE(cml.staff_approved_at) <= DATE(?))
						  	OR (cml.requested_at IS NOT NULL AND DATE(cml.requested_at) <= DATE(?))
						  )
						  AND (
						  	-- Assignment was still valid at sale date (not expired yet)
						  	cml.expires_at IS NULL 
						  	OR cml.expires_at >= DATE(?)
						  	OR (cml.rate_type = 'per_session' AND DATE(cml.staff_approved_at) = DATE(?))
						  )
						ORDER BY 
							CASE 
								WHEN cml.staff_approved_at IS NOT NULL AND DATE(cml.staff_approved_at) <= DATE(?) THEN 0
								WHEN cml.requested_at IS NOT NULL AND DATE(cml.requested_at) <= DATE(?) THEN 1
								ELSE 2
							END,
							COALESCE(cml.staff_approved_at, cml.requested_at, '1970-01-01') DESC,
							cml.id DESC
						LIMIT 1
					");
					$saleDate = $sale['sale_date'];
					$coachStmt->execute([$sale['user_id'], $saleDate, $saleDate, $saleDate, $saleDate, $saleDate, $saleDate]);
					$coachInfo = $coachStmt->fetch();

					// If still no match, try without expiration check (just find any approved assignment for this member)
					if (!$coachInfo || !$coachInfo['coach_id']) {
						$coachStmt2 = $pdo->prepare("
							SELECT cml.coach_id,
							       CONCAT_WS(' ', u_coach.fname, u_coach.mname, u_coach.lname) AS coach_fullname
							FROM coach_member_list cml
							LEFT JOIN user u_coach ON cml.coach_id = u_coach.id
							WHERE cml.member_id = ?
							  AND cml.coach_approval = 'approved'
							  AND cml.staff_approval = 'approved'
							ORDER BY COALESCE(cml.staff_approved_at, cml.requested_at, '1970-01-01') DESC, cml.id DESC
							LIMIT 1
						");
						$coachStmt2->execute([$sale['user_id']]);
						$coachInfo = $coachStmt2->fetch();
					}

					if ($coachInfo && $coachInfo['coach_id']) {
						$salesGrouped[$saleId]['coach_id'] = (int) $coachInfo['coach_id'];
						$salesGrouped[$saleId]['coach_name'] = trim($coachInfo['coach_fullname'] ?? '');
					}
				} catch (Exception $e) {
					error_log("Error fetching coach info for coaching sale $saleId: " . $e->getMessage());
				}
			}

			// Ensure coaching sales have at least one detail entry
			if (empty($sale['sales_details'])) {
				$detail = [
					'id' => null,
					'quantity' => 1,
					'price' => (float) $sale['total_amount']
				];
				if (!empty($sale['coach_id']) || !empty($sale['coach_name'])) {
					$detail['coach'] = [
						'coach_id' => $sale['coach_id'] ?? null,
						'coach_name' => $sale['coach_name'] ?? null
					];
				}
				$salesGrouped[$saleId]['sales_details'][] = $detail;
			}
		}
	}

	// Process guest sales to set plan_name and ensure guest_name is populated
	try {
		foreach ($salesGrouped as $saleId => $sale) {
			if ($sale['sale_type'] === 'Guest') {
				// For guest sessions, set plan_name to "Guest Walk In"
				// Guest sessions use plan_id = 6 to match subscription sales for filtering
				// But plan_name should be "Guest Walk In" to distinguish from subscription sales
				try {
					// First try to get plan_id = 6 specifically (most reliable - matches subscription sales)
					$planStmt = $pdo->prepare("
						SELECT id, plan_name, price, duration_months, duration_days
						FROM member_subscription_plan
						WHERE id = 6
						LIMIT 1
					");
					$planStmt->execute();
					$gymSessionPlan = $planStmt->fetch();

					// If plan_id 6 not found, try to find matching plan by name
					if (!$gymSessionPlan || empty($gymSessionPlan['plan_name'])) {
						$planStmt = $pdo->prepare("
							SELECT id, plan_name, price, duration_months, duration_days
							FROM member_subscription_plan
							WHERE LOWER(plan_name) IN ('gym session', 'day pass', 'walk in', 'session')
							ORDER BY id ASC
							LIMIT 1
						");
						$planStmt->execute();
						$gymSessionPlan = $planStmt->fetch();
					}

					// For guest sales, always use "Guest Walk In" as plan name
					$salesGrouped[$saleId]['plan_name'] = 'Guest Walk In';
					$salesGrouped[$saleId]['plan_id'] = 6; // Use same plan_id for filtering

					// Get price from database if available
					if ($gymSessionPlan && !empty($gymSessionPlan['price'])) {
						$salesGrouped[$saleId]['plan_price'] = (float) $gymSessionPlan['price'];
					} else {
						$salesGrouped[$saleId]['plan_price'] = 150; // Default price
					}

					// Ensure guest_name is properly set as user_name for display
					if (!empty($salesGrouped[$saleId]['guest_name'])) {
						$salesGrouped[$saleId]['user_name'] = trim($salesGrouped[$saleId]['guest_name']);
					}
				} catch (Exception $e) {
					error_log("Error fetching Gym Session plan for guest sale: " . $e->getMessage());
					$salesGrouped[$saleId]['plan_name'] = 'Guest Walk In';
					$salesGrouped[$saleId]['plan_id'] = 6;
					// Ensure guest_name is properly set as user_name for display
					if (!empty($salesGrouped[$saleId]['guest_name'])) {
						$salesGrouped[$saleId]['user_name'] = trim($salesGrouped[$saleId]['guest_name']);
					}
				}
			}
		}
	} catch (Exception $e) {
		error_log("Error processing guest sales: " . $e->getMessage());
	}

	// For ALL subscription sales, ensure we have plan info - query subscription table directly
	// This ensures we always get the correct plan_name from the subscription's actual plan_id
	// Wrap in try-catch to prevent errors from breaking sales retrieval
	try {
		foreach ($salesGrouped as $saleId => $sale) {
			// Process ALL subscription sales to ALWAYS get the correct plan_name from subscription table
			// This ensures plan_name matches what's shown in monitoring subscription
			if (strtolower($sale['sale_type']) === 'subscription' && !empty($sale['user_id'])) {
				// ALWAYS query subscription table to get the correct plan_name
				// Even if plan_name is already set, we want to overwrite it with the correct one
				// Check if sales_details has subscription_id first
				$subscriptionId = null;
				if (!empty($sale['sales_details']) && is_array($sale['sales_details'])) {
					foreach ($sale['sales_details'] as $detail) {
						if (!empty($detail['subscription_id'])) {
							$subscriptionId = $detail['subscription_id'];
							break;
						}
					}
				}

				// If we found subscription_id in sales_details, use it directly (most reliable)
				if ($subscriptionId) {
					// First get subscription details
					$subStmt = $pdo->prepare("
						SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
						       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
						       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
						FROM `subscription` sub
						JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
						LEFT JOIN `user` u ON sub.user_id = u.id
						WHERE sub.id = ?
						LIMIT 1
					");
					$subStmt->execute([$subscriptionId]);
					$subscription = $subStmt->fetch();

					// Get payment method from payment table (most accurate source)
					if ($subscription) {
						$payStmt = $pdo->prepare("
							SELECT payment_method 
							FROM `payment` 
							WHERE subscription_id = ? 
							AND payment_method IS NOT NULL 
							AND payment_method != ''
							ORDER BY payment_date DESC, id DESC
							LIMIT 1
						");
						$payStmt->execute([$subscriptionId]);
						$paymentRecord = $payStmt->fetch();
						if ($paymentRecord && !empty($paymentRecord['payment_method'])) {
							// Override subscription payment_method with payment table value (source of truth)
							$subscription['payment_method'] = $paymentRecord['payment_method'];
						}
					}

					if ($subscription && !empty($subscription['plan_name'])) {
						// Always update plan_name from subscription (most accurate source)
						$salesGrouped[$saleId]['plan_name'] = $subscription['plan_name'];
						$salesGrouped[$saleId]['plan_id'] = $subscription['plan_id'];
						$salesGrouped[$saleId]['plan_price'] = !empty($subscription['plan_price']) ? (float) $subscription['plan_price'] : null;
						$salesGrouped[$saleId]['duration_months'] = !empty($subscription['duration_months']) ? (int) $subscription['duration_months'] : null;
						$salesGrouped[$saleId]['duration_days'] = !empty($subscription['duration_days']) ? (int) $subscription['duration_days'] : null;
						$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($subscription['amount_paid']) ? (float) $subscription['amount_paid'] : null;
						$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($subscription['discounted_price']) ? (float) $subscription['discounted_price'] : null;
						// Update payment_method from payment table (most accurate source), then subscription table
						$finalPaymentMethod = null;
						if (!empty($subscription['payment_method'])) {
							// Payment table value was already fetched and overridden above, so use it
							$finalPaymentMethod = $subscription['payment_method'];
						}
						if ($finalPaymentMethod) {
							$subPaymentMethod = strtolower(trim($finalPaymentMethod));
							if ($subPaymentMethod === 'digital') {
								$subPaymentMethod = 'gcash';
							}
							// Always use payment table payment_method for subscription sales (it's the source of truth)
							$salesGrouped[$saleId]['payment_method'] = $subPaymentMethod;
							error_log("DEBUG sales_api: Sale ID $saleId, Updated payment_method from payment/subscription table (by ID): '$subPaymentMethod'");
						}
						// Update user_name and user_id from subscription if not set or incorrect
						if (!empty($subscription['user_fullname'])) {
							// Always update user_name from subscription (more reliable)
							$currentUserName = strtolower(trim($salesGrouped[$saleId]['user_name'] ?? ''));
							if (
								empty($salesGrouped[$saleId]['user_name']) ||
								$currentUserName === 'gym membership' ||
								$currentUserName === strtolower(trim($subscription['plan_name']))
							) {
								$salesGrouped[$saleId]['user_name'] = trim($subscription['user_fullname']);
							}
						}
						if (!empty($subscription['user_id']) && empty($salesGrouped[$saleId]['user_id'])) {
							$salesGrouped[$saleId]['user_id'] = $subscription['user_id'];
						}
						continue;
					}
				}

				// If no subscription_id found, try matching by user_id, amount, and date (more accurate)
				// Strategy 1: Match subscription by user_id, amount (within 10 peso), and same day
				$subStmt = $pdo->prepare("
					SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
					       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
					       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
					FROM `subscription` sub
					JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
					LEFT JOIN `user` u ON sub.user_id = u.id
					WHERE sub.user_id = ?
					  AND DATE(sub.start_date) = DATE(?)
					  AND (ABS(COALESCE(sub.amount_paid, 0) - ?) <= 10 OR ABS(COALESCE(sub.discounted_price, 0) - ?) <= 10)
					ORDER BY ABS(COALESCE(sub.amount_paid, sub.discounted_price, 0) - ?) ASC, sub.start_date DESC, sub.id DESC
					LIMIT 1
				");
				$subStmt->execute([
					$sale['user_id'],
					$sale['sale_date'],
					$sale['total_amount'],
					$sale['total_amount'],
					$sale['total_amount']
				]);
				$subscription = $subStmt->fetch();

				// Strategy 2: If no exact date/amount match, try matching by amount and date range
				if (!$subscription || empty($subscription['plan_name'])) {
					$subStmt = $pdo->prepare("
						SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
						       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
						       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
						FROM `subscription` sub
						JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
						LEFT JOIN `user` u ON sub.user_id = u.id
						WHERE sub.user_id = ?
						  AND (ABS(COALESCE(sub.amount_paid, 0) - ?) <= 10 OR ABS(COALESCE(sub.discounted_price, 0) - ?) <= 10)
						  AND sub.start_date >= DATE_SUB(?, INTERVAL 14 DAY)
						  AND sub.start_date <= DATE_ADD(?, INTERVAL 14 DAY)
						ORDER BY ABS(COALESCE(sub.amount_paid, sub.discounted_price, 0) - ?) ASC, ABS(DATEDIFF(sub.start_date, ?)) ASC, sub.start_date DESC
						LIMIT 1
					");
					$subStmt->execute([
						$sale['user_id'],
						$sale['total_amount'],
						$sale['total_amount'],
						$sale['sale_date'],
						$sale['sale_date'],
						$sale['total_amount'],
						$sale['sale_date']
					]);
					$subscription = $subStmt->fetch();
				}

				// Strategy 3: If still no match, try by date only (same day or within 7 days)
				if (!$subscription || empty($subscription['plan_name'])) {
					$subStmt = $pdo->prepare("
						SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
						       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
						       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
						FROM `subscription` sub
						JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
						LEFT JOIN `user` u ON sub.user_id = u.id
						WHERE sub.user_id = ?
						  AND sub.start_date >= DATE_SUB(?, INTERVAL 7 DAY)
						  AND sub.start_date <= DATE_ADD(?, INTERVAL 7 DAY)
						ORDER BY ABS(DATEDIFF(sub.start_date, ?)) ASC, sub.start_date DESC
						LIMIT 1
					");
					$subStmt->execute([
						$sale['user_id'],
						$sale['sale_date'],
						$sale['sale_date'],
						$sale['sale_date']
					]);
					$subscription = $subStmt->fetch();
				}

				// Strategy 4: Last resort - find most recent subscription for this user (within 60 days)
				if (!$subscription || empty($subscription['plan_name'])) {
					$subStmt = $pdo->prepare("
						SELECT sub.id, sub.plan_id, sub.user_id, sub.amount_paid, sub.discounted_price, sub.start_date, sub.end_date, sub.payment_method,
						       msp.plan_name, msp.price AS plan_price, msp.duration_months, msp.duration_days,
						       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS user_fullname
						FROM `subscription` sub
						JOIN `member_subscription_plan` msp ON sub.plan_id = msp.id
						LEFT JOIN `user` u ON sub.user_id = u.id
						WHERE sub.user_id = ?
						  AND sub.start_date >= DATE_SUB(?, INTERVAL 60 DAY)
						  AND sub.start_date <= DATE_ADD(?, INTERVAL 14 DAY)
						ORDER BY sub.start_date DESC
						LIMIT 1
					");
					$subStmt->execute([
						$sale['user_id'],
						$sale['sale_date'],
						$sale['sale_date']
					]);
					$subscription = $subStmt->fetch();
				}

				// If we found a subscription, ALWAYS update plan_name and payment_method from payment/subscription table (most accurate)
				if ($subscription && !empty($subscription['plan_name'])) {
					// ALWAYS overwrite plan_name from subscription table (this is the source of truth)
					// This ensures plan_name matches what's shown in monitoring subscription
					$salesGrouped[$saleId]['plan_name'] = $subscription['plan_name'];
					$salesGrouped[$saleId]['plan_id'] = $subscription['plan_id'];
					$salesGrouped[$saleId]['plan_price'] = !empty($subscription['plan_price']) ? (float) $subscription['plan_price'] : null;
					$salesGrouped[$saleId]['duration_months'] = !empty($subscription['duration_months']) ? (int) $subscription['duration_months'] : null;
					$salesGrouped[$saleId]['duration_days'] = !empty($subscription['duration_days']) ? (int) $subscription['duration_days'] : null;
					$salesGrouped[$saleId]['subscription_amount_paid'] = !empty($subscription['amount_paid']) ? (float) $subscription['amount_paid'] : null;
					$salesGrouped[$saleId]['subscription_discounted_price'] = !empty($subscription['discounted_price']) ? (float) $subscription['discounted_price'] : null;
					// Get payment method from payment table (most accurate source)
					$finalPaymentMethod = null;
					if (!empty($subscription['id'])) {
						$payStmt = $pdo->prepare("
							SELECT payment_method 
							FROM `payment` 
							WHERE subscription_id = ? 
							AND payment_method IS NOT NULL 
							AND payment_method != ''
							ORDER BY payment_date DESC, id DESC
							LIMIT 1
						");
						$payStmt->execute([$subscription['id']]);
						$paymentRecord = $payStmt->fetch();
						if ($paymentRecord && !empty($paymentRecord['payment_method'])) {
							$finalPaymentMethod = $paymentRecord['payment_method'];
						}
					}
					// Fallback to subscription table payment_method if payment table doesn't have it
					if (!$finalPaymentMethod && !empty($subscription['payment_method'])) {
						$finalPaymentMethod = $subscription['payment_method'];
					}
					// Update payment_method from payment/subscription table (payment table is source of truth)
					if ($finalPaymentMethod) {
						$subPaymentMethod = strtolower(trim($finalPaymentMethod));
						if ($subPaymentMethod === 'digital') {
							$subPaymentMethod = 'gcash';
						}
						// Always use payment table payment_method for subscription sales (it's the source of truth)
						$salesGrouped[$saleId]['payment_method'] = $subPaymentMethod;
						error_log("DEBUG sales_api: Sale ID $saleId, Updated payment_method from payment/subscription table (by matching): '$subPaymentMethod'");
					}
					// Update user_name from subscription (always use subscription's user)
					if (!empty($subscription['user_fullname'])) {
						$salesGrouped[$saleId]['user_name'] = trim($subscription['user_fullname']);
					}
					// Update user_id from subscription
					if (!empty($subscription['user_id'])) {
						$salesGrouped[$saleId]['user_id'] = $subscription['user_id'];
					}
				} else if (!empty($sale['plan_id'])) {
					// If no subscription found but we have a plan_id, query plan directly as fallback
					// This ensures we at least have the plan_name from the plan table
					$planStmt = $pdo->prepare("
						SELECT id, plan_name, price, duration_months, duration_days, discounted_price
						FROM member_subscription_plan
						WHERE id = ?
						LIMIT 1
					");
					$planStmt->execute([$sale['plan_id']]);
					$plan = $planStmt->fetch();
					if ($plan && !empty($plan['plan_name'])) {
						// Update plan_name from plan table (fallback if subscription not found)
						$salesGrouped[$saleId]['plan_name'] = $plan['plan_name'];
						$salesGrouped[$saleId]['plan_id'] = $plan['id'];
						$salesGrouped[$saleId]['plan_price'] = !empty($plan['price']) ? (float) $plan['price'] : null;
						$salesGrouped[$saleId]['duration_months'] = !empty($plan['duration_months']) ? (int) $plan['duration_months'] : null;
						$salesGrouped[$saleId]['duration_days'] = !empty($plan['duration_days']) ? (int) $plan['duration_days'] : null;
					}
				}
			}
		}
	} catch (Exception $e) {
		// Log error but don't break sales retrieval
		error_log("Error fetching subscription plan info for sales: " . $e->getMessage());
	}

	// FINAL CHECK: Ensure all guest sales are included and have proper data
	// This is a critical safety net to catch any guest sales that might have been missed
	try {
		// Build the same date conditions as the main query
		$finalGuestCheckConditions = [];
		$finalGuestCheckParams = [];

		if ($saleType && $saleType !== 'all' && strtolower($saleType) !== 'guest') {
			// If filtering by a specific non-guest type, skip this check
		} else {
			// Only check if we should include guest sales
			if ($customDate) {
				$finalGuestCheckConditions[] = "DATE(sale_date) = ?";
				$finalGuestCheckParams[] = $customDate;
			} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
				$finalGuestCheckConditions[] = "MONTH(sale_date) = ? AND YEAR(sale_date) = ?";
				$finalGuestCheckParams[] = $month;
				$finalGuestCheckParams[] = $year;
			} elseif ($month && $month !== 'all') {
				$finalGuestCheckConditions[] = "MONTH(sale_date) = ? AND YEAR(sale_date) = YEAR(CURDATE())";
				$finalGuestCheckParams[] = $month;
			} elseif ($year && $year !== 'all') {
				$finalGuestCheckConditions[] = "YEAR(sale_date) = ?";
				$finalGuestCheckParams[] = $year;
			} elseif ($dateFilter && $dateFilter !== 'all') {
				switch ($dateFilter) {
					case 'today':
						$finalGuestCheckConditions[] = "DATE(sale_date) = CURDATE()";
						break;
					case 'week':
						$finalGuestCheckConditions[] = "sale_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
						break;
					case 'month':
						$finalGuestCheckConditions[] = "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())";
						break;
					case 'year':
						$finalGuestCheckConditions[] = "YEAR(sale_date) = YEAR(CURDATE())";
						break;
				}
			}

			$finalGuestCheckConditions[] = "sale_type = 'Guest'";
			$finalGuestWhere = "WHERE " . implode(" AND ", $finalGuestCheckConditions);

			// Get all guest sale IDs that should be in results
			$finalGuestCheckStmt = $pdo->prepare("SELECT id FROM sales $finalGuestWhere");
			$finalGuestCheckStmt->execute($finalGuestCheckParams);
			$allGuestSaleIds = array_column($finalGuestCheckStmt->fetchAll(), 'id');

			// Check which ones are missing from salesGrouped
			$existingSaleIds = array_keys($salesGrouped);
			$missingGuestSaleIds = array_diff($allGuestSaleIds, $existingSaleIds);

			// For each missing guest sale, fetch and add it
			if (!empty($missingGuestSaleIds)) {
				error_log("DEBUG sales_api FINAL CHECK: Found " . count($missingGuestSaleIds) . " guest sales missing from grouped results");

				$placeholders = implode(',', array_fill(0, count($missingGuestSaleIds), '?'));
				$missingGuestStmt = $pdo->prepare("
					SELECT s.id, s.user_id, s.total_amount, s.sale_date, s.sale_type,
					       COALESCE(s.payment_method, 'cash') AS payment_method,
					       s.transaction_status, s.receipt_number, s.cashier_id, s.change_given, s.notes,
					       gs.id AS guest_session_id, gs.guest_name
					FROM sales s
					LEFT JOIN guest_session gs ON (
						s.receipt_number IS NOT NULL 
						AND s.receipt_number != '' 
						AND s.receipt_number = gs.receipt_number
					)
					WHERE s.id IN ($placeholders)
				");
				$missingGuestStmt->execute($missingGuestSaleIds);
				$missingGuestSales = $missingGuestStmt->fetchAll();

				// Get Gym Session plan info - use plan_id = 6 first for consistency
				$gymSessionPlan = null;
				try {
					// First try to get plan_id = 6 specifically (most reliable)
					$planStmt = $pdo->prepare("
							SELECT id, plan_name, price, duration_months, duration_days
							FROM member_subscription_plan
							WHERE id = 6
							LIMIT 1
						");
					$planStmt->execute();
					$gymSessionPlan = $planStmt->fetch();

					// If plan_id 6 not found, try to find matching plan by name
					if (!$gymSessionPlan || empty($gymSessionPlan['plan_name'])) {
						$planStmt = $pdo->prepare("
								SELECT id, plan_name, price, duration_months, duration_days
								FROM member_subscription_plan
								WHERE LOWER(plan_name) IN ('gym session', 'day pass', 'walk in', 'session')
								ORDER BY id ASC
								LIMIT 1
							");
						$planStmt->execute();
						$gymSessionPlan = $planStmt->fetch();
					}
				} catch (Exception $e) {
					error_log("Error fetching Gym Session plan: " . $e->getMessage());
				}

				// Add missing guest sales to salesGrouped
				foreach ($missingGuestSales as $guestSale) {
					$saleId = $guestSale['id'];
					$guestName = !empty($guestSale['guest_name']) ? trim($guestSale['guest_name']) : null;

					// If still no guest_name, try to get it from guest_session by receipt_number
					if (empty($guestName) && !empty($guestSale['receipt_number'])) {
						try {
							$gsStmt = $pdo->prepare("SELECT id, guest_name FROM guest_session WHERE receipt_number = ? LIMIT 1");
							$gsStmt->execute([$guestSale['receipt_number']]);
							$gs = $gsStmt->fetch();
							if ($gs && !empty($gs['guest_name'])) {
								$guestName = trim($gs['guest_name']);
								$guestSale['guest_session_id'] = $gs['id'];
							}
						} catch (Exception $e) {
							error_log("Error fetching guest_name for sale $saleId: " . $e->getMessage());
						}
					}

					// Normalize payment method
					$paymentMethod = strtolower(trim($guestSale['payment_method'] ?? 'cash'));
					if ($paymentMethod === 'digital') {
						$paymentMethod = 'gcash';
					}

					// Add to salesGrouped
					$salesGrouped[$saleId] = [
						'id' => $saleId,
						'total_amount' => (float) $guestSale['total_amount'],
						'sale_date' => $guestSale['sale_date'],
						'sale_type' => 'Guest',
						'payment_method' => $paymentMethod,
						'transaction_status' => $guestSale['transaction_status'],
						'receipt_number' => $guestSale['receipt_number'],
						'cashier_id' => $guestSale['cashier_id'],
						'change_given' => (float) $guestSale['change_given'],
						'notes' => $guestSale['notes'],
						'user_id' => $guestSale['user_id'],
						'user_name' => $guestName ?: 'Guest',
						'guest_name' => $guestName,
						'coach_id' => null,
						'coach_name' => null,
						'sales_details' => [],
						'plan_name' => 'Guest Walk In', // Guest sales use this plan name
						'plan_id' => 6, // Use same plan_id for filtering
						'plan_price' => $gymSessionPlan ? (float) $gymSessionPlan['price'] : null
					];

					error_log("DEBUG sales_api FINAL CHECK: ✅ Added missing guest sale ID $saleId: " . ($guestName ?: 'Unknown Guest'));
				}
			}

			// Get Gym Session plan info if not already fetched - use plan_id = 6 first for consistency
			if (!isset($gymSessionPlan)) {
				try {
					// First try to get plan_id = 6 specifically (most reliable)
					$planStmt = $pdo->prepare("
						SELECT id, plan_name, price, duration_months, duration_days
						FROM member_subscription_plan
						WHERE id = 6
						LIMIT 1
					");
					$planStmt->execute();
					$gymSessionPlan = $planStmt->fetch();

					// If plan_id 6 not found, try to find matching plan by name
					if (!$gymSessionPlan || empty($gymSessionPlan['plan_name'])) {
						$planStmt = $pdo->prepare("
							SELECT id, plan_name, price, duration_months, duration_days
							FROM member_subscription_plan
							WHERE LOWER(plan_name) IN ('gym session', 'day pass', 'walk in', 'session')
							ORDER BY id ASC
							LIMIT 1
						");
						$planStmt->execute();
						$gymSessionPlan = $planStmt->fetch();
					}
				} catch (Exception $e) {
					$gymSessionPlan = null;
				}
			}

			// Final pass: Ensure all guest sales in salesGrouped have guest_name and plan_name
			foreach ($salesGrouped as $saleId => $sale) {
				if ($sale['sale_type'] === 'Guest') {
					// Ensure guest_name is populated
					if (empty($sale['guest_name']) && !empty($sale['receipt_number'])) {
						try {
							$gsStmt = $pdo->prepare("SELECT guest_name FROM guest_session WHERE receipt_number = ? LIMIT 1");
							$gsStmt->execute([$sale['receipt_number']]);
							$gs = $gsStmt->fetch();
							if ($gs && !empty($gs['guest_name'])) {
								$salesGrouped[$saleId]['guest_name'] = trim($gs['guest_name']);
								$salesGrouped[$saleId]['user_name'] = trim($gs['guest_name']);
							}
						} catch (Exception $e) {
							// Silent fail
						}
					}

					// Ensure plan_name is set - use plan_id = 6 first for consistency
					if (empty($sale['plan_name'])) {
						// Try to get plan_id = 6 specifically if not already fetched
						if (!$gymSessionPlan) {
							try {
								$planStmt = $pdo->prepare("
									SELECT id, plan_name, price, duration_months, duration_days
									FROM member_subscription_plan
									WHERE id = 6
									LIMIT 1
								");
								$planStmt->execute();
								$gymSessionPlan = $planStmt->fetch();

								// If plan_id 6 not found, try to find matching plan by name
								if (!$gymSessionPlan || empty($gymSessionPlan['plan_name'])) {
									$planStmt = $pdo->prepare("
										SELECT id, plan_name, price, duration_months, duration_days
										FROM member_subscription_plan
										WHERE LOWER(plan_name) IN ('gym session', 'day pass', 'walk in', 'session')
										ORDER BY id ASC
										LIMIT 1
									");
									$planStmt->execute();
									$gymSessionPlan = $planStmt->fetch();
								}
							} catch (Exception $e) {
								error_log("Error fetching Gym Session plan: " . $e->getMessage());
							}
						}
						$salesGrouped[$saleId]['plan_name'] = 'Guest Walk In'; // Guest sales use this plan name
						$salesGrouped[$saleId]['plan_id'] = 6; // Use same plan_id for filtering
					}
				}
			}
		}
	} catch (Exception $e) {
		error_log("Error in final guest sales check: " . $e->getMessage());
		// Don't break the response if this fails
	}

	// Final debug: Count guest sales in grouped results
	$guestCountInGrouped = 0;
	foreach ($salesGrouped as $sale) {
		if ($sale['sale_type'] === 'Guest') {
			$guestCountInGrouped++;
		}
	}
	error_log("DEBUG sales_api FINAL: Guest sales in grouped results: $guestCountInGrouped out of " . count($salesGrouped) . " total sales");

	if ($guestCountInGrouped === 0 && count($guestSalesData) > 0) {
		error_log("DEBUG sales_api ERROR: Guest sales were queried but not in grouped results! Guest sales data count: " . count($guestSalesData));
		// Force add guest sales if they're missing
		foreach ($guestSalesData as $guestSale) {
			$saleId = $guestSale['id'];
			if (!isset($salesGrouped[$saleId])) {
				error_log("DEBUG sales_api: Force adding missing guest sale ID: $saleId");
				$salesGrouped[$saleId] = [
					'id' => $saleId,
					'total_amount' => (float) $guestSale['total_amount'],
					'sale_date' => $guestSale['sale_date'],
					'sale_type' => 'Guest',
					'payment_method' => strtolower($guestSale['payment_method'] ?? 'cash'),
					'transaction_status' => $guestSale['transaction_status'] ?? 'confirmed',
					'receipt_number' => $guestSale['receipt_number'],
					'cashier_id' => $guestSale['cashier_id'],
					'change_given' => (float) ($guestSale['change_given'] ?? 0),
					'notes' => $guestSale['notes'] ?? '',
					'user_id' => null,
					'user_name' => $guestSale['guest_name'] ?? 'Guest',
					'guest_name' => $guestSale['guest_name'] ?? null,
					'coach_id' => null,
					'coach_name' => null,
					'sales_details' => [
						[
							'id' => null,
							'quantity' => 1,
							'price' => (float) $guestSale['total_amount'],
							'guest_session_id' => $guestSale['guest_session_id'] ?? null
						]
					],
					'plan_name' => 'Guest Walk In', // Guest sales use this plan name
					'plan_id' => 6 // Use same plan_id for filtering
				];
			}
		}
		error_log("DEBUG sales_api: After force add, guest sales count: " . count(array_filter($salesGrouped, function ($s) {
			return $s['sale_type'] === 'Guest';
		})));
	}

	// Sort all sales by sale_date DESC (most recent first)
	// This ensures guest sales are mixed in with other sales chronologically
	$finalSales = array_values($salesGrouped);
	usort($finalSales, function ($a, $b) {
		$dateA = strtotime($a['sale_date'] ?? '1970-01-01');
		$dateB = strtotime($b['sale_date'] ?? '1970-01-01');
		return $dateB - $dateA; // DESC order
	});

	error_log("DEBUG sales_api FINAL OUTPUT: Returning " . count($finalSales) . " total sales, including " . count(array_filter($finalSales, function ($s) {
		return $s['sale_type'] === 'Guest';
	})) . " guest sales");

	echo json_encode(["sales" => $finalSales]);
}

function getAnalyticsData($pdo)
{
	$period = $_GET['period'] ?? 'today';
	$saleType = $_GET['sale_type'] ?? 'all';
	$month = $_GET['month'] ?? '';
	$year = $_GET['year'] ?? '';
	$customDate = $_GET['custom_date'] ?? '';
	$startDate = $_GET['start_date'] ?? '';
	$endDate = $_GET['end_date'] ?? '';

	// Build date condition based on period and filters
	$dateCondition = "";
	$params = [];

	// Handle date range first (highest priority)
	if ($startDate || $endDate) {
		$conditions = [];
		if ($startDate) {
			$conditions[] = "DATE(sale_date) >= ?";
			$params[] = $startDate;
		}
		if ($endDate) {
			$conditions[] = "DATE(sale_date) <= ?";
			$params[] = $endDate;
		}
		$dateCondition = implode(" AND ", $conditions);
	} elseif ($customDate) {
		$dateCondition = "DATE(sale_date) = ?";
		$params[] = $customDate;
	} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
		// Specific month and year
		$dateCondition = "MONTH(sale_date) = ? AND YEAR(sale_date) = ?";
		$params[] = $month;
		$params[] = $year;
	} elseif ($month && $month !== 'all') {
		// Specific month (current year)
		$dateCondition = "MONTH(sale_date) = ? AND YEAR(sale_date) = YEAR(CURDATE())";
		$params[] = $month;
	} elseif ($year && $year !== 'all') {
		// Specific year
		$dateCondition = "YEAR(sale_date) = ?";
		$params[] = $year;
	} else {
		// Default period filters
		switch ($period) {
			case 'today':
				$dateCondition = "DATE(sale_date) = CURDATE()";
				break;
			case 'week':
				$dateCondition = "sale_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)";
				break;
			case 'month':
				$dateCondition = "MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE())";
				break;
			case 'year':
				$dateCondition = "YEAR(sale_date) = YEAR(CURDATE())";
				break;
			default:
				$dateCondition = "DATE(sale_date) = CURDATE()";
		}
	}

	// Build sale type condition
	$saleTypeCondition = "";
	if ($saleType !== 'all') {
		$saleTypeCondition = " AND sale_type = ?";
		$params[] = $saleType;
	}

	// Get period sales (filtered by sale type if specified)
	$stmt = $pdo->prepare("
		SELECT COALESCE(SUM(total_amount), 0) AS period_sales
		FROM `sales`
		WHERE $dateCondition $saleTypeCondition
	");
	$stmt->execute($params);
	$periodSales = $stmt->fetch()['period_sales'];

	// Get products sold in period (only for product sales)
	$productParams = $params;
	$productCondition = $saleTypeCondition;
	if ($saleType === 'all') {
		$productCondition .= " AND s.sale_type = 'Product'";
	} elseif ($saleType !== 'Product') {
		$productCondition = " AND s.sale_type = 'Product'";
		$productParams = [];
	}

	$stmt = $pdo->prepare("
		SELECT COALESCE(SUM(sd.quantity), 0) AS products_sold_period
		FROM `sales` s
		JOIN `sales_details` sd ON s.id = sd.sale_id
		WHERE $dateCondition $productCondition
	");
	$stmt->execute($productParams);
	$productsSoldPeriod = $stmt->fetch()['products_sold_period'];

	// Get all sales types from the sales table
	// Try multiple possible sale_type values for coach and walk-in
	// NOTE: Coach assignments are stored as 'Coaching' in the database
	// Build params array for this query (excluding saleType param)
	$salesBreakdownParams = [];

	// Build date params for sales breakdown (use same date condition as period sales)
	// Rebuild params array for sales breakdown query (same date params, no saleType param)
	$salesBreakdownParams = [];

	// Handle date range first (highest priority)
	if ($startDate || $endDate) {
		if ($startDate) {
			$salesBreakdownParams[] = $startDate;
		}
		if ($endDate) {
			$salesBreakdownParams[] = $endDate;
		}
	} elseif ($customDate) {
		$salesBreakdownParams[] = $customDate;
	} elseif ($month && $month !== 'all' && $year && $year !== 'all') {
		$salesBreakdownParams[] = $month;
		$salesBreakdownParams[] = $year;
	} elseif ($month && $month !== 'all') {
		$salesBreakdownParams[] = $month;
	} elseif ($year && $year !== 'all') {
		$salesBreakdownParams[] = $year;
	}

	$whereClause = $dateCondition ? "WHERE $dateCondition" : "";

	$stmt = $pdo->prepare("
		SELECT 
			COALESCE(SUM(CASE WHEN sale_type = 'Product' THEN total_amount ELSE 0 END), 0) AS product_sales,
			COALESCE(SUM(CASE WHEN sale_type = 'Subscription' OR sale_type = 'Guest' THEN total_amount ELSE 0 END), 0) AS subscription_sales,
			COALESCE(SUM(CASE WHEN sale_type IN ('Coaching', 'Coach Assignment', 'Coach') THEN total_amount ELSE 0 END), 0) AS coach_assignment_sales,
			COALESCE(SUM(CASE WHEN sale_type = 'Guest' THEN total_amount ELSE 0 END), 0) AS walkin_sales
		FROM `sales`
		$whereClause
	");
	$stmt->execute($salesBreakdownParams);
	$salesBreakdown = $stmt->fetch();
	$coachSales = (float) $salesBreakdown['coach_assignment_sales'];
	$walkinSales = (float) $salesBreakdown['walkin_sales'];

	// Get low stock items (only relevant for product sales) - exclude archived products
	$stmt = $pdo->prepare("
		SELECT COUNT(*) AS low_stock_count
		FROM `product`
		WHERE stock <= 10
		AND (is_archived = 0 OR is_archived IS NULL)
	");
	$stmt->execute();
	$lowStockItems = $stmt->fetch()['low_stock_count'];

	// Get total revenue (all time)
	$stmt = $pdo->prepare("
		SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
		FROM `sales`
	");
	$stmt->execute();
	$totalRevenue = $stmt->fetch()['total_revenue'];

	echo json_encode([
		"analytics" => [
			"todaysSales" => (float) $periodSales,
			"productsSoldToday" => (int) $productsSoldPeriod,
			"lowStockItems" => (int) $lowStockItems,
			"monthlyRevenue" => (float) $totalRevenue,
			"productSales" => (float) $salesBreakdown['product_sales'],
			"subscriptionSales" => (float) $salesBreakdown['subscription_sales'],
			"coachAssignmentSales" => (float) $coachSales,
			"walkinSales" => (float) $walkinSales,
			"totalSales" => (float) $periodSales,
			"totalProductSales" => (float) $salesBreakdown['product_sales'],
			"totalSubscriptionSales" => (float) $salesBreakdown['subscription_sales']
		]
	]);
}

function getAllData($pdo)
{
	$products = [];

	$stmt = $pdo->query("SELECT * FROM `product` ORDER BY category, name");
	$products = $stmt->fetchAll();

	echo json_encode([
		"products" => $products ?: []
	]);
}

function createSale($pdo, $data)
{
	if (!isset($data['total_amount'], $data['sale_type'], $data['sales_details'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required fields"]);
		return;
	}

	// POS fields with defaults
	$paymentMethod = $data['payment_method'] ?? 'cash';
	$transactionStatus = $data['transaction_status'] ?? 'confirmed';
	$receiptNumber = $data['receipt_number'] ?? generateReceiptNumber($pdo);
	$cashierId = $data['cashier_id'] ?? $data['staff_id'] ?? $_GET['staff_id'] ?? $_SESSION['user_id'] ?? null;
	$changeGiven = $data['change_given'] ?? 0.00;
	$notes = $data['notes'] ?? '';

	// Get reference number for GCash/digital payments (check both reference_number and gcash_reference)
	$referenceNumber = $data['reference_number'] ?? $data['gcash_reference'] ?? null;
	// Only set reference number if payment method is digital/gcash and reference is provided
	if (($paymentMethod === 'digital' || $paymentMethod === 'gcash') && !empty($referenceNumber)) {
		$referenceNumber = trim($referenceNumber);
	} else {
		$referenceNumber = null;
	}

	// Debug logging for cashier_id
	error_log("Sales API - Cashier ID: $cashierId, Data cashier_id: " . ($data['cashier_id'] ?? 'null') . ", Data staff_id: " . ($data['staff_id'] ?? 'null') . ", GET staff_id: " . ($_GET['staff_id'] ?? 'null') . ", Session user_id: " . ($_SESSION['user_id'] ?? 'null'));

	$pdo->beginTransaction();

	try {
		$stmt = $pdo->prepare("
			INSERT INTO `sales` (user_id, total_amount, sale_type, sale_date, payment_method, transaction_status, receipt_number, cashier_id, change_given, notes, reference_number)
			VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
		");
		$stmt->execute([
			$data['user_id'] ?? null,
			$data['total_amount'],
			$data['sale_type'],
			$paymentMethod,
			$transactionStatus,
			$receiptNumber,
			$cashierId,
			$changeGiven,
			$notes,
			$referenceNumber
		]);

		$saleId = $pdo->lastInsertId();

		foreach ($data['sales_details'] as $detail) {
			$stmt = $pdo->prepare("
				INSERT INTO `sales_details` (sale_id, product_id, subscription_id, quantity, price)
				VALUES (?, ?, ?, ?, ?)
			");
			$stmt->execute([
				$saleId,
				$detail['product_id'] ?? null,
				$detail['subscription_id'] ?? null,
				$detail['quantity'] ?? null,
				$detail['price']
			]);

			if (isset($detail['product_id']) && isset($detail['quantity'])) {
				$stmt = $pdo->prepare("
					UPDATE `product`
					SET stock = stock - ?
					WHERE id = ? AND stock >= ?
				");
				$stmt->execute([
					$detail['quantity'],
					$detail['product_id'],
					$detail['quantity']
				]);

				if ($stmt->rowCount() === 0) {
					throw new Exception("Insufficient stock for product ID: " . $detail['product_id']);
				}
			}
		}

		$pdo->commit();

		// Get product names for logging
		$productNames = [];
		foreach ($data['sales_details'] as $detail) {
			if (isset($detail['product_id'])) {
				$productStmt = $pdo->prepare("SELECT name FROM product WHERE id = ?");
				$productStmt->execute([$detail['product_id']]);
				$product = $productStmt->fetch();
				if ($product) {
					$productNames[] = $product['name'] . " (x{$detail['quantity']})";
				}
			}
		}
		$productList = !empty($productNames) ? implode(", ", $productNames) : "Subscription/Service";

		// Log activity using centralized logger (same as monitor_subscription.php)
		$staffId = $data['staff_id'] ?? null;
		error_log("DEBUG Sales - staffId: " . ($staffId ?? 'NULL') . " from request data");
		error_log("DEBUG Sales - Full request data: " . json_encode($data));
		logStaffActivity($pdo, $staffId, "Process POS Sale", "POS Sale completed: {$productList} - Total: ₱{$data['total_amount']}, Payment: {$paymentMethod}, Receipt: {$receiptNumber}", "Sales");

		http_response_code(201);
		echo json_encode([
			"success" => "Sale created successfully",
			"sale_id" => $saleId,
			"receipt_number" => $receiptNumber,
			"payment_method" => $paymentMethod,
			"transaction_status" => $transactionStatus
		]);

	} catch (Exception $e) {
		$pdo->rollBack();
		http_response_code(400);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function addProduct($pdo, $data)
{
	if (!isset($data['name'], $data['price'], $data['stock'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required fields"]);
		return;
	}

	$category = $data['category'] ?? 'Uncategorized';
	$stmt = $pdo->prepare("INSERT INTO `product` (name, price, stock, category) VALUES (?, ?, ?, ?)");
	$stmt->execute([
		$data['name'],
		$data['price'],
		$data['stock'],
		$category
	]);

	$productId = $pdo->lastInsertId();

	// Log activity using dedicated logging file
	$userId = $_SESSION['user_id'] ?? null;
	$logUrl = "https://api.cnergy.site/log_activity.php?action=Add%20Product&details=" . urlencode("New product added: {$data['name']} - Price: ₱{$data['price']}, Stock: {$data['stock']}, Category: {$category}");
	if ($userId) {
		$logUrl .= "&user_id=" . $userId;
	}
	file_get_contents($logUrl);

	http_response_code(201);
	echo json_encode(["success" => "Product added successfully", "product_id" => $productId]);
}

function updateProductStock($pdo, $data)
{
	if (!isset($data['product_id'], $data['quantity'], $data['type'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required fields"]);
		return;
	}

	$quantity = (int) $data['quantity'];
	$productId = (int) $data['product_id'];
	$type = $data['type']; // 'add' or 'remove'

	if ($type === 'add') {
		$stmt = $pdo->prepare("UPDATE `product` SET stock = stock + ? WHERE id = ?");
	} else {
		$stmt = $pdo->prepare("UPDATE `product` SET stock = GREATEST(0, stock - ?) WHERE id = ?");
	}

	$stmt->execute([$quantity, $productId]);

	if ($stmt->rowCount() > 0) {
		// Log activity using dedicated logging file
		$productStmt = $pdo->prepare("SELECT name FROM product WHERE id = ?");
		$productStmt->execute([$productId]);
		$product = $productStmt->fetch();
		$productName = $product ? $product['name'] : "Product ID: {$productId}";

		$userId = $_SESSION['user_id'] ?? null;
		$logUrl = "https://api.cnergy.site/log_activity.php?action=Update%20Stock&details=" . urlencode("Stock updated for {$productName}: {$type} {$quantity} units");
		if ($userId) {
			$logUrl .= "&user_id=" . $userId;
		}
		file_get_contents($logUrl);

		echo json_encode(["success" => "Stock updated successfully"]);
	} else {
		http_response_code(404);
		echo json_encode(["error" => "Product not found"]);
	}
}

function updateProduct($pdo, $data)
{
	if (!isset($data['id'], $data['name'], $data['price'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required fields"]);
		return;
	}

	$category = $data['category'] ?? 'Uncategorized';
	$stmt = $pdo->prepare("UPDATE `product` SET name = ?, price = ?, category = ? WHERE id = ?");
	$stmt->execute([
		$data['name'],
		$data['price'],
		$category,
		$data['id']
	]);

	if ($stmt->rowCount() > 0) {
		// Log activity using dedicated logging file
		$userId = $_SESSION['user_id'] ?? null;
		$logUrl = "https://api.cnergy.site/log_activity.php?action=Update%20Product&details=" . urlencode("Product updated: {$data['name']} - Price: ₱{$data['price']}, Category: {$category}");
		if ($userId) {
			$logUrl .= "&user_id=" . $userId;
		}
		file_get_contents($logUrl);

		echo json_encode(["success" => "Product updated successfully"]);
	} else {
		http_response_code(404);
		echo json_encode(["error" => "Product not found"]);
	}
}

function archiveProduct($pdo, $data)
{
	if (!isset($data['id']) || !is_numeric($data['id'])) {
		http_response_code(400);
		echo json_encode(["error" => "Invalid product ID"]);
		return;
	}

	try {
		// Get product details before archiving for logging
		$productStmt = $pdo->prepare("SELECT name, price, category FROM product WHERE id = ?");
		$productStmt->execute([$data['id']]);
		$product = $productStmt->fetch();

		if (!$product) {
			throw new Exception("Product not found");
		}

		// Archive the product instead of deleting (preserve sales data)
		// First check if is_archived column exists, if not, add it
		$checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `product` LIKE 'is_archived'");
		if ($checkColumnStmt->rowCount() == 0) {
			// Add is_archived column if it doesn't exist
			$pdo->exec("ALTER TABLE `product` ADD COLUMN `is_archived` TINYINT(1) DEFAULT 0");
			$pdo->exec("ALTER TABLE `product` ADD INDEX `idx_is_archived` (`is_archived`)");
		}

		// Update product to archived status
		$stmt = $pdo->prepare("UPDATE `product` SET `is_archived` = 1 WHERE id = ?");
		$stmt->execute([$data['id']]);

		if ($stmt->rowCount() > 0) {
			// Log activity
			$productName = $product['name'];
			$userId = $_SESSION['user_id'] ?? null;
			$logUrl = "https://api.cnergy.site/log_activity.php?action=Archive%20Product&details=" . urlencode("Product archived: {$productName} - Price: ₱{$product['price']}, Category: {$product['category']}");
			if ($userId) {
				$logUrl .= "&user_id=" . $userId;
			}
			file_get_contents($logUrl);

			echo json_encode(["success" => "Product archived successfully"]);
		} else {
			throw new Exception("Product not found");
		}
	} catch (Exception $e) {
		http_response_code(404);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function restoreProduct($pdo, $data)
{
	if (!isset($data['id']) || !is_numeric($data['id'])) {
		http_response_code(400);
		echo json_encode(["error" => "Invalid product ID"]);
		return;
	}

	try {
		// Check if is_archived column exists, if not, add it
		$checkColumnStmt = $pdo->query("SHOW COLUMNS FROM `product` LIKE 'is_archived'");
		if ($checkColumnStmt->rowCount() == 0) {
			// Add is_archived column if it doesn't exist
			$pdo->exec("ALTER TABLE `product` ADD COLUMN `is_archived` TINYINT(1) DEFAULT 0");
			$pdo->exec("ALTER TABLE `product` ADD INDEX `idx_is_archived` (`is_archived`)");
		}

		// Get product details before restoring for logging
		$productStmt = $pdo->prepare("SELECT name, price, category FROM product WHERE id = ?");
		$productStmt->execute([$data['id']]);
		$product = $productStmt->fetch();

		if (!$product) {
			throw new Exception("Product not found");
		}

		// Restore the product (set is_archived to 0)
		$stmt = $pdo->prepare("UPDATE `product` SET `is_archived` = 0 WHERE id = ?");
		$stmt->execute([$data['id']]);

		if ($stmt->rowCount() > 0) {
			// Log activity
			$productName = $product['name'];
			$userId = $_SESSION['user_id'] ?? null;
			$logUrl = "https://api.cnergy.site/log_activity.php?action=Restore%20Product&details=" . urlencode("Product restored: {$productName} - Price: ₱{$product['price']}, Category: {$product['category']}");
			if ($userId) {
				$logUrl .= "&user_id=" . $userId;
			}
			file_get_contents($logUrl);

			echo json_encode(["success" => "Product restored successfully"]);
		} else {
			throw new Exception("Product not found");
		}
	} catch (Exception $e) {
		http_response_code(404);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

// POS Functions
function generateReceiptNumber($pdo)
{
	do {
		$receiptNumber = 'RCP' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

		$stmt = $pdo->prepare("SELECT COUNT(*) FROM sales WHERE receipt_number = ?");
		$stmt->execute([$receiptNumber]);
		$count = $stmt->fetchColumn();
	} while ($count > 0);

	return $receiptNumber;
}

function createPOSSale($pdo, $data)
{
	// Enhanced POS sale with transaction confirmation
	if (!isset($data['total_amount'], $data['sale_type'], $data['sales_details'], $data['payment_method'])) {
		http_response_code(400);
		echo json_encode(["error" => "Missing required POS fields"]);
		return;
	}

	$paymentMethod = $data['payment_method'];
	$amountReceived = $data['amount_received'] ?? $data['total_amount'];
	$changeGiven = max(0, $amountReceived - $data['total_amount']);
	$receiptNumber = generateReceiptNumber($pdo);
	$cashierId = $data['cashier_id'] ?? $data['staff_id'] ?? $_GET['staff_id'] ?? $_SESSION['user_id'] ?? null;
	$notes = $data['notes'] ?? '';

	// Get reference number for GCash/digital payments (check both reference_number and gcash_reference)
	$referenceNumber = $data['reference_number'] ?? $data['gcash_reference'] ?? null;
	// Only set reference number if payment method is digital/gcash and reference is provided
	if (($paymentMethod === 'digital' || $paymentMethod === 'gcash') && !empty($referenceNumber)) {
		$referenceNumber = trim($referenceNumber);
	} else {
		$referenceNumber = null;
	}

	$pdo->beginTransaction();

	try {
		$stmt = $pdo->prepare("
			INSERT INTO `sales` (user_id, total_amount, sale_type, sale_date, payment_method, transaction_status, receipt_number, cashier_id, change_given, notes, reference_number)
			VALUES (?, ?, ?, NOW(), ?, 'confirmed', ?, ?, ?, ?, ?)
		");
		$stmt->execute([
			$data['user_id'] ?? null,
			$data['total_amount'],
			$data['sale_type'],
			$paymentMethod,
			$receiptNumber,
			$cashierId,
			$changeGiven,
			$notes,
			$referenceNumber
		]);

		$saleId = $pdo->lastInsertId();

		foreach ($data['sales_details'] as $detail) {
			$stmt = $pdo->prepare("
				INSERT INTO `sales_details` (sale_id, product_id, subscription_id, quantity, price)
				VALUES (?, ?, ?, ?, ?)
			");
			$stmt->execute([
				$saleId,
				$detail['product_id'] ?? null,
				$detail['subscription_id'] ?? null,
				$detail['quantity'] ?? null,
				$detail['price']
			]);

			if (isset($detail['product_id']) && isset($detail['quantity'])) {
				$stmt = $pdo->prepare("
					UPDATE `product`
					SET stock = stock - ?
					WHERE id = ? AND stock >= ?
				");
				$stmt->execute([
					$detail['quantity'],
					$detail['product_id'],
					$detail['quantity']
				]);

				if ($stmt->rowCount() === 0) {
					throw new Exception("Insufficient stock for product ID: " . $detail['product_id']);
				}
			}
		}

		$pdo->commit();

		// Log activity using centralized logger (same as monitor_subscription.php)
		$staffId = $data['staff_id'] ?? null;
		error_log("DEBUG Sales POS - staffId: " . ($staffId ?? 'NULL') . " from request data");
		error_log("DEBUG Sales POS - Full request data: " . json_encode($data));
		logStaffActivity($pdo, $staffId, "Process POS Sale", "POS Sale completed: Total: ₱{$data['total_amount']}, Payment: {$paymentMethod}, Receipt: {$receiptNumber}, Change: ₱{$changeGiven}", "Sales");

		http_response_code(201);
		echo json_encode([
			"success" => "POS transaction completed successfully",
			"sale_id" => $saleId,
			"receipt_number" => $receiptNumber,
			"payment_method" => $paymentMethod,
			"change_given" => $changeGiven,
			"transaction_status" => "confirmed"
		]);

	} catch (Exception $e) {
		$pdo->rollBack();
		http_response_code(400);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function confirmTransaction($pdo, $data)
{
	if (!isset($data['sale_id'])) {
		http_response_code(400);
		echo json_encode(["error" => "Sale ID is required"]);
		return;
	}

	$saleId = $data['sale_id'];
	$paymentMethod = $data['payment_method'] ?? 'cash';
	$amountReceived = $data['amount_received'] ?? null;

	try {
		// Get current sale details
		$stmt = $pdo->prepare("SELECT total_amount, change_given FROM sales WHERE id = ?");
		$stmt->execute([$saleId]);
		$sale = $stmt->fetch();

		if (!$sale) {
			throw new Exception("Sale not found");
		}

		$changeGiven = 0;
		if ($amountReceived !== null) {
			$changeGiven = max(0, $amountReceived - $sale['total_amount']);
		}

		$stmt = $pdo->prepare("
			UPDATE sales 
			SET payment_method = ?, transaction_status = 'confirmed', change_given = ?
			WHERE id = ?
		");
		$stmt->execute([$paymentMethod, $changeGiven, $saleId]);

		// Log activity
		$userId = $_SESSION['user_id'] ?? null;
		$logUrl = "https://api.cnergy.site/log_activity.php?action=Confirm%20Transaction&details=" . urlencode("Transaction confirmed - Sale ID: {$saleId}, Payment: {$paymentMethod}, Change: ₱{$changeGiven}");
		if ($userId) {
			$logUrl .= "&user_id=" . $userId;
		}
		file_get_contents($logUrl);

		echo json_encode([
			"success" => "Transaction confirmed successfully",
			"sale_id" => $saleId,
			"payment_method" => $paymentMethod,
			"change_given" => $changeGiven
		]);

	} catch (Exception $e) {
		http_response_code(400);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function editTransaction($pdo, $data)
{
	if (!isset($data['sale_id'])) {
		http_response_code(400);
		echo json_encode(["error" => "Sale ID is required"]);
		return;
	}

	$saleId = $data['sale_id'];
	$pdo->beginTransaction();

	try {
		// Update sale details
		$updateFields = [];
		$params = [];

		if (isset($data['payment_method'])) {
			$updateFields[] = "payment_method = ?";
			$params[] = $data['payment_method'];
		}

		if (isset($data['amount_received'])) {
			$stmt = $pdo->prepare("SELECT total_amount FROM sales WHERE id = ?");
			$stmt->execute([$saleId]);
			$sale = $stmt->fetch();

			if ($sale) {
				$changeGiven = max(0, $data['amount_received'] - $sale['total_amount']);
				$updateFields[] = "change_given = ?";
				$params[] = $changeGiven;
			}
		}

		if (isset($data['notes'])) {
			$updateFields[] = "notes = ?";
			$params[] = $data['notes'];
		}

		if (!empty($updateFields)) {
			$params[] = $saleId;
			$stmt = $pdo->prepare("UPDATE sales SET " . implode(", ", $updateFields) . " WHERE id = ?");
			$stmt->execute($params);
		}

		$pdo->commit();

		// Log activity
		$userId = $_SESSION['user_id'] ?? null;
		$logUrl = "https://api.cnergy.site/log_activity.php?action=Edit%20Transaction&details=" . urlencode("Transaction edited - Sale ID: {$saleId}");
		if ($userId) {
			$logUrl .= "&user_id=" . $userId;
		}
		file_get_contents($logUrl);

		echo json_encode([
			"success" => "Transaction updated successfully",
			"sale_id" => $saleId
		]);

	} catch (Exception $e) {
		$pdo->rollBack();
		http_response_code(400);
		echo json_encode(["error" => $e->getMessage()]);
	}
}

function getCoachSales($pdo)
{
	// Get all coaches info with their user details
	$stmt = $pdo->query("
		SELECT c.*, 
		       CONCAT_WS(' ', u.fname, u.mname, u.lname) AS coach_name
		FROM coaches c
		LEFT JOIN user u ON c.user_id = u.id
		ORDER BY c.id
	");
	$coaches = $stmt->fetchAll();

	// Get all coaching sales from sales table with coach info
	$salesStmt = $pdo->query("
		SELECT s.id AS sale_id,
		       s.user_id,
		       s.total_amount AS amount,
		       s.sale_date,
		       s.receipt_number,
		       s.payment_method,
		       CONCAT_WS(' ', u_member.fname, u_member.mname, u_member.lname) AS member_name,
		       cml.coach_id,
		       cml.rate_type,
		       CONCAT_WS(' ', u_coach.fname, u_coach.mname, u_coach.lname) AS coach_name,
		       c.id AS coach_table_id,
		       c.user_id AS coach_user_id
		FROM sales s
		LEFT JOIN user u_member ON s.user_id = u_member.id
		LEFT JOIN coach_member_list cml ON s.user_id = cml.member_id 
			AND s.sale_type = 'Coaching'
			AND cml.id = (
				SELECT cml2.id
				FROM coach_member_list cml2
				WHERE cml2.member_id = s.user_id
				ORDER BY 
					CASE 
						WHEN cml2.staff_approved_at IS NOT NULL AND DATE(cml2.staff_approved_at) <= DATE(s.sale_date) THEN 0
						WHEN cml2.requested_at IS NOT NULL AND DATE(cml2.requested_at) <= DATE(s.sale_date) THEN 1
						ELSE 2
					END,
					COALESCE(cml2.staff_approved_at, cml2.requested_at, '1970-01-01') DESC,
					cml2.id DESC
				LIMIT 1
			)
		LEFT JOIN coaches c ON cml.coach_id = c.user_id
		LEFT JOIN user u_coach ON c.user_id = u_coach.id
		WHERE s.sale_type = 'Coaching'
		ORDER BY s.sale_date DESC
	");

	$allSales = $salesStmt->fetchAll();

	// Group sales by coach
	$coachSalesMap = [];
	foreach ($allSales as $sale) {
		$coachUserId = $sale['coach_user_id'] ?? null;
		if (!$coachUserId) {
			// If no coach assigned, skip or handle separately
			continue;
		}

		if (!isset($coachSalesMap[$coachUserId])) {
			$coachSalesMap[$coachUserId] = [];
		}

		// Format sale for frontend
		$coachSalesMap[$coachUserId][] = [
			'sale_id' => (int) $sale['sale_id'],
			'item' => $sale['member_name'] ?? 'N/A', // Use member name as item
			'amount' => floatval($sale['amount']),
			'sale_date' => $sale['sale_date'],
			'rate_type' => $sale['rate_type'] ?? 'monthly',
			'receipt_number' => $sale['receipt_number'],
			'payment_method' => $sale['payment_method'] ?? 'cash',
			'member_name' => $sale['member_name'] ?? 'N/A',
			'member_id' => (int) $sale['user_id']
		];
	}

	// Build output array with coaches and their sales
	$out = [];
	foreach ($coaches as $coach) {
		$coachUserId = $coach['user_id'];

		// Core profile info for frontend
		$coachObj = [
			'user_id' => $coach['user_id'],
			'id' => $coach['id'],
			'name' => $coach['coach_name'] ?? trim(($coach['specialty'] ? $coach['specialty'] . ' ' : '') . $coach['id']),
			'specialty' => $coach['specialty'],
			'monthly_rate' => floatval($coach['monthly_rate'] ?? 0),
			'per_session_rate' => floatval($coach['per_session_rate'] ?? 0),
			'rating' => floatval($coach['rating'] ?? 0),
			'image_url' => $coach['image_url'] ?? '',
			'sales' => $coachSalesMap[$coachUserId] ?? []
		];
		$out[] = $coachObj;
	}

	echo json_encode(['coaches' => $out], JSON_UNESCAPED_UNICODE);
}
?>