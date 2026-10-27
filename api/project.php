
<?php

header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . "/db.php";

function respond($success, $message, $data = null, $status = 200) {
    http_response_code($status);

    $response = [
        "success" => $success,
        "message" => $message
    ];

    if ($data !== null) {
        $response["project"] = $data;
    }

    echo json_encode($response);
    exit;
}

try {
    $method = $_SERVER["REQUEST_METHOD"];

    // GET: retrieve the project
    if ($method === "GET") {
        $stmt = $pdo->query(
            "SELECT * FROM projects ORDER BY id ASC LIMIT 1"
        );

        $project = $stmt->fetch();

        if (!$project) {
            respond(false, "No project found. Initialize the project first.", null, 404);
        }

        respond(true, "Project information retrieved successfully.", $project);
    }

    // POST: update the existing project
    if ($method === "POST") {
        $input = json_decode(file_get_contents("php://input"), true);

        if (!is_array($input)) {
            respond(false, "Invalid JSON request.", null, 400);
        }

        $name = trim($input["project_name"] ?? "");
        $client = trim($input["client_name"] ?? "");
        $objectives = trim($input["objectives"] ?? "");
        $inclusions = trim($input["scope_inclusions"] ?? "");
        $exclusions = trim($input["scope_exclusions"] ?? "");
        $stakeholders = trim($input["stakeholders"] ?? "");
        $qualityPlan = trim($input["quality_plan"] ?? "");
        $status = trim($input["status"] ?? "");

        $budget = filter_var(
            $input["approved_budget"] ?? null,
            FILTER_VALIDATE_FLOAT
        );

        $weeks = filter_var(
            $input["baseline_weeks"] ?? null,
            FILTER_VALIDATE_INT
        );

        $startDate = $input["start_date"] ?? "";
        $deadline = $input["deadline"] ?? "";

        if (
            $name === "" ||
            $client === "" ||
            $objectives === "" ||
            $inclusions === "" ||
            $exclusions === "" ||
            $stakeholders === "" ||
            $qualityPlan === ""
        ) {
            respond(false, "Please complete all required text fields.", null, 422);
        }

        if ($budget === false || $budget <= 0 || $budget > 999999999999) {
            respond(false, "Budget must be a valid positive amount.", null, 422);
        }

        if ($weeks === false || $weeks < 1 || $weeks > 520) {
            respond(false, "Duration must be between 1 and 520 weeks.", null, 422);
        }

        $allowedStatuses = [
            "In Progress",
            "On Hold",
            "Completed",
            "Cancelled"
        ];

        if (!in_array($status, $allowedStatuses, true)) {
            respond(false, "Please select a valid project status.", null, 422);
        }

        // Validate optional dates
        foreach (["start_date" => $startDate, "deadline" => $deadline] as $field => $date) {
            if ($date !== "") {
                $parsedDate = DateTime::createFromFormat("!Y-m-d", $date);

                if (!$parsedDate || $parsedDate->format("Y-m-d") !== $date) {
                    respond(false, "Invalid date supplied for " . $field . ".", null, 422);
                }
            }
        }

        if ($startDate !== "" && $deadline !== "" && $deadline < $startDate) {
            respond(false, "Deadline cannot be earlier than the start date.", null, 422);
        }

        $check = $pdo->query(
            "SELECT id FROM projects ORDER BY id ASC LIMIT 1"
        );

        $existing = $check->fetch();

        if (!$existing) {
            respond(false, "No project exists to update.", null, 404);
        }

        $sql = "UPDATE projects SET
                    project_name = ?,
                    client_name = ?,
                    objectives = ?,
                    scope_inclusions = ?,
                    scope_exclusions = ?,
                    stakeholders = ?,
                    approved_budget = ?,
                    baseline_weeks = ?,
                    start_date = ?,
                    deadline = ?,
                    status = ?,
                    quality_plan = ?
                WHERE id = ?";

        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            $name,
            $client,
            $objectives,
            $inclusions,
            $exclusions,
            $stakeholders,
            $budget,
            $weeks,
            $startDate !== "" ? $startDate : null,
            $deadline !== "" ? $deadline : null,
            $status,
            $qualityPlan,
            $existing["id"]
        ]);

        $fetch = $pdo->prepare("SELECT * FROM projects WHERE id = ?");
        $fetch->execute([$existing["id"]]);
        $project = $fetch->fetch();

        respond(true, "Project charter and management plan saved successfully.", $project);
    }

    header("Allow: GET, POST");
    respond(false, "Method not allowed.", null, 405);

} catch (Throwable $e) {
    error_log("Project API error: " . $e->getMessage());

    respond(false, "An internal error occurred. Check the PHP error log.", null, 500);
}
