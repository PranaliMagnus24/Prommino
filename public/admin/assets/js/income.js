$(function () {
    // ---------- helper: toast alert like Permission JS ----------
    function showAlert(title, message, icon = 'success') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: title || '',
                text: message || '',
                icon: icon || 'success',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } else {
            alert((title ? title + ' - ' : '') + (message || ''));
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
                $field = $(formSelector + ' [name^="' + key.split(".")[0] + '"]');
            }
            if ($field.length) {
                $field.addClass("is-invalid");
                const idSafe = key.replace(/\./g, "_") + "Error";
                if ($("#" + idSafe).length) $("#" + idSafe).text(val[0]);
                else {
                    if ($field.next(".invalid-feedback").length)
                        $field.next(".invalid-feedback").text(val[0]);
                    else
                        $field.after('<div class="invalid-feedback">' + val[0] + "</div>");
                }
            }
        });
    }

    // DataTable init
    if ($(".IncomeList").length) {
        if ($.fn.DataTable.isDataTable(".IncomeList")) {
            $(".IncomeList").DataTable().clear().destroy();
        }
        window.incomeTable = $(".IncomeList").DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: { url: incomeListUrl, type: "GET" },
            columns: [
                { data: "DT_RowIndex", name: "DT_RowIndex", orderable: false, searchable: false },
                { data: "customer", name: "customer" },
                { data: "income_title", name: "income_title" },
                { data: "income_date", name: "income_date" },
                { data: "amounts", name: "amounts", orderable: false, searchable: false },
                { data: "total", name: "total", orderable: false, searchable: false },
                { data: "status", name: "status" },
                { data: "action", name: "action", orderable: false, searchable: false }
            ]
        });
    }

    // ---------- Create amount rows ----------
    let createIdx = 0;
    function createAmountRow(idx, amount = "", label = "") {
        return $(`
            <div class="row mb-2 amount-row" data-index="${idx}">
                <div class="col-md-6">
                    <input type="text" name="items[${idx}][income_label]" class="form-control income-label" placeholder="Label" value="${label}">
                </div>
                <div class="col-md-4">
                    <input type="number" name="items[${idx}][income_amount]" class="form-control income-amount" step="0.01" placeholder="Amount" value="${amount}">
                </div>
                <div class="col-md-2 text-end">
                    <button type="button" class="btn btn-danger btn-sm remove-create-amount">&minus;</button>
                </div>
            </div>
        `);
    }

    $("#createAddIncomeAmountBtn").on("click", function () {
        createIdx++;
        $("#createIncomesContainer").append(createAmountRow(createIdx));
    });

    $(document).on("click", ".remove-create-amount", function () {
        const rows = $("#createIncomesContainer .amount-row");
        if (rows.length > 1) $(this).closest(".amount-row").remove();
        else {
            const r = $(this).closest(".amount-row");
            r.find("input").val("");
        }
        recalcCreateTotal();
    });

    // recalc total for create form
    function recalcCreateTotal() {
        let total = 0;
        $("#createIncomesContainer .income-amount").each(function () {
            const v = parseFloat($(this).val()) || 0;
            total += v;
        });
        $("#create_total_amount").remove();
        if ($("#create_total_display").length) {
            $("#create_total_display").val(total.toFixed(2));
        } else {
            $("#createIncomesContainer").after(
                `<input type="hidden" id="create_total_amount" name="total_amount" value="${total.toFixed(2)}">`
            );
        }
    }

    $(document).on("input", "#createIncomesContainer .income-amount", function () {
        recalcCreateTotal();
    });

    // ---------- CREATE submit ----------
    $("#createIncomeForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#createIncomeForm");

        if ($("#createIncomesContainer .amount-row").length === 0) {
            $("#createIncomesContainer").append(createAmountRow(0));
        }

        let fd = new FormData(this);
        $("#createIncomeBtn").prop("disabled", true).html('<i class="fas fa-spinner fa-spin me-2"></i>Saving...');

        $.ajax({
            url: incomeStoreUrl,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    $("#createIncomeForm")[0].reset();
                    $("#createIncomesContainer").html(createAmountRow(0));
                    createIdx = 0;
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById("createIncomeOffcanvas"));
                    if (off) off.hide();

                    // permission-style toast
                    showAlert("Success!", res.message || "Income created", "success");

                    if (window.incomeTable) window.incomeTable.ajax.reload(null, false);
                } else {
                    showAlert("Error!", res && res.message ? res.message : "Failed to create", "error");
                }
            },
            error: function (xhr) {
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, "#createIncomeForm");
                } else {
                    showAlert("Error!", "Failed to create income", "error");
                }
            },
            complete: function () {
                $("#createIncomeBtn").prop("disabled", false).text("Save Income");
            }
        });
    });

    // ---------- OPEN Create Offcanvas ----------
    $("#openCreateIncomeBtn").on("click", function () {
        $("#createIncomeForm")[0].reset();
        $("#createIncomesContainer").html(createAmountRow(0));
        createIdx = 0;
        var off = new bootstrap.Offcanvas(document.getElementById("createIncomeOffcanvas"));
        off.show();
    });

    // ---------- VIEW ----------
    $(document).on("click", ".view-income", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        const url = incomeEditUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res && res.success) {
                const inc = res.data;
                let content = `<div class="row g-3">`;
                content += `<div class="col-12"><label class="form-label fw-bold">Income Title</label><p>${inc.income_title || "-"}</p></div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Customer</label><p>${inc.customer ? inc.customer.name : "-"}</p></div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Date</label><p>${inc.income_date ? new Date(inc.income_date).toLocaleDateString() : "-"}</p></div>`;
                content += `<div class="col-12"><label class="form-label fw-bold">Amounts</label>`;
                if (inc.amounts && inc.amounts.length) {
                    inc.amounts.forEach((a) => {
                        content += `<div class="border rounded p-2 mb-2"><strong>${a.income_label || "Amount"}</strong><br><small>₹${parseFloat(a.income_amount).toFixed(2)}</small></div>`;
                    });
                } else {
                    content += `<p>No amounts</p>`;
                }
                content += `</div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Total</label><p>₹${parseFloat(inc.total_amount || 0).toFixed(2)}</p></div>`;
                content += `</div>`;

                $("#viewIncomeContent").html(content);
                var off = new bootstrap.Offcanvas(document.getElementById("viewIncomeOffcanvas"));
                off.show();
            } else {
                showAlert("Error!", res && res.message ? res.message : "Failed to load", "error");
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch income", "error");
        });
    });

    // ---------- Edit ----------
    $(document).on("click", ".edit-income", function (e) {
        e.preventDefault();
        clearFormErrors("#editincomeForm");
        const id = $(this).data("id");
        const url = incomeEditUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res && res.success) {
                const inc = res.data;
                $("#edit_income_id").val(inc.id);
                $("#edit_customer_id").val(inc.customer_id || "");
                $("#edit_status").val(inc.status || "");
                $("#edit_income_date").val(inc.income_date ? inc.income_date.split("T")[0] : "");
                $("#editincomeForm").find('input[name="income_title"]').val(inc.income_title || "");
                // render amounts
                $("#editIncomesContainer").empty();
                let idx = 0;
                if (inc.amounts && inc.amounts.length) {
                    inc.amounts.forEach((a) => {
                        $("#editIncomesContainer").append(createEditAmountRow(idx, a.income_amount, a.income_label));
                        idx++;
                    });
                } else {
                    $("#editIncomesContainer").append(createEditAmountRow(0));
                }
                editIdx = idx > 0 ? idx - 1 : 0;

                var off = new bootstrap.Offcanvas(document.getElementById("editIncomeOffcanvas"));
                off.show();
            } else {
                showAlert("Error!", res && res.message ? res.message : "Failed to load", "error");
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch income", "error");
        });
    });

    // helper to create edit row
    let editIdx = 0;
    function createEditAmountRow(idx, amount = "", label = "") {
        return $(`
            <div class="row mb-2 edit-amount-row" data-index="${idx}">
                <div class="col-md-6">
                    <input type="text" name="items[${idx}][income_label]" class="form-control edit-income-label" placeholder="Label" value="${label}">
                </div>
                <div class="col-md-4">
                    <input type="number" name="items[${idx}][income_amount]" class="form-control edit-income-amount" step="0.01" placeholder="Amount" value="${amount}">
                </div>
                <div class="col-md-2 text-end">
                    <button type="button" class="btn btn-danger btn-sm remove-edit-amount">&minus;</button>
                </div>
            </div>
        `);
    }

    $("#editAddIncomeAmountBtn").on("click", function () {
        editIdx++;
        $("#editIncomesContainer").append(createEditAmountRow(editIdx));
    });

    $(document).on("click", ".remove-edit-amount", function () {
        const rows = $("#editIncomesContainer .edit-amount-row");
        if (rows.length > 1) $(this).closest(".edit-amount-row").remove();
        else {
            const r = $(this).closest(".edit-amount-row");
            r.find("input").val("");
        }
    });

    // ---------- EDIT submit ----------
    $("#editincomeForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#editincomeForm");

        const id = $("#edit_income_id").val();
        if (!id) {
            showAlert("Error!", "Missing income id", "error");
            return;
        }
        const url = incomeUpdateUrlTemplate.replace(":id", id);
        let fd = new FormData(this);
        fd.append("_method", "PUT");

        $("#editIncomeBtn").prop("disabled", true).text("Updating...");
        $.ajax({
            url: url,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById("editIncomeOffcanvas"));
                    if (off) off.hide();
                    showAlert("Success!", res.message || "Income updated", "success");
                    if (window.incomeTable) window.incomeTable.ajax.reload(null, false);
                } else {
                    showAlert("Error!", res && res.message ? res.message : "Failed to update", "error");
                }
            },
            error: function (xhr) {
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, "#editincomeForm");
                } else {
                    showAlert("Error!", "Failed to update income", "error");
                }
            },
            complete: function () {
                $("#editIncomeBtn").prop("disabled", false).text("Update Income");
            }
        });
    });

    // ---------- DELETE ----------
    $(document).on("click", ".delete-income", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        const name = $(this).data("name") || `Income #${id}`;
        Swal.fire({
            title: "Are you sure?",
            text: `Delete ${name}?`,
            icon: "warning",
            showCancelButton: true,
        }).then(function (res) {
            if (res.isConfirmed) {
                $.ajax({
                    url: incomeDeleteUrlTemplate.replace(":id", id),
                    type: "DELETE",
                    data: { _token: $('meta[name="csrf-token"]').attr("content") },
                    success: function (resp) {
                        if (resp && resp.success) {
                            showAlert("Success!", resp.message || "Deleted", "success");
                            if (window.incomeTable) window.incomeTable.ajax.reload(null, false);
                        } else {
                            showAlert("Error!", resp && resp.message ? resp.message : "Failed to delete", "error");
                        }
                    },
                    error: function (xhr) {
                        if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.message) {
                            showAlert("Error!", xhr.responseJSON.message, "error");
                        } else {
                            showAlert("Error!", "Failed to delete", "error");
                        }
                    }
                });
            }
        });
    });

    // CLEANUP when offcanvas closed
    $('#editIncomeOffcanvas').on('hidden.bs.offcanvas', function () {
        $('#editincomeForm')[0].reset();
        clearFormErrors("#editincomeForm");
    });

    $('#createIncomeOffcanvas').on('hidden.bs.offcanvas', function () {
        $('#createIncomeForm')[0].reset();
        clearFormErrors("#createIncomeForm");
        $("#createIncomesContainer").html(createAmountRow(0));
        createIdx = 0;
    });
});
// Check URL for ?open=create to show offcanvas
if (window.location.search.includes('open=create')) {
    const offcanvasEl = document.getElementById('createIncomeOffcanvas');
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
