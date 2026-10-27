
"use strict";

document.addEventListener("DOMContentLoaded", function () {
    // API Endpoints
    const PROJECT_API = "api/project.php";
    const SCOPE_API = "api/scope.php";
    const SCHEDULE_API = "api/schedule.php";
    const EVM_API = "api/evm.php";
    const QUALITY_API = "api/quality.php";
    const REPORT_API = "api/reports.php";

    // Module 1 Elements
    const detailsButton = document.getElementById("detailsButton");
    const detailsContainer = document.getElementById("project-details");
    const message = document.getElementById("message");
    const headerStatus = document.getElementById("headerStatus");
    const initiationForm = document.getElementById("initiationForm");
    const initiationMessage = document.getElementById("initiationMessage");
    const saveButton = document.getElementById("saveInitiation");
    const reloadButton = document.getElementById("reloadInitiation");

    // Module 2 Elements
    const requirementForm = document.getElementById("requirementForm");
    const requirementMessage = document.getElementById("requirementMessage");
    const changeRequestForm = document.getElementById("changeRequestForm");
    const changeMessage = document.getElementById("changeMessage");
    const requirementsList = document.getElementById("requirementsList");
    const changeRequestsList = document.getElementById("changeRequestsList");
    const refreshScopeButton = document.getElementById("refreshScope");

    // Module 3 Elements
    const scheduleForm = document.getElementById("scheduleForm");
    const scheduleMessage = document.getElementById("scheduleMessage");
    const scheduleList = document.getElementById("scheduleList");
    const refreshScheduleButton = document.getElementById("refreshSchedule");

    // Module 4 Elements
    const evmForm = document.getElementById("evmForm");
    const evmMessage = document.getElementById("evmMessage");

    // Module 5 Elements
    const qualityForm = document.getElementById("qualityForm");
    const qualityMessage = document.getElementById("qualityMessage");
    const qualityList = document.getElementById("qualityList");
    const refreshQualityButton = document.getElementById("refreshQuality");

    // Module 6 Elements
    const generateReportBtn = document.getElementById("generateReportBtn");
    const reportSummaryContainer = document.getElementById("reportSummaryContainer");

    let projectData = null;

    console.log("Healthcare PMS JavaScript initialized.");

    // --------------------------------------------------
    // COMMON HELPERS
    // --------------------------------------------------

    function formatMoney(value) {
        const amount = Number(value);

        if (!Number.isFinite(amount)) {
            return "PKR 0";
        }

        return "PKR " + amount.toLocaleString("en-PK", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    }

    function displayMessage(element, text, success) {
        if (!element) return;

        element.textContent = text;
        element.hidden = false;
        element.style.padding = "12px";
        element.style.borderRadius = "8px";
        element.style.marginTop = "12px";
        element.style.backgroundColor = success ? "#e6f4ee" : "#fdecec";
        element.style.color = success ? "#0d5d4b" : "#9b1c1c";
    }

    async function requestJSON(url, options = {}) {
        const response = await fetch(url, options);
        const rawText = await response.text();

        let result;

        try {
            result = JSON.parse(rawText);
        } catch (error) {
            console.error("Invalid API response:", rawText);
            throw new Error(
                "Server returned invalid JSON. Check the PHP API and its error logs."
            );
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Request failed with HTTP " + response.status
            );
        }

        return result;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    function safeNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    // --------------------------------------------------
    // MODULE 1: PROJECT INITIATION
    // --------------------------------------------------

    function addDetail(label, value) {
        if (!detailsContainer) return;

        const paragraph = document.createElement("p");
        const strong = document.createElement("strong");

        strong.textContent = label + ": ";

        paragraph.appendChild(strong);
        paragraph.appendChild(
            document.createTextNode(
                value === null || value === undefined || value === ""
                    ? "Not provided"
                    : String(value)
            )
        );

        detailsContainer.appendChild(paragraph);
    }

    function renderDashboard(project) {
        if (!project) return;

        if (detailsContainer) {
            detailsContainer.replaceChildren();

            addDetail("Project", project.project_name);
            addDetail("Client", project.client_name);
            addDetail("Baseline Duration", project.baseline_weeks + " weeks");
            addDetail("Baseline Budget", formatMoney(project.approved_budget));
            addDetail("Status", project.status);
            addDetail("Start Date", project.start_date);
            addDetail("Deadline", project.deadline);
        }

        const budget = document.getElementById("dashboardBudget");
        const duration = document.getElementById("dashboardDuration");

        if (budget) {
            budget.textContent = formatMoney(project.approved_budget);
        }

        if (duration) {
            duration.textContent = project.baseline_weeks + " Weeks";
        }

        if (headerStatus) {
            headerStatus.textContent = project.status || "Unknown";
        }
    }

    function fillInitiationForm(project) {
        if (!initiationForm || !project) return;

        const fields = [
            "project_name",
            "client_name",
            "objectives",
            "scope_inclusions",
            "scope_exclusions",
            "stakeholders",
            "approved_budget",
            "baseline_weeks",
            "start_date",
            "deadline",
            "status",
            "quality_plan"
        ];

        fields.forEach(function (field) {
            const input = initiationForm.elements.namedItem(field);

            if (input) {
                input.value = project[field] ?? "";
            }
        });
    }

    async function loadProject(showSuccessMessage = false) {
        try {
            const result = await requestJSON(PROJECT_API);

            projectData = result.project;

            renderDashboard(projectData);
            fillInitiationForm(projectData);

            if (showSuccessMessage) {
                displayMessage(
                    initiationMessage,
                    "Project data reloaded successfully.",
                    true
                );
            }
        } catch (error) {
            console.error("Unable to load project:", error);
            displayMessage(message, error.message, false);
        }
    }

    if (detailsButton) {
        detailsButton.addEventListener("click", function () {
            if (!projectData) {
                displayMessage(message, "Project information is not loaded yet.", false);
                return;
            }

            displayMessage(
                message,
                "Project details loaded. Budget: " +
                formatMoney(projectData.approved_budget) +
                " | Duration: " + projectData.baseline_weeks + " weeks.",
                true
            );
        });
    }

    if (initiationForm) {
        initiationForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!initiationForm.reportValidity()) return;

            const formData = new FormData(initiationForm);
            const data = Object.fromEntries(formData.entries());

            data.approved_budget = Number(data.approved_budget);
            data.baseline_weeks = Number(data.baseline_weeks);

            if (saveButton) saveButton.disabled = true;

            try {
                const result = await requestJSON(PROJECT_API, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                });

                projectData = result.project || data;

                renderDashboard(projectData);
                fillInitiationForm(projectData);

                displayMessage(
                    initiationMessage,
                    result.message || "Project saved successfully.",
                    true
                );

                // Refresh report after saving project information.
                if (reportSummaryContainer) {
                    await loadReportData();
                }
            } catch (error) {
                displayMessage(
                    initiationMessage,
                    "Save failed: " + error.message,
                    false
                );
            } finally {
                if (saveButton) saveButton.disabled = false;
            }
        });
    }

    if (reloadButton) {
        reloadButton.addEventListener("click", function () {
            loadProject(true);
        });
    }

    // --------------------------------------------------
    // MODULE 2: SCOPE & CHANGE REQUESTS
    // --------------------------------------------------

    function renderRequirements(items) {
        if (!requirementsList) return;

        if (!items || items.length === 0) {
            requirementsList.textContent = "No requirements found.";
            return;
        }

        requirementsList.innerHTML = items.map(function (req) {
            const status = req.status || req.approval_status || "Pending";

            return `
                <article class="scope-item"
                    style="border:1px solid #ddd;padding:12px;border-radius:8px;margin-bottom:10px;">
                    <h4>${escapeHTML(req.title)}</h4>
                    <p>${escapeHTML(req.description || "No description provided.")}</p>
                    <p>
                        <strong>Priority:</strong> ${escapeHTML(req.priority || "Medium")}
                        |
                        <strong>Status:</strong> ${escapeHTML(status)}
                    </p>
                </article>
            `;
        }).join("");
    }

    function renderChangeRequests(items) {
        if (!changeRequestsList) return;

        if (!items || items.length === 0) {
            changeRequestsList.textContent = "No change requests found.";
            return;
        }

        changeRequestsList.innerHTML = items.map(function (change) {
            const status = change.status || change.approval_status || "Pending";

            const scheduleImpact = safeNumber(
                change.schedule_impact_weeks ?? change.schedule_impact
            );

            return `
                <article class="scope-item"
                    style="border:1px solid #ddd;padding:12px;border-radius:8px;margin-bottom:10px;">
                    <h4>${escapeHTML(change.title)}</h4>
                    <p>${escapeHTML(change.justification || "")}</p>
                    <p>
                        <strong>Additional Cost:</strong>
                        ${escapeHTML(formatMoney(change.cost_impact))}
                        |
                        <strong>Schedule Impact:</strong>
                        ${scheduleImpact} weeks
                    </p>
                    <p><strong>Status:</strong> ${escapeHTML(status)}</p>
                </article>
            `;
        }).join("");
    }

    async function loadScopeData() {
        if (!requirementsList || !changeRequestsList) return;

        try {
            const result = await requestJSON(SCOPE_API);

            renderRequirements(result.requirements || []);
            renderChangeRequests(result.change_requests || []);
        } catch (error) {
            console.error("Scope API error:", error);

            requirementsList.textContent =
                "Unable to load requirements: " + error.message;

            changeRequestsList.textContent =
                "Unable to load change requests: " + error.message;
        }
    }

    if (requirementForm) {
        requirementForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!requirementForm.reportValidity()) return;

            const form = new FormData(requirementForm);

            try {
                const result = await requestJSON(SCOPE_API, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        action: "create_requirement",
                        title: form.get("title"),
                        description: form.get("description"),
                        priority: form.get("priority")
                    })
                });

                displayMessage(
                    requirementMessage,
                    result.message || "Requirement added successfully.",
                    true
                );

                requirementForm.reset();

                await loadScopeData();

                if (reportSummaryContainer) {
                    await loadReportData();
                }
            } catch (error) {
                displayMessage(requirementMessage, error.message, false);
            }
        });
    }

    if (changeRequestForm) {
        changeRequestForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!changeRequestForm.reportValidity()) return;

            const form = new FormData(changeRequestForm);

            try {
                const result = await requestJSON(SCOPE_API, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        action: "create_change_request",
                        title: form.get("title"),
                        justification: form.get("justification"),
                        cost_impact: Number(form.get("cost_impact")),
                        schedule_impact_weeks: Number(
                            form.get("schedule_impact_weeks")
                        )
                    })
                });

                displayMessage(
                    changeMessage,
                    result.message || "Change request submitted successfully.",
                    true
                );

                changeRequestForm.reset();

                await loadScopeData();

                if (reportSummaryContainer) {
                    await loadReportData();
                }
            } catch (error) {
                displayMessage(changeMessage, error.message, false);
            }
        });
    }

    if (refreshScopeButton) {
        refreshScopeButton.addEventListener("click", loadScopeData);
    }

    // --------------------------------------------------
    // MODULE 3: SCHEDULE & RESOURCES
    // --------------------------------------------------

    function renderSchedule(activities) {
        if (!scheduleList) return;

        if (!activities || activities.length === 0) {
            scheduleList.textContent = "No activities scheduled.";
            return;
        }

        scheduleList.innerHTML = `
            <table class="schedule-table"
                style="width:100%;text-align:left;border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:2px solid #ccc;">
                        <th style="padding:8px;">Activity</th>
                        <th style="padding:8px;">Assigned To</th>
                        <th style="padding:8px;">Start Week</th>
                        <th style="padding:8px;">Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${activities.map(function (act) {
                        return `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:8px;">${escapeHTML(act.activity_name)}</td>
                                <td style="padding:8px;">${escapeHTML(act.assigned_to || "Unassigned")}</td>
                                <td style="padding:8px;">Week ${safeNumber(act.start_week)}</td>
                                <td style="padding:8px;">${safeNumber(act.duration_weeks)} weeks</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        `;
    }

    async function loadScheduleData() {
        if (!scheduleList) return;

        scheduleList.textContent = "Loading schedule...";

        try {
            const result = await requestJSON(SCHEDULE_API);

            renderSchedule(result.activities || []);
        } catch (error) {
            scheduleList.textContent =
                "Unable to load schedule: " + error.message;
        }
    }

    if (scheduleForm) {
        scheduleForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!scheduleForm.reportValidity()) return;

            const form = new FormData(scheduleForm);

            try {
                const result = await requestJSON(SCHEDULE_API, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        activity_name: form.get("activity_name"),
                        assigned_to: form.get("assigned_to"),
                        duration_weeks: Number(form.get("duration_weeks")),
                        start_week: Number(form.get("start_week"))
                    })
                });

                displayMessage(
                    scheduleMessage,
                    result.message || "Schedule activity added successfully.",
                    true
                );

                scheduleForm.reset();

                await loadScheduleData();

                if (reportSummaryContainer) {
                    await loadReportData();
                }
            } catch (error) {
                displayMessage(scheduleMessage, error.message, false);
            }
        });
    }

    if (refreshScheduleButton) {
        refreshScheduleButton.addEventListener("click", loadScheduleData);
    }

    // --------------------------------------------------
    // MODULE 4: COST & EVM ANALYSIS
    // --------------------------------------------------

    if (evmForm) {
        evmForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const pvInput = document.getElementById("pvInput");
            const evInput = document.getElementById("evInput");
            const acInput = document.getElementById("acInput");

            const pv = Number(pvInput?.value);
            const ev = Number(evInput?.value);
            const ac = Number(acInput?.value);

            if (
                !Number.isFinite(pv) ||
                !Number.isFinite(ev) ||
                !Number.isFinite(ac) ||
                pv < 0 ||
                ev < 0 ||
                ac < 0
            ) {
                displayMessage(
                    evmMessage,
                    "Enter valid non-negative PV, EV, and AC values.",
                    false
                );
                return;
            }

            const pvElement = document.getElementById("evmPV");
            const evElement = document.getElementById("evmEV");
            const acElement = document.getElementById("evmAC");
            const cpiElement = document.getElementById("evmCPI");
            const spiElement = document.getElementById("evmSPI");
            const interpretationElement = document.getElementById("evmInterpretation");

            if (pvElement) pvElement.textContent = formatMoney(pv);
            if (evElement) evElement.textContent = formatMoney(ev);
            if (acElement) acElement.textContent = formatMoney(ac);

            const cpi = ac > 0 ? ev / ac : null;
            const spi = pv > 0 ? ev / pv : null;

            if (cpiElement) {
                cpiElement.textContent = cpi === null ? "N/A" : cpi.toFixed(2);
            }

            if (spiElement) {
                spiElement.textContent = spi === null ? "N/A" : spi.toFixed(2);
            }

            let interpretation = "";

            if (cpi !== null) {
                interpretation += cpi < 1
                    ? "Cost performance is over budget. "
                    : cpi > 1
                        ? "Cost performance is under budget. "
                        : "Cost performance is on budget. ";
            } else {
                interpretation += "CPI cannot be calculated when AC is zero. ";
            }

            if (spi !== null) {
                interpretation += spi < 1
                    ? "Schedule performance is behind plan."
                    : spi > 1
                        ? "Schedule performance is ahead of plan."
                        : "Schedule performance is on plan.";
            } else {
                interpretation += "SPI cannot be calculated when PV is zero.";
            }

            if (interpretationElement) {
                interpretationElement.textContent = interpretation;
            }

            displayMessage(evmMessage, "EVM values calculated successfully.", true);
        });
    }

    // --------------------------------------------------
    // MODULE 5: QUALITY MANAGEMENT & RISK CONTROL
    // --------------------------------------------------

    function renderQualityItems(items) {
        if (!qualityList) return;

        const criticalCount = document.getElementById("criticalCount");
        const openDefectCount = document.getElementById("openDefectCount");
        const openRiskCount = document.getElementById("openRiskCount");

        const criticalOpen = (items || []).filter(function (item) {
            return item.severity === "Critical" && item.status !== "Resolved";
        }).length;

        const openDefects = (items || []).filter(function (item) {
            return item.category === "Defect" && item.status !== "Resolved";
        }).length;

        const openRisks = (items || []).filter(function (item) {
            return item.category === "Risk" && item.status !== "Resolved";
        }).length;

        if (criticalCount) criticalCount.textContent = criticalOpen;
        if (openDefectCount) openDefectCount.textContent = openDefects;
        if (openRiskCount) openRiskCount.textContent = openRisks;

        if (!items || items.length === 0) {
            qualityList.textContent = "No quality or risk records found.";
            return;
        }

        qualityList.innerHTML = `
            <table style="width:100%;text-align:left;border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:2px solid #ccc;">
                        <th style="padding:8px;">Title</th>
                        <th style="padding:8px;">Category</th>
                        <th style="padding:8px;">Severity</th>
                        <th style="padding:8px;">Assigned To</th>
                        <th style="padding:8px;">Status</th>
                        <th style="padding:8px;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${(items || []).map(function (item) {
                        const isCritical = item.severity === "Critical";
                        const isResolved = item.status === "Resolved";

                        return `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:8px;">${escapeHTML(item.title)}</td>
                                <td style="padding:8px;">${escapeHTML(item.category)}</td>
                                <td style="padding:8px;">
                                    <strong style="color:${isCritical ? "#9b1c1c" : "#333"};">
                                        ${escapeHTML(item.severity)}
                                    </strong>
                                </td>
                                <td style="padding:8px;">${escapeHTML(item.assigned_to || "Unassigned")}</td>
                                <td style="padding:8px;">
                                    <span style="
                                        padding:4px 8px;
                                        border-radius:4px;
                                        background-color:${isResolved ? "#e6f4ee" : "#fdecec"};
                                        color:${isResolved ? "#0d5d4b" : "#9b1c1c"};">
                                        ${escapeHTML(item.status)}
                                    </span>
                                </td>
                                <td style="padding:8px;">
                                    ${!isResolved ? `
                                        <button type="button"
                                            class="resolve-btn primary-btn"
                                            data-id="${Number(item.id)}"
                                            style="padding:4px 10px;font-size:12px;">
                                            Mark Resolved
                                        </button>
                                    ` : "Resolved"}
                                </td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        `;

        qualityList.querySelectorAll(".resolve-btn").forEach(function (button) {
            button.addEventListener("click", async function () {
                const id = Number(this.getAttribute("data-id"));

                if (!Number.isInteger(id) || id <= 0) {
                    alert("Invalid quality record ID.");
                    return;
                }

                this.disabled = true;

                try {
                    const result = await requestJSON(QUALITY_API, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            action: "resolve",
                            id: id
                        })
                    });

                    displayMessage(
                        qualityMessage,
                        result.message || "Record marked as resolved.",
                        true
                    );

                    await loadQualityData();

                    if (reportSummaryContainer) {
                        await loadReportData();
                    }
                } catch (error) {
                    this.disabled = false;
                    displayMessage(
                        qualityMessage,
                        "Could not update item: " + error.message,
                        false
                    );
                }
            });
        });
    }

    async function loadQualityData() {
        if (!qualityList) return;

        qualityList.textContent = "Loading records...";

        try {
            const result = await requestJSON(QUALITY_API);

            renderQualityItems(result.items || []);
        } catch (error) {
            qualityList.textContent =
                "Unable to load quality log: " + error.message;

            console.error("Quality API error:", error);
        }
    }

    if (qualityForm) {
        qualityForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!qualityForm.reportValidity()) return;

            const form = new FormData(qualityForm);

            try {
                const result = await requestJSON(QUALITY_API, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        title: form.get("title"),
                        description: form.get("description"),
                        category: form.get("category"),
                        severity: form.get("severity"),
                        assigned_to: form.get("assigned_to"),
                        status: form.get("status")
                    })
                });

                displayMessage(
                    qualityMessage,
                    result.message || "Quality record added successfully.",
                    true
                );

                qualityForm.reset();

                await loadQualityData();

                if (reportSummaryContainer) {
                    await loadReportData();
                }
            } catch (error) {
                displayMessage(qualityMessage, error.message, false);
            }
        });
    }

    if (refreshQualityButton) {
        refreshQualityButton.addEventListener("click", loadQualityData);
    }

    // --------------------------------------------------
    // MODULE 6: REPORTS & INTEGRATION
    // --------------------------------------------------

    async function loadReportData() {
        if (!reportSummaryContainer) return;

        reportSummaryContainer.innerHTML = "<p>Generating report...</p>";

        if (generateReportBtn) {
            generateReportBtn.disabled = true;
        }

        try {
            const result = await requestJSON(REPORT_API);
            const rep = result.report || {};

            const projectName = rep.project_name || "Healthcare Project";
            const budget = rep.budget ?? rep.approved_budget ?? 0;
            const duration = rep.duration ?? rep.baseline_weeks ?? 0;
            const approvedRequirements = safeNumber(rep.approved_requirements);
            const totalRequirements = safeNumber(rep.total_requirements);
            const criticalDefects = safeNumber(rep.critical_open_defects);

            reportSummaryContainer.innerHTML = `
                <div style="
                    background:#f9f9f9;
                    padding:15px;
                    border-radius:8px;
                    border-left:5px solid #0d5d4b;">

                    <h4>Project: ${escapeHTML(projectName)}</h4>

                    <p>
                        <strong>Approved Budget Baseline:</strong>
                        ${escapeHTML(formatMoney(budget))}
                    </p>

                    <p>
                        <strong>Approved Schedule Baseline:</strong>
                        ${duration} Weeks
                    </p>

                    <p>
                        <strong>Requirements Scope:</strong>
                        ${approvedRequirements} / ${totalRequirements} Approved
                    </p>

                    <p>
                        <strong>Unresolved Critical Defects:</strong>
                        <span style="
                            color:${criticalDefects > 0 ? "#9b1c1c" : "#0d5d4b"};
                            font-weight:bold;">
                            ${criticalDefects}
                        </span>
                    </p>

                    <p style="margin-bottom:0;color:#666;font-size:13px;">
                        Report generated: ${escapeHTML(new Date().toLocaleString())}
                    </p>
                </div>
            `;
        } catch (error) {
            console.error("Report API error:", error);

            reportSummaryContainer.innerHTML = `
                <p style="color:#9b1c1c;">
                    Error loading report: ${escapeHTML(error.message)}
                </p>
                <p>
                    Please check that <code>api/reports.php</code> exists,
                    connects to the database, and returns valid JSON.
                </p>
            `;
        } finally {
            if (generateReportBtn) {
                generateReportBtn.disabled = false;
            }
        }
    }

    if (generateReportBtn) {
        generateReportBtn.addEventListener("click", loadReportData);
    }

    // --------------------------------------------------
    // INITIAL DATA LOADS
    // --------------------------------------------------

    loadProject();
    loadScopeData();
    loadScheduleData();
    loadQualityData();

    // Load the executive report when Module 6 is available.
    // The Refresh Summary Report button can load it again any time.
    if (reportSummaryContainer) {
        loadReportData();
    }
});
