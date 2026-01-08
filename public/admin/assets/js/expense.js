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
    var expenseTable = null;
    var searchDebounceTimer = null;
    if ($(".ExpenseList").length) {
        if ($.fn.DataTable.isDataTable(".ExpenseList")) {
            $(".ExpenseList").DataTable().clear().destroy();
        }
        expenseTable = $(".ExpenseList").DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: { url: expenseListUrl, type: "GET" },
            // layout with buttons (requires Buttons extension)
            dom: "<'row mb-2'<'col-sm-6'l><'col-sm-6 text-end'B>>" + "rt" + "<'row mt-2'<'col-sm-6'i><'col-sm-6'p>>",
            buttons: [
                {
                    // Search toggle button
                    text: '<i class="bi bi-search me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Search' },
                    action: function(e, dt, node, config) {
                        $('#customSearchContainer').toggle();
                        if ($('#customSearchContainer').is(':visible')) {
                            $('#customSearchInput').focus();
                        } else {
                            // if hiding, clear the search input and table search
                            $('#customSearchInput').val('');
                            expenseTable.search('').draw();
                        }
                    }
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                    action: function(e, dt, node, config) {
                        window.location.href = expenseExportUrl;
                    }
                },
                {
                    extend: 'print',
                    text: '<i class="bi bi-printer me-1"></i>',
                    exportOptions: { columns: ':visible:not(:first-child)' },
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Print' }
                },
                {
                    extend: 'colvis',
                    text: '<i class="bi bi-eye me-1"></i>',
                    columns: ':not(:first-child)',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Column visibility' }
                },
                {
                    text: '<i class="bi bi-trash me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Delete selected' },
                    action: function(e, dt, node, config) {
                        var ids = [];
                        $('.row-checkbox:checked').each(function() {
                            ids.push($(this).data('id'));
                        });
                        if (!ids.length) {
                            showAlert('No selection', 'Please select at least one expense to delete', 'warning');
                            return;
                        }
                        Swal.fire({
                            title: 'Confirm delete',
                            text: 'Delete ' + ids.length + ' selected expense(es)?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete',
                            cancelButtonText: 'Cancel'
                        }).then(function(result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: expenseBulkDeleteUrl,
                                    method: 'POST',
                                    data: {
                                        _token: $('meta[name="csrf-token"]').attr('content'),
                                        ids: ids
                                    },
                                    success: function(res) {
                                        if (res.success) {
                                            showAlert('Deleted', res.message || 'Expenses deleted', 'success');
                                            expenseTable.ajax.reload(null, false);
                                        } else {
                                            showAlert('Error', res.message || 'Failed to delete', 'error');
                                        }
                                    },
                                    error: function() {
                                        showAlert('Error', 'Failed to delete expenses', 'error');
                                    }
                                });
                            }
                        });
                    }
                },
                {
                    text: '<i class="bi bi-funnel me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Filter' },
                    action: function() {
                        // Reset modal selects and show
                        $('#filter_column').val('');
                        $('#filter_value').html('<option value="">-- Select Value --</option>');
                        $('#columnFilterModal').modal('show');
                    }
                }
            ],
            columns: [
                { // checkbox column
                    data: 'checkbox',
                    name: 'checkbox',
                    orderable: false,
                    searchable: false,
                    render: function(data, type, row, meta) {
                        return '<input type="checkbox" class="row-checkbox form-check-input" data-id="' + row.id + '">';
                    },
                    width: '30px'
                },
                { data: "DT_RowIndex", name: "DT_RowIndex", orderable: false, searchable: false },
                { data: "customer", name: "customer" },
                { data: "expense_title", name: "expense_title" },
                { data: "expense_date", name: "expense_date" },
                { data: "amounts", name: "amounts", orderable: false, searchable: false },
                { data: "total", name: "total", orderable: false, searchable: false },
                { data: "status", name: "status" },
                { data: "action", name: "action", orderable: false, searchable: false }
            ],
            order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function(settings) {
                // uncheck master when table redraw
                $('#selectAllExpenses').prop('checked', false);

                // Initialize Bootstrap tooltips for newly created button nodes
                try {
                    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
                    tooltipTriggerList.forEach(function (el) {
                        // Use Bootstrap's tooltip (v5)
                        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
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
            }
        });

        window.expenseTable = expenseTable;
    }

// ---------------- Select All / Row checkbox handling ----------------
$(document).on('change', '#selectAllExpenses', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllExpenses').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var expenseColumnMap = {
    1: 'customer',
    2: 'expense_title',
    3: 'expense_date',
    4: 'status'
};

$('#filter_column').on('change', function() {
    var colIndex = $(this).val();
    $('#filter_value').html('<option value="">Loading...</option>');
    if (!colIndex) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }
    var colKey = expenseColumnMap[colIndex];
    if (!colKey) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Fetch distinct values from server
    $.get(expenseDistinctValuesUrl, { column: colKey }, function(res) {
        if (res.success) {
            var opts = '<option value="">-- Select Value --</option>';
            res.data.forEach(function(v) {
                // escape potential HTML
                var safe = String(v).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
                opts += `<option value="${safe}">${safe}</option>`;
            });
            $('#filter_value').html(opts);
        } else {
            $('#filter_value').html('<option value="">No values</option>');
        }
    }).fail(function() {
        $('#filter_value').html('<option value="">Failed to load</option>');
    });
});

$('#applyColumnFilter').on('click', function() {
    var colIndex = $('#filter_column').val();
    var value = $('#filter_value').val();
    $('#columnFilterModal').modal('hide');

    if (!colIndex) return;

    // colIndex from modal: 1=customer, 2=expense_title, 3=expense_date, 4=status
    // DataTables columns: 0=checkbox, 1=DT_RowIndex, 2=customer, 3=expense_title, 4=expense_date, 5=amounts, 6=total, 7=status, 8=action
    var dtColIndex = parseInt(colIndex, 10) + 1; // add 1 to account for checkbox and index columns
    if (!expenseTable) return;

    if (!value) {
        // clear search for that column
        expenseTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        expenseTable.column(dtColIndex).search('^' + escaped + '$', true, false).draw();
    }
});

/* ---------------- Custom Search input handling ---------------- */
// Show/hide clear icon based on input
$(document).on('input', '#customSearchInput', function () {
  var val = $(this).val();
  $('#customSearchClear').css('visibility', val ? 'visible' : 'hidden');

  // Debounced DataTable search
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(function () {
    if (expenseTable) expenseTable.search(val).draw();
  }, 300);
});

// Clear search
$(document).on('click', '#customSearchClear', function () {
  $('#customSearchInput').val('');
  $('#customSearchClear').css('visibility', 'hidden');
  if (expenseTable) expenseTable.search('').draw();
  $('#customSearchInput').focus();
});

    // ---------- Create amount rows ----------
    let createIdx = 0;
    function createAmountRow(idx, amount = "", label = "") {
        return $(`
            <div class="row mb-2 amount-row" data-index="${idx}">
                <div class="col-md-6">
                    <input type="text" name="items[${idx}][expense_label]" class="form-control expense-label" placeholder="Label" value="${label}">
                </div>
                <div class="col-md-4">
                    <input type="number" name="items[${idx}][expense_amount]" class="form-control expense-amount" step="0.01" placeholder="Amount" value="${amount}">
                </div>
                <div class="col-md-2 text-end">
                    <button type="button" class="btn btn-danger btn-sm remove-create-amount">&minus;</button>
                </div>
            </div>
        `);
    }

    $("#createAddExpenseAmountBtn").on("click", function () {
        createIdx++;
        $("#createExpensesContainer").append(createAmountRow(createIdx));
    });

    $(document).on("click", ".remove-create-amount", function () {
        const rows = $("#createExpensesContainer .amount-row");
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
        $("#createExpensesContainer .expense-amount").each(function () {
            const v = parseFloat($(this).val()) || 0;
            total += v;
        });
        $("#create_expense_total_amount").remove();
        if ($("#create_expense_total_display").length) {
            $("#create_expense_total_display").val(total.toFixed(2));
        } else {
            $("#createExpensesContainer").after(
                `<input type="hidden" id="create_expense_total_amount" name="total_amount" value="${total.toFixed(2)}">`
            );
        }
    }

    $(document).on("input", "#createExpensesContainer .expense-amount", function () {
        recalcCreateTotal();
    });

    // ---------- CREATE submit ----------
    $("#createExpenseForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#createExpenseForm");

        if ($("#createExpensesContainer .amount-row").length === 0) {
            $("#createExpensesContainer").append(createAmountRow(0));
        }

        let fd = new FormData(this);
        $("#createExpenseBtn").prop("disabled", true).html('<i class="fas fa-spinner fa-spin me-2"></i>Saving...');

        $.ajax({
            url: expenseStoreUrl,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    $("#createExpenseForm")[0].reset();
                    $("#createExpensesContainer").html(createAmountRow(0));
                    createIdx = 0;
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById("createExpenseOffcanvas"));
                    if (off) off.hide();

                    // permission-style toast
                    showAlert("Success!", res.message || "Expense created", "success");

                    if (window.expenseTable) window.expenseTable.ajax.reload(null, false);
                } else {
                    showAlert("Error!", res && res.message ? res.message : "Failed to create", "error");
                }
            },
            error: function (xhr) {
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, "#createExpenseForm");
                } else {
                    showAlert("Error!", "Failed to create expense", "error");
                }
            },
            complete: function () {
                $("#createExpenseBtn").prop("disabled", false).text("Save Expense");
            }
        });
    });

    // ---------- OPEN Create Offcanvas ----------
    $("#openCreateExpenseBtn").on("click", function () {
        $("#createExpenseForm")[0].reset();
        $("#createExpensesContainer").html(createAmountRow(0));
        createIdx = 0;
        var off = new bootstrap.Offcanvas(document.getElementById("createExpenseOffcanvas"));
        off.show();
    });

    // ---------- VIEW ----------
    $(document).on("click", ".view-expense", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        const url = expenseEditUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res && res.success) {
                const exp = res.data;
                let content = `<div class="row g-3">`;
                content += `<div class="col-12"><label class="form-label fw-bold">Expense Title</label><p>${exp.expense_title || "-"}</p></div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Customer</label><p>${exp.customer ? exp.customer.name : "-"}</p></div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Date</label><p>${exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : "-"}</p></div>`;
                content += `<div class="col-12"><label class="form-label fw-bold">Amounts</label>`;
                if (exp.amounts && exp.amounts.length) {
                    exp.amounts.forEach((a) => {
                        content += `<div class="border rounded p-2 mb-2"><strong>${a.expense_label || "Amount"}</strong><br><small>₹${parseFloat(a.expense_amount).toFixed(2)}</small></div>`;
                    });
                } else {
                    content += `<p>No amounts</p>`;
                }
                content += `</div>`;
                content += `<div class="col-md-6"><label class="form-label fw-bold">Total</label><p>₹${parseFloat(exp.total_amount || 0).toFixed(2)}</p></div>`;
                content += `</div>`;

                $("#viewExpenseContent").html(content);
                var off = new bootstrap.Offcanvas(document.getElementById("viewExpenseOffcanvas"));
                off.show();
            } else {
                showAlert("Error!", res && res.message ? res.message : "Failed to load", "error");
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch expense", "error");
        });
    });

    // ---------- Edit ----------
    $(document).on("click", ".edit-expense", function (e) {
        e.preventDefault();
        clearFormErrors("#editExpenseForm");
        const id = $(this).data("id");
        const url = expenseEditUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res && res.success) {
                const exp = res.data;
                $("#edit_expense_id").val(exp.id);
                $("#edit_expense_customer_id").val(exp.customer_id || "");
                $("#edit_expense_status").val(exp.status || "");
                $("#edit_expense_date").val(exp.expense_date ? exp.expense_date.split("T")[0] : "");
                $("#editExpenseForm").find('input[name="expense_title"]').val(exp.expense_title || "");
                // render amounts
                $("#editExpensesContainer").empty();
                let idx = 0;
                if (exp.amounts && exp.amounts.length) {
                    exp.amounts.forEach((a) => {
                        $("#editExpensesContainer").append(createEditAmountRow(idx, a.expense_amount, a.expense_label));
                        idx++;
                    });
                } else {
                    $("#editExpensesContainer").append(createEditAmountRow(0));
                }
                editIdx = idx > 0 ? idx - 1 : 0;

                var off = new bootstrap.Offcanvas(document.getElementById("editExpenseOffcanvas"));
                off.show();
            } else {
                showAlert("Error!", res && res.message ? res.message : "Failed to load", "error");
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch expense", "error");
        });
    });

    // helper to create edit row
    let editIdx = 0;
    function createEditAmountRow(idx, amount = "", label = "") {
        return $(`
            <div class="row mb-2 edit-amount-row" data-index="${idx}">
                <div class="col-md-6">
                    <input type="text" name="items[${idx}][expense_label]" class="form-control edit-expense-label" placeholder="Label" value="${label}">
                </div>
                <div class="col-md-4">
                    <input type="number" name="items[${idx}][expense_amount]" class="form-control edit-expense-amount" step="0.01" placeholder="Amount" value="${amount}">
                </div>
                <div class="col-md-2 text-end">
                    <button type="button" class="btn btn-danger btn-sm remove-edit-amount">&minus;</button>
                </div>
            </div>
        `);
    }

    $("#editAddExpenseAmountBtn").on("click", function () {
        editIdx++;
        $("#editExpensesContainer").append(createEditAmountRow(editIdx));
    });

    $(document).on("click", ".remove-edit-amount", function () {
        const rows = $("#editExpensesContainer .edit-amount-row");
        if (rows.length > 1) $(this).closest(".edit-amount-row").remove();
        else {
            const r = $(this).closest(".edit-amount-row");
            r.find("input").val("");
        }
    });

    // ---------- EDIT submit ----------
    $("#editExpenseForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#editExpenseForm");

        const id = $("#edit_expense_id").val();
        if (!id) {
            showAlert("Error!", "Missing expense id", "error");
            return;
        }
        const url = expenseUpdateUrlTemplate.replace(":id", id);
        let fd = new FormData(this);
        fd.append("_method", "PUT");

        $("#editExpenseBtn").prop("disabled", true).text("Updating...");
        $.ajax({
            url: url,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById("editExpenseOffcanvas"));
                    if (off) off.hide();
                    showAlert("Success!", res.message || "Expense updated", "success");
                    if (window.expenseTable) window.expenseTable.ajax.reload(null, false);
                } else {
                    showAlert("Error!", res && res.message ? res.message : "Failed to update", "error");
                }
            },
            error: function (xhr) {
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, "#editExpenseForm");
                } else {
                    showAlert("Error!", "Failed to update expense", "error");
                }
            },
            complete: function () {
                $("#editExpenseBtn").prop("disabled", false).text("Update Expense");
            }
        });
    });

    // ---------- DELETE ----------
    $(document).on("click", ".delete-expense", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        const name = $(this).data("name") || `Expense #${id}`;
        Swal.fire({
            title: "Are you sure?",
            text: `Delete ${name}?`,
            icon: "warning",
            showCancelButton: true,
        }).then(function (res) {
            if (res.isConfirmed) {
                $.ajax({
                    url: expenseDeleteUrlTemplate.replace(":id", id),
                    type: "DELETE",
                    data: {
                        _token: $('meta[name="csrf-token"]').attr("content"),
                    },
                    success: function (resp) {
                        if (resp && resp.success) {
                            showAlert("Success!", resp.message || "Deleted", "success");
                            if (window.expenseTable) window.expenseTable.ajax.reload(null, false);
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

    // ---------- Download Expense ----------
    $(document).on('click', '.download-expense', function(){
        const expenseId = $(this).data('id');
        const url = expenseDownloadUrlTemplate.replace(':id', expenseId);
        window.open(url, '_blank');
    });

    // CLEANUP when offcanvas closed
    $('#editExpenseOffcanvas').on('hidden.bs.offcanvas', function () {
        $('#editExpenseForm')[0].reset();
        clearFormErrors("#editExpenseForm");
    });

    $('#createExpenseOffcanvas').on('hidden.bs.offcanvas', function () {
        $('#createExpenseForm')[0].reset();
        clearFormErrors("#createExpenseForm");
        $("#createExpensesContainer").html(createAmountRow(0));
        createIdx = 0;
    });
});
// Check URL for ?open=create to show offcanvas
if (window.location.search.includes('open=create')) {
    const offcanvasEl = document.getElementById('createExpenseOffcanvas');
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
