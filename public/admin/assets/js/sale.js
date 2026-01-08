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
    var saleTable = null;
    var searchDebounceTimer = null;
    if ($('.saleList').length) {
        if ($.fn.DataTable.isDataTable('.saleList')) $('.saleList').DataTable().clear().destroy();
        saleTable = $('.saleList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: {
                url: saleListUrl,
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
                            saleTable.search('').draw();
                        }
                    }
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                    action: function(e, dt, node, config) {
                        window.location.href = saleExportUrl;
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
                            showAlert('No selection', 'Please select at least one sale to delete', 'warning');
                            return;
                        }
                        Swal.fire({
                            title: 'Confirm delete',
                            text: 'Delete ' + ids.length + ' selected sale(s)?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete',
                            cancelButtonText: 'Cancel'
                        }).then(function(result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: saleBulkDeleteUrl,
                                    method: 'POST',
                                    data: {
                                        _token: $('meta[name="csrf-token"]').attr('content'),
                                        ids: ids
                                    },
                                    success: function(res) {
                                        if (res.success) {
                                            showAlert('Deleted', res.message || 'Sales deleted', 'success');
                                            saleTable.ajax.reload(null, false);
                                        } else {
                                            showAlert('Error', res.message || 'Failed to delete', 'error');
                                        }
                                    },
                                    error: function() {
                                        showAlert('Error', 'Failed to delete sales', 'error');
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
                { data: 'customer' },
                { data: 'product' },
                { data: 'total_amount' },
                { data: 'billing_address' },
                { data: 'sale_date' },
                { data: 'status' },
                { data: 'discount_percentage' },
                { data: 'action', orderable: false, searchable: false }
            ],
            order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function(settings) {
                // uncheck master when table redraw
                $('#selectAllSales').prop('checked', false);

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

        window.saleTable = saleTable;
    }

// ---------------- Select All / Row checkbox handling ----------------
$(document).on('change', '#selectAllSales', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllSales').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var saleColumnMap = {
    1: 'customer',
    2: 'product',
    3: 'total_amount',
    4: 'billing_address',
    5: 'sale_date',
    6: 'status',
    7: 'discount_percentage'
};

$('#filter_column').on('change', function() {
    var colIndex = $(this).val();
    $('#filter_value').html('<option value="">Loading...</option>');
    if (!colIndex) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }
    var colKey = saleColumnMap[colIndex];
    if (!colKey) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Fetch distinct values from server
    $.get(saleDistinctValuesUrl, { column: colKey }, function(res) {
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

    // colIndex from modal: 1=customer, 2=product, etc.
    // DataTables columns: 0=checkbox, 1=DT_RowIndex, 2=customer, 3=product, etc.
    var dtColIndex = parseInt(colIndex, 10) + 1; // add 1 to account for checkbox and index columns
    if (!saleTable) return;

    if (!value) {
        // clear search for that column
        saleTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        saleTable.column(dtColIndex).search('^' + escaped + '$', true, false).draw();
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
    if (saleTable) saleTable.search(val).draw();
  }, 300);
});

// Clear search
$(document).on('click', '#customSearchClear', function () {
  $('#customSearchInput').val('');
  $('#customSearchClear').css('visibility', 'hidden');
  if (saleTable) saleTable.search('').draw();
  $('#customSearchInput').focus();
});

    // ---------- Product Variations ----------
    let currentProductRow = null;
    $(document).on('change', '.product-select', function() {
        const row = $(this).closest('.product-row');
        const productId = $(this).val();
        if (!productId) {
            // Clear variations if product is deselected
            row.find('input[name*="[variations]"]').val('');
            row.find('input[name*="[variations][]"]').remove();
            row.find('.selected-variation').hide().html('');
            return;
        }
        // Check if product has variations
        const product = productsData.find(p => p.id == productId);
        if (!product || !product.has_variations) {
            // No variations, just clear and hide
            row.find('input[name*="[variations]"]').val('');
            row.find('input[name*="[variations][]"]').remove();
            row.find('.selected-variation').hide().html('');
            return;
        }
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
    });

    // save variations
    $('#saveVariationsBtn').on('click', function() {
        const selectedVariations = [];
        $('#variationsContent input[type="checkbox"]:checked').each(function() {
            selectedVariations.push($(this).val());
        });
        if (currentProductRow) {
            // Remove existing variation inputs
            currentProductRow.find('input[name*="[variations]"]').remove();

            // Create hidden inputs for each selected variation
            selectedVariations.forEach(variationId => {
                const inputName = `items[${currentProductRow.data('index')}][variations][]`;
                currentProductRow.append(`<input type="hidden" name="${inputName}" value="${variationId}">`);
            });

            // Display selected variations
            if (selectedVariations.length > 0) {
                const productId = currentProductRow.find('.product-select').val();
                const product = productsData.find(p => p.id == productId);
                if (product) {
                    const variationDetails = selectedVariations.map(variationId => {
                        const variation = product.variations.find(v => v.id == variationId);
                        if (variation) {
                            const attrs = [];
                            if (variation.size) attrs.push('Size: ' + variation.size);
                            if (variation.color) attrs.push('Color: ' + variation.color);
                            if (variation.material) attrs.push('Material: ' + variation.material);
                            return attrs.join(', ') + ' (₹' + variation.price + ')';
                        }
                        return 'Variation ID: ' + variationId;
                    }).join('; ');
                    currentProductRow.find('.selected-variation').html(`<small class="text-muted">${variationDetails}</small>`).show();
                }
            } else {
                currentProductRow.find('.selected-variation').hide().html('');
            }

            // Update rate based on selected variations
            if (selectedVariations.length > 0) {
                const productId = currentProductRow.find('.product-select').val();
                const product = productsData.find(p => p.id == productId);
                if (product) {
                    const firstVariation = product.variations.find(v => v.id == selectedVariations[0]);
                    if (firstVariation) {
                        currentProductRow.find('.item-rate').val(firstVariation.price);
                    }
                }
            } else {
                const productId = currentProductRow.find('.product-select').val();
                const product = productsData.find(p => p.id == productId);
                if (product) {
                    currentProductRow.find('.item-rate').val(product.price);
                }
            }

            // Recompute totals
            const formId = currentProductRow.closest('form').attr('id');
            computeTotalsForContainer(formId === 'createSaleForm' ? '#createSaleForm' : '#editSaleForm');
        }
        $('#productVariationsModal').modal('hide');
    });

    function loadProductVariations(productId) {
        $.ajax({
            url: '/admin/products/' + productId + '/variations',
            type: 'GET',
            success: function(response) {
                let content = '<div class="row">';
                if (response.success && response.data && response.data.length > 0) {
                    response.data.forEach(function(variation) {
                        const attrs = [];
                        if (variation && variation.size) attrs.push('Size: ' + variation.size);
                        if (variation && variation.color) attrs.push('Color: ' + variation.color);
                        if (variation && variation.material) attrs.push('Material: ' + variation.material);
                        if (variation && variation.price) attrs.push('Price: ₹' + variation.price);
                        const attrStr = attrs.join(' | ') || 'Default Variation';

                        content += `
                            <div class="col-md-12 mb-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" value="${variation ? variation.id : ''}" id="variation_${variation ? variation.id : ''}">
                                    <label class="form-check-label" for="variation_${variation ? variation.id : ''}">
                                        ${attrStr}
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

                // Check already selected variations
                if (currentProductRow) {
                    const selectedIds = currentProductRow.find('input[name*="[variations]"]').map(function() {
                        return $(this).val();
                    }).get();
                    selectedIds.forEach(function(id) {
                        $('#variation_' + id).prop('checked', true);
                    });
                }
            },
            error: function() {
                $('#variationsContent').html('<p>Error loading variations.</p>');
            }
        });
    }

    // ---------- Helper Functions ----------
    function computeTotalsForContainer(containerSelector) {
        let subTotal = 0;
        let taxTotal = 0;

        // Calculate product amounts and tax per product
        $(containerSelector).find('tr.product-row, .product-row').each(function(){
            const $row = $(this);
            const qty = parseInt($row.find('.item-qty').val() || 0);
            const rate = parseInt($row.find('.item-rate').val() || 0);
            const amount = qty * rate;

            $row.find('.item-amount').val(amount);
            subTotal += amount;

            // Calculate tax per product
            const percentage = parseInt($row.find('.item-percentage').val() || 0);
            if (percentage > 0) {
                const taxAmount = (amount * percentage) / 100;
                taxTotal += taxAmount;
            }
        });

        // Calculate total before discount
        const totalBeforeDiscount = subTotal + taxTotal;

        // Apply discount on total
        const discountPercentage = parseFloat($(containerSelector).find('.discount-percentage').val() || 0);
        const discountAmount = totalBeforeDiscount * discountPercentage / 100;

        const grandTotal = totalBeforeDiscount - discountAmount;

        // Update display fields
        if (containerSelector === '#createSaleForm') {
            $('#create_sub_total').val(subTotal);
            $('#create_discount_amount').val(Math.round(discountAmount));
            $('#create_tax_total').val(Math.round(taxTotal));
            $('#create_grand_total').val(Math.round(grandTotal));
        } else {
            $('#edit_sub_total').val(subTotal);
            $('#edit_discount_amount').val(Math.round(discountAmount));
            $('#edit_tax_total').val(Math.round(taxTotal));
            $('#edit_grand_total').val(Math.round(grandTotal));
        }
    }

    // ---------- Create Sale Functionality ----------
    let createProductIndex = 1;
    let createTaxIndex = 1;

    // Pre-fill form from quotation data
    function preFillFormFromQuotation(data) {
        // Fill customer
        $('#createSaleForm [name="customer_id"]').val(data.customer_id);

        // Fill sale date (use current date)
        // Already set in resetCreateForm

        // Set status to paid (default for converted sales)
        $('#createSaleForm [name="status"]').val('paid');

        // Clear existing products and add quotation products
        $('#createProductsContainer').empty();

        if (data.items && data.items.length > 0) {
            data.items.forEach((item, index) => {
                const product = productsData.find(p => p.id == item.product_id);
                if (product) {
                    const row = $(`
                        <tr class="product-row" data-index="${index}">
                            <td>
                                <select name="items[${index}][product_id]" class="form-select item-product product-select" required>
                                    <option value="">-- Select Product --</option>
                                    ${productsData.map(p => `<option value="${p.id}" data-price="${p.price}" ${p.id == item.product_id ? 'selected' : ''}>${p.name}</option>`).join('')}
                                </select>
                                <div class="selected-variation mt-1" style="display: none;"></div>
                            </td>
                            <td>
                                <input type="number" name="items[${index}][qty]" class="form-control item-qty" value="${item.qty}" min="1" required>
                            </td>
                            <td>
                                <input type="number" name="items[${index}][rate]" class="form-control item-rate" value="${item.rate}" step="0.01" required>
                            </td>
                            <td>
                                <select name="items[${index}][tax_id]" class="form-select item-tax">
                                    <option value="">-- Select Tax --</option>
                                    ${taxesData.map(t => `<option value="${t.id}" data-percent="${t.percent}" ${t.id == item.tax_id ? 'selected' : ''}>${t.name}</option>`).join('')}
                                </select>
                            </td>
                            <td>
                                <input type="number" name="items[${index}][percentage]" class="form-control item-percentage" value="${item.percentage || 0}" step="0.01" placeholder="%">
                            </td>
                            <td>
                                <input type="text" readonly name="items[${index}][amount]" class="form-control item-amount" value="${item.qty * item.rate}">
                            </td>
                            <td class="text-center">
                                <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                            </td>
                            <input type="hidden" name="items[${index}][variations]" value="">
                        </tr>
                    `);

                    // Handle variations
                    if (item.variations && item.variations.length > 0) {
                        item.variations.forEach(variationId => {
                            row.append(`<input type="hidden" name="items[${index}][variations][]" value="${variationId}">`);
                        });

                        // Show selected variations
                        const variationDetails = item.variations.map(variationId => {
                            const variation = product.variations.find(v => v.id == variationId);
                            if (variation) {
                                const attrs = [];
                                if (variation.size) attrs.push('Size: ' + variation.size);
                                if (variation.color) attrs.push('Color: ' + variation.color);
                                if (variation.material) attrs.push('Material: ' + variation.material);
                                return attrs.join(', ') + ' (₹' + variation.price + ')';
                            }
                            return 'Variation ID: ' + variationId;
                        }).join('; ');
                        row.find('.selected-variation').html(`<small class="text-muted">${variationDetails}</small>`).show();
                    }

                    $('#createProductsContainer').append(row);

                    // If GST number exists, set default tax and make percentage readonly, disable other options
                    if (hasGstNumber && defaultTaxId) {
                        row.find('.item-tax').val(defaultTaxId);
                        const tax = taxesData.find(t => t.id == defaultTaxId);
                        if (tax) {
                            row.find('.item-percentage').val(tax.percent).prop('readonly', true);
                        }
                        // Disable options except 5 and 6
                        row.find('.item-tax option').each(function() {
                            const id = $(this).val();
                            if (id && id != '5' && id != '6') {
                                $(this).prop('disabled', true);
                            }
                        });
                    }
                }
            });
        }

        // Add quotation_id to form
        if (data.quotation && data.quotation.id) {
            $('#createSaleForm').append(`<input type="hidden" name="quotation_id" value="${data.quotation.id}">`);
        }

        // Recompute totals
        computeTotalsForContainer('#createSaleForm');
    }

    // Open Create Offcanvas
    $('#openCreateSaleBtn').on('click', function(){
        resetCreateForm();
        // Pre-fill form if quotation data is available
        if (typeof quotationData !== 'undefined' && quotationData) {
            preFillFormFromQuotation(quotationData);
        }
        const offcanvas = new bootstrap.Offcanvas(document.getElementById('createSaleOffcanvas'));
        offcanvas.show();
    });

    // Reset Create Form
    function resetCreateForm() {
        $('#createSaleForm')[0].reset();
        $('#createSaleForm').find('[name="sale_date"]').val(new Date().toISOString().split('T')[0]);

        // Reset products container
        $('#createProductsContainer').html(`
            <tr class="product-row" data-index="0">
                <td>
                    <select name="items[0][product_id]" class="form-select item-product product-select" required>
                        <option value="">-- Select Product --</option>
                        ${productsData.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name}</option>`).join('')}
                    </select>
                    <div class="selected-variation mt-1" style="display: none;"></div>
                </td>
                <td>
                    <input type="number" name="items[0][qty]" class="form-control item-qty" value="1" min="1" required>
                </td>
                <td>
                    <input type="number" name="items[0][rate]" class="form-control item-rate" step="0.01" required>
                </td>
                <td>
                    <select name="items[0][tax_id]" class="form-select item-tax">
                        <option value="">-- Select Tax --</option>
                        ${taxesData.map(t => `<option value="${t.id}" data-percent="${t.percent}">${t.name}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <input type="number" name="items[0][percentage]" class="form-control item-percentage" step="0.01" placeholder="%">
                </td>
                <td>
                    <input type="text" readonly name="items[0][amount]" class="form-control item-amount">
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                </td>
                <input type="hidden" name="items[0][variations]" value="">
            </tr>
        `);

        createProductIndex = 1;

        // If GST number exists, set default tax and make percentage readonly, disable other options
        if (hasGstNumber && defaultTaxId) {
            $('#createProductsContainer .item-tax').each(function() {
                $(this).val(defaultTaxId);
                const tax = taxesData.find(t => t.id == defaultTaxId);
                if (tax) {
                    $(this).closest('.product-row').find('.item-percentage').val(tax.percent).prop('readonly', true);
                }
                // Disable options except 5 and 6
                $(this).find('option').each(function() {
                    const id = $(this).val();
                    if (id && id != '5' && id != '6') {
                        $(this).prop('disabled', true);
                    }
                });
            });
        }

        computeTotalsForContainer('#createSaleForm');
    }

    // Add Product Row (Create)
    $('#createAddSaleProductBtn').on('click', function(){
        const index = createProductIndex++;
        const productRow = `
            <tr class="product-row" data-index="${index}">
                <td>
                    <select name="items[${index}][product_id]" class="form-select item-product product-select" required>
                        <option value="">-- Select Product --</option>
                        ${productsData.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name}</option>`).join('')}
                    </select>
                    <div class="selected-variation mt-1" style="display: none;"></div>
                </td>
                <td>
                    <input type="number" name="items[${index}][qty]" class="form-control item-qty" value="1" min="1" required>
                </td>
                <td>
                    <input type="number" name="items[${index}][rate]" class="form-control item-rate" step="0.01" required>
                </td>
                <td>
                    <select name="items[${index}][tax_id]" class="form-select item-tax">
                        <option value="">-- Select Tax --</option>
                        ${taxesData.map(t => `<option value="${t.id}" data-percent="${t.percent}">${t.name}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <input type="number" name="items[${index}][percentage]" class="form-control item-percentage" step="0.01" placeholder="%">
                </td>
                <td>
                    <input type="text" readonly name="items[${index}][amount]" class="form-control item-amount">
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                </td>
                <input type="hidden" name="items[${index}][variations]" value="">
            </tr>
        `;
        $('#createProductsContainer').append(productRow);

        // If GST number exists, set default tax and make percentage readonly, disable other options
        if (hasGstNumber && defaultTaxId) {
            const newRow = $('#createProductsContainer tr.product-row').last();
            newRow.find('.item-tax').val(defaultTaxId);
            const tax = taxesData.find(t => t.id == defaultTaxId);
            if (tax) {
                newRow.find('.item-percentage').val(tax.percent).prop('readonly', true);
            }
            // Disable options except 5 and 6
            newRow.find('.item-tax option').each(function() {
                const id = $(this).val();
                if (id && id != '5' && id != '6') {
                    $(this).prop('disabled', true);
                }
            });
        }

        computeTotalsForContainer('#createSaleForm');
    });


    // Remove Product Row
    $(document).on('click', '.remove-create-product', function(){
        if ($('#createProductsContainer tr.product-row').length > 1) {
            $(this).closest('tr.product-row').remove();
            computeTotalsForContainer('#createSaleForm');
        } else {
            // reset first row instead of removing
            const row = $(this).closest('tr.product-row');
            row.find('select').val('');
            row.find('input[type="number"]').val('');
            row.find('input[type="text"]').val('');
            row.find('input[name*="[variations]"]').val('');
            row.find('input[name*="[variations][]"]').remove();
            row.find('.selected-variation').hide().html('');
            showAlert('Warning', 'At least one product is required', 'warning');
        }
    });

    // Remove Tax Row
    $(document).on('click', '.remove-tax-row', function(){
        $(this).closest('.tax-row').remove();
        computeTotalsForContainer('#createSaleForm');
    });

    // Auto-fill rate on product select
    $(document).on('change', '.item-product', function(){
        const price = parseInt($(this).find('option:selected').data('price') || 0);
        $(this).closest('.product-row').find('.item-rate').val(price);
        computeTotalsForContainer($(this).closest('form').attr('id') === 'createSaleForm' ? '#createSaleForm' : '#editSaleForm');
    });

    // Recompute totals on input changes
    $(document).on('input change', '.item-qty, .item-rate, .item-percentage, .discount-percentage', function(){
        const formId = $(this).closest('form').attr('id');
        computeTotalsForContainer(formId === 'createSaleForm' ? '#createSaleForm' : '#editSaleForm');
    });

    // Auto-fill tax percentage on tax select
    $(document).on('change', '.item-tax', function(){
        const percent = parseInt($(this).find('option:selected').data('percent') || 0);
        const percentageField = $(this).closest('.product-row').find('.item-percentage');
        percentageField.val(percent);
        if (hasGstNumber) {
            percentageField.prop('readonly', true);
        }
        const formId = $(this).closest('form').attr('id');
        computeTotalsForContainer(formId === 'createSaleForm' ? '#createSaleForm' : '#editSaleForm');
    });

    // Create Sale Submit
    $('#createSaleForm').on('submit', function(e){
        e.preventDefault();

        // Validate at least one product
        if ($('#createProductsContainer tr.product-row').length === 0) {
            showAlert('Error', 'Please add at least one product', 'error');
            return;
        }

        const formData = new FormData(this);
        $('#createSaleBtn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Saving...');

        $.ajax({
            url: saleStoreUrl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response){
                if (response && response.success) {
                    $('#createSaleForm')[0].reset();
                    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('createSaleOffcanvas'));
                    if (offcanvas) offcanvas.hide();

                    if (window.saleTable) window.saleTable.ajax.reload(null, false);

                    // permission-style toast
                    showAlert('Success', response.message || 'Sale created successfully', 'success');
                } else {
                    showAlert('Error', response.message || 'Failed to create sale', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#createSaleForm');
                } else {
                    let errorMessage = 'Failed to create sale';
                    if (xhr.responseJSON && xhr.responseJSON.message) errorMessage = xhr.responseJSON.message;
                    showAlert('Error', errorMessage, 'error');
                }
            },
            complete: function(){
                $('#createSaleBtn').prop('disabled', false).html('Save Sale');
            }
        });
    });

    // ---------- View Sale ----------
    $(document).on('click', '.view-sale', function(e){
        e.preventDefault();
        const saleId = $(this).data('id');
        const url = saleEditUrlTemplate.replace(':id', saleId);

        $.get(url, function(response){
            if (response && response.success) {
                const sale = response.data;
                let html = `
                    <div class="row g-3">
                        <div class="col-12">
                            <h6 class="border-bottom pb-2">Sale Information</h6>
                            <p><strong>Sale Code:</strong> ${sale.sale_code || 'N/A'}</p>
                            <p><strong>Customer:</strong> ${sale.customer ? sale.customer.name : 'N/A'}</p>
                            <p><strong>Sale Date:</strong> ${sale.sale_date}</p>
                            <p><strong>Status:</strong> <span class="badge ${getStatusBadgeClass(sale.status)}">${sale.status}</span></p>
                            <p><strong>Discount:</strong> ${sale.discount_percentage || 0}%</p>
                        </div>
                        <div class="col-12">
                            <h6 class="border-bottom pb-2">Products</h6>
                `;

                if (sale.products && sale.products.length) {
                    sale.products.forEach(product => {
                        let variations = '';
                        if (product.variations && product.variations.length) {
                            variations = '<br><small><strong>Variations:</strong> ' + product.variations.map(v => {
                                let varData = v.productVariation;
                                if (varData) {
                                    const attrs = [];
                                    if (varData.size) attrs.push('Size: ' + varData.size);
                                    if (varData.color) attrs.push('Color: ' + varData.color);
                                    if (varData.material) attrs.push('Material: ' + varData.material);
                                    return attrs.join(', ') + ' (₹' + varData.price + ')';
                                } else {
                                    // Fallback to find from product variations
                                    const prodVar = product.product && product.product.variations ? product.product.variations.find(vr => vr.id == v.product_variation_id) : null;
                                    if (prodVar) {
                                        const attrs = [];
                                        if (prodVar.size) attrs.push('Size: ' + prodVar.size);
                                        if (prodVar.color) attrs.push('Color: ' + prodVar.color);
                                        if (prodVar.material) attrs.push('Material: ' + prodVar.material);
                                        return attrs.join(', ') + ' (₹' + prodVar.price + ')';
                                    } else {
                                        return 'Variation ID: ' + v.product_variation_id;
                                    }
                                }
                            }).filter(s => s.trim()).join('; ') + '</small>';
                        }
                        html += `
                            <div class="border p-2 mb-2">
                                <strong>${product.product ? product.product.item_name : 'N/A'}</strong>
                                <div class="row">
                                    <div class="col-6">Qty: ${product.qty}</div>
                                    <div class="col-6">Rate: ₹${product.rate}</div>
                                    <div class="col-6">Tax: ${product.percentage || 0}%</div>
                                    <div class="col-6">Tax Amount: ₹${Math.round((product.amount * (product.percentage || 0)) / 100)}</div>
                                    <div class="col-12">Amount: ₹${product.amount}</div>
                                </div>
                                ${variations}
                            </div>
                        `;
                    });
                } else {
                    html += '<p>No products found</p>';
                }

                // Calculate totals for display
                const subTotal = sale.products ? sale.products.reduce((sum, p) => sum + parseInt(p.amount), 0) : 0;

                let taxTotal = 0;
                if (sale.products) {
                    sale.products.forEach(product => {
                        if (product.percentage > 0) {
                            taxTotal += (parseInt(product.amount) * parseInt(product.percentage)) / 100;
                        }
                    });
                }

                const totalBeforeDiscount = subTotal + taxTotal;
                const discountAmount = totalBeforeDiscount * (parseInt(sale.discount_percentage) || 0) / 100;

                const grandTotal = totalBeforeDiscount - discountAmount;

                html += `</div>
                    <div class="col-12">
                        <h6 class="border-bottom pb-2">Summary</h6>
                        <div class="row">
                            <div class="col-6"><strong>Sub Total:</strong></div>
                            <div class="col-6 text-end">₹${subTotal.toFixed(0)}</div>
                            <div class="col-6"><strong>Discount:</strong></div>
                            <div class="col-6 text-end">-₹${discountAmount.toFixed(0)}</div>
                            <div class="col-6"><strong>Tax Total:</strong></div>
                            <div class="col-6 text-end">₹${taxTotal.toFixed(0)}</div>
                            <div class="col-6"><strong class="h5">Grand Total:</strong></div>
                            <div class="col-6 text-end"><strong class="h5">₹${grandTotal.toFixed(0)}</strong></div>
                        </div>
                    </div>
                </div>`;

                $('#viewSaleContent').html(html);
                const offcanvas = new bootstrap.Offcanvas(document.getElementById('viewSaleOffcanvas'));
                offcanvas.show();
            } else {
                showAlert('Error', response && response.message ? response.message : 'Failed to load sale details', 'error');
            }
        }).fail(function(){
            showAlert('Error', 'Failed to fetch sale details', 'error');
        });
    });

    // ---------- Edit Sale ----------
    $(document).on('click', '.edit-sale', function(e){
        e.preventDefault();
        const saleId = $(this).data('id');
        const url = saleEditUrlTemplate.replace(':id', saleId);

        $.get(url, function(response){
            if (response && response.success) {
                const sale = response.data;

                // Fill basic information
                $('#edit_sale_id').val(sale.id);
                $('#edit_customer_id').val(sale.customer_id || '');
                $('#edit_sale_date').val(sale.sale_date ? sale.sale_date.split('T')[0] : '');
                $('#edit_status').val(sale.status || '');
                $('#edit_discount_percentage').val(sale.discount_percentage || 0);

                // Build products rows
                let productsHtml = '';
                if (sale.products && sale.products.length) {
                    sale.products.forEach((product, index) => {
                        const selectedVariations = product.variations ? product.variations.map(v => v.product_variation_id) : [];
                        productsHtml += `
                            <tr class="product-row" data-index="${index}">
                                <td>
                                    <select name="items[${index}][product_id]" class="form-select item-product product-select" required>
                                        <option value="">-- Select Product --</option>
                                        ${response.products.map(p =>
                                            `<option value="${p.id}" data-price="${p.price}" ${p.id == product.product_id ? 'selected' : ''}>${p.item_name}</option>`
                                        ).join('')}
                                    </select>
                                    <div class="selected-variation mt-1" style="display: none;"></div>
                                </td>
                                <td>
                                    <input type="number" name="items[${index}][qty]" class="form-control item-qty" value="${product.qty}" min="1" required>
                                </td>
                                <td>
                                    <input type="number" name="items[${index}][rate]" class="form-control item-rate" value="${product.rate}" step="0.01" required>
                                </td>
                                <td>
                                    <select name="items[${index}][tax_id]" class="form-select item-tax">
                                        <option value="">-- Select Tax --</option>
                                        ${response.taxes.map(t =>
                                            `<option value="${t.id}" data-percent="${t.percent}" ${t.id == product.tax_id ? 'selected' : ''}>${t.name}</option>`
                                        ).join('')}
                                    </select>
                                </td>
                                <td>
                                    <input type="number" name="items[${index}][percentage]" class="form-control item-percentage" value="${product.percentage || 0}" step="0.01" placeholder="%">
                                </td>
                                <td>
                                    <input type="text" readonly name="items[${index}][amount]" class="form-control item-amount" value="${product.amount}">
                                </td>
                                <td class="text-center">
                                    <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                                </td>
                            </tr>
                        `;
                        // Add variation inputs
                        selectedVariations.forEach(variationId => {
                            productsHtml += `<input type="hidden" name="items[${index}][variations][]" value="${variationId}">`;
                        });
                    });
                }
                $('#editProductsContainer').html(productsHtml);

                // Show selected variations
                (sale.products || []).forEach((product, idx) => {
                    const selectedVariations = product.variations ? product.variations.map(v => v.product_variation_id) : [];
                    if (selectedVariations.length > 0) {
                        const pr = productsData.find(p => p.id == product.product_id);
                        if (pr) {
                            const variationDetails = selectedVariations.map(variationId => {
                                const variation = pr.variations.find(vr => vr.id == variationId);
                                if (variation) {
                                    const attrs = [];
                                    if (variation.size) attrs.push('Size: ' + variation.size);
                                    if (variation.color) attrs.push('Color: ' + variation.color);
                                    if (variation.material) attrs.push('Material: ' + variation.material);
                                    return attrs.join(', ') + ' (₹' + variation.price + ')';
                                }
                                return 'Variation ID: ' + variationId;
                            }).join('; ');
                            $('#editProductsContainer .product-row').eq(idx).find('.selected-variation').html(`<small class="text-muted">${variationDetails}</small>`).show();
                        }
                    }
                });

                // If GST number exists, set default tax and make percentage readonly, disable other options
                if (response.hasGstNumber && response.defaultTaxId) {
                    $('#editProductsContainer .item-tax').each(function() {
                        $(this).val(response.defaultTaxId);
                        const tax = response.taxes.find(t => t.id == response.defaultTaxId);
                        if (tax) {
                            $(this).closest('.product-row').find('.item-percentage').val(tax.percent).prop('readonly', true);
                        }
                        // Disable options except 5 and 6
                        $(this).find('option').each(function() {
                            const id = $(this).val();
                            if (id && id != '5' && id != '6') {
                                $(this).prop('disabled', true);
                            }
                        });
                    });
                }

                // Set indices for adding new rows
                createProductIndex = sale.products ? sale.products.length : 0;

                computeTotalsForContainer('#editSaleForm');
                const offcanvas = new bootstrap.Offcanvas(document.getElementById('editSaleOffcanvas'));
                offcanvas.show();
            } else {
                showAlert('Error', response && response.message ? response.message : 'Failed to load sale for editing', 'error');
            }
        }).fail(function(){
            showAlert('Error', 'Failed to fetch sale details', 'error');
        });
    });

    // Add Product Row (Edit)
    $('#editAddSaleProductBtn').on('click', function(){
        const index = createProductIndex++;
        const productRow = `
            <tr class="product-row" data-index="${index}">
                <td>
                    <select name="items[${index}][product_id]" class="form-select item-product product-select" required>
                        <option value="">-- Select Product --</option>
                        ${productsData.map(p => `<option value="${p.id}" data-price="${p.price}">${p.name}</option>`).join('')}
                    </select>
                    <div class="selected-variation mt-1" style="display: none;"></div>
                </td>
                <td>
                    <input type="number" name="items[${index}][qty]" class="form-control item-qty" value="1" min="1" required>
                </td>
                <td>
                    <input type="number" name="items[${index}][rate]" class="form-control item-rate" step="0.01" required>
                </td>
                <td>
                    <select name="items[${index}][tax_id]" class="form-select item-tax">
                        <option value="">-- Select Tax --</option>
                        ${taxesData.map(t => `<option value="${t.id}" data-percent="${t.percent}">${t.name}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <input type="number" name="items[${index}][percentage]" class="form-control item-percentage" step="0.01" placeholder="%">
                </td>
                <td>
                    <input type="text" readonly name="items[${index}][amount]" class="form-control item-amount">
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                </td>
                <input type="hidden" name="items[${index}][variations]" value="">
            </tr>
        `;
        $('#editProductsContainer').append(productRow);

        // If GST number exists, set default tax and make percentage readonly, disable other options
        if (hasGstNumber && defaultTaxId) {
            const newRow = $('#editProductsContainer tr.product-row').last();
            newRow.find('.item-tax').val(defaultTaxId);
            const tax = taxesData.find(t => t.id == defaultTaxId);
            if (tax) {
                newRow.find('.item-percentage').val(tax.percent).prop('readonly', true);
            }
            // Disable options except 5 and 6
            newRow.find('.item-tax option').each(function() {
                const id = $(this).val();
                if (id && id != '5' && id != '6') {
                    $(this).prop('disabled', true);
                }
            });
        }

        computeTotalsForContainer('#editSaleForm');
    });


    // Edit Sale Submit
    $('#editSaleForm').on('submit', function(e){
        e.preventDefault();

        const saleId = $('#edit_sale_id').val();
        if (!saleId) {
            showAlert('Error', 'Sale ID is missing', 'error');
            return;
        }

        // Validate at least one product
        if ($('#editProductsContainer tr.product-row').length === 0) {
            showAlert('Error', 'Please add at least one product', 'error');
            return;
        }

        const formData = new FormData(this);
        formData.append('_method', 'PUT');

        $('#editSaleBtn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Updating...');

        const url = saleUpdateUrlTemplate.replace(':id', saleId);

        $.ajax({
            url: url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response){
                if (response && response.success) {
                    const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('editSaleOffcanvas'));
                    if (offcanvas) offcanvas.hide();

                    if (window.saleTable) window.saleTable.ajax.reload(null, false);

                    showAlert('Success', response.message || 'Sale updated successfully', 'success');
                } else {
                    showAlert('Error', response.message || 'Failed to update sale', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#editSaleForm');
                } else {
                    let errorMessage = 'Failed to update sale';
                    if (xhr.responseJSON && xhr.responseJSON.message) errorMessage = xhr.responseJSON.message;
                    showAlert('Error', errorMessage, 'error');
                }
            },
            complete: function(){
                $('#editSaleBtn').prop('disabled', false).html('Update Sale');
            }
        });
    });

    // ---------- Delete Sale ----------
    $(document).on('click', '.delete-sale', function(){
        const saleId = $(this).data('id');
        const saleName = $(this).data('name') || `Sale #${saleId}`;

        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete ${saleName}. This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: saleDeleteUrlTemplate.replace(':id', saleId),
                    type: 'DELETE',
                    data: {
                        _token: $('meta[name="csrf-token"]').attr('content')
                    },
                    success: function(response){
                        if (response && response.success) {
                            if (window.saleTable) window.saleTable.ajax.reload(null, false);
                            showAlert('Success', response.message || 'Sale has been deleted.', 'success');
                        } else {
                            showAlert('Error', response.message || 'Failed to delete sale', 'error');
                        }
                    },
                    error: function(){
                        showAlert('Error', 'Failed to delete sale', 'error');
                    }
                });
            }
        });
    });

    // ---------- Download Sale ----------
    $(document).on('click', '.download-sale', function(){
        const saleId = $(this).data('id');
        const url = saleDownloadUrlTemplate.replace(':id', saleId);
        window.open(url, '_blank');
    });

    // ---------- Helper Functions ----------
    function getStatusBadgeClass(status) {
        switch(status) {
            case 'paid': return 'bg-success';
            case 'partial paid': return 'bg-warning';
            case 'unpaid': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    // Initialize totals
    computeTotalsForContainer('#createSaleForm');

    // Auto-open offcanvas if quotation data is present
    if (typeof quotationData !== 'undefined' && quotationData) {
        resetCreateForm();
        preFillFormFromQuotation(quotationData);
        const offcanvas = new bootstrap.Offcanvas(document.getElementById('createSaleOffcanvas'));
        offcanvas.show();
    }
});
if (window.location.search.includes('open=create')) {
    const offcanvasEl = document.getElementById('createSaleOffcanvas');
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
