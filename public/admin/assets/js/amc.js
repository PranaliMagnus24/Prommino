  // open offcanvas when + clicked
    document.getElementById('openAddAmcBtn').addEventListener('click', function() {
        var offcanvasEl = document.getElementById('addAmcOffcanvas');
        var bsOff = new bootstrap.Offcanvas(offcanvasEl);
        bsOff.show();
        // generate schedules when opening
        generateSchedules();
    });

    // VIEW AMC details
    $(document).on('click', '.view-amc', async function() {
        var id = $(this).data('id');
        try {
            const res = await $.ajax({
                url: amcEditUrl.replace(':id', id),
                type: 'GET'
            });
            if (res.success) {
                var a = res.data;
                // Collect variation IDs that need details
                let variationPromises = [];
                let variationMap = {};
                a.products.forEach(p => {
                    if (p.variations && p.variations.length) {
                        p.variations.forEach(v => {
                            if (!v.productVariation && v.product_variation_id) {
                                variationPromises.push(
                                    $.get('/admin/variations/' + v.product_variation_id + '/edit').then(res => {
                                        if (res.success) {
                                            variationMap[v.product_variation_id] = res.data;
                                        }
                                    }).catch(() => {
                                        // Ignore errors
                                    })
                                );
                            }
                        });
                    }
                });
                // Wait for all fetches
                await Promise.all(variationPromises);
                var content = `
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold">AMC Code:</label>
                            <p>${a.amc_code || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Customer:</label>
                            <p>${a.customer ? a.customer.name : '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Contact Person:</label>
                            <p>${a.contact_person || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Contact Person Number:</label>
                            <p>${a.contact_person_number || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">AMC Date:</label>
                            <p>${a.amc_date ? new Date(a.amc_date).toLocaleDateString() : '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Status:</label>
                            <p><span class="badge bg-${a.status === 'open' ? 'success' : a.status === 'progress' ? 'warning' : 'secondary'}">${a.status || '-'}</span></p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Assigned To:</label>
                            <p>${a.assignee ? a.assignee.name : '-'}</p>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold">AMC Details:</label>
                            <p>${a.amc_details || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">Interval Months:</label>
                            <p>${a.interval_months || '-'}</p>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold">No. of Services:</label>
                            <p>${a.no_of_services || '-'}</p>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold">Products:</label>
                            <div class="border rounded p-2">
                                ${a.products && a.products.length ? a.products.map(p => {
                                    let variations = '';
                                    if (p.variations && p.variations.length) {
                                        variations = '<br><small><strong>Variations:</strong> ' + p.variations.map(v => {
                                            let varData = v.productVariation || variationMap[v.product_variation_id];
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
                                    <div class="mb-2">
                                        <strong>${p.product ? p.product.item_name : 'N/A'}</strong> - ₹${p.product ? p.product.price : 'N/A'}
                                        ${variations}
                                    </div>
                                    `;
                                }).join('') : '<p>No products</p>'}
                            </div>
                        </div>
                        <div class="col-12">
                            <label class="form-label fw-bold">Service Schedules:</label>
                            <div class="border rounded p-2">
                                ${a.schedules && a.schedules.length ? a.schedules.map(s => `
                                    <div class="mb-2 d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>Service ${s.service_no}</strong> - ${s.scheduled_date ? new Date(s.scheduled_date).toLocaleDateString() : 'N/A'}<br>
                                            <small>${s.description || 'No description'}</small>
                                        </div>
                                        <button type="button" class="btn btn-sm btn-outline-primary reschedule-schedule" data-id="${s.id}" data-date="${s.scheduled_date ? s.scheduled_date.split('T')[0] : ''}" data-description="${s.description || ''}">
                                            <i class="bi bi-calendar-event"></i> Reschedule
                                        </button>
                                    </div>
                                `).join('') : '<p>No schedules</p>'}
                            </div>
                        </div>
                        ${a.attachment_path ? `
                        <div class="col-12">
                            <label class="form-label fw-bold">Attachment:</label>
                            <p><a href="${a.attachment_url}" target="_blank" class="btn btn-sm btn-outline-primary">View Attachment</a></p>
                        </div>
                        ` : ''}
                    </div>
                `;
                $('#viewAmcContent').html(content);
                var offcanvasEl = document.getElementById('viewAmcOffcanvas');
                var bsOff = new bootstrap.Offcanvas(offcanvasEl);
                bsOff.show();
            } else {
                showAlert('Error!', res.message || 'Failed to load AMC.', 'error');
            }
        } catch (error) {
            showAlert('Error!', 'Failed to load AMC.', 'error');
        }
    });

    // helper: add months safely (handles month overflow)
    function addMonths(dateStr, months) {
        const d = new Date(dateStr);
        const day = d.getDate();
        d.setMonth(d.getMonth() + months);

        // adjust for overflow (e.g., Jan 31 + 1 month)
        if (d.getDate() < day) {
            d.setDate(0); // last day of previous month
        }
        return d;
    }

    function formatDateInput(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth()+1).padStart(2,'0');
        const dd = String(date.getDate()).padStart(2,'0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function generateSchedules() {
    const container = $('#schedulesContainer');
    container.empty();

    let startDate = $('#amc_date').val();
    if (!startDate) {
        const today = new Date();
        startDate = formatDateInput(today);
        $('#amc_date').val(startDate);
    }

    const interval = parseInt($('#interval_months').val() || 3, 10);
    const noOf = parseInt($('#no_of_services').val() || 1, 10);

    for (let i = 1; i <= noOf; i++) {
        let dateObj;
        if (i === 1) {
            dateObj = new Date(startDate);
        } else {
            dateObj = addMonths(startDate, (i-1) * interval);
        }

        const scheduled = formatDateInput(dateObj);

        const html = `
            <div class="row mb-2 schedule-row" data-service="${i}">
                <div class="col-md-5">
                    <label class="form-label">Service ${i}</label>
                    <input type="date" name="schedules[${i}][scheduled_date]" class="form-control schedule-date" value="${scheduled}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Description</label>
                    <input type="text" name="schedules[${i}][description]" class="form-control schedule-desc" placeholder="Description ${i}">
                </div>
                <div class="col-md-1 text-end">
                    <label class="form-label">&nbsp;</label>
                    <button type="button" class="btn btn-danger btn-sm remove-schedule">&minus;</button>
                </div>
            </div>
        `;
        container.append(html);
    }
}

  // Update the change event to regenerate schedules
$('#interval_months, #no_of_services, #amc_date').on('change', function() {
    generateSchedules();
});
    // PRODUCTS: add / remove simple rows (product_id + note + variations)
    let prodIdx = 1; // initial row index 0 present
    $('#addProductBtn').on('click', function() {
        const idx = prodIdx++;
        const options = productsData.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        const row = $(`
            <div class="row mb-2 product-row" data-index="${idx}">
                <div class="col-md-6">
                    <select name="items[${idx}][product_id]" class="form-select product-select">
                        <option value="">-- Select Product --</option>
                        ${options}
                    </select>
                    <div class="selected-variation mt-1" style="display: none;"></div>
                </div>
                <div class="col-md-5">
                    <input type="text" name="items[${idx}][note]" class="form-control" placeholder="Note">
                </div>
                <div class="col-md-1 text-end">
                    <button type="button" class="btn btn-danger btn-sm remove-product-row">&minus;</button>
                </div>
                <input type="hidden" name="items[${idx}][variations]" value="">
            </div>
        `);
        $('#productsContainer').append(row);
    });

    // remove product row
    $(document).on('click', '.remove-product-row', function() {
        const rows = $('#productsContainer .product-row');
        if (rows.length > 1) {
            $(this).closest('.product-row').remove();
        } else {
            // reset last row instead of removing
            const r = $(this).closest('.product-row');
            r.find('.product-select').val('');
            r.find('input[type="text"]').val('');
            r.find('input[name*="[variations]"]').val('');
            r.find('input[name*="[variations][]"]').remove();
            r.find('.selected-variation').hide().html('');
        }
    });

    // select variations when product is selected
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

    // before submit: renumber schedules (optional)
    $('#amcCreateForm').on('submit', function() {
        // renumber schedule input names to continuous indexes (1..n)
        $('#schedulesContainer .schedule-row').each(function(i){
            const idx = i+1;
            $(this).find('.schedule-date').attr('name', `schedules[${idx}][scheduled_date]`);
            $(this).find('.schedule-desc').attr('name', `schedules[${idx}][description]`);
        });

        // ensure product input names are continuous
        $('#productsContainer .product-row').each(function(i){
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

        return true;
    });

    // init: set default date, generate schedules when page ready
    $(document).ready(function() {
        if (!$('#amc_date').val()) {
            const today = new Date();
            $('#amc_date').val(formatDateInput(today));
        }
        // do not open offcanvas automatically; schedules will generate when user clicks +
    });


    $(function() {
    // routes (blade should set these JS variables or we compute)


    // detect datatable if present
    var amcTable = null;
    if ($('.amcList').length && $.fn.DataTable.isDataTable('.amcList')) {
        amcTable = $('.amcList').DataTable();
    }

    // helper to clear frontend validation UI (similar to brands example)
    function clearFormErrors(selector) {
        $(selector + " .is-invalid").removeClass("is-invalid");
        $(selector + " .invalid-feedback").text("");
    }

    // CREATE AMC via AJAX
    $('#amcCreateForm').on('submit', function(e) {
        e.preventDefault();
        clearFormErrors('#amcCreateForm');

        var fd = new FormData(this);
        var submitBtn = $('#saveAmcBtn');

        $.ajax({
            url: storeAmcUrl,
            type: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            beforeSend: function() {
                submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Saving...');
            },
            success: function(response) {
                if (response.success) {
                    // reset form
                    $('#amcCreateForm')[0].reset();
                    // close offcanvas
                    var offcanvasEl = document.getElementById('addAmcOffcanvas');
                    var bsOff = bootstrap.Offcanvas.getInstance(offcanvasEl);
                    if (bsOff) bsOff.hide();

                    // show success like brands
                    showAlert('Success!', response.message || 'AMC created successfully.', 'success');

                    // reload datatable or page fallback
                    if (amcTable && typeof amcTable.ajax === 'function') {
                        amcTable.ajax.reload(null, false);
                    } else {
                        location.reload();
                    }
                } else {
                    showAlert('Error!', response.message || 'Failed to create AMC.', 'error');
                }
            },
            error: function(xhr) {
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    const errors = xhr.responseJSON.errors;
                    $.each(errors, function(key, value) {
                        // try to find field by id or name
                        var field = $('[name="' + key + '"]');
                        if (field.length) {
                            field.addClass('is-invalid');
                            // find or create error container with id like key + 'Error' or use sibling .invalid-feedback
                            var idSafe = key.replace(/\./g,'_') + 'Error';
                            if ($('#' + idSafe).length) {
                                $('#' + idSafe).text(value[0]);
                            } else {
                                field.next('.invalid-feedback').text(value[0]);
                            }
                        }
                    });
                } else {
                    showAlert('Error!', 'Failed to create AMC.', 'error');
                }
            },
            complete: function() {
                submitBtn.prop('disabled', false).html('Save AMC');
            }
        });
    });

    // OPEN edit offcanvas and populate form
    $(document).on('click', '.edit-amc', function() {
        var id = $(this).data('id');
        clearFormErrors('#amcCreateForm');

        $.ajax({
            url: amcEditUrl.replace(':id', id),
            type: 'GET',
            success: function(res) {
                if (res.success) {
                    var a = res.data;

                    // open offcanvas
                    var offcanvasEl = document.getElementById('addAmcOffcanvas');
                    var bsOff = new bootstrap.Offcanvas(offcanvasEl);
                    bsOff.show();

                    // populate fields. Be careful: field names match your form
                    $('#amcCreateForm').attr('data-edit-id', a.id); // mark form as editing
                    $('[name="customer_id"]').val(a.customer_id).change();
                    $('[name="contact_person"]').val(a.contact_person || '');
                    $('[name="contact_person_number"]').val(a.contact_person_number || '');
                    $('[name="amc_date"]').val(a.amc_date ? a.amc_date.split('T')[0] : '');
                    $('[name="status"]').val(a.status || 'open');
                    $('[name="assigned_to"]').val(a.assigned_to || '');
                    $('[name="amc_details"]').val(a.amc_details || '');
                    $('[name="interval_months"]').val(a.interval_months || 1);
                    $('[name="no_of_services"]').val(a.no_of_services || 1);

                    // attachment preview / link (optional)
                    if (a.attachment_url) {
                        // put a link under attachment input
                        if ($('#attachmentPreview').length === 0) {
                            $('[name="attachment"]').after('<div id="attachmentPreview" class="mt-2"></div>');
                        }
                        $('#attachmentPreview').html(`<a href="${a.attachment_url}" target="_blank">Current attachment</a>`);
                    } else {
                        $('#attachmentPreview').remove();
                    }

                    // populate products: clear and create rows
                    $('#productsContainer').empty();
                    if (a.products && a.products.length) {
                        a.products.forEach(function(p, idx) {
                            const selectedVariations = p.variations ? p.variations.map(v => v.product_variation_id) : [];
                            const row = $(`
                                <div class="row mb-2 product-row" data-index="${idx}">
                                    <div class="col-md-6">
                                        <select name="items[${idx}][product_id]" class="form-select product-select">
                                            <option value="">-- Select Product --</option>
                                        </select>
                                        <div class="selected-variation mt-1" style="display: none;"></div>
                                    </div>
                                    <div class="col-md-5">
                                        <input type="text" name="items[${idx}][note]" class="form-control" placeholder="Note" value="${p.note || ''}">
                                    </div>
                                    <div class="col-md-1 text-end">
                                        <button type="button" class="btn btn-danger btn-sm remove-product-row">&minus;</button>
                                    </div>
                                </div>
                            `);
                            // Add variation inputs
                            selectedVariations.forEach(variationId => {
                                row.append(`<input type="hidden" name="items[${idx}][variations][]" value="${variationId}">`);
                            });
                            $('#productsContainer').append(row);
                        });
                    } else {
                        // keep a blank row
                        $('#addProductBtn').trigger('click');
                    }

                    // fill product selects (for each select in container)
                    $('#productsContainer .product-select').each(function() {
                        var sel = $(this);
                        sel.empty().append('<option value="">-- Select Product --</option>');
                        productsData.forEach(function(p) {
                            sel.append(`<option value="${p.id}">${p.name}</option>`);
                        });
                    });

                    // set selected product ids if any
                    if (a.products && a.products.length) {
                        $('#productsContainer .product-row').each(function(i) {
                            var prod = a.products[i];
                            if (prod) $(this).find('.product-select').val(prod.product_id);
                        });
                    }

                    // Show selected variations
                    if (a.products && a.products.length) {
                        $('#productsContainer .product-row').each(function(i) {
                            var prod = a.products[i];
                            if (prod && prod.variations && prod.variations.length > 0) {
                                const variationDetails = prod.variations.map(v => {
                                    // Find variation details from productsData
                                    const product = productsData.find(p => p.id == prod.product_id);
                                    if (product) {
                                        const variation = product.variations.find(vr => vr.id == v.product_variation_id);
                                        if (variation) {
                                            const attrs = [];
                                            if (variation.size) attrs.push('Size: ' + variation.size);
                                            if (variation.color) attrs.push('Color: ' + variation.color);
                                            if (variation.material) attrs.push('Material: ' + variation.material);
                                            return attrs.join(', ') + ' (₹' + variation.price + ')';
                                        }
                                    }
                                    return 'Variation ID: ' + v.product_variation_id;
                                }).join('; ');
                                $(this).find('.selected-variation').html(`<small class="text-muted">${variationDetails}</small>`).show();
                            }
                        });
                    }

                    // populate schedules
                    $('#schedulesContainer').empty();
                    if (a.schedules && a.schedules.length) {
                        a.schedules.forEach(function(s, idx) {
                            var scheduled_val = s.scheduled_date ? s.scheduled_date.split('T')[0] : '';
                            const html = `
                                <div class="row mb-2 schedule-row" data-service="${idx+1}">
                                    <div class="col-md-5">
                                        <label class="form-label">Service ${idx+1}</label>
                                        <input type="date" name="schedules[${idx+1}][scheduled_date]" class="form-control schedule-date" value="${scheduled_val}">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">&nbsp;</label>
                                        <input type="text" name="schedules[${idx+1}][description]" class="form-control schedule-desc" placeholder="Description ${idx+1}" value="${s.description || ''}">
                                    </div>
                                    <div class="col-md-1 text-end">
                                        <label class="form-label">&nbsp;</label>
                                        <button type="button" class="btn btn-danger btn-sm remove-schedule">&minus;</button>
                                    </div>
                                </div>
                            `;
                            $('#schedulesContainer').append(html);
                        });
                    } else {
                        generateSchedules(); // fallback
                    }
                } else {
                    showAlert('Error!', res.message || 'Failed to load AMC.', 'error');
                }
            },
            error: function() {
                showAlert('Error!', 'Failed to load AMC.', 'error');
            }
        });
    });

    // UPDATE AMC (submit form when editing)
    $('#saveAmcBtn').on('click', function(e) {
        // if form is in edit mode (has data-edit-id) we perform update
        var editId = $('#amcCreateForm').attr('data-edit-id');
        if (!editId) return; // not edit, normal submit will handle create

        e.preventDefault();
        clearFormErrors('#amcCreateForm');

        var form = $('#amcCreateForm')[0];
        var fd = new FormData(form);
        // append _method=PUT for Laravel to accept
        fd.append('_method','PUT');

        var updateBtn = $('#saveAmcBtn');
        var updateUrl = amcUpdateUrl.replace(':id', editId);

        $.ajax({
            url: updateUrl,
            type: 'POST', // method override via _method=PUT
            data: fd,
            processData: false,
            contentType: false,
            beforeSend: function() {
                updateBtn.prop('disabled', true).text('Updating...');
            },
            success: function(res) {
                if (res.success) {
                    // hide offcanvas
                    var offcanvasEl = document.getElementById('addAmcOffcanvas');
                    var bsOff = bootstrap.Offcanvas.getInstance(offcanvasEl);
                    if (bsOff) bsOff.hide();

                    $('#amcCreateForm')[0].reset();
                    $('#amcCreateForm').removeAttr('data-edit-id');
                    $('#attachmentPreview').remove();

                    showAlert('Success!', res.message || 'AMC updated successfully.', 'success');

                    if (amcTable && typeof amcTable.ajax === 'function') {
                        amcTable.ajax.reload(null, false);
                    } else {
                        location.reload();
                    }
                } else {
                    showAlert('Error!', res.message || 'Failed to update AMC.', 'error');
                }
            },
            error: function(xhr) {
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    const errors = xhr.responseJSON.errors;
                    $.each(errors, function(key, value) {
                        var field = $('[name="' + key + '"]');
                        if (field.length) {
                            field.addClass('is-invalid');
                            var idSafe = key.replace(/\./g,'_') + 'Error';
                            if ($('#' + idSafe).length) {
                                $('#' + idSafe).text(value[0]);
                            } else {
                                field.next('.invalid-feedback').text(value[0]);
                            }
                        }
                    });
                } else {
                    showAlert('Error!', 'Failed to update AMC.', 'error');
                }
            },
            complete: function() {
                updateBtn.prop('disabled', false).text('Save AMC');
            }
        });
    });

    // DELETE AMC
    $(document).on('click', '.delete-amc', function() {
        var id = $(this).data('id');
        var name = $(this).data('name') || 'this record';

        Swal.fire({
            title:'Are you sure?',
            text:`Delete ${name}?`,
            icon:'warning',
            showCancelButton:true,
        }).then(function(res) {
            if (res.isConfirmed) {
                $.ajax({
                    url: amcDeleteUrl.replace(':id', id),
                    type: 'DELETE',
                    data: { _token: $('meta[name="csrf-token"]').attr('content') },
                    success: function(r) {
                        if (r.success) {
                            showAlert('Success!', r.message || 'AMC deleted successfully.', 'success');
                            if (amcTable && typeof amcTable.ajax === 'function') {
                                amcTable.ajax.reload(null, false);
                            } else {
                                location.reload();
                            }
                        } else {
                            showAlert('Error!', r.message || 'Failed to delete AMC.', 'error');
                        }
                    },
                    error: function(xhr) {
                        showAlert('Error!', 'Failed to delete AMC.', 'error');
                    }
                });
            }
        });
    });

    // When offcanvas closes (either after create or cancel), reset form and edit marker
    $('#addAmcOffcanvas').on('hidden.bs.offcanvas', function() {
        $('#amcCreateForm')[0].reset();
        $('#amcCreateForm').removeAttr('data-edit-id');
        clearFormErrors('#amcCreateForm');
        $('#attachmentPreview').remove();
        // regenerate initial one product row & schedules
        $('#productsContainer').empty();
        $('#productsContainer').append(`<div class="row mb-2 product-row" data-index="0">
              <div class="col-md-6">
                <select name="items[0][product_id]" class="form-select product-select">
                  <option value="">-- Select Product --</option>
                </select>
                <div class="selected-variation mt-1" style="display: none;"></div>
              </div>
              <div class="col-md-5">
                <input type="text" name="items[0][note]" class="form-control" placeholder="Note">
              </div>
              <div class="col-md-1 text-end">
                <button type="button" class="btn btn-danger btn-sm remove-product-row">&minus;</button>
              </div>
              <input type="hidden" name="items[0][variations]" value="">
            </div>`);
        // fill product select options
        $('#productsContainer .product-select').each(function(){
            var sel = $(this);
            sel.empty().append('<option value="">-- Select Product --</option>');
            productsData.forEach(function(p){ sel.append(`<option value="${p.id}">${p.name}</option>`); });
        });

        // regenerate schedules
        generateSchedules();
    });

    $('#addAmcOffcanvas .select2').select2({
            dropdownParent: $('#addAmcOffcanvas'),
            allowClear: true
        });
    // ensure initial productsData options in create
    $('#productsContainer .product-select').each(function(){
        var sel = $(this);
        sel.empty().append('<option value="">-- Select Product --</option>');
        productsData.forEach(function(p){ sel.append(`<option value="${p.id}">${p.name}</option>`); });
    });

});

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




$(function() {
    var amcTable = null;
    var searchDebounceTimer = null;
    if ($('.amcList').length) {
        // destroy existing table if accidentally initialized earlier
        if ($.fn.DataTable.isDataTable('.amcList')) {
            $('.amcList').DataTable().clear().destroy();
        }

        amcTable = $('.amcList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: {
                url: amcListUrl,
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
                            amcTable.search('').draw();
                        }
                    }
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                    action: function(e, dt, node, config) {
                        window.location.href = amcExportUrl;
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
                            showAlert('No selection', 'Please select at least one AMC to delete', 'warning');
                            return;
                        }
                        Swal.fire({
                            title: 'Confirm delete',
                            text: 'Delete ' + ids.length + ' selected AMC(s)?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete',
                            cancelButtonText: 'Cancel'
                        }).then(function(result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: amcBulkDeleteUrl,
                                    method: 'POST',
                                    data: {
                                        _token: $('meta[name="csrf-token"]').attr('content'),
                                        ids: ids
                                    },
                                    success: function(res) {
                                        if (res.success) {
                                            showAlert('Deleted', res.message || 'AMCs deleted', 'success');
                                            amcTable.ajax.reload(null, false);
                                        } else {
                                            showAlert('Error', res.message || 'Failed to delete', 'error');
                                        }
                                    },
                                    error: function() {
                                        showAlert('Error', 'Failed to delete AMCs', 'error');
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
                { data: 'assigned_to', name: 'assigned_to' },
                { data: 'products', name: 'products' },
                { data: 'amc_date', name: 'amc_date' },
                { data: 'status', name: 'status' },
                { data: 'employee_status', name: 'employee_status', orderable: false, searchable: false },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ],
            order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function(settings) {
                // uncheck master when table redraw
                $('#selectAllAmcs').prop('checked', false);

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

        // keep instance accessible immediately too
        window.amcTable = amcTable;
    }

    /* ---------------- Custom Search input handling ---------------- */
    // Show/hide clear icon based on input
    $(document).on('input', '#customSearchInput', function () {
      var val = $(this).val();
      $('#customSearchClear').css('visibility', val ? 'visible' : 'hidden');

      // Debounced DataTable search
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        if (window.amcTable) window.amcTable.search(val).draw();
      }, 300);
    });

    // Clear search
    $(document).on('click', '#customSearchClear', function () {
      $('#customSearchInput').val('');
      $('#customSearchClear').css('visibility', 'hidden');
      if (window.amcTable) window.amcTable.search('').draw();
      $('#customSearchInput').focus();
    });
});

// ---------------- Select All / Row checkbox handling ----------------
$(document).on('change', '#selectAllAmcs', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllAmcs').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var amcColumnMap = {
    1: 'customer',
    2: 'assigned_to',
    3: 'products',
    4: 'amc_date',
    5: 'status',
    6: 'employee_status'
};

$('#filter_column').on('change', function() {
    var colIndex = $(this).val();
    $('#filter_value').html('<option value="">Loading...</option>');
    if (!colIndex) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }
    var colKey = amcColumnMap[colIndex];
    if (!colKey) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Fetch distinct values from server
    $.get(amcDistinctValuesUrl, { column: colKey }, function(res) {
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
    if (!window.amcTable) return;

    if (!value) {
        // clear search for that column
        window.amcTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        window.amcTable.column(dtColIndex).search(escaped, false, false).draw();
    }
});
// Reschedule functionality
$(document).on('click', '.reschedule-schedule', function() {
    const scheduleId = $(this).data('id');
    const currentDate = $(this).data('date');
    const description = $(this).data('description');

    $('#reschedule_schedule_id').val(scheduleId);
    $('#reschedule_date').val(currentDate);
    $('#reschedule_description').val(description);

    $('#rescheduleModal').modal('show');
});

$('#saveRescheduleBtn').on('click', function() {
    const scheduleId = $('#reschedule_schedule_id').val();
    const newDate = $('#reschedule_date').val();
    const description = $('#reschedule_description').val();

    if (!newDate) {
        showAlert('Error!', 'Please select a new date.', 'error');
        return;
    }

    $('#saveRescheduleBtn').prop('disabled', true).text('Rescheduling...');

    $.ajax({
        url: '/admin/amc/' + scheduleId + '/reschedule',
        type: 'POST',
        data: {
            scheduled_date: newDate,
            description: description,
            _token: $('meta[name="csrf-token"]').attr('content')
        },
        success: function(res) {
            if (res.success) {
                $('#rescheduleModal').modal('hide');
                showAlert('Success!', res.message || 'Schedule rescheduled successfully.', 'success');

                // Refresh the view AMC offcanvas if open
                const viewOffcanvas = document.getElementById('viewAmcOffcanvas');
                if (viewOffcanvas && viewOffcanvas.classList.contains('show')) {
                    // Find the view button and trigger it again
                    $('.view-amc[data-id="' + res.data.amc.id + '"]').trigger('click');
                }
            } else {
                showAlert('Error!', res.message || 'Failed to reschedule.', 'error');
            }
        },
        error: function(xhr) {
            if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                const errors = Object.values(xhr.responseJSON.errors).flat();
                showAlert('Validation Error!', errors.join('<br>'), 'error');
            } else {
                showAlert('Error!', 'Failed to reschedule schedule.', 'error');
            }
        },
        complete: function() {
            $('#saveRescheduleBtn').prop('disabled', false).text('Reschedule');
        }
    });
});

// Check URL for ?open=create to show offcanvas
if (window.location.search.includes('open=create')) {
    const offcanvasEl = document.getElementById('addAmcOffcanvas');
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
