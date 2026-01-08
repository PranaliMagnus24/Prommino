// public/admin/assets/js/complaint.js
// Requires: jQuery, DataTables, Bootstrap 5, SweetAlert2
$(function () {
    // -------------------------
    // DataTable
    // -------------------------
    var complaintTable = null;
    var searchDebounceTimer = null;
    if ($(".complaintList").length) {
        if ($.fn.DataTable.isDataTable(".complaintList")) {
            $(".complaintList").DataTable().clear().destroy();
        }
        complaintTable = $(".complaintList").DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: { url: complaintListUrl, type: "GET" },
            // layout with buttons (requires Buttons extension)
            dom:
                "<'row mb-2'<'col-sm-6'l><'col-sm-6 text-end'B>>" +
                "rt" +
                "<'row mt-2'<'col-sm-6'i><'col-sm-6'p>>",
            buttons: [
                {
                    // Search toggle button
                    text: '<i class="bi bi-search me-1"></i>',
                    attr: { "data-bs-toggle": "tooltip", title: "Search" },
                    action: function (e, dt, node, config) {
                        $("#customSearchContainer").toggle();
                        if ($("#customSearchContainer").is(":visible")) {
                            $("#customSearchInput").focus();
                        } else {
                            // if hiding, clear the search input and table search
                            $("#customSearchInput").val("");
                            complaintTable.search("").draw();
                        }
                    },
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: {
                        "data-bs-toggle": "tooltip",
                        title: "Download CSV",
                    },
                    action: function (e, dt, node, config) {
                        window.location.href = complaintExportUrl;
                    },
                },

                {
                    extend: "print",
                    text: '<i class="bi bi-printer me-1"></i>',
                    exportOptions: { columns: ":visible:not(:first-child)" },
                    attr: { "data-bs-toggle": "tooltip", title: "Print" },
                },
                {
                    extend: "colvis",
                    text: '<i class="bi bi-eye me-1"></i>',
                    columns: ":not(:first-child)",
                    attr: {
                        "data-bs-toggle": "tooltip",
                        title: "Column visibility",
                    },
                },
                {
                    text: '<i class="bi bi-trash me-1"></i>',
                    attr: {
                        "data-bs-toggle": "tooltip",
                        title: "Delete selected",
                    },
                    action: function (e, dt, node, config) {
                        var ids = [];
                        $(".row-checkbox:checked").each(function () {
                            ids.push($(this).data("id"));
                        });
                        if (!ids.length) {
                            showAlert(
                                "No selection",
                                "Please select at least one complaint to delete",
                                "warning"
                            );
                            return;
                        }
                        Swal.fire({
                            title: "Confirm delete",
                            text:
                                "Delete " +
                                ids.length +
                                " selected complaint(s)?",
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "Yes, delete",
                            cancelButtonText: "Cancel",
                        }).then(function (result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: complaintBulkDeleteUrl,
                                    method: "POST",
                                    data: {
                                        _token: $(
                                            'meta[name="csrf-token"]'
                                        ).attr("content"),
                                        ids: ids,
                                    },
                                    success: function (res) {
                                        if (res.success) {
                                            showAlert(
                                                "Deleted",
                                                res.message ||
                                                    "Complaints deleted",
                                                "success"
                                            );
                                            complaintTable.ajax.reload(
                                                null,
                                                false
                                            );
                                        } else {
                                            showAlert(
                                                "Error",
                                                res.message ||
                                                    "Failed to delete",
                                                "error"
                                            );
                                        }
                                    },
                                    error: function () {
                                        showAlert(
                                            "Error",
                                            "Failed to delete complaints",
                                            "error"
                                        );
                                    },
                                });
                            }
                        });
                    },
                },
                {
                    text: '<i class="bi bi-funnel me-1"></i>',
                    attr: { "data-bs-toggle": "tooltip", title: "Filter" },
                    action: function () {
                        // Reset modal selects and show
                        $("#filter_column").val("");
                        $("#filter_value").html(
                            '<option value="">-- Select Value --</option>'
                        );
                        $("#columnFilterModal").modal("show");
                    },
                },
            ],
            columns: [
                {
                    // checkbox column
                    data: "checkbox",
                    name: "checkbox",
                    orderable: false,
                    searchable: false,
                    render: function (data, type, row, meta) {
                        return (
                            '<input type="checkbox" class="row-checkbox form-check-input" data-id="' +
                            row.id +
                            '">'
                        );
                    },
                    width: "30px",
                },
                {
                    data: "DT_RowIndex",
                    name: "DT_RowIndex",
                    orderable: false,
                    searchable: false,
                },
                { data: "customer", name: "customer" },
                { data: "product", name: "product" },
                { data: "complaint_date", name: "complaint_date" },
                { data: "assign_to", name: "assign_to" },
                { data: "status", name: "status" },
                {
                    data: "action",
                    name: "action",
                    orderable: false,
                    searchable: false,
                },
            ],
            order: [[1, "desc"]], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function (settings) {
                // uncheck master when table redraw
                $("#selectAllComplaints").prop("checked", false);

                // Initialize Bootstrap tooltips for newly created button nodes
                try {
                    var tooltipTriggerList = [].slice.call(
                        document.querySelectorAll('[data-bs-toggle="tooltip"]')
                    );
                    tooltipTriggerList.forEach(function (el) {
                        // Use Bootstrap's tooltip (v5)
                        if (
                            typeof bootstrap !== "undefined" &&
                            bootstrap.Tooltip
                        ) {
                            // If already initialized, ignore
                            if (!el._bsTooltip) {
                                new bootstrap.Tooltip(el);
                            }
                        } else {
                            // fallback: browser native title is enough
                        }
                    });
                } catch (e) {
                    // ignore if bootstrap not present
                }
            },
        });

        window.complaintTable = complaintTable;
    }

    // ---------------- Select All / Row checkbox handling ----------------
    $(document).on("change", "#selectAllComplaints", function () {
        var checked = $(this).prop("checked");
        $(".row-checkbox").prop("checked", checked);
    });

    $(document).on("change", ".row-checkbox", function () {
        var total = $(".row-checkbox").length;
        var checked = $(".row-checkbox:checked").length;
        $("#selectAllComplaints").prop("checked", total === checked);
    });

    // ---------------- Column Filter modal logic ----------------
    // Map UI column selection value to DB key used in distinct API
    var complaintColumnMap = {
        2: "customer",
        3: "product",
        4: "complaint_date",
        5: "assign_to",
        6: "status",
    };

    $("#filter_column").on("change", function () {
        var colIndex = $(this).val();
        $("#filter_value").html('<option value="">Loading...</option>');
        if (!colIndex) {
            $("#filter_value").html(
                '<option value="">-- Select Value --</option>'
            );
            return;
        }
        var colKey = complaintColumnMap[colIndex];
        if (!colKey) {
            $("#filter_value").html(
                '<option value="">-- Select Value --</option>'
            );
            return;
        }

        // Fetch distinct values from server
        $.get(complaintDistinctValuesUrl, { column: colKey }, function (res) {
            if (res.success) {
                var opts = '<option value="">-- Select Value --</option>';
                res.data.forEach(function (v) {
                    // escape potential HTML
                    var safe = String(v)
                        .replace(/&/g, "&")
                        .replace(/</g, "<")
                        .replace(/>/g, ">");
                    opts += `<option value="${safe}">${safe}</option>`;
                });
                $("#filter_value").html(opts);
            } else {
                $("#filter_value").html('<option value="">No values</option>');
            }
        }).fail(function () {
            $("#filter_value").html('<option value="">Failed to load</option>');
        });
    });

    $("#applyColumnFilter").on("click", function () {
        var colIndex = $("#filter_column").val();
        var value = $("#filter_value").val();
        $("#columnFilterModal").modal("hide");

        if (!colIndex) return;

        // colIndex corresponds to datatable column index (including checkbox column at 0)
        var dtColIndex = parseInt(colIndex, 10); // numeric
        if (!complaintTable) return;

        if (!value) {
            // clear search for that column
            complaintTable.column(dtColIndex).search("").draw();
        } else {
            // escape regex characters
            var escaped = $.fn.dataTable.util.escapeRegex(value);
            complaintTable
                .column(dtColIndex)
                .search("^" + escaped + "$", true, false)
                .draw();
        }
    });

    // -------------------------
    // Helpers
    // -------------------------
    function showAlert(title, message, icon = "success") {
        if (typeof Swal !== "undefined") {
            Swal.fire({
                title: title || "",
                text: message || "",
                icon: icon || "success",
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: "top-end",
            });
        } else {
            alert((title ? title + " - " : "") + (message || ""));
        }
    }

    function clearFormErrors(selector) {
        $(selector + " .is-invalid").removeClass("is-invalid");
        $(selector + " .invalid-feedback").text("");
    }

    function handleValidationErrors(errors, formSelector) {
        $.each(errors, function (key, val) {
            let $field = $(formSelector + ' [name="' + key + '"]');
            if (!$field.length) {
                $field = $(
                    formSelector + ' [name^="' + key.split(".")[0] + '"]'
                );
            }
            if ($field.length) {
                $field.addClass("is-invalid");
                const idSafe = key.replace(/\./g, "_") + "Error";
                if ($("#" + idSafe).length) $("#" + idSafe).text(val[0]);
                else {
                    if ($field.next(".invalid-feedback").length)
                        $field.next(".invalid-feedback").text(val[0]);
                    else
                        $field.after(
                            '<div class="invalid-feedback">' + val[0] + "</div>"
                        );
                }
            }
        });
    }

    // utility to set value safely by id then name
    function setFieldValue(selectorOrName, value, formSelector) {
        // selectorOrName could be '#id' or 'name'
        if (selectorOrName.startsWith("#")) {
            $(selectorOrName).val(value);
            return;
        }
        const $byId = $(formSelector + " " + selectorOrName);
        if ($byId.length) {
            $byId.val(value);
            return;
        }
        // try name attribute
        $(formSelector + ' [name="' + selectorOrName + '"]').val(value);
    }

    // format date string YYYY-MM-DD if possible from ISO
    function toDateInputValue(isoOrDate) {
        if (!isoOrDate) return "";
        // sometimes it's "2025-10-28T00:00:00" or "2025-10-28"
        if (isoOrDate.indexOf && isoOrDate.indexOf("T") !== -1) {
            return isoOrDate.split("T")[0];
        }
        return isoOrDate;
    }

    // -------------------------
    // Open Create Offcanvas
    // -------------------------
    $("#openCreateComplaintBtn").on("click", function () {
        $("#createComplaintForm")[0].reset();
        clearFormErrors("#createComplaintForm");

        // ensure create assign_date default: today (only if input exists)
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = (today.getMonth() + 1).toString().padStart(2, "0");
        const dd = today.getDate().toString().padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;

        // try id first, then name
        if ($("#create_assign_date").length)
            $("#create_assign_date").val(todayStr);
        else $('#createComplaintForm [name="assign_date"]').val(todayStr);

        var off = new bootstrap.Offcanvas(
            document.getElementById("createComplaintOffcanvas")
        );
        off.show();

        // Initialize select2 for create form
        $("#createComplaintOffcanvas .select2").select2({
            dropdownParent: $("#createComplaintOffcanvas"),
            allowClear: true,
        });
    });

    // -------------------------
    // Form Type Change Handler
    // -------------------------
    $("#formType").on("change", function () {
        const formType = $(this).val();
        if (formType === "complaint") {
            $(".complaint-field").show();
            $(".task-field").hide();
        } else if (formType === "task") {
            $(".complaint-field").hide();
            $(".task-field").show();
        } else {
            $(".complaint-field, .task-field").hide();
        }
    });

    // -------------------------
    // Edit Form Type Change Handler
    // ------------------------
    $("#editFormType").on("change", function () {
        const formType = $(this).val();
        if (formType === "complaint") {
            $("#editComplaintForm .complaint-field").show();
            $("#editComplaintForm .task-field").hide();
        } else if (formType === "task") {
            $("#editComplaintForm .complaint-field").hide();
            $("#editComplaintForm .task-field").show();
        } else {
            $(
                "#editComplaintForm .complaint-field, #editComplaintForm .task-field"
            ).hide();
        }
    });

    // -------------------------
    // Create submit
    // -------------------------
    $("#createComplaintForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#createComplaintForm");

        // Build FormData but ensure we DO NOT send complaint_time on create
        const form = this;
        let fd = new FormData(form);

        // remove complaint_time if present
        if (fd.has("complaint_time")) fd.delete("complaint_time");

        $("#createComplaintBtn").prop("disabled", true).text("Saving...");
        $.ajax({
            url: complaintStoreUrl,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res.success) {
                    // Add new customer to dropdowns if created
                    if (res.new_customer) {
                        const option = `<option value="${res.new_customer.id}">${res.new_customer.name}</option>`;
                        // Insert before "other" option to keep "other" last
                        const $createSelect = $(
                            '#createComplaintForm select[name="customer_id"]'
                        );
                        const $editSelect = $(
                            '#editComplaintForm select[name="customer_id"]'
                        );
                        $createSelect
                            .find('option[value="other"]')
                            .before(option);
                        $editSelect
                            .find('option[value="other"]')
                            .before(option);
                        // Update select2
                        $createSelect.trigger("change.select2");
                        $editSelect.trigger("change.select2");
                    }
                    $("#createComplaintForm")[0].reset();
                    // hide offcanvas
                    var off = bootstrap.Offcanvas.getInstance(
                        document.getElementById("createComplaintOffcanvas")
                    );
                    if (off) off.hide();
                    showAlert(
                        "Success!",
                        res.message || "Complaint created",
                        "success"
                    );
                    if (window.complaintTable)
                        window.complaintTable.ajax.reload(null, false);
                } else {
                    showAlert(
                        "Error!",
                        res.message || "Failed to create",
                        "error"
                    );
                }
            },
            error: function (xhr) {
                if (
                    xhr.status === 422 &&
                    xhr.responseJSON &&
                    xhr.responseJSON.errors
                ) {
                    handleValidationErrors(
                        xhr.responseJSON.errors,
                        "#createComplaintForm"
                    );
                } else {
                    showAlert("Error!", "Failed to create complaint", "error");
                }
            },
            complete: function () {
                $("#createComplaintBtn")
                    .prop("disabled", false)
                    .text("Save Complaint");
            },
        });
    });

    // -------------------------
    // Open Edit & populate - संशोधित
    // -------------------------
    $(document).on("click", ".edit-complaint", function () {
        clearFormErrors("#editComplaintForm");
        $("#editComplaintForm .selected-file-display").remove();
        const id = $(this).data("id");
        const url = complaintEditUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res.success) {
                const c = res.data;

                // populate common fields (try by id then by name)
                $("#edit_complaint_id").val(c.id || "");

                // सबसे पहले form_type set करें
                setFieldValue(
                    "#editFormType",
                    c.form_type || "complaint",
                    "#editComplaintForm"
                );

                // Form type के आधार पर fields show/hide
                const formType = c.form_type || "complaint";
                if (formType === "complaint") {
                    $("#editComplaintForm .complaint-field").show();
                    $("#editComplaintForm .task-field").hide();
                } else if (formType === "task") {
                    $("#editComplaintForm .complaint-field").hide();
                    $("#editComplaintForm .task-field").show();
                }

                // अन्य fields populate करें
                setFieldValue(
                    "#edit_customer_id",
                    c.customer_id || "",
                    "#editComplaintForm"
                );
                setFieldValue(
                    "#edit_product_id",
                    c.product_id || "",
                    "#editComplaintForm"
                );
                setFieldValue(
                    "#edit_complaint_date",
                    toDateInputValue(c.complaint_date),
                    "#editComplaintForm"
                );
                setFieldValue(
                    "#edit_complaint_time",
                    c.complaint_time || "",
                    "#editComplaintForm"
                );
                setFieldValue(
                    "#edit_assign_to",
                    c.assign_to || "",
                    "#editComplaintForm"
                );
                setFieldValue(
                    "#edit_status",
                    c.status || "open",
                    "#editComplaintForm"
                );
                setFieldValue(
                    "#edit_complaint_desc",
                    c.complaint_desc || "",
                    "#editComplaintForm"
                );

                // complaint type और task type
                setFieldValue(
                    "#edit_complaint_type_id",
                    c.complaint_type_id || "",
                    "#editComplaintForm"
                );
                setFieldValue(
                    "#edit_task_type_id",
                    c.task_type_id || "",
                    "#editComplaintForm"
                ); // Add this field if not exists

                // assign date
                if (c.assign_date)
                    setFieldValue(
                        "#edit_assign_date",
                        toDateInputValue(c.assign_date),
                        "#editComplaintForm"
                    );
                else
                    setFieldValue(
                        "#edit_assign_date",
                        "",
                        "#editComplaintForm"
                    );

                // handle variations
                $('#editComplaintForm input[name="variations[]"]').remove();
                $("#editComplaintForm .selected-variation").hide().html("");
                if (c.variations && c.variations.length) {
                    c.variations.forEach((variation) => {
                        $("#editComplaintForm").append(
                            `<input type="hidden" name="variations[]" value="${variation.product_variation_id}">`
                        );
                    });
                    // Display selected variations
                    const product = productsData.find(
                        (p) => p.id == c.product_id
                    );
                    if (product) {
                        const variationDetails = c.variations
                            .map((v) => {
                                let varData = product.variations.find(
                                    (vv) => vv.id == v.product_variation_id
                                );
                                if (varData) {
                                    const attrs = [];
                                    if (varData.size)
                                        attrs.push("Size: " + varData.size);
                                    if (varData.color)
                                        attrs.push("Color: " + varData.color);
                                    if (varData.material)
                                        attrs.push(
                                            "Material: " + varData.material
                                        );
                                    return (
                                        attrs.join(", ") +
                                        " (₹" +
                                        varData.price +
                                        ")"
                                    );
                                } else {
                                    return (
                                        "Variation ID: " +
                                        v.product_variation_id
                                    );
                                }
                            })
                            .join("; ");
                        $("#editComplaintForm .selected-variation")
                            .html(
                                `<small class="text-muted">${variationDetails}</small>`
                            )
                            .show();
                    }
                }

                // attachments को display करें (यदि ज़रूरी हो)
                if (c.attachments && c.attachments.length > 0) {
                    let attachmentsHtml =
                        '<ul class="list-group list-group-flush">';
                    c.attachments.forEach((attachment) => {
                        const fileUrl = attachment.file_path.startsWith(
                            "upload/"
                        )
                            ? "/" + attachment.file_path
                            : "/upload/" + attachment.file_path;
                        const mimeType = attachment.mime_type;
                        if (mimeType && mimeType.startsWith("video/")) {
                            attachmentsHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <video controls style="max-width: 200px; max-height: 150px;"><source src="${fileUrl}" type="${mimeType}"></video>
                                <br><small class="text-muted">${attachment.original_name}</small>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger delete-attachment" data-attachment-id="${attachment.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </li>`;
                        } else if (mimeType && mimeType.startsWith("image/")) {
                            attachmentsHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <img src="${fileUrl}" alt="${attachment.original_name}" style="max-width: 200px; max-height: 150px;" class="img-thumbnail">
                                <br><small class="text-muted">${attachment.original_name}</small>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger delete-attachment" data-attachment-id="${attachment.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </li>`;
                        } else {
                            attachmentsHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <a href="${fileUrl}" target="_blank">${attachment.original_name}</a>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger delete-attachment" data-attachment-id="${attachment.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </li>`;
                        }
                    });
                    attachmentsHtml += "</ul>";
                    $("#existingAttachmentsList").html(attachmentsHtml);
                    $("#existingAttachments").show();
                } else {
                    $("#existingAttachments").hide();
                }

                // Initialize select2 for edit form
                $("#editComplaintOffcanvas .select2").select2({
                    dropdownParent: $("#editComplaintOffcanvas"),
                    allowClear: true,
                });

                var off = new bootstrap.Offcanvas(
                    document.getElementById("editComplaintOffcanvas")
                );
                off.show();
            } else {
                showAlert("Error!", res.message || "Failed to load", "error");
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch complaint", "error");
        });
    });

    // -------------------------
    // Edit submit (update) - unchanged
    // -------------------------
    $("#editComplaintForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#editComplaintForm");

        const id = $("#edit_complaint_id").val();
        if (!id) {
            showAlert("Error!", "Missing complaint id", "error");
            return;
        }

        const url = complaintUpdateUrlTemplate.replace(":id", id);
        let fd = new FormData(this);

        // Use method override for PUT
        fd.append("_method", "PUT");

        $("#editComplaintBtn").prop("disabled", true).text("Updating...");
        $.ajax({
            url: url,
            type: "POST", // method override
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res.success) {
                    var off = bootstrap.Offcanvas.getInstance(
                        document.getElementById("editComplaintOffcanvas")
                    );
                    if (off) off.hide();
                    showAlert(
                        "Success!",
                        res.message || "Complaint updated",
                        "success"
                    );
                    if (window.complaintTable)
                        window.complaintTable.ajax.reload(null, false);
                } else {
                    showAlert(
                        "Error!",
                        res.message || "Failed to update",
                        "error"
                    );
                }
            },
            error: function (xhr) {
                if (
                    xhr.status === 422 &&
                    xhr.responseJSON &&
                    xhr.responseJSON.errors
                ) {
                    handleValidationErrors(
                        xhr.responseJSON.errors,
                        "#editComplaintForm"
                    );
                } else {
                    showAlert("Error!", "Failed to update complaint", "error");
                }
            },
            complete: function () {
                $("#editComplaintBtn")
                    .prop("disabled", false)
                    .text("Update Complaint");
            },
        });
    });

    // -------------------------
    // View complaint
    // -------------------------
    $(document).on("click", ".view-complaint", function () {
        const id = $(this).data("id");
        const url = complaintEditUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res.success) {
                const c = res.data;

                // complaint type name if relation loaded:
                const typeName =
                    c.type && c.type.name
                        ? c.type.name
                        : c.complaint_type_id_name || null;

                let variations = "";
                if (c.variations && c.variations.length) {
                    variations =
                        "<br><small><strong>Variations:</strong> " +
                        c.variations
                            .map((v) => {
                                const product = productsData.find(
                                    (p) => p.id == c.product_id
                                );
                                let varData = null;
                                if (product) {
                                    varData = product.variations.find(
                                        (vv) => vv.id == v.product_variation_id
                                    );
                                }
                                if (varData) {
                                    const attrs = [];
                                    if (varData.size)
                                        attrs.push("Size: " + varData.size);
                                    if (varData.color)
                                        attrs.push("Color: " + varData.color);
                                    if (varData.material)
                                        attrs.push(
                                            "Material: " + varData.material
                                        );
                                    return (
                                        attrs.join(", ") +
                                        " (₹" +
                                        varData.price +
                                        ")"
                                    );
                                } else {
                                    return (
                                        "Variation ID: " +
                                        v.product_variation_id
                                    );
                                }
                            })
                            .filter((s) => s.trim())
                            .join("; ") +
                        "</small>";
                }

                let attachmentsHtml = "";
                if (c.attachments && c.attachments.length > 0) {
                    attachmentsHtml =
                        '<div class="col-12"><label class="form-label fw-bold">Attachments</label><ul>';
                    c.attachments.forEach((attachment) => {
                        const fileUrl = attachment.file_path.startsWith(
                            "upload/"
                        )
                            ? "/" + attachment.file_path
                            : "/upload/" + attachment.file_path;
                        const mimeType = attachment.mime_type;
                        if (mimeType && mimeType.startsWith("video/")) {
                            attachmentsHtml += `<li><video controls style="max-width: 300px;"><source src="${fileUrl}" type="${mimeType}">${attachment.original_name}</video></li>`;
                        } else {
                            attachmentsHtml += `<li><a href="${fileUrl}" target="_blank">${attachment.original_name}</a></li>`;
                        }
                    });
                    attachmentsHtml += "</ul></div>";
                }

                let content = `
                  <div class="row g-3">
                      <div class="col-md-6"><label class="form-label fw-bold">Complaint Code</label><p>${
                          c.complaint_code || "C#" + c.id
                      }</p></div>
                      <div class="col-md-6"><label class="form-label fw-bold">Customer</label><p>${
                          c.customer ? c.customer.name : "-"
                      }</p></div>
                      <div class="col-md-6"><label class="form-label fw-bold">Product</label><p>${
                          c.product ? c.product.item_name : "-"
                      }${variations}</p></div>
                      <div class="col-md-6"><label class="form-label fw-bold">Date</label><p>${
                          c.complaint_date
                              ? new Date(c.complaint_date).toLocaleDateString()
                              : "-"
                      } ${
                    c.complaint_time ? "at " + c.complaint_time : ""
                }</p></div>
                      <div class="col-md-6"><label class="form-label fw-bold">Assigned To</label><p>${
                          c.assignee ? c.assignee.name : "-"
                      }</p></div>
                      <div class="col-md-6"><label class="form-label fw-bold">Status</label><p>${
                          c.status
                              ? c.status.charAt(0).toUpperCase() +
                                c.status.slice(1)
                              : "-"
                      }</p></div>
                      <div class="col-md-6"><label class="form-label fw-bold">Complaint Type</label><p>${
                          typeName
                              ? typeName
                              : c.complaint_type_id
                              ? "Type #" + c.complaint_type_id
                              : "-"
                      }</p></div>
                      <div class="col-md-6"><label class="form-label fw-bold">Assign Date</label><p>${
                          c.assign_date
                              ? new Date(c.assign_date).toLocaleDateString()
                              : "-"
                      }</p></div>
                      <div class="col-12"><label class="form-label fw-bold">Description</label><p>${
                          c.complaint_desc || "-"
                      }</p></div>
                      ${attachmentsHtml}
                  </div>
                `;
                $("#viewComplaintContent").html(content);

                var off = new bootstrap.Offcanvas(
                    document.getElementById("viewComplaintOffcanvas")
                );
                off.show();
            } else {
                showAlert("Error!", res.message || "Failed to load", "error");
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch complaint", "error");
        });
    });

    // -------------------------
    // Edit submit (update)
    // -------------------------
    // $('#editComplaintForm').on('submit', function(e){
    //     e.preventDefault();
    //     clearFormErrors('#editComplaintForm');

    //     const id = $('#edit_complaint_id').val();
    //     if (!id) { showAlert('Error!','Missing complaint id','error'); return; }

    //     const url = complaintUpdateUrlTemplate.replace(':id', id);
    //     let fd = new FormData(this);

    //     // Use method override for PUT
    //     fd.append('_method','PUT');

    //     $('#editComplaintBtn').prop('disabled', true).text('Updating...');
    //     $.ajax({
    //         url: url,
    //         type: 'POST', // method override
    //         data: fd,
    //         processData: false,
    //         contentType: false,
    //         success: function(res){
    //             if (res.success) {
    //                 var off = bootstrap.Offcanvas.getInstance(document.getElementById('editComplaintOffcanvas'));
    //                 if (off) off.hide();
    //                 showAlert('Success!', res.message || 'Complaint updated','success');
    //                 if (window.complaintTable) window.complaintTable.ajax.reload(null,false);
    //             } else {
    //                 showAlert('Error!', res.message || 'Failed to update','error');
    //             }
    //         },
    //         error: function(xhr){
    //             if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
    //                 handleValidationErrors(xhr.responseJSON.errors, '#editComplaintForm');
    //             } else {
    //                 showAlert('Error!','Failed to update complaint','error');
    //             }
    //         },
    //         complete: function(){
    //             $('#editComplaintBtn').prop('disabled', false).text('Update Complaint');
    //         }
    //     });
    // });

    // -------------------------
    // Delete complaint
    // -------------------------
    $(document).on("click", ".delete-complaint", function () {
        const id = $(this).data("id");
        const name = $(this).data("name") || `Complaint #${id}`;
        Swal.fire({
            title: "Are you sure?",
            text: `Delete ${name}?`,
            icon: "warning",
            showCancelButton: true,
        }).then(function (res) {
            if (res.isConfirmed) {
                $.ajax({
                    url: complaintDeleteUrlTemplate.replace(":id", id),
                    type: "DELETE",
                    data: {
                        _token: $('meta[name="csrf-token"]').attr("content"),
                    },
                    success: function (resp) {
                        if (resp.success) {
                            showAlert(
                                "Success!",
                                resp.message || "Deleted",
                                "success"
                            );
                            if (window.complaintTable)
                                window.complaintTable.ajax.reload(null, false);
                        } else {
                            showAlert(
                                "Error!",
                                resp.message || "Failed to delete",
                                "error"
                            );
                        }
                    },
                    error: function () {
                        showAlert("Error!", "Failed to delete", "error");
                    },
                });
            }
        });
    });

    // -------------------------
    // Reset edit offcanvas on close (optional)
    // -------------------------
    $("#editComplaintOffcanvas").on("hidden.bs.offcanvas", function () {
        $("#editComplaintForm")[0].reset();
        $("#edit_complaint_id").val("");
        clearFormErrors("#editComplaintForm");
        $("#editComplaintForm .selected-variation").hide().html("");
        $("#editComplaintForm .selected-file-display").remove();
    });

    // -------------------------
    // Product Variations
    // -------------------------
    let currentProductRow = null;
    $(document).on("change", ".product-select", function () {
        const row = $(this).closest("form");
        const productId = $(this).val();
        if (!productId) {
            // Clear variations if product is deselected
            row.find('input[name="variations"]').val("");
            row.find('input[name="variations[]"]').remove();
            row.find(".selected-variation").hide().html("");
            return;
        }
        // Check if product has variations
        const product = productsData.find((p) => p.id == productId);
        if (!product || !product.has_variations) {
            // No variations, just clear and hide
            row.find('input[name="variations"]').val("");
            row.find('input[name="variations[]"]').remove();
            row.find(".selected-variation").hide().html("");
            return;
        }
        // Prevent opening modal if already open for another product
        if ($("#productVariationsModal").hasClass("show")) {
            showAlert(
                "Please save or cancel the current variation selection first.",
                "",
                "warning"
            );
            // Reset the select to previous value or empty
            $(this).val("");
            return;
        }
        currentProductRow = row;
        loadProductVariations(productId);
        $("#productVariationsModal").modal("show");
    });

    // save variations
    $("#saveVariationsBtn").on("click", function () {
        const selectedVariations = [];
        $('#variationsContent input[type="checkbox"]:checked').each(
            function () {
                selectedVariations.push($(this).val());
            }
        );
        if (currentProductRow) {
            // Remove existing variation inputs
            currentProductRow.find('input[name="variations"]').remove();
            currentProductRow.find('input[name="variations[]"]').remove();

            // Create hidden inputs for each selected variation
            selectedVariations.forEach((variationId) => {
                currentProductRow.append(
                    `<input type="hidden" name="variations[]" value="${variationId}">`
                );
            });

            // Display selected variations
            if (selectedVariations.length > 0) {
                const productId = currentProductRow
                    .find(".product-select")
                    .val();
                const product = productsData.find((p) => p.id == productId);
                if (product) {
                    const variationDetails = selectedVariations
                        .map((variationId) => {
                            const variation = product.variations.find(
                                (v) => v.id == variationId
                            );
                            if (variation) {
                                const attrs = [];
                                if (variation.size)
                                    attrs.push("Size: " + variation.size);
                                if (variation.color)
                                    attrs.push("Color: " + variation.color);
                                if (variation.material)
                                    attrs.push(
                                        "Material: " + variation.material
                                    );
                                return (
                                    attrs.join(", ") +
                                    " (₹" +
                                    variation.price +
                                    ")"
                                );
                            }
                            return "Variation ID: " + variationId;
                        })
                        .join("; ");
                    currentProductRow
                        .find(".selected-variation")
                        .html(
                            `<small class="text-muted">${variationDetails}</small>`
                        )
                        .show();
                }
            } else {
                currentProductRow.find(".selected-variation").hide().html("");
            }
        }
        $("#productVariationsModal").modal("hide");
    });

    function loadProductVariations(productId) {
        $.ajax({
            url: "/admin/products/" + productId + "/variations",
            type: "GET",
            success: function (response) {
                let content = '<div class="row">';
                if (
                    response.success &&
                    response.data &&
                    response.data.length > 0
                ) {
                    response.data.forEach(function (variation) {
                        const attrs = [];
                        if (variation && variation.size)
                            attrs.push("Size: " + variation.size);
                        if (variation && variation.color)
                            attrs.push("Color: " + variation.color);
                        if (variation && variation.material)
                            attrs.push("Material: " + variation.material);
                        if (variation && variation.price)
                            attrs.push("Price: ₹" + variation.price);
                        const attrStr =
                            attrs.join(" | ") || "Default Variation";

                        content += `
                            <div class="col-md-12 mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" value="${
                                        variation ? variation.id : ""
                                    }" id="variation_${
                            variation ? variation.id : ""
                        }">
                                    <label class="form-check-label" for="variation_${
                                        variation ? variation.id : ""
                                    }">
                                        ${attrStr}
                                    </label>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    content +=
                        '<div class="col-12"><p>No variations available for this product.</p></div>';
                }
                content += "</div>";
                $("#variationsContent").html(content);

                // Check already selected variations
                if (currentProductRow) {
                    const selectedIds = currentProductRow
                        .find('input[name="variations[]"]')
                        .map(function () {
                            return $(this).val();
                        })
                        .get();
                    selectedIds.forEach(function (id) {
                        $("#variation_" + id).prop("checked", true);
                    });
                }
            },
            error: function () {
                $("#variationsContent").html(
                    "<p>Error loading variations.</p>"
                );
            },
        });
    }

    // -------------------------
    // Custom Search input handling
    // -------------------------
    // Show/hide clear icon based on input
    $(document).on("input", "#customSearchInput", function () {
        var val = $(this).val();
        $("#customSearchClear").css("visibility", val ? "visible" : "hidden");

        // Debounced DataTable search
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
            if (complaintTable) complaintTable.search(val).draw();
        }, 300);
    });

    // Clear search
    $(document).on("click", "#customSearchClear", function () {
        $("#customSearchInput").val("");
        $("#customSearchClear").css("visibility", "hidden");
        if (complaintTable) complaintTable.search("").draw();
        $("#customSearchInput").focus();
    });
});
if (window.location.search.includes("open=create")) {
    const offcanvasEl = document.getElementById("createComplaintOffcanvas");
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
//Add more file inputs and display selected files
$("#addMoreFiles, .add-more-files").on("click", function () {
    // Add a new file input field with remove button
    const newInput = $(
        '<input type="file" name="task_attachments[]" class="file-input mb-2">'
    );
    const removeBtn = $(
        '<button type="button" class="remove-input btn btn-sm btn-outline-danger ms-2">&times;</button>'
    );
    const container = $('<div class="d-flex align-items-center mb-2">')
        .append(newInput)
        .append(removeBtn);
    $(this).closest(".col-12").append(container);
});

// Handle remove input button
$(document).on("click", ".remove-input", function () {
    $(this).closest(".d-flex").remove();
});

// Use event delegation for dynamic file inputs
$(document).on("change", ".file-input", function () {
    let files = this.files;
    let html = "";

    for (let i = 0; i < files.length; i++) {
        html += `<div class="selected-file-display d-flex justify-content-between align-items-center border rounded p-2 mb-1 bg-light"><span class="text-truncate">${files[i].name}</span><button type="button" class="remove-file btn btn-sm btn-danger ms-2">&times;</button></div>`;
    }

    $(this).nextAll(".selected-file-display").remove();
    $(this).after(html);
});

// Handle remove file button
$(document).on("click", ".remove-file", function () {
    $(this).closest("div").remove();
    // Note: This only removes from display, the file remains in the input
    // User can reselect if needed
});

// Handle delete attachment button
$(document).on("click", ".delete-attachment", function () {
    const attachmentId = $(this).data("attachment-id");
    const attachmentItem = $(this).closest(".list-group-item");

    Swal.fire({
        title: "Delete Attachment",
        text: "Are you sure you want to delete this attachment?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete",
        cancelButtonText: "Cancel",
    }).then(function (result) {
        if (result.isConfirmed) {
            const url = complaintDeleteAttachmentUrlTemplate.replace(
                ":attachment",
                attachmentId
            );
            $.ajax({
                url: url,
                type: "DELETE",
                data: {
                    _token: $('meta[name="csrf-token"]').attr("content"),
                },
                success: function (res) {
                    if (res.success) {
                        attachmentItem.remove();
                        showAlert(
                            "Success!",
                            res.message || "Attachment deleted",
                            "success"
                        );
                        // If no attachments left, hide the section
                        if (
                            $("#existingAttachmentsList .list-group-item")
                                .length === 0
                        ) {
                            $("#existingAttachments").hide();
                        }
                    } else {
                        showAlert(
                            "Error!",
                            res.message || "Failed to delete attachment",
                            "error"
                        );
                    }
                },
                error: function (xhr) {
                    let message = "Failed to delete attachment";
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }
                    showAlert("Error!", message, "error");
                },
            });
        }
    });
});
