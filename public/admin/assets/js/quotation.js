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
    var quotationTable = null;
    var searchDebounceTimer = null;
    if ($('.quotationList').length) {
        if ($.fn.DataTable.isDataTable('.quotationList')) $('.quotationList').DataTable().clear().destroy();
        quotationTable = $('.quotationList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: {
                url: quotationListUrl,
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
                            quotationTable.search('').draw();
                        }
                    }
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                    action: function(e, dt, node, config) {
                        window.location.href = quotationExportUrl;
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
                            showAlert('No selection', 'Please select at least one quotation to delete', 'warning');
                            return;
                        }
                        Swal.fire({
                            title: 'Confirm delete',
                            text: 'Delete ' + ids.length + ' selected quotation(s)?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete',
                            cancelButtonText: 'Cancel'
                        }).then(function(result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: quotationBulkDeleteUrl,
                                    method: 'POST',
                                    data: {
                                        _token: $('meta[name="csrf-token"]').attr('content'),
                                        ids: ids
                                    },
                                    success: function(res) {
                                        if (res.success) {
                                            showAlert('Deleted', res.message || 'Quotations deleted', 'success');
                                            quotationTable.ajax.reload(null, false);
                                        } else {
                                            showAlert('Error', res.message || 'Failed to delete', 'error');
                                        }
                                    },
                                    error: function() {
                                        showAlert('Error', 'Failed to delete quotations', 'error');
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
                { data: 'email' },
                { data: 'form_type' },
                { data: 'status' },
                { data: 'action', orderable: false, searchable: false }
            ],
            order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function(settings) {
                // uncheck master when table redraw
                $('#selectAllQuotations').prop('checked', false);

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

        window.quotationTable = quotationTable;
    }

// ---------------- Select All / Row checkbox handling ----------------
$(document).on('change', '#selectAllQuotations', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllQuotations').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var quotationColumnMap = {
    1: 'customer',
    2: 'product',
    3: 'total_amount',
    4: 'email',
    6: 'form_type',
    7: 'status'
};

$('#filter_column').on('change', function() {
    var colIndex = $(this).val();
    $('#filter_value').html('<option value="">Loading...</option>');
    if (!colIndex) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }
    var colKey = quotationColumnMap[colIndex];
    if (!colKey) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Fetch distinct values from server
    $.get(quotationDistinctValuesUrl, { column: colKey }, function(res) {
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
    if (colIndex >= 6) dtColIndex = parseInt(colIndex, 10); // adjust for skipped column numbers
    if (!quotationTable) return;

    if (!value) {
        // clear search for that column
        quotationTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        quotationTable.column(dtColIndex).search('^' + escaped + '$', true, false).draw();
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
    if (quotationTable) quotationTable.search(val).draw();
  }, 300);
});

// Clear search
$(document).on('click', '#customSearchClear', function () {
  $('#customSearchInput').val('');
  $('#customSearchClear').css('visibility', 'hidden');
  if (quotationTable) quotationTable.search('').draw();
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
            computeTotalsForContainer(formId === 'createQuotationForm' ? '#createQuotationForm' : '#editQuotationForm');
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

    // ---------- Helpers ----------
    function computeTotalsForContainer(containerSelector) {
        let sub = 0;
        let taxTotal = 0;
        $(containerSelector).find('tr.product-row, .product-row').each(function(){
            const $r = $(this);
            const qty = parseFloat($r.find('.item-qty').val() || 0);
            const rate = parseFloat($r.find('.item-rate').val() || 0);
            const amt = +(qty * rate);
            $r.find('.item-amount').val(amt.toFixed(0));
            sub += amt;

            const pct = parseFloat($r.find('.item-percentage').val() || 0);
            const taxAmt = +(amt * pct / 100);
            taxTotal += taxAmt;
        });

        const totalBeforeDiscount = +(sub + taxTotal);
        const discountPercentage = parseFloat($(containerSelector).find('.discount-percentage').val() || 0);
        const discountAmount = totalBeforeDiscount * discountPercentage / 100;
        const grand = totalBeforeDiscount - discountAmount;

        if (containerSelector === '#createQuotationForm') {
            $('#create_sub_total').val(sub.toFixed(0));
            $('#create_tax_total').val(taxTotal.toFixed(0));
            $('#create_grand_total').val(grand.toFixed(0));
        } else {
            $('#edit_sub_total').val(sub.toFixed(0));
            $('#edit_tax_total').val(taxTotal.toFixed(0));
            $('#edit_grand_total').val(grand.toFixed(0));
        }
    }

    // ---------- Form type change logic ----------
    $('#formType').on('change', function() {
        const formType = $(this).val();
        if (formType === 'quotation') {
            $('.quotation-date-field').show();
            $('.sale-date-field').hide();
            $('#status').html(`
                <option value="">--Select Status--</option>
                <option value="open">Open</option>
                <option value="progress">Progress</option>
                <option value="closed">Closed</option>
            `);
        } else if (formType === 'sale') {
            $('.quotation-date-field').hide();
            $('.sale-date-field').show();
            $('#status').html(`
                <option value="">--Select Status--</option>
                <option value="paid">Paid</option>
                <option value="partial paid">Partial Paid</option>
                <option value="unpaid">Unpaid</option>
            `);
        }
        $('#create_grand_total').parent().addClass('d-none');
    });

    $('#edit_form_type').on('change', function() {
        const formType = $(this).val();
        if (formType === 'quotation') {
            $('.edit-quotation-date-field').show();
            $('.edit-sale-date-field').hide();
            $('#edit_status').html(`
                <option value="">--Select Status--</option>
                <option value="open">Open</option>
                <option value="progress">Progress</option>
                <option value="closed">Closed</option>
            `);
        } else if (formType === 'sale') {
            $('.edit-quotation-date-field').hide();
            $('.edit-sale-date-field').show();
            $('#edit_status').html(`
                <option value="">--Select Status--</option>
                <option value="paid">Paid</option>
                <option value="partial paid">Partial Paid</option>
                <option value="unpaid">Unpaid</option>
            `);
        }
        $('#edit_grand_total').parent().addClass('d-none');
    });

    // ---------- Create product rows ----------
    let createIdx = $('#createProductsContainer tr.product-row').length ? $('#createProductsContainer tr.product-row').length : 1;
    $('#createAddQuotationProductBtn').on('click', function(){
        const idx = createIdx++;
        let prodOptions = '<option value="">-- Select Product --</option>';
        productsData.forEach(p => prodOptions += `<option value="${p.id}" data-price="${p.price}">${p.name}</option>`);
        let taxOptions = '<option value="">-- Select Tax --</option>';
        taxesData.forEach(t => taxOptions += `<option value="${t.id}" data-percent="${t.percent}">${t.name}</option>`);

        const row = $(`
            <tr class="product-row" data-index="${idx}">
                <td>
                    <select name="items[${idx}][product_id]" class="form-select item-product product-select">${prodOptions}</select>
                    <div class="selected-variation mt-1" style="display: none;"></div>
                </td>
                <td>
                    <input type="number" name="items[${idx}][qty]" class="form-control item-qty" value="1" min="1" placeholder="Qty">
                </td>
                <td>
                    <input type="number" name="items[${idx}][rate]" class="form-control item-rate" step="0.01" placeholder="Rate">
                </td>
                <td>
                    <select name="items[${idx}][tax_id]" class="form-select item-tax">${taxOptions}</select>
                </td>
                <td>
                    <input type="number" name="items[${idx}][percentage]" class="form-control item-percentage" step="0.01" placeholder="%">
                </td>
                <td>
                    <input type="text" readonly name="items[${idx}][amount]" class="form-control item-amount" placeholder="Amount">
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                </td>
                <input type="hidden" name="items[${idx}][variations]" value="">
            </tr>
            <tr class="product-desc-row" data-index="${idx}">
                <td colspan="6">
                    <input type="text" name="items[${idx}][product_desc]" class="form-control" placeholder="Product Description">
                </td>
                <td></td>
            </tr>
        `);
        $('#createProductsContainer').append(row);

        // If GST number exists, set default tax, make percentage readonly, and disable other options
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
    });

    // remove product row
    $(document).on('click', '.remove-create-product', function(){
        const rows = $('#createProductsContainer tr.product-row');
        if (rows.length > 1) {
            const index = $(this).closest('tr.product-row').data('index');
            $(this).closest('tr.product-row').remove();
            $(`tr.product-desc-row[data-index="${index}"]`).remove();
        } else {
            // reset first row instead of removing
            const row = $(this).closest('tr.product-row');
            const index = row.data('index');
            row.find('select').val('');
            row.find('input[type="number"]').val('');
            row.find('input[type="text"]').val('');
            row.find('input[name*="[variations]"]').val('');
            row.find('input[name*="[variations][]"]').remove();
            row.find('.selected-variation').hide().html('');
            $(`tr.product-desc-row[data-index="${index}"] input`).val('');
        }
        computeTotalsForContainer('#createQuotationForm');
    });

    // auto-fill rate on product select (create)
    $(document).on('change', '#createProductsContainer .item-product', function(){
        const price = parseFloat($(this).find('option:selected').data('price') || 0);
        $(this).closest('.product-row').find('.item-rate').val(price.toFixed(0));
        computeTotalsForContainer('#createQuotationForm');
    });

    // recompute on qty or rate change in create
    $(document).on('input change', '#createProductsContainer .item-qty, #createProductsContainer .item-rate, #createProductsContainer .item-percentage, #createQuotationForm .discount-percentage', function(){
        computeTotalsForContainer('#createQuotationForm');
    });

    // autofill percentage on tax select in create
    $(document).on('change', '#createProductsContainer .item-tax', function(){
        const pct = parseFloat($(this).find('option:selected').data('percent') || 0);
        const percentageField = $(this).closest('.product-row').find('.item-percentage');
        percentageField.val(pct.toFixed(0));
        if (hasGstNumber) {
            percentageField.prop('readonly', true);
        }
        computeTotalsForContainer('#createQuotationForm');
    });


    // ---------- CREATE submit ----------
    $('#openCreateQuotationBtn').on('click', function(){
        $('#createQuotationForm')[0].reset();
        $('#createProductsContainer').html(`
            <tr class="product-row" data-index="0">
                <td>
                    <select name="items[0][product_id]" class="form-select item-product product-select">
                        <option value="">-- Select Product --</option>
                        ${productsData.map(p=>`<option value="${p.id}" data-price="${p.price}">${p.name}</option>`).join('')}
                    </select>
                    <div class="selected-variation mt-1" style="display: none;"></div>
                </td>
                <td>
                    <input type="number" name="items[0][qty]" class="form-control item-qty" value="1" min="1" placeholder="Qty">
                </td>
                <td>
                    <input type="number" name="items[0][rate]" class="form-control item-rate" step="0.01" placeholder="Rate">
                </td>
                <td>
                    <select name="items[0][tax_id]" class="form-select item-tax">
                        <option value="">-- Select Tax --</option>
                        ${taxesData.map(t=>`<option value="${t.id}" data-percent="${t.percent}">${t.name}</option>`).join('')}
                    </select>
                </td>
                <td>
                    <input type="number" name="items[0][percentage]" class="form-control item-percentage" step="0.01" placeholder="%">
                </td>
                <td>
                    <input type="text" readonly name="items[0][amount]" class="form-control item-amount" placeholder="Amount">
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                </td>
                <input type="hidden" name="items[0][variations]" value="">
            </tr>
            <tr class="product-desc-row" data-index="0">
                <td colspan="6">
                    <input type="text" name="items[0][product_desc]" class="form-control" placeholder="Product Description">
                </td>
                <td></td>
            </tr>
        `);

        // If GST number exists, set default tax, make percentage readonly, and disable other tax options
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

        computeTotalsForContainer('#createQuotationForm');
        var off = new bootstrap.Offcanvas(document.getElementById('createQuotationOffcanvas'));
        off.show();
    });

    $('#createQuotationForm').on('submit', function(e){
        e.preventDefault();
        clearFormErrors('#createQuotationForm');
        const fd = new FormData(this);
        $('#createQuotationBtn').prop('disabled', true).text('Saving...');
        $.ajax({
            url: quotationStoreUrl,
            type: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            success: function(res){
                if (res && res.success) {
                    $('#createQuotationForm')[0].reset();
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById('createQuotationOffcanvas'));
                    if (off) off.hide();
                    if (window.quotationTable) window.quotationTable.ajax.reload(null,false);
                    showAlert('Success', res.message || 'Created', 'success');
                } else {
                    showAlert('Error', res && res.message ? res.message : 'Failed', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#createQuotationForm');
                } else {
                    showAlert('Error', 'Failed to create', 'error');
                }
            },
            complete: function(){ $('#createQuotationBtn').prop('disabled', false).text('Save Quotation'); }
        });
    });

    // ---------- VIEW ----------
    $(document).on('click', '.view-quotation', function(e){
        e.preventDefault();
        const id = $(this).data('id');
        const url = quotationEditUrlTemplate.replace(':id', id);
        $.get(url, function(res){
            if (res && res.success) {
                const q = res.data;
                const isQuotation = q.form_type === 'quotation';
                const codeLabel = isQuotation ? 'Quotation' : 'Sale';
                const code = isQuotation ? (q.quotation_code ?? 'Q#'+q.id) : (q.sale_code ?? 'S#'+q.id);
                const formTypeDisplay = q.form_type ? q.form_type.charAt(0).toUpperCase() + q.form_type.slice(1) : '-';
                const statusDisplay = q.status ? q.status.charAt(0).toUpperCase() + q.status.slice(1) : '-';
                let html = `<div class="row g-3">
                    <div class="col-12"><strong>${codeLabel}:</strong> ${code}</div>
                    <div class="col-12"><strong>Customer:</strong> ${q.customer ? q.customer.name : '-'}</div>
                    <div class="col-12"><strong>Form Type:</strong> ${formTypeDisplay}</div>
                    <div class="col-12"><strong>Date:</strong> ${isQuotation ? (q.quotation_date ? new Date(q.quotation_date).toLocaleDateString() : '-') : (q.sale_date ? new Date(q.sale_date).toLocaleDateString() : '-')}</div>
                    <div class="col-12"><strong>Status:</strong> ${statusDisplay}</div>
                </div><hr>`;

                if (q.products && q.products.length) {
                    q.products.forEach(p => {
                        let variations = '';
                        if (p.variations && p.variations.length) {
                            variations = '<br><small><strong>Variations:</strong> ' + p.variations.map(v => {
                                let varData = v.productVariation;
                                if (varData) {
                                    const attrs = [];
                                    if (varData.size) attrs.push('Size: ' + varData.size);
                                    if (varData.color) attrs.push('Color: ' + varData.color);
                                    if (varData.material) attrs.push('Material: ' + varData.material);
                                    return attrs.join(', ') + ' (₹' + varData.price + ')';
                                } else {
                                    // Fallback to find from product variations
                                    const prodVar = p.product && p.product.variations ? p.product.variations.find(vr => vr.id == v.product_variation_id) : null;
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
                        html += `<div class="border p-2 mb-2">
                            <strong>${p.product ? p.product.item_name : '-'}</strong>
                            ${p.product_desc ? `<div>Description: ${p.product_desc}</div>` : ''}
                            <div>Qty: ${p.qty}</div>
                            <div>Rate: ₹${p.rate}</div>
                            <div>Tax: ${p.percentage ? p.percentage + '%' : '0%'}</div>
                            <div>Amount: ₹${p.amount}</div>
                            ${variations}
                        </div>`;
                    });
                }

                if (q.taxes && q.taxes.length) {
                    html += `<hr><div><strong>Taxes</strong></div>`;
                    // compute client-side using stored percentages
                }

                let subtotal = 0;
                let taxTotal = 0;
                if (q.products && q.products.length) {
                    q.products.forEach(p => {
                        subtotal += parseFloat(p.amount);
                        if (p.percentage > 0) {
                            const taxAmt = +(parseFloat(p.amount) * parseFloat(p.percentage) / 100);
                            taxTotal += taxAmt;
                        }
                    });
                }

                const totalBeforeDiscount = subtotal + Math.round(taxTotal);
                const discountPercentage = parseFloat(q.discount_percentage) || 0;
                const discountAmount = totalBeforeDiscount * discountPercentage / 100;
                const grandTotal = totalBeforeDiscount - discountAmount;

                html += `<hr><div><strong>Sub Total: ₹${subtotal}</strong></div>`;
                html += `<div><strong>Tax Total: ₹${Math.round(taxTotal)}</strong></div>`;
                if (discountPercentage > 0) {
                    html += `<div><strong>Discount (${discountPercentage}%): ₹${discountAmount.toFixed(2)}</strong></div>`;
                }
                html += `<div class="mt-2"><h5>Grand Total: ₹${grandTotal.toFixed(2)}</h5></div>`;

                $('#viewQuotationContent').html(html);
                var off = new bootstrap.Offcanvas(document.getElementById('viewQuotationOffcanvas'));
                off.show();
            } else {
                showAlert('Error', res && res.message ? res.message : 'Failed to load', 'error');
            }
        }).fail(function(){ showAlert('Error', 'Failed to fetch', 'error'); });
    });

    // ---------- EDIT ----------
    $(document).on('click', '.edit-quotation', function(e){
        e.preventDefault();
        const id = $(this).data('id');
        loadEditForm(id, false);
    });

    // ---------- CONVERT TO SALE ----------
    $(document).on('click', '.convert-to-sale', function(e){
        e.preventDefault();
        const id = $(this).data('id');
        loadEditForm(id, true);
    });

    function loadEditForm(id, isConvertToSale = false) {
        const url = quotationEditUrlTemplate.replace(':id', id);
        $.get(url, function(res){
            if (res && res.success) {
                const q = res.data;
                $('#edit_quotation_id').val(q.id);
                $('#edit_form_type').val(isConvertToSale ? 'sale' : (q.form_type || 'quotation'));
                $('#edit_customer_id').val(q.customer_id || '');
                $('#edit_quotation_date').val(q.quotation_date ? q.quotation_date.split('T')[0] : '');
                $('#edit_sale_date').val(q.sale_date ? q.sale_date.split('T')[0] : '');
                $('#edit_discount_percentage').val(q.discount_percentage || 0);

                // Trigger form type change to set visibility and status options
                $('#edit_form_type').trigger('change');

                // Set status after options are set, ensuring it's valid for the form_type
                let status = q.status || '';
                const formType = isConvertToSale ? 'sale' : (q.form_type || 'quotation');
                if (formType === 'quotation') {
                    if (!['open', 'progress', 'closed'].includes(status)) {
                        status = 'open';
                    }
                } else if (formType === 'sale') {
                    if (!['paid', 'partial paid', 'unpaid'].includes(status)) {
                        status = 'paid';
                    }
                }
                $('#edit_status').val(status);

                // Update offcanvas title and button text
                if (isConvertToSale) {
                    $('#editQuotationOffcanvas .offcanvas-title').html('<i class="bi bi-arrow-right-circle"></i> Convert to Sale');
                    $('#editQuotationBtn').text('Convert to Sale');
                } else {
                    $('#editQuotationOffcanvas .offcanvas-title').html('<i class="bi bi-pencil-square"></i> Edit Quotation');
                    $('#editQuotationBtn').text('Update Quotation');
                }

                let prodRows = '';
                const masterProducts = res.products || [];
                const masterTaxesEdit = res.taxes || [];
                (q.products || []).forEach((p, idx) => {
                    const selectedVariations = p.variations ? p.variations.map(v => v.product_variation_id) : [];
                    let options = '<option value="">-- Select Product --</option>';
                    masterProducts.forEach(mp => options += `<option value="${mp.id}" data-price="${mp.price ?? 0}" ${mp.id == (p.product_id ?? (p.product ? p.product.id : '')) ? 'selected' : ''}>${mp.item_name}</option>`);

                    let taxOptions = '<option value="">-- Select Tax --</option>';
                    masterTaxesEdit.forEach(mt => taxOptions += `<option value="${mt.id}" data-percent="${mt.percent}" ${mt.id == p.tax_id ? 'selected' : ''}>${mt.name}</option>`);

                    prodRows += `<tr class="product-row" data-index="${idx}">
                        <td>
                            <select name="items[${idx}][product_id]" class="form-select item-product product-select">${options}</select>
                            <div class="selected-variation mt-1" style="display: none;"></div>
                        </td>
                        <td>
                            <input type="number" name="items[${idx}][qty]" class="form-control item-qty" value="${p.qty}" min="1" placeholder="Qty">
                        </td>
                        <td>
                            <input type="number" name="items[${idx}][rate]" class="form-control item-rate" value="${p.rate}" step="0.01" placeholder="Rate">
                        </td>
                        <td>
                            <select name="items[${idx}][tax_id]" class="form-select item-tax">${taxOptions}</select>
                        </td>
                        <td>
                            <input type="number" name="items[${idx}][percentage]" class="form-control item-percentage" value="${p.percentage || 0}" step="0.01" placeholder="%">
                        </td>
                        <td>
                            <input type="text" readonly name="items[${idx}][amount]" class="form-control item-amount" value="${p.amount}" placeholder="Amount">
                        </td>
                        <td class="text-center">
                            <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                        </td>
                    </tr>
                    <tr class="product-desc-row" data-index="${idx}">
                        <td colspan="6">
                            <input type="text" name="items[${idx}][product_desc]" class="form-control" placeholder="Product Description" value="${p.product_desc || ''}">
                        </td>
                        <td></td>
                    </tr>`;
                    // Add variation inputs
                    selectedVariations.forEach(variationId => {
                        prodRows += `<input type="hidden" name="items[${idx}][variations][]" value="${variationId}">`;
                    });
                });
                $('#editProductsContainer').html(prodRows);

                // Show selected variations
                (q.products || []).forEach((p, idx) => {
                    const selectedVariations = p.variations ? p.variations.map(v => v.product_variation_id) : [];
                    if (selectedVariations.length > 0) {
                        const product = productsData.find(pr => pr.id == p.product_id);
                        if (product) {
                            const variationDetails = selectedVariations.map(variationId => {
                                const variation = product.variations.find(vr => vr.id == variationId);
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

                // If GST number exists, set default tax, make percentage readonly, and disable other options
                if (res.hasGstNumber && res.defaultTaxId) {
                    $('#editProductsContainer .item-tax').each(function() {
                        $(this).val(res.defaultTaxId);
                        const tax = res.taxes.find(t => t.id == res.defaultTaxId);
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

                computeTotalsForContainer('#editQuotationForm');
                var off = new bootstrap.Offcanvas(document.getElementById('editQuotationOffcanvas'));
                off.show();
            } else {
                showAlert('Error', res && res.message ? res.message : 'Failed to load', 'error');
            }
        }).fail(function(){ showAlert('Error','Failed to fetch','error'); });
    }

    // add product in edit
    $(document).on('click', '#editAddQuotationProductBtn', function(){
        const idx = $('#editProductsContainer tr.product-row').length;
        let prodOptions = '<option value="">-- Select Product --</option>';
        productsData.forEach(p => prodOptions += `<option value="${p.id}" data-price="${p.price}">${p.name}</option>`);
        let taxOptions = '<option value="">-- Select Tax --</option>';
        taxesData.forEach(t => taxOptions += `<option value="${t.id}" data-percent="${t.percent}">${t.name}</option>`);
        const row = $(`
            <tr class="product-row" data-index="${idx}">
                <td>
                    <select name="items[${idx}][product_id]" class="form-select item-product product-select">${prodOptions}</select>
                    <div class="selected-variation mt-1" style="display: none;"></div>
                </td>
                <td>
                    <input type="number" name="items[${idx}][qty]" class="form-control item-qty" value="1" min="1" placeholder="Qty">
                </td>
                <td>
                    <input type="number" name="items[${idx}][rate]" class="form-control item-rate" step="0.01" placeholder="Rate">
                </td>
                <td>
                    <select name="items[${idx}][tax_id]" class="form-select item-tax">${taxOptions}</select>
                </td>
                <td>
                    <input type="number" name="items[${idx}][percentage]" class="form-control item-percentage" step="0.01" placeholder="%">
                </td>
                <td>
                    <input type="text" readonly name="items[${idx}][amount]" class="form-control item-amount" placeholder="Amount">
                </td>
                <td class="text-center">
                    <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                </td>
                <input type="hidden" name="items[${idx}][variations]" value="">
            </tr>
            <tr class="product-desc-row" data-index="${idx}">
                <td colspan="6">
                    <input type="text" name="items[${idx}][product_desc]" class="form-control" placeholder="Product Description">
                </td>
                <td></td>
            </tr>
        `);
        $('#editProductsContainer').append(row);

        // If GST number exists, set default tax, make percentage readonly, and disable other options
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
    });


    // when product select in edit, autofill price
    $(document).on('change', '#editProductsContainer .item-product', function(){
        const price = parseFloat($(this).find('option:selected').data('price') || 0);
        $(this).closest('.product-row').find('.item-rate').val(price.toFixed(0));
        computeTotalsForContainer('#editQuotationForm');
    });

    // recompute on change in edit
    $(document).on('input change', '#editProductsContainer .item-qty, #editProductsContainer .item-rate, #editProductsContainer .item-percentage, #editQuotationForm .discount-percentage', function(){
        computeTotalsForContainer('#editQuotationForm');
    });

    // autofill percentage on tax select in edit
    $(document).on('change', '#editProductsContainer .item-tax', function(){
        const pct = parseFloat($(this).find('option:selected').data('percent') || 0);
        const percentageField = $(this).closest('.product-row').find('.item-percentage');
        percentageField.val(pct.toFixed(0));
        if (hasGstNumber) {
            percentageField.prop('readonly', true);
        }
        computeTotalsForContainer('#editQuotationForm');
    });

    // ---------- EDIT submit ----------
    $('#editQuotationForm').on('submit', function(e){
        e.preventDefault();
        clearFormErrors('#editQuotationForm');
        const id = $('#edit_quotation_id').val();
        if (!id) { showAlert('Error', 'Missing id', 'error'); return; }
        const url = quotationUpdateUrlTemplate.replace(':id', id);
        const fd = new FormData(this);
        fd.append('_method','PUT');
        $('#editQuotationBtn').prop('disabled', true).text('Updating...');
        $.ajax({
            url: url,
            type: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            success: function(res){
                if (res && res.success) {
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById('editQuotationOffcanvas'));
                    if (off) off.hide();
                    if (window.quotationTable) window.quotationTable.ajax.reload(null,false);
                    showAlert('Success', res.message || 'Updated', 'success');
                } else {
                    showAlert('Error', res && res.message ? res.message : 'Failed to update', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#editQuotationForm');
                } else {
                    showAlert('Error','Failed to update','error');
                }
            },
            complete: function(){ $('#editQuotationBtn').prop('disabled', false).text('Update Quotation'); }
        });
    });

    // ---------- DELETE ----------
    $(document).on('click', '.delete-quotation', function(){
        const id = $(this).data('id');
        const name = $(this).data('name') || `Quotation #${id}`;
        Swal.fire({
            title: 'Are you sure?',
            text: `Delete ${name}?`,
            icon: 'warning',
            showCancelButton: true,
        }).then(function(res){
            if (res.isConfirmed) {
                $.ajax({
                    url: quotationDeleteUrlTemplate.replace(':id', id),
                    type: 'DELETE',
                    data: { _token: $('meta[name="csrf-token"]').attr('content') },
                    success: function(resp){
                        if (resp && resp.success) {
                            showAlert('Success', resp.message || 'Deleted', 'success');
                            if (window.quotationTable) window.quotationTable.ajax.reload(null,false);
                        } else showAlert('Error', resp && resp.message ? resp.message : 'Failed', 'error');
                    },
                    error: function(){ showAlert('Error','Failed to delete','error'); }
                });
            }
        });
    });



    // Convert to sale from create form
    $('#createConvertToSaleBtn').on('click', function(e){
        e.preventDefault();
        clearFormErrors('#createQuotationForm');
        const fd = new FormData(document.getElementById('createQuotationForm'));
        $('#createConvertToSaleBtn').prop('disabled', true).text('Converting...');
        $.ajax({
            url: quotationConvertToSaleUrl,
            type: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            success: function(res){
                if (res && res.success) {
                    showAlert('Success', res.message || 'Converted to sale', 'success');
                    if (res.redirect) {
                        window.location.href = res.redirect;
                    }
                } else {
                    showAlert('Error', res && res.message ? res.message : 'Failed', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#createQuotationForm');
                } else {
                    showAlert('Error', 'Failed to convert', 'error');
                }
            },
            complete: function(){ $('#createConvertToSaleBtn').prop('disabled', false).text('Convert to Sale'); }
        });
    });

    // Convert to sale from edit form
    $('#editConvertToSaleBtn').on('click', function(e){
        e.preventDefault();
        clearFormErrors('#editQuotationForm');
        const fd = new FormData(document.getElementById('editQuotationForm'));
        $('#editConvertToSaleBtn').prop('disabled', true).text('Converting...');
        $.ajax({
            url: quotationConvertToSaleUrl,
            type: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            success: function(res){
                if (res && res.success) {
                    showAlert('Success', res.message || 'Converted to sale', 'success');
                    if (res.redirect) {
                        window.location.href = res.redirect;
                    }
                } else {
                    showAlert('Error', res && res.message ? res.message : 'Failed', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#editQuotationForm');
                } else {
                    showAlert('Error', 'Failed to convert', 'error');
                }
            },
            complete: function(){ $('#editConvertToSaleBtn').prop('disabled', false).text('Convert to Sale'); }
        });
    });

    // initial compute
    computeTotalsForContainer('#createQuotationForm');

    // Add download functionality
    $(document).on('click', '.download-quotation', function(){
        const id = $(this).data('id');
        const url = quotationDownloadUrlTemplate.replace(':id', id);
        window.open(url, '_blank');
    });

    // download button in view offcanvas (uses currently viewed id if present)
    $(document).on('click', '#downloadQuotationBtn', function(){
        const id = $(document).find('.view-quotation').data('id');
        if (id) {
            const url = quotationDownloadUrlTemplate.replace(':id', id);
            window.open(url, '_blank');
        }
    });
});
if (window.location.search.includes('open=create')) {
    const offcanvasEl = document.getElementById('createQuotationOffcanvas');
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
