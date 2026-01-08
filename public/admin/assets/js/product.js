/* ---------------- Utility: showAlert ---------------- */
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

$(document).ready(function() {
    /* ---------------- Utility: clear form errors ---------------- */
    function clearErrors(formSelector) {
        $(formSelector + ' .is-invalid').removeClass('is-invalid');
        $(formSelector + ' .invalid-feedback').text('');
    }

    /* ---------------- DataTable: Products ---------------- */
var productTable = null;
var searchDebounceTimer = null;
if ($('.productList').length) {
    productTable = $('.productList').DataTable({
        serverSide: true,
        processing: true,
        responsive: true,
        ajax: {
            url: productsListUrl,
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
                        productTable.search('').draw();
                    }
                }
            },
            {
                text: '<i class="bi bi-download me-1"></i>',
                attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                action: function(e, dt, node, config) {
                    window.location.href = productsExportUrl;
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
                        showAlert('No selection', 'Please select at least one product to delete', 'warning');
                        return;
                    }
                    Swal.fire({
                        title: 'Confirm delete',
                        text: 'Delete ' + ids.length + ' selected product(s)?',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, delete',
                        cancelButtonText: 'Cancel'
                    }).then(function(result) {
                        if (result.isConfirmed) {
                            $.ajax({
                                url: productsBulkDeleteUrl,
                                method: 'POST',
                                data: {
                                    _token: $('meta[name="csrf-token"]').attr('content'),
                                    ids: ids
                                },
                                success: function(res) {
                                    if (res.success) {
                                        showAlert('Deleted', res.message || 'Products deleted', 'success');
                                        productTable.ajax.reload(null, false);
                                    } else {
                                        showAlert('Error', res.message || 'Failed to delete', 'error');
                                    }
                                },
                                error: function() {
                                    showAlert('Error', 'Failed to delete products', 'error');
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
                data: null,
                orderable: false,
                searchable: false,
                render: function(data, type, row, meta) {
                    return '<input type="checkbox" class="row-checkbox form-check-input" data-id="' + row.id + '">';
                },
                width: '30px'
            },
            { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
            { data: 'item_name', name: 'item_name' },
            { data: 'model_number', name: 'model_number' },
            { data: 'brand', name: 'brand' },
            { data: 'category', name: 'category' },
            { data: 'unit', name: 'unit' },
            { data: 'price', name: 'price' },
            { data: 'action', name: 'action', orderable: false, searchable: false }
        ],
        order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
        drawCallback: function(settings) {
            // uncheck master when table redraw
            $('#selectAllProducts').prop('checked', false);

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
}

// ---------------- Select All / Row checkbox handling ----------------
$(document).on('change', '#selectAllProducts', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllProducts').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var columnMap = {
    1: 'item_name',
    2: 'model_number',
    3: 'brand',
    4: 'category',
    5: 'unit',
    6: 'price'
};

$('#filter_column').on('change', function() {
    var colIndex = $(this).val();
    $('#filter_value').html('<option value="">Loading...</option>');
    if (!colIndex) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }
    var colKey = columnMap[colIndex];
    if (!colKey) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Fetch distinct values from server
    $.get(productsDistinctValuesUrl, { column: colKey }, function(res) {
        if (res.success) {
            var opts = '<option value="">-- Select Value --</option>';
            res.data.forEach(function(v) {
                // escape potential HTML
                var safe = String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

    // colIndex from filter_column (1-based for filter options), corresponds to datatable column index (including checkbox at 0)
    // filter value 1 = item_name = DT column 2, filter value 2 = model_number = DT column 3, etc.
    var dtColIndex = parseInt(colIndex, 10) + 1; // +1 because DT starts with checkbox at 0
    if (!productTable) return;

    if (!value) {
        // clear search for that column
        productTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        productTable.column(dtColIndex).search('^' + escaped + '$', true, false).draw();
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
    if (productTable) productTable.search(val).draw();
  }, 300);
});

// Clear search
$(document).on('click', '#customSearchClear', function () {
  $('#customSearchInput').val('');
  $('#customSearchClear').css('visibility', 'hidden');
  if (productTable) productTable.search('').draw();
  $('#customSearchInput').focus();
});




    /* ---------------- Variation Checkbox Logic ---------------- */
    $('#has_variations').on('change', function() {
        if ($(this).is(':checked')) {
            $('#variationSection').show();
        } else {
            $('#variationSection').hide();
        }
    });

    $('#edit_has_variations').on('change', function() {
        if ($(this).is(':checked')) {
            $('#editVariationSection').show();
        } else {
            $('#editVariationSection').hide();
        }
    });

    /* ---------------- Add Product (Create) ---------------- */
    $('#productForm').on('submit', function(e) {
        e.preventDefault();
        clearErrors('#productForm');

        var btn = $('#productSubmitBtn');
        var fd = new FormData(this);

        $.ajax({
            url: productsStoreUrl,
            type: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            beforeSend: function() {
                btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
            },
            success: function(res) {
                if (res.success) {
                    $('#productForm')[0].reset();
                    $('#productPreview').hide().attr('src','');

                    // hide offcanvas safely
                    var offcanvasEl = document.getElementById('productOffcanvas');
                    if (offcanvasEl) {
                        var bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
                        if (bsOffcanvas) bsOffcanvas.hide();
                    }

                    showAlert('Success!', res.message || 'Product added', 'success');
                    if (productTable) productTable.ajax.reload(null, false);
                } else {
                    showAlert('Error!', res.message || 'Failed to add product', 'error');
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON && xhr.responseJSON.errors;
                if (errors) {
                    $.each(errors, function(key, value) {
                        var fieldId = '#' + key;
                        var errId = '#' + key + 'Error';
                        // ensure selects/fields map to correct IDs in form
                        $(fieldId).addClass('is-invalid');
                        $(errId).text(value[0]);
                    });
                } else {
                    showAlert('Error!', (xhr.responseJSON && xhr.responseJSON.message) || 'Failed to add product.', 'error');
                }
            },
            complete: function() {
                btn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add Product');
            }
        });
    });

    /* ---------------- Image preview for add form ---------------- */
    $('#product_img').on('change', function(e) {
        const file = this.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            $('#productPreview').attr('src', url).show();
        } else {
            $('#productPreview').hide().attr('src','');
        }
    });

    /* ---------------- Open View Details offcanvas & populate ---------------- */
    $(document).on('click', '.view-product-details', function() {
        var id = $(this).data('id');
        var url = productsEditUrlTemplate.replace(':id', id);

        // Show loading state
        $('#productDetailsContent').html(`
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading product details...</p>
            </div>
        `);

        $('#viewProductOffcanvas').offcanvas('show');

        $.ajax({
            url: url,
            type: 'GET',
            success: function(res) {
                if (res.success) {
                    var p = res.data;
                    var detailsHtml = generateProductDetailsHtml(p);
                    $('#productDetailsContent').html(detailsHtml);
                } else {
                    $('#productDetailsContent').html(`
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle me-2"></i>
                            Failed to load product details: ${res.message || 'Unknown error'}
                        </div>
                    `);
                }
            },
            error: function() {
                $('#productDetailsContent').html(`
                    <div class="alert alert-danger">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        Failed to load product details. Please try again.
                    </div>
                `);
            }
        });
    });

    /* ---------------- Open Edit modal & populate ---------------- */
    $(document).on('click', '.edit-product', function() {
        clearErrors('#editProductForm');
        var id = $(this).data('id');
        var url = productsEditUrlTemplate.replace(':id', id);

        $.ajax({
            url: url,
            type: 'GET',
            success: function(res) {
                if (res.success) {
                    var p = res.data;
                    $('#edit_product_id').val(p.id);
                    $('#edit_item_name').val(p.item_name);
                    $('#edit_model_number').val(p.model_number);
                    $('#edit_brand_id').val(p.brand_id);
                    $('#edit_product_category_id').val(p.product_category_id);
                    $('#edit_unit_category_id').val(p.unit_category_id);
                    $('#edit_price').val(p.price);

                    // Handle variations checkbox
                    if (p.has_variations) {
                        $('#edit_has_variations').prop('checked', true);
                        $('#editVariationSection').show();
                    } else {
                        $('#edit_has_variations').prop('checked', false);
                        $('#editVariationSection').hide();
                    }

                    if (p.product_img_url) {
                        $('#editProductPreview').attr('src', p.product_img_url).show();
                    } else {
                        $('#editProductPreview').hide().attr('src','');
                    }

                    $('#editProductModal').modal('show');
                } else {
                    showAlert('Error!', res.message || 'Failed to load product data.', 'error');
                }
            },
            error: function() {
                showAlert('Error!', 'Failed to load product data.', 'error');
            }
        });
    });

    /* ---------------- Image preview in edit modal ---------------- */
    $('#edit_product_img').on('change', function() {
        const file = this.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            $('#editProductPreview').attr('src', url).show();
        }
    });

    /* ---------------- Update Product ---------------- */
    $('#updateProductBtn').on('click', function() {
        clearErrors('#editProductForm');
        var id = $('#edit_product_id').val();
        var fd = new FormData($('#editProductForm')[0]);
        var url = productsUpdateUrlTemplate.replace(':id', id);
        var btn = $('#updateProductBtn');

        $.ajax({
            url: url,
            type: 'POST', // server expects POST with _method PUT
            data: fd,
            processData: false,
            contentType: false,
            beforeSend: function() {
                btn.prop('disabled', true).text('Updating...');
            },
            success: function(res) {
                if (res.success) {
                    $('#editProductModal').modal('hide');
                    showAlert('Success!', res.message || 'Product updated', 'success');
                    if (productTable) productTable.ajax.reload(null, false);
                } else {
                    showAlert('Error!', res.message || 'Failed to update product', 'error');
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON && xhr.responseJSON.errors;
                if (errors) {
                    $.each(errors, function(key, value) {
                        var fieldId = '#edit_' + key;
                        var errId = '#edit_' + key + 'Error';
                        $(fieldId).addClass('is-invalid');
                        $(errId).text(value[0]);
                    });
                } else {
                    showAlert('Error!', (xhr.responseJSON && xhr.responseJSON.message) || 'Failed to update product.', 'error');
                }
            },
            complete: function() {
                btn.prop('disabled', false).text('Update Product');
            }
        });
    });

    /* ---------------- Delete single product ---------------- */
    $(document).on('click', '.delete-product', function() {
        var id = $(this).data('id');
        var name = $(this).data('name');

        Swal.fire({
            title: 'Are you sure?',
            text: `You want to delete product "${name}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                var url = productsDeleteUrlTemplate.replace(':id', id);
                $.ajax({
                    url: url,
                    type: 'DELETE',
                    data: {
                        _token: $('meta[name="csrf-token"]').attr('content')
                    },
                    success: function(res) {
                        if (res.success) {
                            showAlert('Success!', res.message || 'Product deleted', 'success');
                            if (productTable) productTable.ajax.reload(null, false);
                        } else {
                            showAlert('Error!', res.message || 'Failed to delete product', 'error');
                        }
                    },
                    error: function() {
                        showAlert('Error!', 'Failed to delete product.', 'error');
                    }
                });
            }
        });
    });

    /* ---------------- Reset forms when offcanvas/modal closed ---------------- */
    $('#productOffcanvas').on('hidden.bs.offcanvas', function () {
        $('#productForm')[0].reset();
        clearErrors('#productForm');
        $('#productPreview').hide().attr('src','');
        $('#variationSection').hide();
    });
    $('#productOffcanvas .select2').select2({
            dropdownParent: $('#productOffcanvas'),
            allowClear: true
        });

    $('#editProductModal').on('hidden.bs.modal', function() {
        $('#editProductForm')[0].reset();
        clearErrors('#editProductForm');
        $('#editProductPreview').hide().attr('src','');
        $('#editVariationSection').hide();
    });
    $('#editProductModal .select2').select2({
            dropdownParent: $('#editProductModal'),
            allowClear: true
        });

    /* ---------------- Stock Management ---------------- */
    var stockTable = null;
    var stockSearchDebounceTimer = null;
    if ($('.stockList').length) {
        stockTable = $('.stockList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: {
                url: stockListUrl,
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
                            stockTable.search('').draw();
                        }
                    }
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                    action: function(e, dt, node, config) {
                        window.location.href = stockExportUrl;
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
                            showAlert('No selection', 'Please select at least one stock item to delete', 'warning');
                            return;
                        }
                        Swal.fire({
                            title: 'Confirm delete',
                            text: 'Delete ' + ids.length + ' selected stock item(s)?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete',
                            cancelButtonText: 'Cancel'
                        }).then(function(result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: stockBulkDeleteUrl,
                                    method: 'POST',
                                    data: {
                                        _token: $('meta[name="csrf-token"]').attr('content'),
                                        ids: ids
                                    },
                                    success: function(res) {
                                        if (res.success) {
                                            showAlert('Deleted', res.message || 'Stock items deleted', 'success');
                                            stockTable.ajax.reload(null, false);
                                        } else {
                                            showAlert('Error', res.message || 'Failed to delete', 'error');
                                        }
                                    },
                                    error: function() {
                                        showAlert('Error', 'Failed to delete stock items', 'error');
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
                    data: null,
                    orderable: false,
                    searchable: false,
                    render: function(data, type, row, meta) {
                        return '<input type="checkbox" class="row-checkbox form-check-input" data-id="' + row.id + '">';
                    },
                    width: '30px'
                },
                { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'item_name', name: 'item_name' },
                { data: 'price', name: 'price' },
                { data: 'quantity', name: 'quantity' },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ],
            order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function(settings) {
                // uncheck master when table redraw
                $('#selectAllStocks').prop('checked', false);

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
    }

    // View stock details
    $(document).on('click', '.view-stock', function() {
        var id = $(this).data('id');
        var url = stockShowUrl.replace(':id', id);

        $.get(url, function(res) {
            if (res.success) {
                var data = res.data;
                var content = `
                    <div class="row mb-3">
                        <div class="col-12">
                            <table class="table table-bordered table-striped">
                                <thead class="table-light">
                                    <tr>
                                        <th>Product Code</th>
                                        <th>Product Name</th>
                                        <th>Product Date</th>
                                        <th>Supplier Name</th>
                                        <th>Quantity</th>
                                        <th>Current Stock</th>
                                    </tr>
                                </thead>
                                <tbody>`;

                if (data.purchase_history && data.purchase_history.length > 0) {
                    data.purchase_history.forEach(function(item) {
                        content += `
                            <tr>
                                <td>${item.product_code}</td>
                                <td>${item.product_name}</td>
                                <td>${item.purchase_date}</td>
                                <td>${item.supplier_name}</td>
                                <td>${item.qty}</td>
                                <td>${item.current_stock}</td>
                            </tr>`;
                    });
                } else {
                    content += '<tr><td colspan="6" class="text-center">No purchase history found</td></tr>';
                }

                content += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

                $('#viewStockContent').html(content);
                $('#viewStockModal').modal('show');
            } else {
                showAlert('Error','Failed to load stock details','error');
            }
        }).fail(function() {
            showAlert('Error','Failed to load stock details','error');
        });
    });

// ---------------- Select All / Row checkbox handling for Stock ----------------
$(document).on('change', '#selectAllStocks', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllStocks').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var columnMap = {
    1: 'item_name',
    2: 'model_number',
    3: 'brand',
    4: 'category',
    5: 'unit',
    6: 'price'
};

var stockColumnMap = {
    1: 'item_name',
    2: 'price',
    3: 'quantity'
};

$('#filter_column').on('change', function() {
    var colIndex = $(this).val();
    $('#filter_value').html('<option value="">Loading...</option>');
    if (!colIndex) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Determine which table we're filtering
    var isStockTable = $(this).closest('.dataTables_wrapper').find('.stockList').length > 0;
    var colKey = isStockTable ? stockColumnMap[colIndex] : columnMap[colIndex];
    var distinctValuesUrl = isStockTable ? stockDistinctValuesUrl : productsDistinctValuesUrl;

    if (!colKey) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Fetch distinct values from server
    $.get(distinctValuesUrl, { column: colKey }, function(res) {
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

    // Determine which table we're filtering (product or stock)
    var isStockTable = $('#filter_column').closest('.dataTables_wrapper').find('.stockList').length > 0;
    var targetTable = isStockTable ? stockTable : productTable;

    // colIndex from filter_column (1-based for filter options), corresponds to datatable column index (including checkbox at 0)
    // For products: filter value 1 = item_name = DT column 2, etc.
    // For stock: filter value 1 = item_name = DT column 2, etc.
    var dtColIndex = parseInt(colIndex, 10) + 1; // +1 because DT starts with checkbox at 0

    if (!targetTable) return;

    if (!value) {
        // clear search for that column
        targetTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        targetTable.column(dtColIndex).search('^' + escaped + '$', true, false).draw();
    }
});

/* ---------------- Custom Search input handling for Stock ---------------- */
// Show/hide clear icon based on input
$(document).on('input', '#customSearchInput', function () {
  var val = $(this).val();
  $('#customSearchClear').css('visibility', val ? 'visible' : 'hidden');

  // Debounced DataTable search
  if (stockSearchDebounceTimer) clearTimeout(stockSearchDebounceTimer);
  stockSearchDebounceTimer = setTimeout(function () {
    if (stockTable) stockTable.search(val).draw();
  }, 300);
});

// Clear search
$(document).on('click', '#customSearchClear', function () {
  $('#customSearchInput').val('');
  $('#customSearchClear').css('visibility', 'hidden');
  if (stockTable) stockTable.search('').draw();
  $('#customSearchInput').focus();
});

    /* ---------------- End of file ---------------- */
});

// Variations Management
let currentProductId = null;

// Open variations management modal
$(document).on('click', '.manage-variations', function() {
    currentProductId = $(this).data('id');
    const productName = $(this).data('name');

    $('#variationProductName').text(productName);
    $('#product_id').val(currentProductId);
    loadVariations(currentProductId);
    $('#variationsModal').modal('show');
});

// Load variations for a product
function loadVariations(productId) {
    const url = productsVariationsUrl.replace(':product', productId);

    $.get(url, function(response) {
        if (response.success) {
            const variations = response.data;
            const tbody = $('#variationsTableBody');
            tbody.empty();

            if (variations.length === 0) {
                tbody.append('<tr><td colspan="8" class="text-center">No variations found</td></tr>');
                return;
            }

            variations.forEach(variation => {
                const row = `
                    <tr>
                        <td>${variation.sku}</td>
                        <td>${variation.size || '-'}</td>
                        <td>${variation.color || '-'}</td>
                        <td>${variation.material || '-'}</td>
                        <td>₹${parseFloat(variation.price).toFixed(2)}</td>
                        <td>${variation.stock_quantity}</td>
                        <td>
                            ${variation.is_default ?
                                '<span class="badge bg-success">Default</span>' :
                                `<button class="btn btn-sm btn-outline-primary set-default-btn" data-id="${variation.id}">Set Default</button>`
                            }
                        </td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-variation-btn" data-id="${variation.id}">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-variation-btn" data-id="${variation.id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });
        }
    }).fail(function() {
        showAlert('Error', 'Failed to load variations', 'error');
    });
}

// Add variation button click
$('#addVariationBtn').on('click', function() {
    $('#variationModalTitle').text('Add Variation');
    $('#variationForm')[0].reset();
    $('#variation_id').val('');
    $('#variationPreview').hide();
    clearVariationErrors();
    $('#variationFormModal').modal('show');
});

// Edit variation
$(document).on('click', '.edit-variation-btn', function() {
    const variationId = $(this).data('id');
    const url = productsVariationsEditUrl.replace(':variation', variationId);

    $.get(url, function(response) {
        if (response.success) {
            const variation = response.data;
            $('#variationModalTitle').text('Edit Variation');
            $('#variation_id').val(variation.id);
            $('#sku').val(variation.sku);
            $('#price').val(variation.price);
            $('#size').val(variation.size || '');
            $('#color').val(variation.color || '');
            $('#material').val(variation.material || '');
            $('#stock_quantity').val(variation.stock_quantity);

            if (variation.variation_image_url) {
                $('#variationPreview').attr('src', variation.variation_image_url).show();
            } else {
                $('#variationPreview').hide();
            }

            clearVariationErrors();
            $('#variationFormModal').modal('show');
        }
    }).fail(function() {
        showAlert('Error', 'Failed to load variation data', 'error');
    });
});

// Save variation
$('#saveVariationBtn').on('click', function() {
    const variationId = $('#variation_id').val();
    const productId = $('#product_id').val();
    const formData = new FormData($('#variationForm')[0]);

    let url;

    if (variationId) {
        url = productsVariationsUpdateUrl.replace(':variation', variationId);
        // Add method spoofing for PUT request
        formData.append('_method', 'PUT');
    } else {
        url = productsVariationsStoreUrl.replace(':product', productId);
    }

    $.ajax({
        url: url,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            if (response.success) {
                $('#variationFormModal').modal('hide');
                showAlert('Success', response.message, 'success');
                loadVariations(currentProductId);
            }
        },
        error: function(xhr) {
            const errors = xhr.responseJSON && xhr.responseJSON.errors;
            if (errors) {
                clearVariationErrors();
                $.each(errors, function(key, value) {
                    $(`#${key}`).addClass('is-invalid');
                    $(`#${key}Error`).text(value[0]);
                });
            } else {
                showAlert('Error', 'Failed to save variation', 'error');
            }
        }
    });
});

// Delete variation
$(document).on('click', '.delete-variation-btn', function() {
    const variationId = $(this).data('id');

    Swal.fire({
        title: 'Are you sure?',
        text: 'This variation will be deleted permanently!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            const url = productsVariationsDeleteUrl.replace(':variation', variationId);

            $.ajax({
                url: url,
                type: 'DELETE',
                data: {
                    _token: $('meta[name="csrf-token"]').attr('content')
                },
                success: function(response) {
                    if (response.success) {
                        showAlert('Success', response.message, 'success');
                        loadVariations(currentProductId);
                    }
                },
                error: function() {
                    showAlert('Error', 'Failed to delete variation', 'error');
                }
            });
        }
    });
});

// Set default variation
$(document).on('click', '.set-default-btn', function() {
    const variationId = $(this).data('id');
    const url = productsVariationsSetDefaultUrl.replace(':variation', variationId);

    $.ajax({
        url: url,
        type: 'POST',
        data: {
            _token: $('meta[name="csrf-token"]').attr('content')
        },
        success: function(response) {
            if (response.success) {
                showAlert('Success', response.message, 'success');
                loadVariations(currentProductId);
            }
        },
        error: function() {
            showAlert('Error', 'Failed to set default variation', 'error');
        }
    });
});

// Variation image preview
$('#variation_image').on('change', function(e) {
    const file = this.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        $('#variationPreview').attr('src', url).show();
    } else {
        $('#variationPreview').hide();
    }
});

function clearVariationErrors() {
    $('#variationForm .is-invalid').removeClass('is-invalid');
    $('#variationForm .invalid-feedback').text('');
}

/* ---------------- Generate Product Details HTML ---------------- */
function generateProductDetailsHtml(product) {
    var html = '';

    // Product Image
    html += '<div class="row mb-4">';
    html += '<div class="col-12 text-center">';
    if (product.product_img_url) {
        html += '<img src="' + product.product_img_url + '" alt="' + product.item_name + '" class="img-fluid rounded shadow" style="max-width: 300px; max-height: 300px;">';
    } else {
        html += '<div class="bg-light rounded d-inline-flex align-items-center justify-content-center" style="width: 200px; height: 200px;">';
        html += '<i class="bi bi-image text-muted" style="font-size: 3rem;"></i>';
        html += '</div>';
    }
    html += '</div>';
    html += '</div>';

    // Basic Information
    html += '<div class="row mb-4">';
    html += '<div class="col-12">';
    html += '<h5 class="border-bottom pb-2"><i class="bi bi-info-circle me-2"></i>Basic Information</h5>';
    html += '<div class="row">';
    html += '<div class="col-md-6">';
    html += '<p><strong>Item Name:</strong> ' + (product.item_name || 'N/A') + '</p>';
    html += '<p><strong>Model Number:</strong> ' + (product.model_number || 'N/A') + '</p>';
    html += '<p><strong>Brand:</strong> ' + (product.brand_name || 'N/A') + '</p>';
    html += '</div>';
    html += '<div class="col-md-6">';
    html += '<p><strong>Category:</strong> ' + (product.category_name || 'N/A') + '</p>';
    html += '<p><strong>Unit:</strong> ' + (product.unit_name || 'N/A') + '</p>';
    html += '<p><strong>Base Price:</strong> ₹' + (product.price ? parseFloat(product.price).toFixed(2) : 'N/A') + '</p>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Variations Section
    if (product.has_variations) {
        html += '<div class="row mb-4">';
        html += '<div class="col-12">';
        html += '<h5 class="border-bottom pb-2"><i class="bi bi-diagram-3 me-2"></i>Product Variations</h5>';

        // Load variations via AJAX
        html += '<div id="variationsDetailsContainer">';
        html += '<div class="text-center">';
        html += '<div class="spinner-border spinner-border-sm text-primary" role="status">';
        html += '<span class="visually-hidden">Loading variations...</span>';
        html += '</div>';
        html += '<p class="mt-2 small">Loading variations...</p>';
        html += '</div>';
        html += '</div>';

        html += '</div>';
        html += '</div>';

        // Load variations after a short delay to ensure the container is rendered
        setTimeout(function() {
            loadVariationsForDetails(product.id);
        }, 100);
    } else {
        html += '<div class="row mb-4">';
        html += '<div class="col-12">';
        html += '<h5 class="border-bottom pb-2"><i class="bi bi-diagram-3 me-2"></i>Product Variations</h5>';
        html += '<p class="text-muted">This product does not have variations.</p>';
        html += '</div>';
        html += '</div>';
    }

    // Additional Information
    html += '<div class="row mb-4">';
    html += '<div class="col-12">';
    html += '<h5 class="border-bottom pb-2"><i class="bi bi-clock me-2"></i>Additional Information</h5>';
    html += '<div class="row">';
    html += '<div class="col-md-6">';
    html += '<p><strong>Created At:</strong> ' + (product.created_at ? new Date(product.created_at).toLocaleString() : 'N/A') + '</p>';
    html += '</div>';
    html += '<div class="col-md-6">';
    html += '<p><strong>Last Updated:</strong> ' + (product.updated_at ? new Date(product.updated_at).toLocaleString() : 'N/A') + '</p>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    return html;
}

/* ---------------- Load Variations for Details View ---------------- */
function loadVariationsForDetails(productId) {
    const url = productsVariationsUrl.replace(':product', productId);

    $.get(url, function(response) {
        if (response.success) {
            const variations = response.data;
            let variationsHtml = '';

            if (variations.length === 0) {
                variationsHtml = '<p class="text-muted">No variations found for this product.</p>';
            } else {
                variationsHtml = '<div class="table-responsive">';
                variationsHtml += '<table class="table table-sm table-bordered">';
                variationsHtml += '<thead class="table-light">';
                variationsHtml += '<tr>';
                variationsHtml += '<th>SKU</th>';
                variationsHtml += '<th>Size</th>';
                variationsHtml += '<th>Color</th>';
                variationsHtml += '<th>Material</th>';
                variationsHtml += '<th>Price</th>';
                variationsHtml += '<th>Stock</th>';
                variationsHtml += '<th>Default</th>';
                variationsHtml += '</tr>';
                variationsHtml += '</thead>';
                variationsHtml += '<tbody>';

                variations.forEach(variation => {
                    variationsHtml += '<tr>';
                    variationsHtml += '<td>' + variation.sku + '</td>';
                    variationsHtml += '<td>' + (variation.size || '-') + '</td>';
                    variationsHtml += '<td>' + (variation.color || '-') + '</td>';
                    variationsHtml += '<td>' + (variation.material || '-') + '</td>';
                    variationsHtml += '<td>₹' + parseFloat(variation.price).toFixed(2) + '</td>';
                    variationsHtml += '<td>' + variation.stock_quantity + '</td>';
                    variationsHtml += '<td>' + (variation.is_default ? '<span class="badge bg-success">Yes</span>' : '<span class="badge bg-secondary">No</span>') + '</td>';
                    variationsHtml += '</tr>';
                });

                variationsHtml += '</tbody>';
                variationsHtml += '</table>';
                variationsHtml += '</div>';
            }

            $('#variationsDetailsContainer').html(variationsHtml);
        } else {
            $('#variationsDetailsContainer').html('<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i>Failed to load variations.</div>');
        }
    }).fail(function() {
        $('#variationsDetailsContainer').html('<div class="alert alert-danger"><i class="bi bi-exclamation-triangle me-2"></i>Failed to load variations.</div>');
    });
}

// Check URL for ?open=create to show offcanvas
if (window.location.search.includes('open=create')) {
    const offcanvasEl = document.getElementById('productOffcanvas');
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
// Update your existing URLs with variation URLs

