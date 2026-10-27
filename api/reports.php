<?php
ob_start();
ini_set('display_errors', 0);
error_reporting(0);

header("Content-Type: application/json; charset=UTF-8");

if (file_exists(__DIR__ . "/db.php")) {
    require_once __DIR__ . "/db.php";
} elseif (file_exists(__DIR__ . "/../config/db.php")) {
    require_once __DIR__ . "/../config/db.php";
} else {
    ob_clean();
    echo json_encode(["success" => false, "message" => "db.php connection file missing."]);
    exit;
}

if (!isset($pdo)) {
    ob_clean();
    echo json_encode(["success" => false, "message" => "Database connection variable \$pdo is not set."]);
    exit;
}

function getPDOValue($pdo, $sql, $default = 0) {
    try {
        $stmt = $pdo->query($sql);
        if ($stmt && $row = $stmt->fetch(PDO::FETCH_NUM)) {
            return intval($row[0]);
        }
    } catch (Exception $e) {
        return $default;
    }
    return $default;
}

// 1. Fetch Project Details
$projectName = "Smart Healthcare PMS";
$budget = 5000000;
$duration = 16;

try {
    $projectStmt = $pdo->query("SELECT project_name, approved_budget, baseline_weeks FROM project_initiation LIMIT 1");
    if ($projectStmt && $row = $projectStmt->fetch(PDO::FETCH_ASSOC)) {
        $projectName = $row['project_name'] ?? $projectName;
        $budget = $row['approved_budget'] ?? $budget;
        $duration = $row['baseline_weeks'] ?? $duration;
    }
} catch (Exception $e) {
    // Fallback defaults stay active
}

// 2. Fetch Requirements Stats
$totalReq = getPDOValue($pdo, "SELECT COUNT(*) FROM scope_requirements", 0);
$approvedReq = getPDOValue($pdo, "SELECT COUNT(*) FROM scope_requirements WHERE status='Approved'", 0);

// 3. Fetch Critical Unresolved Defects Stats
$criticalDefects = getPDOValue($pdo, "SELECT COUNT(*) FROM defects_risks WHERE status != 'Resolved' AND severity='Critical'", 0);

ob_clean();
echo json_encode([
    "success" => true,
    "report" => [
        "project_name" => $projectName,
        "budget" => floatval($budget),
        "duration" => intval($duration),
        "total_requirements" => intval($totalReq),
        "approved_requirements" => intval($approvedReq),
        "critical_open_defects" => intval($criticalDefects)
    ]
]);
exit;
?>