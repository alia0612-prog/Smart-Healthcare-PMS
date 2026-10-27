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

$method = $_SERVER['REQUEST_METHOD'];

// GET: Load Defects & Risks
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM defects_risks ORDER BY id DESC");
        $items = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
        
        ob_clean();
        echo json_encode(["success" => true, "items" => $items]);
    } catch (PDOException $e) {
        ob_clean();
        echo json_encode(["success" => true, "items" => [], "error" => $e->getMessage()]);
    }
    exit;
}

// POST: Add or Resolve Item
if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    try {
        if (isset($data['action']) && $data['action'] === 'resolve') {
            $stmt = $pdo->prepare("UPDATE defects_risks SET status = 'Resolved' WHERE id = :id");
            $stmt->execute([':id' => $data['id']]);
            
            ob_clean();
            echo json_encode(["success" => true, "message" => "Status updated to Resolved!"]);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO defects_risks (title, category, severity, assigned_to) VALUES (:title, :category, :severity, :assigned_to)");
        $stmt->execute([
            ':title'       => $data['title'] ?? '',
            ':category'    => $data['category'] ?? 'Defect',
            ':severity'    => $data['severity'] ?? 'Medium',
            ':assigned_to' => $data['assigned_to'] ?? ''
        ]);
        
        ob_clean();
        echo json_encode(["success" => true, "message" => "Record added successfully!"]);
    } catch (PDOException $e) {
        ob_clean();
        echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
    }
    exit;
}

ob_clean();
echo json_encode(["success" => false, "message" => "Invalid Request Method"]);
exit;
?>