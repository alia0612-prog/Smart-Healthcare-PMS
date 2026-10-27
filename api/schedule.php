<?php
// Debugging outputs output buffer me capture honge taake JSON corrupt na ho
ob_start();

ini_set('display_errors', 0);
error_reporting(0);

header("Content-Type: application/json; charset=UTF-8");

// Database file inclusion (Dono `db.php` aur `config/db.php` paths check honge)
if (file_exists(__DIR__ . "/db.php")) {
    require_once __DIR__ . "/db.php";
} elseif (file_exists(__DIR__ . "/../config/db.php")) {
    require_once __DIR__ . "/../config/db.php";
} else {
    ob_clean();
    echo json_encode(["success" => false, "message" => "db.php connection file missing."]);
    exit;
}

// PDO object check ($pdo expected from db.php)
if (!isset($pdo)) {
    ob_clean();
    echo json_encode(["success" => false, "message" => "Database connection variable \$pdo is not set."]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// --------------------------------------------------
// 1. GET REQUEST: FETCH ALL ACTIVITIES
// --------------------------------------------------
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM schedule_activities ORDER BY start_week ASC");
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);

        ob_clean();
        echo json_encode([
            "success" => true,
            "activities" => $activities
        ]);
    } catch (PDOException $e) {
        ob_clean();
        echo json_encode([
            "success" => true,
            "activities" => [],
            "error" => $e->getMessage()
        ]);
    }
    exit;
}

// --------------------------------------------------
// 2. POST REQUEST: ADD NEW ACTIVITY
// --------------------------------------------------
if ($method === 'POST') {
    $rawInput = file_get_contents("php://input");
    $data = json_decode($rawInput, true);

    if (!$data || empty($data['activity_name']) || empty($data['assigned_to'])) {
        ob_clean();
        echo json_encode(["success" => false, "message" => "Required fields are missing."]);
        exit;
    }

    $activity_name = trim($data['activity_name']);
    $assigned_to   = trim($data['assigned_to']);
    $duration_weeks = intval($data['duration_weeks']);
    $start_week     = intval($data['start_week']);

    try {
        $sql = "INSERT INTO schedule_activities (activity_name, assigned_to, duration_weeks, start_week) 
                VALUES (:activity_name, :assigned_to, :duration_weeks, :start_week)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':activity_name'  => $activity_name,
            ':assigned_to'    => $assigned_to,
            ':duration_weeks' => $duration_weeks,
            ':start_week'     => $start_week
        ]);

        ob_clean();
        echo json_encode([
            "success" => true,
            "message" => "Activity added successfully!"
        ]);
    } catch (PDOException $e) {
        ob_clean();
        echo json_encode([
            "success" => false,
            "message" => "Database Error: " . $e->getMessage()
        ]);
    }
    exit;
}

ob_clean();
echo json_encode(["success" => false, "message" => "Invalid Request Method"]);
exit;
?>