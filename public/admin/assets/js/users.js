$(function () {
    // ========== Users DataTable ==========
    let userTable = $("#userTable").DataTable({
        serverSide: true,
        processing: true,
        responsive: true,
        dom:
            "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
        language: {
            lengthMenu:
                '<select class="form-select">' +
                '<option value="10">10</option>' +
                '<option value="25">25</option>' +
                '<option value="50">50</option>' +
                '<option value="100">100</option>' +
                "</select>",
        },
        buttons: [
            {
                extend: "collection",
                text: '<i class="bi bi-download"></i>',
                className: "btn btn-light dropdown-toggle",
                buttons: [
                    {
                        extend: "csv",
                        className: "dropdown-item",
                        exportOptions: { columns: [0, 1, 2, 3] },
                    },
                    {
                        extend: "excel",
                        className: "dropdown-item",
                        exportOptions: { columns: [0, 1, 2, 3] },
                    },
                    {
                        extend: "pdf",
                        className: "dropdown-item",
                        exportOptions: { columns: [0, 1, 2, 3] },
                    },
                    {
                        extend: "print",
                        className: "dropdown-item",
                        exportOptions: { columns: [0, 1, 2, 3] },
                    },
                ],
            },
        ],
        ajax: {
            url: UserDataListUrl,
            data: function (d) {
                d.role_id = window.currentRole || 3;
            },
        },
        columns: [
            {
                data: "DT_RowIndex",
                name: "DT_RowIndex",
                orderable: false,
                searchable: false,
            },
            { data: "name", name: "name" },
            { data: "email", name: "email" },
            { data: "role", name: "role" },
            {
                data: "action",
                name: "action",
                orderable: false,
                searchable: false,
            },
        ],
    });

    // ========== Helpers ==========
    function clearFormErrors(formSelector) {
        $(formSelector + " .is-invalid").removeClass("is-invalid");
        $(formSelector + " .invalid-feedback")
            .text("")
            .hide();
    }

    function showFieldErrors(formSelector, errors) {
        $.each(errors, function (key, msgs) {
            let $input = $(formSelector).find('[name="' + key + '"]');
            if ($input.length === 0) {
                $input = $(formSelector).find("#" + key);
            }
            if ($input.length) {
                $input.addClass("is-invalid");
                let errId = $input.attr("id")
                    ? $input.attr("id") + "Error"
                    : key + "Error";
                let $feedback = $("#" + errId);
                if ($feedback.length === 0) {
                    $feedback = $("<div>", {
                        id: errId,
                        class: "invalid-feedback",
                    }).insertAfter($input);
                }
                $feedback.text(msgs[0]).show();
            } else {
                toastr.error(msgs[0]);
            }
        });
    }

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

    // ========== Toggle Additional Forms Based on Role ==========
    function toggleAdditionalForms(roleId, isEditMode = false) {
        const companyAccordion = $("#companyInfoAccordion");
        const accountAccordion = $("#accountInfoAccordion");

        // Show company and account forms for Supplier (4) and Customer (5)
        if ([4, 5].includes(parseInt(roleId))) {
            companyAccordion.removeClass("d-none");
            accountAccordion.removeClass("d-none");

            // Expand company accordion by default in edit mode
            if (isEditMode) {
                $("#companyCollapse").addClass("show");
                $("#accountCollapse").addClass("show");
            }
        } else {
            companyAccordion.addClass("d-none");
            accountAccordion.addClass("d-none");
        }
    }

    // ========== Create/Update user — Form submit ==========
    $("#userForm").on("submit", function (e) {
        e.preventDefault();
        var form = this;
        var fd = new FormData(form);

        clearFormErrors("#userForm");

        var submitBtn = $(form).find('button[type="submit"]');
        var originalBtnHtml = submitBtn.html();
        submitBtn
            .prop("disabled", true)
            .html('<i class="fas fa-spinner fa-spin me-2"></i>Saving...');

        let url = UserDataStoreUrl;
        let method = "POST";
        const userId = $("#userId").val();
        if (userId) {
            url = UserDataUpdateUrlTemplate.replace(":id", userId);
            method = "POST";
            fd.append("_method", "PUT");
        }

        $.ajax({
            url: url,
            type: method,
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res.success) {
                    $("#userForm")[0].reset();
                    $("#state-dropdown").val("").trigger("change");
                    $("#city-dropdown").val("").trigger("change");
                    showAlert(
                        "Success!",
                        res.message || "User saved successfully.",
                        "success"
                    );
                    $("#userOffcanvas").offcanvas("hide");
                    userTable.ajax.reload(null, false);
                } else {
                    showAlert(
                        "Error!",
                        res.message || "Failed to save user.",
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
                    showFieldErrors("#userForm", xhr.responseJSON.errors);
                } else {
                    showAlert(
                        "Error!",
                        "Server error while saving user.",
                        "error"
                    );
                }
            },
            complete: function () {
                submitBtn.prop("disabled", false).html(originalBtnHtml);
            },
        });
    });

    // ========== Tabs role change ==========
    $("#userTabs button").on("click", function () {
        $("#userTabs button").removeClass("active");
        $(this).addClass("active");
        window.currentRole = $(this).data("role");
        userTable.ajax.reload();
    });

    // ========== Edit user — populate form ==========
    // ========== Edit user — populate form ==========
    $(document).on("click", ".editUser", function () {
        const userId = $(this).data("id");
        $.get(UserDataEditUrlTemplate.replace(":id", userId), function (res) {
            if (res.success) {
                const user = res.data;
                console.log("User data:", user); // Debug log

                // Populate basic form fields
                $('#userForm [name="first_name"]').val(user.first_name || "");
                $('#userForm [name="last_name"]').val(user.last_name || "");
                $('#userForm [name="email"]').val(user.email || "");
                $('#userForm [name="gender"]').val(user.gender || "");
                $('#userForm [name="dob"]').val(user.dob || "");
                $('#userForm [name="phone"]').val(user.phone || "");
                $('#userForm [name="address"]').val(user.address || "");
                $('#userForm [name="pincode"]').val(user.pincode || "");

                // Handle role - make it read-only in edit mode
                $("#roles").addClass("d-none");
                $("#roleDisplay")
                    .removeClass("d-none")
                    .val(user.roles?.[0]?.name || "N/A");
                $('#userForm [name="roles"]').val(user.role_id);

                // Handle state and city - Set state first, then load cities
                if (user.state_id) {
                    $("#state-dropdown").val(user.state_id).trigger("change");

                    // Load cities after state is set
                    setTimeout(() => {
                        loadCitiesForState(user.state_id, user.city_id);
                    }, 500);
                } else {
                    $("#city-dropdown").html(
                        '<option value="">--Select City--</option>'
                    );
                }

                // Populate company information if exists
                if (user.company_profile) {
                    $('#userForm [name="company_name"]').val(
                        user.company_profile.company_name || ""
                    );
                    $('#userForm [name="company_contact_person"]').val(
                        user.company_profile.company_contact_person || ""
                    );
                    $('#userForm [name="account_number"]').val(
                        user.company_profile.account_number || ""
                    );
                    $('#userForm [name="ifsc_code"]').val(
                        user.company_profile.ifsc_code || ""
                    );
                    $('#userForm [name="branch_name"]').val(
                        user.company_profile.branch_name || ""
                    );
                    $('#userForm [name="tin_number"]').val(
                        user.company_profile.tin_number || ""
                    );
                    $('#userForm [name="cst_number"]').val(
                        user.company_profile.cst_number || ""
                    );
                    $('#userForm [name="pan_number"]').val(
                        user.company_profile.pan_number || ""
                    );
                    $('#userForm [name="gst_number"]').val(
                        user.company_profile.gst_number || ""
                    );
                    $('#userForm [name="phone_number"]').val(
                        user.company_profile.phone_number || ""
                    );
                }

                // Populate account information if exists
                if (user.account_information) {
                    $('#userForm [name="bank_name"]').val(
                        user.account_information.bank_name || ""
                    );
                    $('#userForm [name="branch_code"]').val(
                        user.account_information.branch_code || ""
                    );
                    $('#userForm [name="switch_code"]').val(
                        user.account_information.switch_code || ""
                    );
                    $('#userForm [name="international_bank_code"]').val(
                        user.account_information.international_bank_code || ""
                    );
                    $('#userForm [name="national_bank_code"]').val(
                        user.account_information.national_bank_code || ""
                    );
                }

                // Clear password fields for edit
                $('#userForm [name="password"]').val("");
                $('#userForm [name="password_confirmation"]').val("");

                // Update form for edit mode
                $("#formTitle").text("Edit User");
                $("#submitBtn").text("Update");
                $("#formMethod").val("PUT");
                $("#userId").val(userId);

                // Make password optional in edit mode
                $("#passwordRequired").hide();
                $("#confirmPasswordRequired").hide();
                $('#userForm [name="password"]').removeAttr("required");
                $('#userForm [name="password_confirmation"]').removeAttr(
                    "required"
                );

                // Toggle additional forms based on role
                toggleAdditionalForms(user.role_id, true);

                // Show offcanvas
                $("#userOffcanvas").offcanvas("show");
            }
        }).fail(function (xhr) {
            console.error("Failed to load user:", xhr);
            showAlert("Error!", "Failed to load user data.", "error");
        });
    });

    // ========== Delete user ==========
    $(document).on("click", ".deleteUser", function () {
        const userId = $(this).data("id");
        if (confirm("Are you sure you want to delete this user?")) {
            $.ajax({
                url: UserDataDeleteUrlTemplate.replace(":id", userId),
                type: "DELETE",
                success: function (res) {
                    if (res.success) {
                        showAlert("Success!", res.message, "success");
                        userTable.ajax.reload(null, false);
                    } else {
                        showAlert("Error!", res.message, "error");
                    }
                },
                error: function (xhr) {
                    showAlert("Error!", "Failed to delete user.", "error");
                },
            });
        }
    });

    // ========== Reset form when offcanvas is hidden ==========
    $("#userOffcanvas").on("hidden.bs.offcanvas", function () {
        $("#userForm")[0].reset();
        $("#formTitle").text("Add User");
        $("#submitBtn").text("Save");
        $("#formMethod").val("POST");
        $("#userId").val("");
        $("#passwordRequired").show();
        $("#confirmPasswordRequired").show();
        $('#userForm [name="password"]').attr("required", true);
        $('#userForm [name="password_confirmation"]').attr("required", true);
        $("#state-dropdown").val("").trigger("change");
        $("#city-dropdown").html('<option value="">--Select City--</option>');

        // Reset role field
        $("#roles").removeClass("d-none");
        $("#roleDisplay").addClass("d-none");

        // Hide additional forms
        $("#companyInfoAccordion").addClass("d-none");
        $("#accountInfoAccordion").addClass("d-none");

        clearFormErrors("#userForm");
    });

    // ========== Show additional forms when role is selected in create mode ==========
    $("#roles").on("change", function () {
        const roleId = $(this).val();
        toggleAdditionalForms(roleId, false);
    });

    // Helper function to load cities
    function loadCitiesForState(stateId, selectedCityId = null) {
        const url = CitiesByStateUrlTemplate + "/" + stateId;

        $.get(url, function (res) {
            let options = '<option value="">--Select City--</option>';
            if (res.cities && res.cities.length > 0) {
                $.each(res.cities, function (i, ct) {
                    const selected = selectedCityId == ct.id ? "selected" : "";
                    options += `<option value="${ct.id}" ${selected}>${ct.name}</option>`;
                });
            }
            $("#city-dropdown").html(options);
        }).fail(function () {
            $("#city-dropdown").html(
                '<option value="">--Select City--</option>'
            );
        });
    }

    $(document).on("change", "#state-dropdown", function () {
        const stateId = $(this).val();
        $("#city-dropdown").html('<option value="">Loading...</option>');
        if (!stateId) {
            $("#city-dropdown").html(
                '<option value="">--Select City--</option>'
            );
            return;
        }

        const url = CitiesByStateUrlTemplate + "/" + stateId;

        $.get(url, function (res) {
            let options = '<option value="">--Select City--</option>';
            if (res.cities && res.cities.length > 0) {
                $.each(res.cities, function (i, ct) {
                    options += `<option value="${ct.id}">${ct.name}</option>`;
                });
            }
            $("#city-dropdown").html(options);
        }).fail(function () {
            $("#city-dropdown").html(
                '<option value="">--Select City--</option>'
            );
        });
    });
}); // end ready
