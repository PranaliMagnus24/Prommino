
$(function(){
    // -- DataTables init --
    var serviceTable = null;
    var searchDebounceTimer = null;
    if ($('.serviceList').length) {
        if ($.fn.DataTable.isDataTable('.serviceList')) {
            $('.serviceList').DataTable().clear().destroy();
        }

        serviceTable = $('.serviceList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: {
                url: serviceListUrl,
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
                            serviceTable.search('').draw();
                        }
                    }
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                    action: function(e, dt, node, config) {
                        window.location.href = servicesExportUrl;
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
                            showAlert('No selection', 'Please select at least one service to delete', 'warning');
                            return;
                        }
                        Swal.fire({
                            title: 'Confirm delete',
                            text: 'Delete ' + ids.length + ' selected service(s)?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete',
                            cancelButtonText: 'Cancel'
                        }).then(function(result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: serviceBulkDeleteUrl,
                                    method: 'POST',
                                    data: {
                                        _token: $('meta[name="csrf-token"]').attr('content'),
                                        ids: ids
                                    },
                                    success: function(res) {
                                        if (res.success) {
                                            showAlert('Deleted', res.message || 'Services deleted', 'success');
                                            serviceTable.ajax.reload(null, false);
                                        } else {
                                            showAlert('Error', res.message || 'Failed to delete', 'error');
                                        }
                                    },
                                    error: function() {
                                        showAlert('Error', 'Failed to delete services', 'error');
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
                { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'customer', name: 'customer' },
                { data: 'product', name: 'product' },
                { data: 'service_date', name: 'service_date' },
                { data: 'assigned_to', name: 'assigned_to' },
                { data: 'status', name: 'status' },
                { data: 'employee_status', name: 'employee_status', orderable: false, searchable: false },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ],
            order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function(settings) {
                // uncheck master when table redraw
                $('#selectAllServices').prop('checked', false);

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

        window.serviceTable = serviceTable;
    }

// ---------------- Select All / Row checkbox handling ----------------
$(document).on('change', '#selectAllServices', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllServices').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var serviceColumnMap = {
    2: 'customer',
    3: 'product',
    4: 'service_date',
    5: 'assigned_to',
    6: 'status',
    7: 'employee_status'
};

$('#filter_column').on('change', function() {
    var colIndex = $(this).val();
    $('#filter_value').html('<option value="">Loading...</option>');
    if (!colIndex) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }
    var colKey = serviceColumnMap[colIndex];
    if (!colKey) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Fetch distinct values from server
    $.get(serviceDistinctValuesUrl, { column: colKey }, function(res) {
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

    // colIndex corresponds to datatable column index (including checkbox column at 0)
    var dtColIndex = parseInt(colIndex, 10); // numeric
    if (!serviceTable) return;

    if (!value) {
        // clear search for that column
        serviceTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        serviceTable.column(dtColIndex).search('^' + escaped + '$', true, false).draw();
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
    if (serviceTable) serviceTable.search(val).draw();
  }, 300);
});

// Clear search
$(document).on('click', '#customSearchClear', function () {
  $('#customSearchInput').val('');
  $('#customSearchClear').css('visibility', 'hidden');
  if (serviceTable) serviceTable.search('').draw();
  $('#customSearchInput').focus();
});

    // ---------- CREATE Offcanvas product rows ----------
    let createProdIdx = 1; // starting after initial 0 row
    $('#createAddProductBtn').on('click', function() {
        const idx = createProdIdx++;
        let options = '<option value="">-- Select Product --</option>';
        productsData.forEach(p => {
            options += `<option value="${p.id}">${p.name}</option>`;
        });
        const row = $(`
            <div class="row mb-2 product-row" data-index="${idx}">
                <div class="col-md-6">
                    <select name="items[${idx}][product_id]" class="form-select product-select select2">
                        ${options}
                    </select>
                    <div class="selected-variation mt-1" style="display: none;"></div>
                </div>
                <div class="col-md-5">
                    <input type="text" name="items[${idx}][note]" class="form-control" placeholder="Note (optional)">
                </div>
                <div class="col-md-1 text-end">
                    <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                </div>
                <input type="hidden" name="items[${idx}][variations]" value="">
            </div>
        `);
        $('#createProductsContainer').append(row);
    });

    $(document).on('click', '.remove-create-product', function(){
        const rows = $('#createProductsContainer .product-row');
        if (rows.length > 1) $(this).closest('.product-row').remove();
        else {
            // reset inputs
            const r = $(this).closest('.product-row');
            r.find('select').val('');
            r.find('input[type="text"]').val('');
            r.find('input[name*="[variations]"]').val('');
            r.find('input[name*="[variations][]"]').remove();
            r.find('.selected-variation').hide().html('');
        }
    });

    // select variations when product is selected
    let currentProductRow = null;
    $(document).on('change', '.product-select', function() {
        const row = $(this).closest('.product-row, .edit-product-row');
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

    // ---------- Service Charge Toggle ----------
    function toggleChargeValue(containerId, selectId) {
        const val = $(selectId).val();
        if (val == '1') {
            $(containerId).show();
        } else {
            $(containerId).hide();
            $(containerId + ' input').val('');
        }
    }

    $('#service_charge').on('change', function() {
        toggleChargeValue('#create_charge_value_container', '#service_charge');
    });

    $('#edit_service_charge').on('change', function() {
        toggleChargeValue('#edit_charge_value_container', '#edit_service_charge');
    });

    // ---------- CREATE submit ----------
    $('#createServiceForm').on('submit', function(e){
        e.preventDefault();
        clearFormErrors('#createServiceForm');

        // ensure product input names are continuous
        $('#createProductsContainer .product-row').each(function(i){
            const idx = i;
            const sel = $(this).find('.product-select');
            const note = $(this).find('input[type="text"]');
            const variations = $(this).find('input[name*="[variations]"]');

            sel.attr('name', `items[${idx}][product_id]`);
            note.attr('name', `items[${idx}][note]`);
            variations.each(function() {
                const name = $(this).attr('name');
                const newName = name.replace(/items\[\d+\]/, `items[${idx}]`);
                $(this).attr('name', newName);
            });
        });

        let fd = new FormData(this);
        $('#createServiceBtn').prop('disabled', true).text('Saving...');

        $.ajax({
            url: serviceStoreUrl,
            type: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            success: function(res){
                if (res.success) {
                    $('#createServiceForm')[0].reset();
                    $('#create_charge_value_container').hide();
                    $('#createProductsContainer').html(`<div class="row mb-2 product-row" data-index="0">
                        <div class="col-md-6">
                            <select name="items[0][product_id]" class="form-select product-select select2">
                                <option value="">-- Select Product --</option>
                                @foreach($products as $p)
                                  <option value="{{ $p->id }}">{{ $p->item_name }}</option>
                                @endforeach
                            </select>
                            <div class="selected-variation mt-1" style="display: none;"></div>
                        </div>
                        <div class="col-md-5">
                            <input type="text" name="items[0][note]" class="form-control" placeholder="Note (optional)">
                        </div>
                        <div class="col-md-1 text-end">
                            <button type="button" class="btn btn-danger btn-sm remove-create-product">&minus;</button>
                        </div>
                        <input type="hidden" name="items[0][variations]" value="">
                    </div>`);
                    createProdIdx = 1;
                    // hide offcanvas
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById('createServiceOffcanvas'));
                    if (off) off.hide();
                    showAlert('Success!', res.message || 'Service created', 'success');
                    if (window.serviceTable) window.serviceTable.ajax.reload(null,false);
                } else {
                    showAlert('Error!', res.message || 'Failed to create', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#createServiceForm');
                } else {
                    showAlert('Error!', 'Failed to create service', 'error');
                }
            },
            complete: function(){
                $('#createServiceBtn').prop('disabled', false).text('Save Service');
            }
        });
    });

    // ---------- OPEN Create Offcanvas ----------
    $('#openCreateServiceBtn').on('click', function(){
        $('#createServiceForm')[0].reset();
        $('#createProductsContainer').find('.product-row').not('[data-index="0"]').remove();
        createProdIdx = 1;
        var off = new bootstrap.Offcanvas(document.getElementById('createServiceOffcanvas'));
        off.show();
    });
    $('#createServiceOffcanvas .select2').select2({
            dropdownParent: $('#createServiceOffcanvas'),
            allowClear: true
        });

    // ---------- EDIT logic: render product rows helper ----------
    function renderEditProductRows(products) {
        $('#editProductsContainer').empty();
        let idx = 0;
        if (Array.isArray(products) && products.length) {
            products.forEach(function(p){
                const selectedVariations = p.variations ? p.variations.map(v => v.product_variation_id) : [];
                let options = '<option value="">-- Select Product --</option>';
                productsData.forEach(pp => {
                    options += `<option value="${pp.id}">${pp.name}</option>`;
                });
                const row = $(`
                    <div class="row mb-2 edit-product-row" data-index="${idx}">
                        <div class="col-md-6">
                            <select name="items[${idx}][product_id]" class="form-select product-select select2">
                                ${options}
                            </select>
                            <div class="selected-variation mt-1" style="display: none;"></div>
                        </div>
                        <div class="col-md-5">
                            <input type="text" name="items[${idx}][note]" class="form-control" placeholder="Note (optional)" value="${p.note ?? ''}">
                        </div>
                        <div class="col-md-1 text-end">
                            <button type="button" class="btn btn-danger btn-sm remove-edit-product">&minus;</button>
                        </div>
                    </div>
                `);
                // Add variation inputs
                selectedVariations.forEach(variationId => {
                    row.append(`<input type="hidden" name="items[${idx}][variations][]" value="${variationId}">`);
                });
                $('#editProductsContainer').append(row);
                // set selected value after append
                row.find('select').val(p.product_id || '');
                // Show selected variations
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
                        row.find('.selected-variation').html(`<small class="text-muted">${variationDetails}</small>`).show();
                    }
                }
                idx++;
            });
        } else {
            // at least one blank row
            let options = '<option value="">-- Select Product --</option>';
            productsData.forEach(pp => {
                options += `<option value="${pp.id}">${pp.name}</option>`;
            });
            $('#editProductsContainer').append(`
                <div class="row mb-2 edit-product-row" data-index="0">
                    <div class="col-md-6">
                        <select name="items[0][product_id]" class="form-select product-select select2">
                            ${options}
                        </select>
                        <div class="selected-variation mt-1" style="display: none;"></div>
                    </div>
                    <div class="col-md-5">
                        <input type="text" name="items[0][note]" class="form-control" placeholder="Note (optional)">
                    </div>
                    <div class="col-md-1 text-end">
                        <button type="button" class="btn btn-danger btn-sm remove-edit-product">&minus;</button>
                    </div>
                    <input type="hidden" name="items[0][variations]" value="">
                </div>
            `);
        }
    }

    let editProdIdx = 0;
    $('#editAddProductBtn').on('click', function(){
        editProdIdx++;
        let options = '<option value="">-- Select Product --</option>';
        productsData.forEach(p => {
            options += `<option value="${p.id}">${p.name}</option>`;
        });
        const row = $(`
            <div class="row mb-2 edit-product-row" data-index="${editProdIdx}">
                <div class="col-md-6">
                    <select name="items[${editProdIdx}][product_id]" class="form-select product-select select2">
                        ${options}
                    </select>
                    <div class="selected-variation mt-1" style="display: none;"></div>
                </div>
                <div class="col-md-5">
                    <input type="text" name="items[${editProdIdx}][note]" class="form-control" placeholder="Note (optional)">
                </div>
                <div class="col-md-1 text-end">
                    <button type="button" class="btn btn-danger btn-sm remove-edit-product">&minus;</button>
                </div>
                <input type="hidden" name="items[${editProdIdx}][variations]" value="">
            </div>
        `);
        $('#editProductsContainer').append(row);
    });

    $(document).on('click', '.remove-edit-product', function(){
        const rows = $('#editProductsContainer .edit-product-row');
        if (rows.length > 1) $(this).closest('.edit-product-row').remove();
        else {
            const r = $(this).closest('.edit-product-row');
            r.find('select').val('');
            r.find('input[type="text"]').val('');
            r.find('input[name*="[variations]"]').val('');
            r.find('input[name*="[variations][]"]').remove();
            r.find('.selected-variation').hide().html('');
        }
    });

    // ---------- OPEN View Offcanvas & populate ----------
    $(document).on('click', '.view-service', function(){
        const id = $(this).data('id');
        const url = serviceEditUrlTemplate.replace(':id', id);

        $.get(url, function(res){
            if (res.success) {
                const s = res.data;
                let content = `
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">AMC:</label>
                            <p>${s.amc ? (s.amc.amc_code || 'AMC#' + s.amc.id) + (s.amc.customer ? ' — ' + s.amc.customer.name : '') : '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Service Code:</label>
                            <p>${s.service_code || 'SVC#' + s.id}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Assign To:</label>
                            <p>${s.assignee ? s.assignee.name : '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Service Date:</label>
                            <p>${s.service_date ? new Date(s.service_date).toLocaleDateString() : '-'} ${s.service_time ? 'at ' + s.service_time : ''}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Service Charged:</label>
                            <p>${s.service_charge == '1' ? 'Yes' : 'No'}</p>
                        </div>
                        ${s.service_charge == '1' && s.charge_value ? `
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Service Charge Value:</label>
                            <p>₹${s.charge_value}</p>
                        </div>
                        ` : ''}
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Status:</label>
                            <p><span class="badge ${s.status === 'open' ? 'bg-primary' : s.status === 'progress' ? 'bg-warning text-dark' : 'bg-success'}">${s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span></p>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold">Service Details:</label>
                            <p>${s.service_details || '-'}</p>
                        </div>
                        ${s.remark ? `
                        <div class="col-12">
                            <label class="form-label fw-bold">Remark:</label>
                            <p>${s.remark}</p>
                        </div>
                        ` : ''}
                        <div class="col-12">
                            <label class="form-label fw-bold">Products:</label>
                            ${s.products && s.products.length ? s.products.map(p => {
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
                                            return 'Variation ID: ' + v.product_variation_id;
                                        }
                                    }).filter(s => s.trim()).join('; ') + '</small>';
                                }
                                return `
                                    <div class="border rounded p-2 mb-2">
                                        <strong>${p.product ? p.product.item_name : 'N/A'}</strong>
                                        ${p.product && p.product.price ? `<br><small class="text-muted">Price: ₹${p.product.price}</small>` : ''}
                                        ${variations}
                                        ${p.note ? `<br><small class="text-muted">Note: ${p.note}</small>` : ''}
                                    </div>
                                `;
                            }).join('') : '<p>No products assigned</p>'}
                        </div>
                    </div>
                `;
                $('#viewServiceContent').html(content);

                // open offcanvas
                var off = new bootstrap.Offcanvas(document.getElementById('viewServiceOffcanvas'));
                off.show();
            } else {
                showAlert('Error!', res.message || 'Failed to load', 'error');
            }
        }).fail(function(){
            showAlert('Error!','Failed to fetch service','error');
        });
    });

    // ---------- OPEN Edit Offcanvas & populate ----------
    $(document).on('click', '.edit-service', function(){
        clearFormErrors('#editServiceForm');
        const id = $(this).data('id');
        const url = serviceEditUrlTemplate.replace(':id', id);

        $.get(url, function(res){
            if (res.success) {
                const s = res.data;
                $('#edit_service_id').val(s.id);
                $('#edit_amc_id').val(s.amc_id || '');
                $('#edit_customer_id').val(s.customer_id || '');
                $('#edit_assigned_to').val(s.assigned_to || '');
                $('#edit_service_date').val(s.service_date ? s.service_date.split('T')[0] : '');
                $('#edit_service_time').val(s.service_time || '');
                $('#edit_service_details').val(s.service_details || '');
                $('#edit_remark').val(s.remark || '');
                $('#edit_status').val(s.status || 'open');
                $('#edit_service_charge').val(s.service_charge || '');
                $('#edit_charge_value').val(s.charge_value || '');
                toggleChargeValue('#edit_charge_value_container', '#edit_service_charge');

                // render product rows from s.products (array of {product_id, note})
                renderEditProductRows(s.products || []);
                editProdIdx = ($('#editProductsContainer .edit-product-row').length - 1) >= 0 ? $('#editProductsContainer .edit-product-row').length -1 : 0;

                // open offcanvas
                var off = new bootstrap.Offcanvas(document.getElementById('editServiceOffcanvas'));
                off.show();
            } else {
                showAlert('Error!', res.message || 'Failed to load', 'error');
            }
        }).fail(function(){
            showAlert('Error!','Failed to fetch service','error');
        });
    });

    // ---------- EDIT submit ----------
    $('#editServiceForm').on('submit', function(e){
        e.preventDefault();
        clearFormErrors('#editServiceForm');

        // ensure product input names are continuous
        $('#editProductsContainer .edit-product-row').each(function(i){
            const idx = i;
            const sel = $(this).find('.product-select');
            const note = $(this).find('input[type="text"]');
            const variations = $(this).find('input[name*="[variations]"]');

            sel.attr('name', `items[${idx}][product_id]`);
            note.attr('name', `items[${idx}][note]`);
            variations.each(function() {
                const name = $(this).attr('name');
                const newName = name.replace(/items\[\d+\]/, `items[${idx}]`);
                $(this).attr('name', newName);
            });
        });

        const id = $('#edit_service_id').val();
        if (!id) { showAlert('Error!','Missing service id','error'); return; }

        const url = serviceUpdateUrlTemplate.replace(':id', id);
        let fd = new FormData(this);
        fd.append('_method','PUT');

        $('#editServiceBtn').prop('disabled', true).text('Updating...');
        $.ajax({
            url: url,
            type: 'POST', // using method override
            data: fd,
            processData: false,
            contentType: false,
            success: function(res){
                if (res.success) {
                    // hide offcanvas
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById('editServiceOffcanvas'));
                    if (off) off.hide();

                    showAlert('Success!', res.message || 'Service updated', 'success');
                    if (window.serviceTable) window.serviceTable.ajax.reload(null,false);
                } else {
                    showAlert('Error!', res.message || 'Failed to update', 'error');
                }
            },
            error: function(xhr){
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, '#editServiceForm');
                } else {
                    showAlert('Error!', 'Failed to update service', 'error');
                }
            },
            complete: function(){
                $('#editServiceBtn').prop('disabled', false).text('Update Service');
            }
        });
    });

    // ---------- DELETE ----------
    $(document).on('click', '.delete-service', function(){
        const id = $(this).data('id');
        const name = $(this).data('name') || `Service #${id}`;
        Swal.fire({
            title: 'Are you sure?',
            text: `Delete ${name}?`,
            icon: 'warning',
            showCancelButton: true,
        }).then(function(res){
            if (res.isConfirmed) {
                $.ajax({
                    url: serviceDeleteUrlTemplate.replace(':id', id),
                    type: 'DELETE',
                    data: { _token: $('meta[name="csrf-token"]').attr('content') },
                    success: function(resp){
                        if (resp.success) {
                            showAlert('Success!', resp.message || 'Deleted', 'success');
                            if (window.serviceTable) window.serviceTable.ajax.reload(null,false);
                        } else {
                            showAlert('Error!', resp.message || 'Failed to delete', 'error');
                        }
                    },
                    error: function(){
                        showAlert('Error!', 'Failed to delete', 'error');
                    }
                });
            }
        });
    });

    // ---------- helpers ----------
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

    // reset edit offcanvas on close
    $('#editServiceOffcanvas').on('hidden.bs.offcanvas', function(){
        $('#editServiceForm')[0].reset();
        $('#edit_service_id').val('');
        $('#edit_charge_value_container').hide();
        $('#editProductsContainer').empty();
    });
});

        $('#editServiceOffcanvas .select2').select2({
            dropdownParent: $('#editServiceOffcanvas'),
            allowClear: true
        });
// Check URL for ?open=create to show offcanvas
if (window.location.search.includes('open=create')) {
    const offcanvasEl = document.getElementById('createServiceOffcanvas');
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
