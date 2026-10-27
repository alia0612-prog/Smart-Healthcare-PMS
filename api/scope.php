
<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(204);
    exit;
}

require_once __DIR__ . "/db.php";

function respond($success, $message, $data = [], $code = 200) {
    http_response_code($code);
    echo json_encode(array_merge([
        "success" => $success,
        "message" => $message
    ], $data));
    exit;
}

try {
    // GET: Load requirements and change requests
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        $requirements = $pdo->query(
            "SELECT id, project_id, title, description,
                    priority, status, approved, created_at
             FROM requirements
             WHERE project_id = 1
             ORDER BY id DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        $changes = $pdo->query(
            "SELECT id, project_id, title, justification,
                    cost_impact, schedule_impact_weeks,
                    status, decision_notes, created_at
             FROM change_requests
             WHERE project_id = 1
             ORDER BY id DESC"
        )->fetchAll(PDO::FETCH_ASSOC);

        respond(true, "Scope data loaded successfully.", [
            "requirements" => $requirements,
            "change_requests" => $changes
        ]);
    }

    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        respond(false, "Method not allowed.", [], 405);
    }

    $input = json_decode(file_get_contents("php://input"), true);

    if (!is_array($input)) {
        respond(false, "Invalid JSON request.", [], 400);
    }

    $action = $input["action"] ?? "";

    // Create a new requirement
    if ($action === "create_requirement") {
        $title = trim($input["title"] ?? "");
        $description = trim($input["description"] ?? "");
        $priority = $input["priority"] ?? "Medium";

        if ($title === "") {
            respond(false, "Requirement title is required.", [], 422);
        }

        if (!in_array($priority, ["High", "Medium", "Low"], true)) {
            respond(false, "Invalid priority.", [], 422);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO requirements
             (project_id, title, description, priority, status, approved)
             VALUES (1, ?, ?, ?, 'Proposed', 0)"
        );

        $stmt->execute([$title, $description, $priority]);

        respond(true, "Requirement added as Proposed.", [
            "id" => $pdo->lastInsertId()
        ], 201);
    }

    // Approve or reject a requirement
    if ($action === "decide_requirement") {
        $id = (int)($input["id"] ?? 0);
        $decision = $input["decision"] ?? "";

        if ($id < 1 || !in_array($decision, ["Approved", "Rejected"], true)) {
            respond(false, "Invalid requirement or decision.", [], 422);
        }

        $stmt = $pdo->prepare(
            "UPDATE requirements
             SET status = ?, approved = ?
             WHERE id = ? AND project_id = 1"
        );

        $stmt->execute([
            $decision,
            $decision === "Approved" ? 1 : 0,
            $id
        ]);

        respond(true, "Requirement decision saved.");
    }

    // Create a change request
    if ($action === "create_change_request") {
        $title = trim($input["title"] ?? "");
        $justification = trim($input["justification"] ?? "");
        $cost = filter_var($input["cost_impact"] ?? 0, FILTER_VALIDATE_FLOAT);
        $weeks = filter_var($input["schedule_impact_weeks"] ?? 0, FILTER_VALIDATE_INT);

        if ($title === "" || $justification === "" ||
            $cost === false || $cost < 0 ||
            $weeks === false || $weeks < 0) {
            respond(false, "Enter valid change request details.", [], 422);
        }

        $stmt = $pdo->prepare(
            "INSERT INTO change_requests
             (project_id, title, justification, cost_impact,
              schedule_impact_weeks, status)
             VALUES (1, ?, ?, ?, ?, 'Pending')"
        );

        $stmt->execute([$title, $justification, $cost, $weeks]);

        respond(true, "Change request submitted as Pending.", [
            "id" => $pdo->lastInsertId()
        ], 201);
    }

    // Approve or reject a change request
    if ($action === "decide_change") {
        $id = (int)($input["id"] ?? 0);
        $decision = $input["decision"] ?? "";
        $notes = trim($input["decision_notes"] ?? "");

        if ($id < 1 || !in_array($decision, ["Approved", "Rejected"], true)) {
            respond(false, "Invalid change request or decision.", [], 422);
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            "SELECT * FROM change_requests
             WHERE id = ? AND project_id = 1
             FOR UPDATE"
        );
        $stmt->execute([$id]);
        $change = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$change) {
            $pdo->rollBack();
            respond(false, "Change request not found.", [], 404);
        }

        if ($change["status"] !== "Pending") {
            $pdo->rollBack();
            respond(false, "This change request has already been decided.", [], 409);
        }

        if ($decision === "Approved") {
            // Apply approved cost and schedule impact only once.
            $stmt = $pdo->prepare(
                "UPDATE projects
                 SET approved_budget = approved_budget + ?,
                     baseline_weeks = baseline_weeks + ?
                 WHERE id = 1"
            );

            $stmt->execute([
                $change["cost_impact"],
                $change["schedule_impact_weeks"]
            ]);

            // Approve the AI and mobile requirements if this
            // is the combined request from the case study.
            if ($change["title"] === "AI Diagnosis and Mobile Application") {
                $stmt = $pdo->prepare(
                    "UPDATE requirements
                     SET status = 'Approved', approved = 1
                     WHERE project_id = 1
                       AND title IN (
                           'AI Preliminary Diagnosis',
                           'Mobile Application'
                       )"
                );
                $stmt->execute();
            }
        }

        $stmt = $pdo->prepare(
            "UPDATE change_requests
             SET status = ?, decision_notes = ?, decided_at = NOW()
             WHERE id = ? AND project_id = 1"
        );

        $stmt->execute([$decision, $notes, $id]);

        $pdo->commit();

        respond(
            true,
            $decision === "Approved"
                ? "Change approved. Budget and schedule updated."
                : "Change rejected. Budget and schedule unchanged."
        );
    }

    respond(false, "Unknown action.", [], 400);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Scope API error: " . $e->getMessage());

    respond(false, "Server error. Check the PHP error log.", [], 500);
}
