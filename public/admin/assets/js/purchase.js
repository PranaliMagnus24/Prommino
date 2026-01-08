// purchases.js (unified alert + validation helpers + new row handling)
var table = null;
$(function() {
    // ---------- Helpers ----------
    function showAlert(title, message, type = 'success') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: title || '',
                text: message || '',
                icon: type === 'error' ? 'error' : (type === 'info' ? 'info' : 'success'),
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        } else {
            const successDiv = document.createElement('div');
            successDiv.className = 'alert alert-' + (type === 'error' ? 'danger' : (type === 'info' ? 'info' : 'success')) + ' alert-dismissible fade show position-fixed';
            successDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
            successDiv.innerHTML = `<i class="bi ${type === 'error' ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill'} me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
            document.body.appendChild(successDiv);
            setTimeout(() => { if (successDiv.parentNode) successDiv.remove(); }, 5000);
        }
    }

    function clearFormErrors(selector) {
        $(selector + ' .is-invalid').removeClass('is-invalid');
        $(selector + ' .invalid-feedback').text('');
    }

    function handleValidationErrors(errors, formSelector) {
        $.each(errors, function (key, val) {
            // try exact name first
            let $field = $(formSelector + ' [name="' + key + '"]');

            // if not found, try bracket-style conversion: items[0][qty] from items.0.qty
            if (!$field.length) {
                const alt = '[' + key.replace(/\./g, '][') + ']';
                $field = $(formSelector + ' [name="' + alt + '"]');
            }

            // fallback: try prefix match
            if (!$field.length) {
                const base = key.split('.')[0];
                $field = $(formSelector + ' [name^="' + base + '"]');
            }

            if ($field.length) {
                $field.addClass('is-invalid');
                const idSafe = key.replace(/\./g, '_').replace(/\[/g, '_').replace(/\]/g, '') + 'Error';
                if ($('#' + idSafe).length) {
                    $('#' + idSafe).text(val[0]);
                } else {
                    if ($field.next('.invalid-feedback').length) {
                        $field.next('.invalid-feedback').text(val[0]);
                    } else {
                        $field.after('<div class="invalid-feedback">' + val[0] + '</div>');
                    }
                }
            }
        });
    }

    // ---------- DataTable init ----------
    var purchaseTable = null;
    var searchDebounceTimer = null;
    if ($('.purchasesList').length) {
        purchaseTable = $('.purchasesList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: {
                url: purchasesListUrl,
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
                            purchaseTable.search('').draw();
                        }
                    }
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                    action: function(e, dt, node, config) {
                        window.location.href = purchasesExportUrl;
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
                            showAlert('No selection', 'Please select at least one purchase to delete', 'warning');
                            return;
                        }
                        Swal.fire({
                            title: 'Confirm delete',
                            text: 'Delete ' + ids.length + ' selected purchase(s)?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete',
                            cancelButtonText: 'Cancel'
                        }).then(function(result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: purchasesBulkDeleteUrl,
                                    method: 'POST',
                                    data: {
                                        _token: $('meta[name="csrf-token"]').attr('content'),
                                        ids: ids
                                    },
                                    success: function(res) {
                                        if (res.success) {
                                            showAlert('Deleted', res.message || 'Purchases deleted', 'success');
                                            purchaseTable.ajax.reload(null, false);
                                        } else {
                                            showAlert('Error', res.message || 'Failed to delete', 'error');
                                        }
                                    },
                                    error: function() {
                                        showAlert('Error', 'Failed to delete purchases', 'error');
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
                    orderable: true,
                    searchable: true,
                    render: function(data, type, row, meta) {
                        return '<input type="checkbox" class="row-checkbox form-check-input" data-id="' + row.id + '">';
                    },
                    width: '30px'
                },
                { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'supplier', name: 'supplier' },
                { data: 'products', name: 'products' },
                { data: 'purchase_date', name: 'purchase_date' },
                { data: 'billing_address', name: 'billing_address' },
                { data: 'status', name: 'status' },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ],
            order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function(settings) {
                // uncheck master when table redraw
                $('#selectAllPurchases').prop('checked', false);

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

    // ---------- product select helpers ----------
    function productSelectOptions(selectedId = '') {
        var opts = '<option value="">--Select Product--</option>';
        productsData.forEach(function(p) {
            var selected = (p.id == selectedId) ? 'selected' : '';
            opts += `<option value="${p.id}" ${selected} data-name="${p.name}" data-price="${p.price}">${p.name}</option>`;
        });
        return opts;
    }

    // ---------- Row add/remove & calculations (create form) ----------
    function reindexRows() {
        $('#productRowsWrapper tbody .product-row').each(function(index) {
            $(this).attr('data-row-index', index);
            $(this).find('select.product-select').attr('name', `items[${index}][product_id]`);
            $(this).find('input[name*="[product_variation_id]"]').attr('name', `items[${index}][product_variation_id]`);
            $(this).find('.qty-input').attr('name', `items[${index}][qty]`);
            $(this).find('.rate-input').attr('name', `items[${index}][rate]`);
            $(this).find('.amount-input').attr('name', `items[${index}][amount]`);
            $(this).find('.invalid-feedback').each(function() { $(this).text(''); });
        });
        $('#productRowsWrapper tbody .product-desc-row').each(function(index) {
            $(this).attr('data-row-index', index);
            $(this).find('textarea[name*="[product_desc]"]').attr('name', `items[${index}][product_desc]`);
        });
    }

// ---------------- Select All / Row checkbox handling ----------------
$(document).on('change', '#selectAllPurchases', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllPurchases').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var columnMap = {
    1: 'supplier',
    2: 'products',
    3: 'purchase_date',
    4: 'billing_address',
    5: 'status'
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
    $.get(purchasesDistinctValuesUrl, { column: colKey }, function(res) {
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

    // colIndex from filter_column (1-based for filter options), corresponds to datatable column index (including checkbox at 0)
    // filter value 1 = supplier = DT column 2, filter value 2 = products = DT column 3, etc.
    var dtColIndex = parseInt(colIndex, 10) + 1; // +1 because DT starts with checkbox at 0
    if (!purchaseTable) return;

    if (!value) {
        // clear search for that column
        purchaseTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        purchaseTable.column(dtColIndex).search('^' + escaped + '$', true, false).draw();
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
    if (purchaseTable) purchaseTable.search(val).draw();
  }, 300);
});

// Clear search
$(document).on('click', '#customSearchClear', function () {
  $('#customSearchInput').val('');
  $('#customSearchClear').css('visibility', 'hidden');
  if (purchaseTable) purchaseTable.search('').draw();
  $('#customSearchInput').focus();
});

    function addRowWithValues(values = null) {
        var idx = $('#productRowsWrapper tbody .product-row').length;
        var productOptions = productSelectOptions(values && values.product_id ? values.product_id : '');
        var qtyVal = values && values.qty !== undefined ? values.qty : 1;
       var rateVal = values && values.rate !== undefined && values.rate != 0 ? values.rate : '';
        var amtVal = values && values.amount !== undefined ? parseFloat(values.amount).toFixed(0) : '0';
        var descVal = values && values.product_desc ? values.product_desc : '';

        var rowHtml = `
        <tr class="product-row" data-row-index="${idx}">
          <td>
              <select name="items[${idx}][product_id]" class="form-select product-select select2">
                  ${productOptions}
              </select>
              <div class="invalid-feedback" id="items_${idx}_product_idError"></div>
              <input type="hidden" name="items[${idx}][product_variation_id]" value="">
              <div class="selected-variation mt-1" style="display: none;"></div>
          </td>
          <td>
              <input type="number" class="form-control qty-input" name="items[${idx}][qty]" value="${qtyVal}" min="0" step="1">
          </td>
          <td>
              <input type="number" class="form-control rate-input" name="items[${idx}][rate]" value="${rateVal}" min="0">
          </td>
          <td>
              <input type="number" class="form-control amount-input" name="items[${idx}][amount]" value="${amtVal}" readonly>
          </td>
          <td>
              <button type="button" class="btn btn-danger btn-sm remove-row-btn" title="Remove row">
                  <i class="bi bi-dash"></i>
              </button>
          </td>
        </tr>
        <tr class="product-desc-row" data-row-index="${idx}">
          <td colspan="4">
          <input type="text" class="form-control amount-input" name="items[${idx}][product_desc]" placeholder="Product description" value="${descVal}">
          </td>
          <td></td>
        </tr>
        `;
        $('#productRowsWrapper tbody').append(rowHtml);
        recalcAll();
    }

    // Add row (create form)
    $('#addRowBtn').on('click', function() {
        addRowWithValues(null);
        reindexRows();
    });

    // Remove row (delegated)
    $(document).on('click', '.remove-row-btn', function() {
        if ($('#productRowsWrapper tbody .product-row').length <= 1) {
            var first = $('#productRowsWrapper tbody .product-row').first();
            var firstDesc = $('#productRowsWrapper tbody .product-desc-row').first();
            first.find('select.product-select').val('');
            first.find('input[name*="[product_variation_id]"]').val('');
            firstDesc.find('textarea[name*="[product_desc]"]').val('');
            first.find('.selected-variation').hide().html('');
            first.find('.qty-input').val(1);
            first.find('.rate-input').val(0);
            first.find('.amount-input').val('0');
        } else {
            var rowIndex = $(this).closest('.product-row').data('row-index');
            $(this).closest('.product-row').remove();
            $('#productRowsWrapper tbody .product-desc-row[data-row-index="' + rowIndex + '"]').remove();
            reindexRows();
        }
        recalcAll();
    });

    // Calculate single row amount (create/edit)
    function calculateAmount(rowElement) {
        var qty = parseFloat(rowElement.find('.qty-input').val() || 0);
        var rate = parseFloat(rowElement.find('.rate-input').val() || 0);
        var amount = qty * rate;
        if (isNaN(amount)) amount = 0;
        rowElement.find('.amount-input').val(amount.toFixed(0));
        recalcAll();
    }

    // select variations when product is selected
    let currentProductRow = null;
    $(document).on('change', '#productRowsWrapper .product-select', function() {
        const row = $(this).closest('.product-row');
        const productId = $(this).val();
        if (!productId) {
            // Clear variations if product is deselected
            row.find('input[name*="[product_variation_id]"]').val('');
            row.find('.selected-variation').hide().html('');
            row.find('.rate-input').val('0.00');
            calculateAmount(row);
            return;
        }

        const product = productsData.find(p => p.id == productId);
        if (product && product.has_variations) {
            // Prevent opening modal if already open for another product
            if ($('#productVariationsModal').hasClass('show')) {
                showAlert('Please save or cancel the current variation selection first.', '', 'warning');
                // Reset the select to previous value or empty
                $(this).val('');
                return;
            }
            currentProductRow = row;
            loadProductVariations(productId);
            $('#productVariationsModal').modal('show');
        } else {
            // Product has no variations, just set the price
            row.find('input[name*="[product_variation_id]"]').val('');
            row.find('.selected-variation').hide().html('');
            row.find('.rate-input').val(product && product.price ? product.price.toFixed(0) : '0');
            calculateAmount(row);
        }
    });

    // save variations
    $('#saveVariationsBtn').on('click', function() {
        const selectedVariations = [];
        $('#variationsContent input[type="radio"]:checked').each(function() {
            selectedVariations.push($(this).val());
        });
        if (currentProductRow && selectedVariations.length > 0) {
            const variationId = selectedVariations[0]; // since radio, only one
            currentProductRow.find('input[name*="[product_variation_id]"]').val(variationId);
            // Show selected variation details
            const productId = currentProductRow.find('.product-select').val();
            const product = productsData.find(p => p.id == productId);
            if (product) {
                const variation = product.variations.find(v => v.id == variationId);
                if (variation) {
                    const attrs = [];
                    if (variation.size) attrs.push('Size: ' + variation.size);
                    if (variation.color) attrs.push('Color: ' + variation.color);
                    if (variation.material) attrs.push('Material: ' + variation.material);
                    const attrStr = attrs.join(', ') || 'Default Variation';
                    currentProductRow.find('.selected-variation').html(`<small class="text-muted">${attrStr} (₹${variation.price})</small>`).show();
                    currentProductRow.find('.rate-input').val(variation.price.toFixed(0));
                }
            }
        } else if (currentProductRow) {
            // No variation selected, use product price
            currentProductRow.find('input[name*="[product_variation_id]"]').val('');
            currentProductRow.find('.selected-variation').hide().html('');
            const productId = currentProductRow.find('.product-select').val();
            const product = productsData.find(p => p.id == productId);
            currentProductRow.find('.rate-input').val(product && product.price ? product.price.toFixed(0) : '0');
        }
        $('#productVariationsModal').modal('hide');
        if (currentProductRow) calculateAmount(currentProductRow);
    });

    function loadProductVariations(productId) {
        const product = productsData.find(p => p.id == productId);
        let content = '<div class="row">';
        if (product && product.has_variations && product.variations.length > 0) {
            product.variations.forEach(function(variation) {
                const attrs = [];
                if (variation.size) attrs.push('Size: ' + variation.size);
                if (variation.color) attrs.push('Color: ' + variation.color);
                if (variation.material) attrs.push('Material: ' + variation.material);
                const attrStr = attrs.join(', ') || 'Default Variation';

                content += `
                    <div class="col-md-12 mb-3">
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="selected_variation" value="${variation.id}" id="variation_${variation.id}">
                            <label class="form-check-label" for="variation_${variation.id}">
                                ${attrStr} (₹${variation.price})
                            </label>
                        </div>
                    </div>
                `;
            });
        } else {
            content += '<div class="col-12"><p>No variations available for this product.</p></div>';
        }
        content += '</div>';
        $('#variationsContent').html(content);

        // Check already selected variation
        if (currentProductRow) {
            const selectedId = currentProductRow.find('input[name*="[product_variation_id]"]').val();
            if (selectedId) {
                $('#variation_' + selectedId).prop('checked', true);
            }
        }
    }

    // qty/rate input handlers for create rows
    $(document).on('input', '#productRowsWrapper .qty-input, #productRowsWrapper .rate-input', function() {
        var row = $(this).closest('.product-row');
        calculateAmount(row);
    });

    // ----------------- Edit modal row helpers -----------------
   function addEditRowWithValues(values = null) {
    var idx = $('#editProductRowsContainer tbody .edit-product-row').length;
    var productOptions = getProductOptions(values && values.product_id ? values.product_id : '');
    var qtyVal = values && values.qty !== undefined ? values.qty : 1;
    var rateVal = values && values.rate !== undefined && values.rate != 0 ? values.rate : '';
    var amtVal = values && values.amount !== undefined ? parseFloat(values.amount).toFixed(0) : '0';
    var descVal = values && values.product_desc ? values.product_desc : '';
    var variationId = values && values.product_variation_id ? values.product_variation_id : '';

    // Product Row (Main row)
    var productRow = `
    <tr class="edit-product-row" data-edit-row-index="${idx}">
        <td>
            <select name="items[${idx}][product_id]" class="form-select product-select select2">
                ${productOptions}
            </select>
            <div class="invalid-feedback" id="edit_items_${idx}_product_idError"></div>
            <input type="hidden" name="items[${idx}][product_variation_id]" value="${variationId}">
            <div class="selected-variation mt-1" style="display: ${variationId ? 'block' : 'none'};">${getVariationDisplay(variationId, values ? values.product_id : null)}</div>
        </td>
        <td>
            <input type="number" class="form-control qty-input" name="items[${idx}][qty]" value="${qtyVal}" min="0" step="1">
        </td>
        <td>
            <input type="number" class="form-control rate-input" name="items[${idx}][rate]" value="${rateVal}" min="0">
        </td>
        <td>
            <input type="number" class="form-control amount-input" name="items[${idx}][amount]" value="${amtVal}" readonly>
        </td>
        <td>
            <button type="button" class="btn btn-danger btn-sm remove-edit-row-btn" title="Remove row">
                <i class="bi bi-dash"></i>
            </button>
        </td>
    </tr>`;

    // Description Row (Separate row like create form)
    var descRow = `
    <tr class="edit-product-desc-row" data-edit-row-index="${idx}">
        <td colspan="4">
            <input type="text" class="form-control" name="items[${idx}][product_desc]" placeholder="Product description" value="${descVal}">
        </td>
        <td></td>
    </tr>`;

    $('#editProductRowsContainer tbody').append(productRow);
    $('#editProductRowsContainer tbody').append(descRow);
}

// Helper function to get product options
function getProductOptions(selectedId = '') {
    var opts = '<option value="">--Select Product--</option>';
    productsData.forEach(function(p) {
        var selected = (p.id == selectedId) ? 'selected' : '';
        opts += `<option value="${p.id}" ${selected} data-name="${p.name}" data-price="${p.price}">${p.name}</option>`;
    });
    return opts;
}
function getVariationDisplay(variationId, productId) {
    if (!variationId || !productId) return '';

    const product = productsData.find(p => p.id == productId);
    if (!product || !product.variations) return '';

    const variation = product.variations.find(v => v.id == variationId);
    if (!variation) return '';

    const attrs = [];
    if (variation.size) attrs.push('Size: ' + variation.size);
    if (variation.color) attrs.push('Color: ' + variation.color);
    if (variation.material) attrs.push('Material: ' + variation.material);
    const attrStr = attrs.join(', ') || 'Default Variation';

    return `<small class="text-muted">${attrStr} (₹${variation.price})</small>`;
}


    // Remove edit row
    $(document).on('click', '.remove-edit-row-btn', function() {
    const productRows = $('#editProductRowsContainer tbody .edit-product-row');

    if (productRows.length <= 1) {
        // If only one row, clear it instead of removing
        const firstRow = productRows.first();
        const firstDesc = firstRow.next('.edit-product-desc-row');

        firstRow.find('select.product-select').val('');
        firstRow.find('input[name*="[product_variation_id]"]').val('');
        firstRow.find('.selected-variation').hide().html('');
        firstRow.find('.qty-input').val(1);
        firstRow.find('.rate-input').val(0);
        firstRow.find('.amount-input').val('0');
        firstDesc.find('input[name*="[product_desc]"]').val('');
    } else {
        // Get row index and remove both product and description rows
        const rowIndex = $(this).closest('.edit-product-row').data('edit-row-index');
        $(this).closest('.edit-product-row').remove();
        $(`.edit-product-desc-row[data-edit-row-index="${rowIndex}"]`).remove();

        // Reindex remaining rows
        reindexEditRows();
    }
    recalcAll();
});

function reindexEditRows() {
    $('#editProductRowsContainer tbody .edit-product-row').each(function(index) {
        $(this).attr('data-edit-row-index', index);
        $(this).find('select.product-select').attr('name', `items[${index}][product_id]`);
        $(this).find('input[name*="[product_variation_id]"]').attr('name', `items[${index}][product_variation_id]`);
        $(this).find('.qty-input').attr('name', `items[${index}][qty]`);
        $(this).find('.rate-input').attr('name', `items[${index}][rate]`);
        $(this).find('.amount-input').attr('name', `items[${index}][amount]`);
    });

    $('#editProductRowsContainer tbody .edit-product-desc-row').each(function(index) {
        $(this).attr('data-edit-row-index', index);
        $(this).find('input[name*="[product_desc]"]').attr('name', `items[${index}][product_desc]`);
    });
}
    // select variations when product is selected in edit
    $(document).on('change', '#editProductRowsContainer .product-select', function() {
    const row = $(this).closest('.edit-product-row');
    const productId = $(this).val();

    if (!productId) {
        row.find('input[name*="[product_variation_id]"]').val('');
        row.find('.selected-variation').hide().html('');
        row.find('.rate-input').val('0');
        calculateAmount(row);
        return;
    }

    const product = productsData.find(p => p.id == productId);
    if (product && product.has_variations) {
        if ($('#productVariationsModal').hasClass('show')) {
            showAlert('Please save or cancel the current variation selection first.', '', 'warning');
            $(this).val('');
            return;
        }
        currentProductRow = row;
        loadProductVariations(productId);
        $('#productVariationsModal').modal('show');
    } else {
        row.find('input[name*="[product_variation_id]"]').val('');
        row.find('.selected-variation').hide().html('');
        row.find('.rate-input').val(product && product.price ? product.price.toFixed(0) : '0');
        calculateAmount(row);
    }
});


   $(document).on('input', '#editProductRowsContainer .qty-input, #editProductRowsContainer .rate-input', function() {
    var row = $(this).closest('.edit-product-row');
    calculateAmount(row);
});
$('#editPurchaseModal').on('hidden.bs.modal', function() {
    $('#editPurchaseForm')[0].reset();
    $('#editProductRowsContainer tbody').empty();
    // Close any open variation modal
    $('#productVariationsModal').modal('hide');
});

    // ----------------- Form submit (create) -----------------
    $('#purchaseForm').on('submit', function(e) {
        e.preventDefault();
        clearFormErrors('#purchaseForm');

        var fd = new FormData(this);
        $('#purchaseSubmitBtn').prop('disabled',true).text('Saving...');

        $.ajax({
            url: purchasesStoreUrl,
            method: 'POST',
            data: fd,
            contentType: false,
            processData: false,
            headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
            success: function(res) {
                if (res && res.success) {
                    $('#purchaseForm')[0].reset();
                    $('#productRowsWrapper').empty();
                    addRowWithValues(null);
                    reindexRows();
                    $('#purchaseOffcanvas').find('.btn-close').trigger('click');
                    showAlert('Success', res.message || 'Purchase created successfully!', 'success');
                    if (purchaseTable) purchaseTable.ajax.reload(null,false);
                } else {
                    showAlert('Error', res && res.message ? res.message : 'Failed', 'error');
                }
            },
            error: function(xhr) {
                if (xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#purchaseForm');
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    showAlert('Error', xhr.responseJSON.message, 'error');
                } else {
                    showAlert('Error','Failed to save purchase','error');
                }
            },
            complete: function() {
                $('#purchaseSubmitBtn').prop('disabled',false).text('Save Purchase');
            }
        });
    });

    // ----------------- View purchase: open offcanvas & populate -----------------
    $(document).on('click', '.view-purchase', function() {
        var id = $(this).data('id');
        var url = purchasesEditUrl.replace(':id', id);

        $.get(url, function(res) {
            if (res && res.success) {
                var p = res.data;
                // Collect product codes
                var productCodes = [];
                if (p.items && p.items.length > 0) {
                    p.items.forEach(function(item) {
                        if (item.product && item.product.product_code) {
                            productCodes.push(item.product.product_code);
                        }
                    });
                }
                var productCodesStr = productCodes.length > 0 ? productCodes.join(', ') : 'N/A';
                var content = `
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Product Code:</label>
                            <p>${productCodesStr}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Supplier Name:</label>
                            <p>${p.supplier ? p.supplier.name : 'N/A'}</p>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Contact Person:</label>
                            <p>${p.contact_person || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Purchase Date:</label>
                            <p>${p.purchase_date ? p.purchase_date.split('T')[0] : 'N/A'}</p>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Status:</label>
                            <p><span class="badge ${p.status === 'ordered' ? 'bg-success' : 'bg-warning'}">${p.status ? (p.status.charAt(0).toUpperCase() + p.status.slice(1)) : ''}</span></p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Billing Address:</label>
                            <p>${p.supplier && p.supplier.address ? p.supplier.address : 'N/A'}</p>
                        </div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-12">
                            <label class="form-label fw-bold">Purchase Items:</label>
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                        <th>Qty</th>
                                        <th>Rate</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>`;

                if (p.items && p.items.length > 0) {
                    p.items.forEach(function(item) {
                        var productName = item.product ? item.product.item_name : 'N/A';
                        if (item.product_variation_id && item.product && item.product.variations) {
                            var variation = item.product.variations.find(v => v.id == item.product_variation_id);
                            if (variation) {
                                var attrs = [];
                                if (variation.size) attrs.push('Size: ' + variation.size);
                                if (variation.color) attrs.push('Color: ' + variation.color);
                                if (variation.material) attrs.push('Material: ' + variation.material);
                                productName += ' (' + attrs.join(', ') + ')';
                            }
                        }
                        content += `
                            <tr>
                                <td>${productName}</td>
                                <td>${item.qty}</td>
                                <td>${parseFloat(item.rate).toFixed(0)}</td>
                                <td>${parseFloat(item.amount).toFixed(0)}</td>
                            </tr>`;
                    });
                } else {
                    content += '<tr><td colspan="4" class="text-center">No items found</td></tr>';
                }

                content += `
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
                $('#viewPurchaseContent').html(content);
                var off = new bootstrap.Offcanvas(document.getElementById('viewPurchaseOffcanvas'));
                if (off) off.show();
            } else {
                showAlert('Error','Failed to load purchase details','error');
            }
        }).fail(function() {
            showAlert('Error','Failed to fetch purchase','error');
        });
    });

    // ----------------- Edit purchase: open modal & populate -----------------
    $(document).on('click', '.edit-purchase', function() {
    var id = $(this).data('id');
    var url = purchasesEditUrl.replace(':id', id);

    $.get(url, function(res) {
        if (res && res.success) {
            var p = res.data;

            // Reset forms
            $('#editProductRowsContainer tbody').empty();

            // Set basic fields
            $('#edit_purchase_id').val(p.id);
            $('#edit_supplier_id').val(p.supplier_id);
            $('#edit_contact_person').val(p.contact_person);
            $('#edit_purchase_date').val(p.purchase_date ? p.purchase_date.split('T')[0] : '');
            $('#edit_status').val(p.status);

            // Add product rows
            if (p.items && p.items.length > 0) {
                p.items.forEach(function(item, index) {
                    addEditRowWithValues({
                        product_id: item.product_id,
                        product_variation_id: item.product_variation_id,
                        qty: item.qty,
                        rate: item.rate,
                        amount: item.amount,
                        product_desc: item.product_desc
                    });

                    // Set variation display and rate if variation exists
                    if (item.product_variation_id && item.product_id) {
                        const row = $(`#editProductRowsContainer tbody .edit-product-row[data-edit-row-index="${index}"]`);
                        const product = productsData.find(pr => pr.id == item.product_id);
                        if (product && product.variations) {
                            const variation = product.variations.find(v => v.id == item.product_variation_id);
                            if (variation) {
                                const attrs = [];
                                if (variation.size) attrs.push('Size: ' + variation.size);
                                if (variation.color) attrs.push('Color: ' + variation.color);
                                if (variation.material) attrs.push('Material: ' + variation.material);
                                const attrStr = attrs.join(', ') || 'Default Variation';

                                row.find('.selected-variation').html(`<small class="text-muted">${attrStr} (₹${variation.price})</small>`).show();
                                row.find('.rate-input').val(variation.price.toFixed(0));
                                row.find('.amount-input').val((item.qty * variation.price).toFixed(0));
                            }
                        }
                    }
                });
            } else {
                // Add one empty row if no items
                addEditRowWithValues(null);
            }

            // Initialize select2 for all product selects in edit modal
            $('#editPurchaseModal .select2').select2({
                width: '100%',
                dropdownParent: $('#editPurchaseModal')
            });

            // Show modal
            $('#editPurchaseModal').modal('show');

            // Recalculate totals
            recalcAll();

        } else {
            showAlert('Error', 'Failed to load purchase', 'error');
        }
    }).fail(function() {
        showAlert('Error', 'Failed to fetch purchase', 'error');
    });
});
// Helper function for variation attributes
function getVariationAttributes(variation) {
    const attrs = [];
    if (variation.size) attrs.push('Size: ' + variation.size);
    if (variation.color) attrs.push('Color: ' + variation.color);
    if (variation.material) attrs.push('Material: ' + variation.material);
    return attrs.join(', ') || 'Default Variation';
}

// Update the Add Edit Row button click handler
$('#addEditRowBtn').on('click', function() {
    addEditRowWithValues(null);
    // Initialize select2 for the new row
    $('#editPurchaseModal .select2:last').select2({
        width: '100%',
        dropdownParent: $('#editPurchaseModal')
    });
});

    // ----------------- Update purchase (edit) -----------------
    $('#updatePurchaseBtn').on('click', function() {
        clearFormErrors('#editPurchaseForm');
        var form = $('#editPurchaseForm')[0];
        var fd = new FormData(form);
        var id = $('#edit_purchase_id').val();
        var url = purchasesUpdateUrl.replace(':id', id);

        $(this).prop('disabled',true).text('Updating...');

        $.ajax({
            url: url,
            method: 'POST',
            data: fd,
            contentType: false,
            processData: false,
            headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
            success: function(res) {
                if (res && res.success) {
                    $('#editPurchaseModal').modal('hide');
                    showAlert('Success','Purchase updated successfully!','success');
                    if (purchaseTable) purchaseTable.ajax.reload(null,false);
                } else {
                    showAlert('Error', res && res.message ? res.message : 'Failed', 'error');
                }
            },
            error: function(xhr) {
                if (xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#editPurchaseForm');
                } else {
                    showAlert('Error','Failed to update purchase','error');
                }
            },
            complete: function() {
                $('#updatePurchaseBtn').prop('disabled',false).text('Update');
            }
        });
    });

    // ----------------- Delete purchase -----------------
    $(document).on('click', '.delete-purchase', function() {
        var id = $(this).data('id'),
            name = $(this).data('name') || `Purchase #${id}`;
        Swal.fire({
            title:'Are you sure?',
            text:`Delete ${name}?`,
            icon:'warning',
            showCancelButton:true,
        }).then(function(res){
            if (res.isConfirmed) {
                var url = purchasesDeleteUrl.replace(':id', id);
                $.ajax({
                    url:url,
                    type:'DELETE',
                    data:{_token:$('meta[name="csrf-token"]').attr('content')},
                    success:function(r){
                        if (r && r.success) {
                            showAlert('Success', r.message || 'Deleted', 'success');
                            if (purchaseTable) purchaseTable.ajax.reload(null,false);
                        } else {
                            showAlert('Error', r && r.message ? r.message : 'Failed', 'error');
                        }
                    },
                    error:function() {
                        showAlert('Error','Failed to delete','error');
                    }
                });
            }
        });
    });

    // ----------------- recalcAll -----------------
    function recalcAll() {
        var sub = 0;
        $('.amount-input').each(function() {
            var val = parseFloat($(this).val() || 0);
            sub += isNaN(val) ? 0 : val;
        });
        $('.amount').each(function() {
            var val = parseFloat($(this).val() || 0);
            sub += isNaN(val) ? 0 : val;
        });

        if ($('#sub_total').length) $('#sub_total').val(sub.toFixed(0));
        var tax = parseFloat($('#tax_amount').val() || 0);
        var grand = (sub + (isNaN(tax) ? 0 : tax)).toFixed(0);
        if ($('#grand_total').length) $('#grand_total').val(grand);
    }

    // initial calculate for first row (if present)
    $(document).ready(function() {
        if ($('#productRowsWrapper tbody .product-row').length === 0) {
            addRowWithValues(null);
        }
        $('#productRowsWrapper tbody .product-row').each(function() {
            calculateAmount($(this));
        });
    });

    // When purchase offcanvas closes, reset form
    $('#purchaseOffcanvas').on('hidden.bs.offcanvas', function() {
        $('#purchaseForm')[0].reset();
        $('#productRowsWrapper tbody').empty();
        addRowWithValues(null);
        reindexRows();
        // Close any open variation modal
        $('#productVariationsModal').modal('hide');
    });
    $('#purchaseOffcanvas .select2').select2({
            dropdownParent: $('#purchaseOffcanvas'),
            allowClear: true
        });

    // When edit modal closes, reset
    $('#editPurchaseModal').on('hidden.bs.modal', function() {
        $('#editPurchaseForm')[0].reset();
        $('#editProductRowsContainer tbody').empty();
        // Close any open variation modal
        $('#productVariationsModal').modal('hide');
    });
    $('#editPurchaseModal .select2').select2({
            dropdownParent: $('#editPurchaseModal'),
            allowClear: true
        });
});
// Check URL for ?open=create to show offcanvas
if (window.location.search.includes('open=create')) {
    const offcanvasEl = document.getElementById('purchaseOffcanvas');
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
