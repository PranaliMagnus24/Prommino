$(function () {
    // -------------------------
    // DataTable
    // -------------------------
    var businessTable = null;
    var searchDebounceTimer = null;
    if ($(".BusinessList").length) {
        if ($.fn.DataTable.isDataTable(".BusinessList")) {
            $(".BusinessList").DataTable().clear().destroy();
        }
        businessTable = $(".BusinessList").DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: { url: businessUrl, type: "GET" },
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
                            businessTable.search("").draw();
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
                        // For now, just show alert. You can implement export later
                        showAlert(
                            "Info",
                            "Export functionality coming soon",
                            "info"
                        );
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
                                "Please select at least one business to delete",
                                "warning"
                            );
                            return;
                        }
                        Swal.fire({
                            title: "Confirm delete",
                            text:
                                "Delete " +
                                ids.length +
                                " selected business(es)?",
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "Yes, delete",
                            cancelButtonText: "Cancel",
                        }).then(function (result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: businessUrl + "/bulk-delete",
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
                                                    "Businesses deleted",
                                                "success"
                                            );
                                            businessTable.ajax.reload(
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
                                            "Failed to delete businesses",
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
                { data: "business_name", name: "business_name" },
                { data: "first_name", name: "first_name" },
                { data: "email", name: "email" },
                { data: "phone", name: "phone" },
                { data: "registration_date", name: "registration_date" },
                { data: "expiry_date", name: "expiry_date" },
                { data: "package", name: "package" },
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
                $("#selectAllBusinesses").prop("checked", false);

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

        window.businessTable = businessTable;
    }

    // ---------------- Select All / Row checkbox handling ----------------
    $(document).on("change", "#selectAllBusinesses", function () {
        var checked = $(this).prop("checked");
        $(".row-checkbox").prop("checked", checked);
    });

    $(document).on("change", ".row-checkbox", function () {
        var total = $(".row-checkbox").length;
        var checked = $(".row-checkbox:checked").length;
        $("#selectAllBusinesses").prop("checked", total === checked);
    });

    // ---------------- Column Filter modal logic ----------------
    // Map UI column selection value to DB key used in distinct API
    var businessColumnMap = {
        2: "business_name",
        3: "first_name",
        4: "email",
        5: "phone",
        6: "registration_date",
        7: "expiry_date",
        8: "package",
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
        var colKey = businessColumnMap[colIndex];
        if (!colKey) {
            $("#filter_value").html(
                '<option value="">-- Select Value --</option>'
            );
            return;
        }

        // Fetch distinct values from server
        $.get(
            businessUrl + "/distinct-values",
            { column: colKey },
            function (res) {
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
                    $("#filter_value").html(
                        '<option value="">No values</option>'
                    );
                }
            }
        ).fail(function () {
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
        if (!businessTable) return;

        if (!value) {
            // clear search for that column
            businessTable.column(dtColIndex).search("").draw();
        } else {
            // escape regex characters
            var escaped = $.fn.dataTable.util.escapeRegex(value);
            businessTable
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
    // -------------------------
    // Open Create Offcanvas
    // -------------------------
    $("#openCreateBusinessBtn").on("click", function () {
        $("#createBusinessForm")[0].reset();
        clearFormErrors("#createBusinessForm");
        // Hide package info
        $("#create-package-info").hide();

        var off = new bootstrap.Offcanvas(
            document.getElementById("createBusinessOffcanvas")
        );
        off.show();
    });

    // ---------- PACKAGE SELECTION HANDLER FOR CREATE ----------
    $("#create_package_id").on("change", function () {
        var packageId = $(this).val();
        if (packageId) {
            $.ajax({
                url: packageUrl.replace(":id", packageId),
                type: "GET",
                success: function (data) {
                    $("#create-package-title").text(data.package_title);
                    $("#create-package-description").text(
                        data.package_description
                    );
                    $("#create-package-duration").text(data.duration_years);
                    $("#create-package-fee").text(data.year_fee);
                    $("#create-package-user-limit").text(data.user_limit);
                    $("#create-package-trial").text(
                        data.is_trial
                            ? "Yes (" + data.trial_days + " days)"
                            : "No"
                    );
                    $("#create-package-info").show();

                    // Calculate expiry date based on logic
                    var registrationDate = $("#createRegistrationDate").val();
                    if (registrationDate) {
                        var regDate = new Date(registrationDate);
                        if (!data.duration_years && data.trial_days) {
                            regDate.setDate(
                                regDate.getDate() + parseInt(data.trial_days)
                            );
                        } else {
                            regDate.setFullYear(
                                regDate.getFullYear() +
                                    parseInt(data.duration_years || 0)
                            );
                        }
                        var expiryDate = regDate.toISOString().split("T")[0];
                        $("#createExpiryDate").val(expiryDate);
                    }
                },
                error: function () {
                    showAlert(
                        "Error",
                        "Failed to load package details",
                        "error"
                    );
                },
            });
        } else {
            $("#create-package-info").hide();
            $("#createExpiryDate").val("");
        }
    });

    // ---------- PACKAGE SELECTION HANDLER FOR EDIT ----------
    $("#edit_package_id").on("change", function () {
        var packageId = $(this).val();
        if (packageId) {
            $.ajax({
                url: packageUrl.replace(":id", packageId),
                type: "GET",
                success: function (data) {
                    $("#edit-package-title").text(data.package_title);
                    $("#edit-package-description").text(
                        data.package_description
                    );
                    $("#edit-package-duration").text(data.duration_years);
                    $("#edit-package-fee").text(data.year_fee);
                    $("#edit-package-user-limit").text(data.user_limit);
                    $("#edit-package-trial").text(
                        data.is_trial
                            ? "Yes (" + data.trial_days + " days)"
                            : "No"
                    );
                    $("#edit-package-info").show();

                    // Calculate expiry date based on logic
                    var registrationDate = $("#editRegistrationDate").val();
                    if (registrationDate) {
                        var regDate = new Date(registrationDate);
                        if (!data.duration_years && data.trial_days) {
                            regDate.setDate(
                                regDate.getDate() + parseInt(data.trial_days)
                            );
                        } else {
                            regDate.setFullYear(
                                regDate.getFullYear() +
                                    parseInt(data.duration_years || 0)
                            );
                        }
                        var expiryDate = regDate.toISOString().split("T")[0];
                        $("#editExpiryDate").val(expiryDate);
                    }
                },
                error: function () {
                    showAlert(
                        "Error",
                        "Failed to load package details",
                        "error"
                    );
                },
            });
        } else {
            $("#edit-package-info").hide();
            $("#editExpiryDate").val("");
        }
    });

    // -------------------------
    // Create submit
    // -------------------------
    $("#createBusinessForm")
        .off("submit")
        .on("submit", function (e) {
            e.preventDefault();
            clearFormErrors("#createBusinessForm");

            let fd = new FormData(this);
            fd.append("_token", $('meta[name="csrf-token"]').attr("content"));

            $("#createBusinessBtn").prop("disabled", true).text("Saving...");

            $.ajax({
                url: businessUrl,
                type: "POST",
                data: fd,
                processData: false,
                contentType: false,

                success: function (res) {
                    if (res.success) {
                        $("#createBusinessForm")[0].reset();
                        $("#create-package-info").hide();

                        var off = bootstrap.Offcanvas.getInstance(
                            document.getElementById("createBusinessOffcanvas")
                        );
                        if (off) off.hide();

                        showAlert(
                            "Success!",
                            res.message || "Business created successfully",
                            "success"
                        );

                        if (window.businessTable)
                            window.businessTable.ajax.reload(null, false);
                    } else {
                        showAlert("Error!", res.message || "Failed", "error");
                    }
                },

                error: function (xhr) {
                    if (xhr.status === 422 && xhr.responseJSON?.errors) {
                        handleValidationErrors(
                            xhr.responseJSON.errors,
                            "#createBusinessForm"
                        );
                    } else {
                        showAlert("Error!", "Something went wrong", "error");
                    }
                },

                complete: function () {
                    $("#createBusinessBtn")
                        .prop("disabled", false)
                        .text("Save");
                },
            });
        });

    // -------------------------
    // Edit submit
    // -------------------------
    $("#editBusinessForm")
        .off("submit")
        .on("submit", function (e) {
            e.preventDefault();
            clearFormErrors("#editBusinessForm");

            const id = $("#editBusinessId").val();
            const url = businessUrl + "/" + id;

            let fd = new FormData(this);
            fd.append("_token", $('meta[name="csrf-token"]').attr("content"));

            $("#editBusinessBtn").prop("disabled", true).text("Updating...");

            $.ajax({
                url: url,
                type: "POST",
                data: fd,
                processData: false,
                contentType: false,

                success: function (res) {
                    if (res.success) {
                        var off = bootstrap.Offcanvas.getInstance(
                            document.getElementById("editBusinessOffcanvas")
                        );
                        if (off) off.hide();

                        showAlert(
                            "Success!",
                            res.message || "Business updated successfully",
                            "success"
                        );

                        if (window.businessTable)
                            window.businessTable.ajax.reload(null, false);
                    } else {
                        showAlert("Error!", res.message || "Failed", "error");
                    }
                },

                error: function (xhr) {
                    if (xhr.status === 422 && xhr.responseJSON?.errors) {
                        handleValidationErrors(
                            xhr.responseJSON.errors,
                            "#editBusinessForm"
                        );
                    } else {
                        showAlert("Error!", "Something went wrong", "error");
                    }
                },

                complete: function () {
                    $("#editBusinessBtn")
                        .prop("disabled", false)
                        .text("Update");
                },
            });
        });

    // -------------------------
    // Edit business
    // -------------------------
    $(document).on("click", ".editBusiness", function () {
        clearFormErrors("#editBusinessForm");
        const id = $(this).data("id");
        const url = businessUrl + "/" + id + "/edit";

        $.get(url, function (res) {
            if (res.success) {
                const c = res.data;

                // populate edit form
                $("#editBusinessId").val(id);
                $("#editUserId").val(c.user_id || "");
                $("#editBusinessName").val(c.business_name || "");
                $("#editFirstName").val(c.first_name || "");
                $("#editLastName").val(c.last_name || "");
                $("#editEmail").val(c.email || "");
                $("#editPhone").val(c.phone || "");
                $("#editAddress").val(c.address || "");
                $("#edit_package_id").val(c.package_id || "");
                $("#edit_package_id").trigger("change");
                $("#editRegistrationDate").val(c.registration_date || "");
                $("#editExpiryDate").val(c.expiry_date || "");
                $("#editSubdomain").val(c.subdomain || "");

                var off = new bootstrap.Offcanvas(
                    document.getElementById("editBusinessOffcanvas")
                );
                off.show();
            } else {
                showAlert("Error!", res.message || "Failed to load", "error");
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch business", "error");
        });
    });

    // -------------------------
    // Delete business
    // -------------------------
    $(document).on("click", ".deleteBusiness", function () {
        const id = $(this).data("id");
        const name = $(this).data("name") || `Business #${id}`;
        Swal.fire({
            title: "Are you sure?",
            text: `Delete ${name}?`,
            icon: "warning",
            showCancelButton: true,
        }).then(function (res) {
            if (res.isConfirmed) {
                $.ajax({
                    url: businessUrl + "/" + id,
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
                            if (window.businessTable)
                                window.businessTable.ajax.reload(null, false);
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
    // Reset create offcanvas on close
    // -------------------------
    $("#createBusinessOffcanvas").on("hidden.bs.offcanvas", function () {
        $("#createBusinessForm")[0].reset();
        $("#create-package-info").hide();
        clearFormErrors("#createBusinessForm");
    });

    // -------------------------
    // Reset edit offcanvas on close
    // -------------------------
    $("#editBusinessOffcanvas").on("hidden.bs.offcanvas", function () {
        $("#editBusinessForm")[0].reset();
        $("#edit-package-info").hide();
        clearFormErrors("#editBusinessForm");
    });

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
            if (businessTable) businessTable.search(val).draw();
        }, 300);
    });

    // Clear search
    $(document).on("click", "#customSearchClear", function () {
        $("#customSearchInput").val("");
        $("#customSearchClear").css("visibility", "hidden");
        if (businessTable) businessTable.search("").draw();
        $("#customSearchInput").focus();
    });
});
