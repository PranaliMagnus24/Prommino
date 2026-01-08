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

    // DataTables init
    var packageTable = null;
    var searchDebounceTimer = null;
    if ($("#packagesTable").length) {
        if ($.fn.DataTable.isDataTable("#packagesTable")) {
            $("#packagesTable").DataTable().clear().destroy();
        }

        packageTable = $("#packagesTable").DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: {
                url: packageListUrl,
                type: "GET",
                data: function (d) {
                    d.status = $("#statusFilter").val();
                },
            },
            dom:
                "<'row mb-2'<'col-sm-6'l><'col-sm-6 text-end'B>>" +
                "rt" +
                "<'row mt-2'<'col-sm-6'i><'col-sm-6'p>>",
            buttons: [
                {
                    text: '<i class="bi bi-search me-1"></i>',
                    attr: { "data-bs-toggle": "tooltip", title: "Search" },
                    action: function (e, dt, node, config) {
                        $("#customSearchContainer").toggle();
                        if ($("#customSearchContainer").is(":visible")) {
                            $("#customSearchInput").focus();
                        } else {
                            $("#customSearchInput").val("");
                            packageTable.search("").draw();
                        }
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
                                "Please select at least one package to delete",
                                "warning"
                            );
                            return;
                        }
                        Swal.fire({
                            title: "Confirm delete",
                            text:
                                "Delete " +
                                ids.length +
                                " selected package(s)?",
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "Yes, delete",
                            cancelButtonText: "Cancel",
                        }).then(function (result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: packageBulkDeleteUrl,
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
                                                    "Packages deleted",
                                                "success"
                                            );
                                            packageTable.ajax.reload(
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
                                            "Failed to delete packages",
                                            "error"
                                        );
                                    },
                                });
                            }
                        });
                    },
                },
                {
                    extend: "excel",
                    text: '<i class="bi bi-file-earmark-spreadsheet me-1"></i>',
                    exportOptions: { columns: ":visible:not(:first-child)" },
                    attr: {
                        "data-bs-toggle": "tooltip",
                        title: "Export to Excel",
                    },
                    action: function (e, dt, node, config) {
                        window.location.href = packagesExportUrl;
                    },
                },
                {
                    text: '<i class="bi bi-funnel me-1"></i>',
                    attr: { "data-bs-toggle": "tooltip", title: "Filter" },
                    action: function () {
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
                { data: "package_title", name: "package_title" },
                { data: "duration_years", name: "duration_years" },
                { data: "year_fee", name: "year_fee" },
                { data: "status", name: "status" },
                {
                    data: "action",
                    name: "action",
                    orderable: false,
                    searchable: false,
                },
            ],
            order: [[1, "desc"]],
            drawCallback: function (settings) {
                $("#selectAllPackages").prop("checked", false);
                var tooltipTriggerList = [].slice.call(
                    document.querySelectorAll('[data-bs-toggle="tooltip"]')
                );
                tooltipTriggerList.forEach(function (el) {
                    if (!el._bsTooltip) {
                        new bootstrap.Tooltip(el);
                    }
                });
            },
        });

        window.packageTable = packageTable;
    }

    // Select All / Row checkbox handling
    $(document).on("change", "#selectAllPackages", function () {
        var checked = $(this).prop("checked");
        $(".row-checkbox").prop("checked", checked);
    });

    $(document).on("change", ".row-checkbox", function () {
        var total = $(".row-checkbox").length;
        var checked = $(".row-checkbox:checked").length;
        $("#selectAllPackages").prop("checked", total === checked);
    });

    // Column Filter modal logic
    var packageColumnMap = {
        2: "package_title",
        3: "duration_years",
        4: "year_fee",
        5: "status",
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
        var colKey = packageColumnMap[colIndex];
        if (!colKey) {
            $("#filter_value").html(
                '<option value="">-- Select Value --</option>'
            );
            return;
        }

        $.get(packageDistinctUrl, { column: colKey }, function (res) {
            if (res.success) {
                var opts = '<option value="">-- Select Value --</option>';
                res.data.forEach(function (v) {
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

        var dtColIndex = parseInt(colIndex, 10);
        if (!packageTable) return;

        if (!value) {
            packageTable.column(dtColIndex).search("").draw();
        } else {
            var escaped = $.fn.dataTable.util.escapeRegex(value);
            packageTable
                .column(dtColIndex)
                .search("^" + escaped + "$", true, false)
                .draw();
        }
    });

    // Custom Search input handling
    $(document).on("input", "#customSearchInput", function () {
        var val = $(this).val();
        $("#customSearchClear").css("visibility", val ? "visible" : "hidden");

        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
            if (packageTable) packageTable.search(val).draw();
        }, 300);
    });

    $(document).on("click", "#customSearchClear", function () {
        $("#customSearchInput").val("");
        $("#customSearchClear").css("visibility", "hidden");
        if (packageTable) packageTable.search("").draw();
        $("#customSearchInput").focus();
    });

    // Function to toggle fields based on trial checkbox for create form
    function toggleCreateTrialFields() {
        var isChecked = $("#packageTrial").is(":checked");
        if (isChecked) {
            $("#trialDays").closest(".col-md-6").show();
            $("#durationYears").closest(".col-md-6").hide();
            $("#yearFee").closest(".col-md-6").hide();
        } else {
            $("#trialDays").closest(".col-md-6").hide();
            $("#durationYears").closest(".col-md-6").show();
            $("#yearFee").closest(".col-md-6").show();
        }
    }

    // Function to toggle fields based on trial checkbox for edit form
    function toggleEditTrialFields() {
        var isChecked = $("#editPackageTrial").is(":checked");
        if (isChecked) {
            $("#editTrialDays").closest(".col-md-6").show();
            $("#editDurationYears").closest(".col-md-6").hide();
            $("#editYearFee").closest(".col-md-6").hide();
        } else {
            $("#editTrialDays").closest(".col-md-6").hide();
            $("#editDurationYears").closest(".col-md-6").show();
            $("#editYearFee").closest(".col-md-6").show();
        }
    }

    // ---------- OPEN Create Offcanvas ----------
    $("#OpenCreatePackageBtn").on("click", function () {
        $("#createPackageForm")[0].reset();
        $("#featuresContainer").html(`
            <div class="input-group mb-2">
                <input type="text" name="features[]" class="form-control feature-input" placeholder="Enter feature">
                <button type="button" class="btn btn-danger remove-feature">Remove</button>
            </div>`);
        toggleCreateTrialFields(); // Set initial state
        var off = new bootstrap.Offcanvas(
            document.getElementById("createPackageOffcanvas")
        );
        off.show();
    });

    // Bind change event for create trial checkbox
    $("#packageTrial").on("change", function () {
        toggleCreateTrialFields();
    });

    // ---------- CREATE submit ----------
    $("#createPackageForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#createPackageForm");

        let fd = new FormData(this);
        $("#createPackageBtn")
            .prop("disabled", true)
            .html('<i class="fas fa-spinner fa-spin me-2"></i>Saving...');

        $.ajax({
            url: packageStoreUrl,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    $("#createPackageForm")[0].reset();
                    $("#featuresContainer").html(`
                        <div class="input-group mb-2">
                            <input type="text" name="features[]" class="form-control feature-input" placeholder="Enter feature">
                            <button type="button" class="btn btn-danger remove-feature">Remove</button>
                        </div>`);
                    var off = bootstrap.Offcanvas.getInstance(
                        document.getElementById("createPackageOffcanvas")
                    );
                    if (off) off.hide();

                    showAlert(
                        "Success!",
                        res.message || "Package created",
                        "success"
                    );

                    if (window.packageTable)
                        window.packageTable.ajax.reload(null, false);
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
                        "#createPackageForm"
                    );
                } else {
                    showAlert("Error!", "Failed to create package", "error");
                }
            },
            complete: function () {
                $("#createPackageBtn").prop("disabled", false).text("Save");
            },
        });
    });

    // Add feature for create
    $("#addFeature").on("click", function () {
        $("#featuresContainer").append(`
            <div class="input-group mb-2">
                <input type="text" name="features[]" class="form-control feature-input" placeholder="Enter feature">
                <button type="button" class="btn btn-danger remove-feature">Remove</button>
            </div>`);
    });

    // Remove feature
    $(document).on("click", ".remove-feature", function () {
        $(this).closest(".input-group").remove();
    });

    // For edit add
    $("#editAddFeature").on("click", function () {
        $("#editFeaturesContainer").append(`
            <div class="input-group mb-2">
                <input type="text" name="features[]" class="form-control feature-input" placeholder="Enter feature">
                <button type="button" class="btn btn-danger remove-feature">Remove</button>
            </div>`);
    });

    // ---------- EDIT submit ----------
    $("#editPackageForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#editPackageForm");

        let fd = new FormData(this);
        let id = $(this).data("id");
        $("#editPackageBtn")
            .prop("disabled", true)
            .html('<i class="fas fa-spinner fa-spin me-2"></i>Updating...');

        $.ajax({
            url: packageUpdateUrl.replace(":id", id),
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    var off = bootstrap.Offcanvas.getInstance(
                        document.getElementById("editPackageOffcanvas")
                    );
                    if (off) off.hide();

                    showAlert(
                        "Success!",
                        res.message || "Package updated",
                        "success"
                    );

                    if (window.packageTable)
                        window.packageTable.ajax.reload(null, false);
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
                        "#editPackageForm"
                    );
                } else {
                    showAlert("Error!", "Failed to update package", "error");
                }
            },
            complete: function () {
                $("#editPackageBtn").prop("disabled", false).text("Update");
            },
        });
    });

    // Edit button
    $(document).on("click", ".edit-btn", function () {
        var id = $(this).data("id");
        $.get(packageShowUrl.replace(":id", id), function (data) {
            $("#editPackageForm").data("id", id);
            $("#editPackageTitle").val(data.package_title);
            $("#editPackageDescription").val(data.package_description);
            $("#editDurationYears").val(data.duration_years);
            $("#editYearFee").val(data.year_fee);
            $("#editPackageTrial").prop("checked", data.is_trial);
            $("#editTrialDays").val(data.trial_days);
            $("#editUserLimit").val(data.user_limit);
            $("#editPackageStatus").val(data.status);
            $("#editFeaturesContainer").html("");
            data.features.forEach(function (feature) {
                $("#editFeaturesContainer").append(`
                    <div class="input-group mb-2">
                        <input type="text" name="features[]" class="form-control feature-input" value="${feature.feature_name}" placeholder="Enter feature">
                        <button type="button" class="btn btn-danger remove-feature">Remove</button>
                    </div>`);
            });
            toggleEditTrialFields(); // Set initial state based on loaded data
            var off = new bootstrap.Offcanvas(
                document.getElementById("editPackageOffcanvas")
            );
            off.show();
        }).fail(function (xhr) {
            if (xhr.status === 404) {
                showAlert(
                    "Error",
                    "Package not found. It may have been deleted.",
                    "error"
                );
            } else {
                showAlert("Error", "Failed to load package data.", "error");
            }
        });
    });

    // Bind change event for edit trial checkbox
    $("#editPackageTrial").on("change", function () {
        toggleEditTrialFields();
    });

    // ---------- DELETE ----------
    $(document).on("click", ".delete-btn", function () {
        var id = $(this).data("id");
        Swal.fire({
            title: "Are you sure?",
            text: "Delete this package?",
            icon: "warning",
            showCancelButton: true,
        }).then(function (res) {
            if (res.isConfirmed) {
                $.ajax({
                    url: packageDestroyUrl.replace(":id", id),
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
                            if (window.packageTable)
                                window.packageTable.ajax.reload(null, false);
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
});
