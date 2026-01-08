$(function () {
    // ---------- helper: toast alert like Permission JS ----------
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

    // DataTable init
    var customerTable = null;
    var searchDebounceTimer = null;
    if ($(".CustomerList").length) {
        if ($.fn.DataTable.isDataTable(".CustomerList")) {
            $(".CustomerList").DataTable().clear().destroy();
        }
        customerTable = $(".CustomerList").DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: { url: customerListUrl, type: "GET" },
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
                            customerTable.search("").draw();
                        }
                    },
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: {
                        "data-bs-toggle": "tooltip",
                        title: "Download Excel",
                    },
                    action: function (e, dt, node, config) {
                        window.location.href = customerExportUrl;
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
                                "Please select at least one customer to delete",
                                "warning"
                            );
                            return;
                        }
                        Swal.fire({
                            title: "Confirm delete",
                            text:
                                "Delete " +
                                ids.length +
                                " selected customer(s)?",
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "Yes, delete",
                            cancelButtonText: "Cancel",
                        }).then(function (result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: customerBulkDeleteUrl,
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
                                                    "Customers deleted",
                                                "success"
                                            );
                                            customerTable.ajax.reload(
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
                                            "Failed to delete customers",
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
                { data: "phone", name: "phone" },
                { data: "role", name: "role" },
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
                $("#selectAllCustomer").prop("checked", false);

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

        window.customerTable = customerTable;
    }

    // ---------------- Select All / Row checkbox handling ----------------
    $(document).on("change", "#selectAllCustomer", function () {
        var checked = $(this).prop("checked");
        $(".row-checkbox").prop("checked", checked);
    });

    $(document).on("change", ".row-checkbox", function () {
        var total = $(".row-checkbox").length;
        var checked = $(".row-checkbox:checked").length;
        $("#selectAllCustomer").prop("checked", total === checked);
    });

    // ---------------- Column Filter modal logic ----------------
    // Map UI column selection value to DB key used in distinct API
    var customerColumnMap = {
        1: "customer",
        2: "phone",
        3: "role",
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
        var colKey = customerColumnMap[colIndex];
        if (!colKey) {
            $("#filter_value").html(
                '<option value="">-- Select Value --</option>'
            );
            return;
        }

        // Fetch distinct values from server
        $.get(customerDistinctValuesUrl, { column: colKey }, function (res) {
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

        // colIndex from modal: 1=customer, 2=phone, 3=role
        // DataTables columns: 0=checkbox, 1=DT_RowIndex, 2=customer, 3=phone, 4=role, 5=action
        var dtColIndex = parseInt(colIndex, 10) + 1; // add 1 to account for checkbox and index columns
        if (!customerTable) return;

        if (!value) {
            // clear search for that column
            customerTable.column(dtColIndex).search("").draw();
        } else {
            // escape regex characters
            var escaped = $.fn.dataTable.util.escapeRegex(value);
            customerTable
                .column(dtColIndex)
                .search("^" + escaped + "$", true, false)
                .draw();
        }
    });

    /* ---------------- Custom Search input handling ---------------- */
    // Show/hide clear icon based on input
    $(document).on("input", "#customSearchInput", function () {
        var val = $(this).val();
        $("#customSearchClear").css("visibility", val ? "visible" : "hidden");

        // Debounced DataTable search
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
            if (customerTable) customerTable.search(val).draw();
        }, 300);
    });

    // Clear search
    $(document).on("click", "#customSearchClear", function () {
        $("#customSearchInput").val("");
        $("#customSearchClear").css("visibility", "hidden");
        if (customerTable) customerTable.search("").draw();
        $("#customSearchInput").focus();
    });

    // ---------- CREATE submit ----------
    $("#createCustomerForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#createCustomerForm");

        let fd = new FormData(this);
        $("#createCustomerBtn")
            .prop("disabled", true)
            .html('<i class="fas fa-spinner fa-spin me-2"></i>Saving...');

        $.ajax({
            url: customerStoreUrl,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    $("#createCustomerForm")[0].reset();
                    var off = bootstrap.Offcanvas.getInstance(
                        document.getElementById("createCustomerOffcanvas")
                    );
                    if (off) off.hide();

                    showAlert(
                        "Success!",
                        res.message || "Customer created",
                        "success"
                    );

                    if (window.customerTable)
                        window.customerTable.ajax.reload(null, false);
                } else {
                    showAlert(
                        "Error!",
                        res && res.message ? res.message : "Failed to create",
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
                        "#createCustomerForm"
                    );
                } else {
                    showAlert("Error!", "Failed to create customer", "error");
                }
            },
            complete: function () {
                $("#createCustomerBtn")
                    .prop("disabled", false)
                    .text("Save Customer");
            },
        });
    });

    // ---------- OPEN Create Offcanvas ----------
    $("#openCreateCustomerBtn").on("click", function () {
        $("#createCustomerForm")[0].reset();
        clearFormErrors("#createCustomerForm");
        // Set default role if available
        if ($("#roles option").length > 1) {
            $("#roles").val($("#roles option").eq(1).val()); // Select first role option
        }
        var off = new bootstrap.Offcanvas(
            document.getElementById("createCustomerOffcanvas")
        );
        off.show();
    });

    // ---------- OPEN Import Modal ----------
    $("#importCustomerBtn").on("click", function () {
        $("#importCustomerForm")[0].reset();
        clearFormErrors("#importCustomerForm");
        var modal = new bootstrap.Modal(
            document.getElementById("importCustomerModal")
        );
        modal.show();
    });

    // ---------- IMPORT submit ----------
    $("#importCustomerForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#importCustomerForm");

        let fd = new FormData(this);
        $("#importCustomerSubmitBtn")
            .prop("disabled", true)
            .html('<i class="fas fa-spinner fa-spin me-2"></i>Importing...');

        $.ajax({
            url: customerImportUrl,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    $("#importCustomerForm")[0].reset();
                    var modal = bootstrap.Modal.getInstance(
                        document.getElementById("importCustomerModal")
                    );
                    if (modal) modal.hide();

                    showAlert(
                        "Success!",
                        res.message || "Customers imported",
                        "success"
                    );

                    if (window.customerTable)
                        window.customerTable.ajax.reload(null, false);
                } else {
                    showAlert(
                        "Error!",
                        res && res.message ? res.message : "Failed to import",
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
                        "#importCustomerForm"
                    );
                } else {
                    showAlert("Error!", "Failed to import customers", "error");
                }
            },
            complete: function () {
                $("#importCustomerSubmitBtn")
                    .prop("disabled", false)
                    .text("Import");
            },
        });
    });

    // ---------- VIEW ----------
    $(document).on("click", ".view-customer", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        const url = customerViewUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res && res.success) {
                const customer = res.data;
                let content = `<div class="row g-3">`;
                content += `<div class="col-12"><label class="form-label fw-bold">Customer Name</label><p>${
                    customer.name || "-"
                }</p></div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Email</label><p>${
                    customer.email || "-"
                }</p></div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Phone</label><p>${
                    customer.phone || "-"
                }</p></div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Gender</label><p>${
                    customer.gender
                        ? customer.gender.charAt(0).toUpperCase() +
                          customer.gender.slice(1)
                        : "-"
                }</p></div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Role</label><p>${
                    customer.roles
                        ? customer.roles.map((role) => role.name).join(", ")
                        : "-"
                }</p></div>`;
                content += `<div class="col-12"><label class="form-label fw-bold">Address</label><p>${
                    customer.address || "-"
                }</p></div>`;
                content += `</div>`;

                $("#viewCustomerContent").html(content);
                var off = new bootstrap.Offcanvas(
                    document.getElementById("viewCustomerOffcanvas")
                );
                off.show();
            } else {
                showAlert(
                    "Error!",
                    res && res.message ? res.message : "Failed to load",
                    "error"
                );
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch customer", "error");
        });
    });

    // ---------- Edit ----------
    $(document).on("click", ".edit-customer", function (e) {
        e.preventDefault();
        clearFormErrors("#editCustomerForm");
        const id = $(this).data("id");
        const url = customerEditUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res && res.success) {
                const customer = res.data;
                $("#edit_customer_id").val(customer.id);
                $("#edit_first_name").val(customer.first_name || "");
                $("#edit_last_name").val(customer.last_name || "");
                $("#edit_email").val(customer.email || "");
                $("#edit_phone").val(customer.phone || "");
                $("#edit_gender").val(customer.gender || "");
                $("#edit_address").val(customer.address || "");
                // Set role
                if (customer.roles && customer.roles.length > 0) {
                    $("#roles").val(customer.roles[0].id);
                }

                var off = new bootstrap.Offcanvas(
                    document.getElementById("editCustomerOffcanvas")
                );
                off.show();
            } else {
                showAlert(
                    "Error!",
                    res && res.message ? res.message : "Failed to load",
                    "error"
                );
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch customer", "error");
        });
    });

    // ---------- EDIT submit ----------
    $("#editCustomerForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#editCustomerForm");

        const id = $("#edit_customer_id").val();
        if (!id) {
            showAlert("Error!", "Missing customer id", "error");
            return;
        }
        const url = customerUpdateUrlTemplate.replace(":id", id);
        let fd = new FormData(this);
        fd.append("_method", "PUT");

        $("#editCustomerBtn").prop("disabled", true).text("Updating...");
        $.ajax({
            url: url,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    var off = bootstrap.Offcanvas.getInstance(
                        document.getElementById("editCustomerOffcanvas")
                    );
                    if (off) off.hide();
                    showAlert(
                        "Success!",
                        res.message || "Customer updated",
                        "success"
                    );
                    if (window.customerTable)
                        window.customerTable.ajax.reload(null, false);
                } else {
                    showAlert(
                        "Error!",
                        res && res.message ? res.message : "Failed to update",
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
                        "#editCustomerForm"
                    );
                } else {
                    showAlert("Error!", "Failed to update customer", "error");
                }
            },
            complete: function () {
                $("#editCustomerBtn")
                    .prop("disabled", false)
                    .text("Update Customer");
            },
        });
    });

    // ---------- DELETE ----------
    $(document).on("click", ".delete-customer", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        const name = $(this).data("name") || `Customer #${id}`;
        Swal.fire({
            title: "Are you sure?",
            text: `Delete ${name}?`,
            icon: "warning",
            showCancelButton: true,
        }).then(function (res) {
            if (res.isConfirmed) {
                $.ajax({
                    url: customerDeleteUrlTemplate.replace(":id", id),
                    type: "DELETE",
                    data: {
                        _token: $('meta[name="csrf-token"]').attr("content"),
                    },
                    success: function (resp) {
                        if (resp && resp.success) {
                            showAlert(
                                "Success!",
                                resp.message || "Deleted",
                                "success"
                            );
                            if (window.customerTable)
                                window.customerTable.ajax.reload(null, false);
                        } else {
                            showAlert(
                                "Error!",
                                resp && resp.message
                                    ? resp.message
                                    : "Failed to delete",
                                "error"
                            );
                        }
                    },
                    error: function (xhr) {
                        if (
                            xhr.status === 422 &&
                            xhr.responseJSON &&
                            xhr.responseJSON.message
                        ) {
                            showAlert(
                                "Error!",
                                xhr.responseJSON.message,
                                "error"
                            );
                        } else {
                            showAlert("Error!", "Failed to delete", "error");
                        }
                    },
                });
            }
        });
    });

    // CLEANUP when offcanvas closed
    $("#editCustomerOffcanvas").on("hidden.bs.offcanvas", function () {
        $("#editCustomerForm")[0].reset();
        clearFormErrors("#editCustomerForm");
    });

    $("#createCustomerOffcanvas").on("hidden.bs.offcanvas", function () {
        $("#createCustomerForm")[0].reset();
        clearFormErrors("#createCustomerForm");
    });

    $("#importCustomerModal").on("hidden.bs.modal", function () {
        $("#importCustomerForm")[0].reset();
        clearFormErrors("#importCustomerForm");
    });
});

// Check URL for ?open=create to show offcanvas
if (window.location.search.includes("open=create")) {
    const offcanvasEl = document.getElementById("createCustomerOffcanvas");
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
