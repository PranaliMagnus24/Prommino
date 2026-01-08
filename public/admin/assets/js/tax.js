$(function(){
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
    var taxTable = null;
    var searchDebounceTimer = null;
    if ($('.taxList').length) {
        if ($.fn.DataTable.isDataTable('.taxList')) $('.taxList').DataTable().clear().destroy();
        taxTable = $('.taxList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: {
                url: taxListUrl,
                type: 'GET'
            },
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
                            taxTable.search('').draw();
                        }
                    }
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                    action: function(e, dt, node, config) {
                        window.location.href = taxExportUrl;
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
                            showAlert('No selection', 'Please select at least one tax to delete', 'warning');
                            return;
                        }
                        Swal.fire({
                            title: 'Confirm delete',
                            text: 'Delete ' + ids.length + ' selected tax(es)?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete',
                            cancelButtonText: 'Cancel'
                        }).then(function(result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: taxBulkDeleteUrl,
                                    method: 'POST',
                                    data: {
                                        _token: $('meta[name="csrf-token"]').attr('content'),
                                        ids: ids
                                    },
                                    success: function(res) {
                                        if (res.success) {
                                            showAlert('Deleted', res.message || 'Taxes deleted', 'success');
                                            taxTable.ajax.reload(null, false);
                                        } else {
                                            showAlert('Error', res.message || 'Failed to delete', 'error');
                                        }
                                    },
                                    error: function() {
                                        showAlert('Error', 'Failed to delete taxes', 'error');
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
                { data: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'name' },
                { data: 'percent' },
                { data: 'status' },
                { data: 'action', orderable: false, searchable: false }
            ],
            order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function(settings) {
                // uncheck master when table redraw
                $('#selectAllTaxes').prop('checked', false);

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

        window.taxTable = taxTable;
    }

// ---------------- Select All / Row checkbox handling ----------------
$(document).on('change', '#selectAllTaxes', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllTaxes').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var taxColumnMap = {
    1: 'name',
    2: 'percent',
    3: 'status'
};

$('#filter_column').on('change', function() {
    var colIndex = $(this).val();
    $('#filter_value').html('<option value="">Loading...</option>');
    if (!colIndex) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }
    var colKey = taxColumnMap[colIndex];
    if (!colKey) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Fetch distinct values from server
    $.get(taxDistinctValuesUrl, { column: colKey }, function(res) {
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

    // colIndex from modal: 1=name, 2=percent, etc.
    // DataTables columns: 0=checkbox, 1=DT_RowIndex, 2=name, 3=percent, etc.
    var dtColIndex = parseInt(colIndex, 10) + 1; // add 1 to account for checkbox and index columns
    if (!taxTable) return;

    if (!value) {
        // clear search for that column
        taxTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        taxTable.column(dtColIndex).search('^' + escaped + '$', true, false).draw();
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
    if (taxTable) taxTable.search(val).draw();
  }, 300);
});

// Clear search
$(document).on('click', '#customSearchClear', function () {
  $('#customSearchInput').val('');
  $('#customSearchClear').css('visibility', 'hidden');
  if (taxTable) taxTable.search('').draw();
  $('#customSearchInput').focus();
});

    // ---------- Create Tax Functionality ----------
    $('#taxForm').on('submit', function(e){
        e.preventDefault();
        clearFormErrors('#taxForm');

        const formData = new FormData(this);
        $('#submitBtn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Adding...');

        $.ajax({
            url: taxStoreUrl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response){
                if (response && response.success) {
                    $('#taxForm')[0].reset();
                    if (window.taxTable) window.taxTable.ajax.reload(null, false);
                    showAlert('Success', response.message || 'Tax created successfully', 'success');
                } else {
                    showAlert('Error', response.message || 'Failed to create tax', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#taxForm');
                } else {
                    let errorMessage = 'Failed to create tax';
                    if (xhr.responseJSON && xhr.responseJSON.message) errorMessage = xhr.responseJSON.message;
                    showAlert('Error', errorMessage, 'error');
                }
            },
            complete: function(){
                $('#submitBtn').prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add Tax');
            }
        });
    });

    // ---------- Edit Tax ----------
    $(document).on('click', '.edit-tax', function(e){
        e.preventDefault();
        const taxId = $(this).data('id');
        const url = taxEditUrlTemplate.replace(':id', taxId);

        $.get(url, function(response){
            if (response && response.success) {
                const tax = response.data;
                $('#edit_tax_id').val(tax.id);
                $('#edit_name').val(tax.name);
                $('#edit_percentage').val(tax.percent);
                $('#edit_status').val(tax.status);
                $('#editTaxModal').modal('show');
            } else {
                showAlert('Error', response && response.message ? response.message : 'Failed to load tax details', 'error');
            }
        }).fail(function(){
            showAlert('Error', 'Failed to fetch tax details', 'error');
        });
    });

    // Update Tax
    $('#updateTaxBtn').on('click', function(){
        const taxId = $('#edit_tax_id').val();
        if (!taxId) {
            showAlert('Error', 'Tax ID is missing', 'error');
            return;
        }

        clearFormErrors('#editTaxForm');
        const formData = new FormData(document.getElementById('editTaxForm'));
        $('#updateTaxBtn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Updating...');

        const url = taxUpdateUrlTemplate.replace(':id', taxId);

        $.ajax({
            url: url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response){
                if (response && response.success) {
                    $('#editTaxModal').modal('hide');
                    if (window.taxTable) window.taxTable.ajax.reload(null, false);
                    showAlert('Success', response.message || 'Tax updated successfully', 'success');
                } else {
                    showAlert('Error', response.message || 'Failed to update tax', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#editTaxForm');
                } else {
                    let errorMessage = 'Failed to update tax';
                    if (xhr.responseJSON && xhr.responseJSON.message) errorMessage = xhr.responseJSON.message;
                    showAlert('Error', errorMessage, 'error');
                }
            },
            complete: function(){
                $('#updateTaxBtn').prop('disabled', false).html('Update Tax');
            }
        });
    });

    // ---------- Delete Tax ----------
    $(document).on('click', '.delete-tax', function(){
        const taxId = $(this).data('id');
        const taxName = $(this).data('name') || `Tax #${taxId}`;

        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete ${taxName}. This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: taxDeleteUrlTemplate.replace(':id', taxId),
                    type: 'DELETE',
                    data: {
                        _token: $('meta[name="csrf-token"]').attr('content')
                    },
                    success: function(response){
                        if (response && response.success) {
                            if (window.taxTable) window.taxTable.ajax.reload(null, false);
                            showAlert('Success', response.message || 'Tax has been deleted.', 'success');
                        } else {
                            showAlert('Error', response.message || 'Failed to delete tax', 'error');
                        }
                    },
                    error: function(){
                        showAlert('Error', 'Failed to delete tax', 'error');
                    }
                });
            }
        });
    });

    // ---------- Download Tax ----------
    $(document).on('click', '.download-tax', function(){
        const taxId = $(this).data('id');
        const url = taxDownloadUrlTemplate.replace(':id', taxId);
        window.open(url, '_blank');
    });
});
