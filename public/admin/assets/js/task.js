$(function () {
    // ---------- helper: toast alert like Permission JS ----------
    // Make sure Swal is loaded
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
            // fallback
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

    // ---------- DataTable init ----------
    var taskTable = null;
    var searchDebounceTimer = null;
    if ($(".TaskList").length) {
        if ($.fn.DataTable.isDataTable(".TaskList")) {
            $(".TaskList").DataTable().clear().destroy();
        }
        taskTable = $(".TaskList").DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            ajax: { url: taskListUrl, type: "GET" },
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
                            taskTable.search('').draw();
                        }
                    }
                },
                {
                    text: '<i class="bi bi-download me-1"></i>',
                    attr: { 'data-bs-toggle': 'tooltip', 'title': 'Download CSV' },
                    action: function(e, dt, node, config) {
                        window.location.href = taskExportUrl;
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
                            showAlert('No selection', 'Please select at least one task to delete', 'warning');
                            return;
                        }
                        Swal.fire({
                            title: 'Confirm delete',
                            text: 'Delete ' + ids.length + ' selected task(es)?',
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Yes, delete',
                            cancelButtonText: 'Cancel'
                        }).then(function(result) {
                            if (result.isConfirmed) {
                                $.ajax({
                                    url: taskBulkDeleteUrl,
                                    method: 'POST',
                                    data: {
                                        _token: $('meta[name="csrf-token"]').attr('content'),
                                        ids: ids
                                    },
                                    success: function(res) {
                                        if (res.success) {
                                            showAlert('Deleted', res.message || 'Tasks deleted', 'success');
                                            taskTable.ajax.reload(null, false);
                                        } else {
                                            showAlert('Error', res.message || 'Failed to delete', 'error');
                                        }
                                    },
                                    error: function() {
                                        showAlert('Error', 'Failed to delete tasks', 'error');
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
                { data: "assign_to", name: "assign_to" },
                { data: "assign_date", name: "assign_date" },
                { data: "task_type", name: "task_type" },
                { data: "status", name: "status" },
                { data: "action", name: "action", orderable: false, searchable: false }
            ],
            order: [[1, 'desc']], // index 1 is the Id (DT_RowIndex) because 0 is checkbox
            drawCallback: function(settings) {
                // uncheck master when table redraw
                $('#selectAllTasks').prop('checked', false);

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

        window.taskTable = taskTable;
    }

// ---------------- Select All / Row checkbox handling ----------------
$(document).on('change', '#selectAllTasks', function() {
    var checked = $(this).prop('checked');
    $('.row-checkbox').prop('checked', checked);
});

$(document).on('change', '.row-checkbox', function() {
    var total = $('.row-checkbox').length;
    var checked = $('.row-checkbox:checked').length;
    $('#selectAllTasks').prop('checked', total === checked);
});

// ---------------- Column Filter modal logic ----------------
// Map UI column selection value to DB key used in distinct API
var taskColumnMap = {
    1: 'customer',
    2: 'assign_to',
    3: 'assign_date',
    4: 'task_type',
    5: 'status'
};

$('#filter_column').on('change', function() {
    var colIndex = $(this).val();
    $('#filter_value').html('<option value="">Loading...</option>');
    if (!colIndex) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }
    var colKey = taskColumnMap[colIndex];
    if (!colKey) {
        $('#filter_value').html('<option value="">-- Select Value --</option>');
        return;
    }

    // Fetch distinct values from server
    $.get(taskDistinctValuesUrl, { column: colKey }, function(res) {
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

    // colIndex from modal: 1=customer, 2=assign_to, etc.
    // DataTables columns: 0=checkbox, 1=DT_RowIndex, 2=customer, 3=assign_to, etc.
    var dtColIndex = parseInt(colIndex, 10) + 1; // add 1 to account for checkbox and index columns
    if (!taskTable) return;

    if (!value) {
        // clear search for that column
        taskTable.column(dtColIndex).search('').draw();
    } else {
        // escape regex characters
        var escaped = $.fn.dataTable.util.escapeRegex(value);
        taskTable.column(dtColIndex).search('^' + escaped + '$', true, false).draw();
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
    if (taskTable) taskTable.search(val).draw();
  }, 300);
});

// Clear search
$(document).on('click', '#customSearchClear', function () {
  $('#customSearchInput').val('');
  $('#customSearchClear').css('visibility', 'hidden');
  if (taskTable) taskTable.search('').draw();
  $('#customSearchInput').focus();
});

    // ---------- CREATE submit ----------
    $("#createTaskForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#createTaskForm");

        let fd = new FormData(this);
        $("#createTaskBtn").prop("disabled", true).html('<i class="fas fa-spinner fa-spin me-2"></i>Saving...');

        $.ajax({
            url: taskStoreUrl,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    $("#createTaskForm")[0].reset();
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById("createTaskOffcanvas"));
                    if (off) off.hide();

                    // show toast (permission-style)
                    showAlert("Success!", res.message || "Task created", "success");

                    if (window.taskTable) window.taskTable.ajax.reload(null, false);
                } else {
                    showAlert("Error!", res && res.message ? res.message : "Failed to create", "error");
                }
            },
            error: function (xhr) {
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, "#createTaskForm");
                } else {
                    showAlert("Error!", "Failed to create task", "error");
                }
            },
            complete: function () {
                $("#createTaskBtn").prop("disabled", false).html('Save Task');
            }
        });
    });

    // ---------- OPEN Create Offcanvas ----------
    $("#openCreateTaskBtn").on("click", function () {
        $("#createTaskForm")[0].reset();
        var off = new bootstrap.Offcanvas(document.getElementById("createTaskOffcanvas"));
        off.show();
    });

    // ---------- VIEW ----------
    $(document).on("click", ".view-task", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        const url = taskEditUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res && res.success) {
                const task = res.data;
                let content = `<div class="row g-3">`;
                content += `<div class="col-12"><label class="form-label fw-bold">Customer</label><p>${task.customer ? task.customer.name : "-"}</p></div>`;
                content += `<div class="col-12"><label class="form-label fw-bold">Assign To</label><p>${task.assignee ? task.assignee.name : "-"}</p></div>`;
                content += `<div class="col-12"><label class="form-label fw-bold">Assign Date</label><p>${task.assign_date ? new Date(task.assign_date).toLocaleDateString() : "-"}</p></div>`;
                content += `<div class="col-12"><label class="form-label fw-bold">Task Type</label><p>${task.type ? task.type.name : "-"}</p></div>`;
                content += `<div class="col-12"><label class="form-label fw-bold">Task Description</label><p>${task.task_desc || "-"}</p></div>`;
                if (task.attachments && task.attachments.length > 0) {
                    content += `<div class="col-12"><label class="form-label fw-bold">Attachments</label><div class="d-flex flex-wrap gap-2">`;
                    task.attachments.forEach(function(attachment) {
                        content += `<a href="/upload/${attachment.file_path}" target="_blank" class="btn btn-sm btn-outline-primary">${attachment.original_name}</a>`;
                    });
                    content += `</div></div>`;
                } else {
                    content += `<div class="col-12"><label class="form-label fw-bold">Attachments</label><p class="text-muted">No attachments</p></div>`;
                }
                if (task.employee_photo) {
                    content += `<div class="col-12"><label class="form-label fw-bold">Selfie Photo</label><div class="mt-2"><img src="/upload/${task.employee_photo}" alt="Selfie Photo" class="img-fluid rounded" style="max-width:300px;"></div></div>`;
                } else {
                    content += `<div class="col-12"><label class="form-label fw-bold">Selfie Photo</label><p class="text-muted">No photo</p></div>`;
                }
                content += `<div class="col-12"><label class="form-label fw-bold">Status</label><p>${task.status ? task.status : "-"}</p></div>`;
                content += `</div>`;

                $("#viewTaskContent").html(content);
                var off = new bootstrap.Offcanvas(document.getElementById("viewTaskOffcanvas"));
                off.show();
            } else {
                showAlert("Error!", res && res.message ? res.message : "Failed to load", "error");
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch task", "error");
        });
    });

    // ---------- Edit ----------
    $(document).on("click", ".edit-task", function (e) {
        e.preventDefault();
        clearFormErrors("#editTaskForm");
        const id = $(this).data("id");
        const url = taskEditUrlTemplate.replace(":id", id);

        $.get(url, function (res) {
            if (res && res.success) {
                const task = res.data;
                $("#edit_task_id").val(task.id);
                $("#edit_customer_id").val(task.customer_id || "");
                $("#edit_task_assign_to").val(task.assign_to || "");
                $("#edit_task_assign_date").val(task.assign_date ? task.assign_date.split("T")[0] : "");
                $("#edit_task_type_id").val(task.task_type_id || "");
                $("#edit_task_desc").val(task.task_desc || "");
                $("#edit_task_status").val(task.status || "");

                if (task.attachments && task.attachments.length > 0) {
                    let attachmentsHtml = '<div class="d-flex flex-wrap gap-2">';
                    task.attachments.forEach(function(attachment) {
                        attachmentsHtml += `<a href="/upload/${attachment.file_path}" target="_blank" class="btn btn-sm btn-outline-info">${attachment.original_name}</a>`;
                    });
                    attachmentsHtml += '</div>';
                    $("#current_attachments").html(attachmentsHtml);
                } else {
                    $("#current_attachments").html('<small class="text-muted">No attachments</small>');
                }

                if (task.employee_photo) {
                    $("#editCurrentPhoto").html(`<div class="position-relative d-inline-block"><img src="/upload/${task.employee_photo}" alt="Current Photo" class="img-fluid rounded" style="max-width:200px;"><button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0" id="deleteCurrentPhoto" style="width:20px; height:20px; padding:0; line-height:1;">×</button></div>`);
                } else {
                    $("#editCurrentPhoto").html('<small class="text-muted">No photo</small>');
                }
                // Add hidden input for delete flag
                if (!$('#delete_photo').length) {
                    $('#editTaskForm').append('<input type="hidden" name="delete_photo" id="delete_photo" value="0">');
                }

                var off = new bootstrap.Offcanvas(document.getElementById("editTaskOffcanvas"));
                off.show();
            } else {
                showAlert("Error!", res && res.message ? res.message : "Failed to load", "error");
            }
        }).fail(function () {
            showAlert("Error!", "Failed to fetch task", "error");
        });
    });

    // ---------- DELETE CURRENT PHOTO ----------
    $(document).on('click', '#deleteCurrentPhoto', function() {
        $('#delete_photo').val('1');
        $('#editCurrentPhoto').html('<small class="text-muted">Photo will be deleted on update</small>');
    });

    // ---------- EDIT submit ----------
    $("#editTaskForm").on("submit", function (e) {
        e.preventDefault();
        clearFormErrors("#editTaskForm");

        const id = $("#edit_task_id").val();
        if (!id) {
            showAlert("Error!", "Missing task id", "error");
            return;
        }
        const url = taskUpdateUrlTemplate.replace(":id", id);
        let fd = new FormData(this);
        fd.append("_method", "PUT");

        $("#editTaskBtn").prop("disabled", true).text("Updating...");
        $.ajax({
            url: url,
            type: "POST",
            data: fd,
            processData: false,
            contentType: false,
            success: function (res) {
                if (res && res.success) {
                    var off = bootstrap.Offcanvas.getInstance(document.getElementById("editTaskOffcanvas"));
                    if (off) off.hide();

                    showAlert("Success!", res.message || "Task updated", "success");
                    if (window.taskTable) window.taskTable.ajax.reload(null, false);

                    // Update current photo display
                    if (res.data && res.data.employee_photo) {
                        $("#editCurrentPhoto").html(`<div class="position-relative d-inline-block"><img src="/upload/${res.data.employee_photo}" alt="Current Photo" class="img-fluid rounded" style="max-width:200px;"><button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0" id="deleteCurrentPhoto" style="width:20px; height:20px; padding:0; line-height:1;">×</button></div>`);
                    } else {
                        $("#editCurrentPhoto").html('<small class="text-muted">No photo</small>');
                    }
                    $('#delete_photo').val('0');
                } else {
                    showAlert("Error!", res && res.message ? res.message : "Failed to update", "error");
                }
            },
            error: function (xhr) {
                if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.errors) {
                    handleValidationErrors(xhr.responseJSON.errors, "#editTaskForm");
                } else {
                    showAlert("Error!", "Failed to update task", "error");
                }
            },
            complete: function () {
                $("#editTaskBtn").prop("disabled", false).text("Update Task");
            }
        });
    });

    // ---------- DELETE ----------
    $(document).on("click", ".delete-task", function (e) {
        e.preventDefault();
        const id = $(this).data("id");
        const name = $(this).data("name") || `Task #${id}`;
        Swal.fire({
            title: "Are you sure?",
            text: `Delete ${name}?`,
            icon: "warning",
            showCancelButton: true,
        }).then(function (res) {
            if (res.isConfirmed) {
                $.ajax({
                    url: taskDeleteUrlTemplate.replace(":id", id),
                    type: "DELETE",
                    data: {
                        _token: $('meta[name="csrf-token"]').attr("content"),
                    },
                    success: function (resp) {
                        if (resp && resp.success) {
                            showAlert("Success!", resp.message || "Deleted", "success");
                            if (window.taskTable) window.taskTable.ajax.reload(null, false);
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

    // ---------- Download Task ----------
    $(document).on('click', '.download-task', function(){
        const taskId = $(this).data('id');
        const url = taskDownloadUrlTemplate.replace(':id', taskId);
        window.open(url, '_blank');
    });

    // ---------- CLEANUP when offcanvas/modal closed ----------
    $('#editTaskOffcanvas').on('hidden.bs.offcanvas', function () {
        $('#editTaskForm')[0].reset();
        clearFormErrors("#editTaskForm");
        $("#current_attachment").html('');
    });

   $('#createTaskOffcanvas').on('hidden.bs.offcanvas', function () {
    $('#createTaskForm')[0].reset();
    clearFormErrors("#createTaskForm");
    // Stop any ongoing camera stream
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
        window.currentStream = null;
    }
    // Reset photo capture
    $('#photoPreview').hide().empty();
    $('#captureStatus').text('Click to capture photo and GPS location');
});

$('#editTaskOffcanvas').on('hidden.bs.offcanvas', function () {
    $('#editTaskForm')[0].reset();
    clearFormErrors("#editTaskForm");
    $("#current_attachments").html('');
    // Stop any ongoing camera stream
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
        window.currentStream = null;
    }
    // Reset photo capture
    $('#editPhotoPreview').hide().empty();
    $('#editCaptureStatus').text('Click to capture photo and GPS location');
    $('#editCurrentPhoto').html('');
});

    // ---------- Employee Photo & GPS Capture for Create ----------
   $('#captureBtn').on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    capturePhotoAndGPS('employeePhotoInput', 'gpsLatitude', 'gpsLongitude', 'photoImg', 'photoPreview', 'captureStatus');
});

    // ---------- Employee Photo & GPS Capture for Edit ----------
    $('#editCaptureBtn').on('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    capturePhotoAndGPS('editEmployeePhotoInput', 'editGpsLatitude', 'editGpsLongitude', 'editPhotoImg', 'editPhotoPreview', 'editCaptureStatus');
});

    // Function to capture photo and GPS
    function capturePhotoAndGPS(fileInputId, latInputId, lngInputId, imgId, previewId, statusId) {
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
        window.currentStream = null;
    }

    $('#' + statusId).text('Requesting location access...');

    // Check if geolocation is supported
    if (!navigator.geolocation) {
        $('#' + statusId).text('Geolocation is not supported by this browser.');
        return;
    }

    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        $('#' + statusId).text('Camera is not supported by this browser.');
        return;
    }

    // Request location first
    navigator.geolocation.getCurrentPosition(function(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        $('#' + latInputId).val(lat);
        $('#' + lngInputId).val(lng);

        $('#' + statusId).text('Location obtained. Fetching detailed address...');

        // Reverse geocoding to get detailed address
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
            .then(response => response.json())
            .then(data => {
                let address = data.display_name || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
                proceedWithCamera(address);
            })
            .catch(err => {
                console.error('Reverse geocoding failed:', err);
                let address = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
                proceedWithCamera(address);
            });

        function proceedWithCamera(address) {
            $('#' + statusId).text('Address obtained. Requesting camera access...');

            // Check for HTTPS (required for camera on many browsers)
            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                $('#' + statusId).text('Camera requires HTTPS. Please use a secure connection.');
                return;
            }

            // Request camera with back camera preference for mobile
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' } // Prefer back camera
                }
            };

            navigator.mediaDevices.getUserMedia(constraints)
                .then(function(stream) {
                    window.currentStream = stream;
                    $('#' + statusId).text('Camera opened. Click "Capture" to take photo.');

                    // Create video element
                    const video = document.createElement('video');
                    video.srcObject = stream;
                    video.autoplay = true;
                    video.playsinline = true;

                    // Wait for video to be ready
                    video.onloadedmetadata = function() {
                        video.play();

                        // Create capture button container
                        const captureContainer = document.createElement('div');
                        captureContainer.className = 'd-flex flex-column align-items-center mt-3';

                        // Create capture button
                        const captureBtn = document.createElement('button');
                        captureBtn.type = 'button';
                        captureBtn.textContent = 'Capture Photo';
                        captureBtn.className = 'btn btn-success btn-sm mb-2';

                        // Create cancel button
                        const cancelBtn = document.createElement('button');
                        cancelBtn.type = 'button';
                        cancelBtn.textContent = 'Cancel';
                        cancelBtn.className = 'btn btn-danger btn-sm';

                        captureContainer.appendChild(captureBtn);
                        captureContainer.appendChild(cancelBtn);

                        // Show video and buttons
                        $('#' + previewId).empty().append(video).append(captureContainer).show();

                        captureBtn.onclick = function() {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(video, 0, 0);

                            // Overlay detailed address info on the photo
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                            ctx.fillRect(10, canvas.height - 100, canvas.width - 20, 90);

                            ctx.fillStyle = 'black';
                            ctx.font = '14px Arial';

                            // Wrap address text if too long
                            const maxWidth = canvas.width - 40;
                            const words = address.split(' ');
                            let lines = [];
                            let currentLine = '';
                            words.forEach(word => {
                                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                                const metrics = ctx.measureText(testLine);
                                if (metrics.width > maxWidth && currentLine) {
                                    lines.push(currentLine);
                                    currentLine = word;
                                } else {
                                    currentLine = testLine;
                                }
                            });
                            if (currentLine) lines.push(currentLine);

                            // Draw address lines
                            lines.forEach((line, index) => {
                                if (index < 3) { // Limit to 3 lines
                                    ctx.fillText(line, 20, canvas.height - 75 + index * 18);
                                }
                            });

                            // Draw date
                            ctx.fillText(`Date: ${new Date().toLocaleString()}`, 20, canvas.height - 15);

                            canvas.toBlob(function(blob) {
                                const dataUrl = canvas.toDataURL('image/jpeg');

                                // Stop stream
                                stream.getTracks().forEach(track => track.stop());
                                window.currentStream = null;

                                // Create confirm button
                                const confirmContainer = document.createElement('div');
                                confirmContainer.className = 'd-flex flex-column align-items-center mt-3';

                                const confirmBtn = document.createElement('button');
                                confirmBtn.textContent = 'Use This Photo';
                                confirmBtn.className = 'btn btn-primary btn-sm mb-2';
                                confirmBtn.type = 'button';

                                const retakeBtn = document.createElement('button');
                                retakeBtn.textContent = 'Retake Photo';
                                retakeBtn.className = 'btn btn-secondary btn-sm';
                                retakeBtn.type = 'button';

                                confirmContainer.appendChild(confirmBtn);
                                confirmContainer.appendChild(retakeBtn);

                                confirmBtn.onclick = function() {
                                    const file = new File([blob], 'captured_photo.jpg', { type: 'image/jpeg' });
                                    const dt = new DataTransfer();
                                    dt.items.add(file);
                                    $('#' + fileInputId)[0].files = dt.files;
                                    // Reset delete flag if in edit
                                    if ($('#delete_photo').length) {
                                        $('#delete_photo').val('0');
                                    }

                                    $('#' + previewId).html('<img id="' + imgId + '" src="' + dataUrl + '" alt="Captured Photo" style="max-width:200px; border: 2px solid green;" class="mt-2">');
                                    $('#' + statusId).text('Photo applied to form. Ready to save.');

                                    // Show success message
                                    showAlert("Success", "Photo captured and ready to use!", "success");
                                };

                                retakeBtn.onclick = function() {
                                    // Restart the capture process
                                    $(confirmContainer).remove();
                                    proceedWithCamera(address);
                                };

                                // Remove video and buttons, show img and confirm
                                $('#' + previewId).html('<img id="' + imgId + '" src="' + dataUrl + '" alt="Captured Photo" style="max-width:200px; border: 2px solid blue;" class="mt-2">').append(confirmContainer);

                                $('#' + statusId).text('Photo captured. Click "Use This Photo" to apply.');
                            }, 'image/jpeg');
                        };

                        cancelBtn.onclick = function() {
                            // Stop stream
                            stream.getTracks().forEach(track => track.stop());
                            window.currentStream = null;
                            $('#' + previewId).hide().empty();
                            $('#' + statusId).text('Cancelled. Click to capture photo and GPS location');
                        };
                    };
                })
                .catch(function(err) {
                    $('#' + statusId).text('Camera access denied or failed: ' + err.message);
                    console.error('Camera error:', err);
                });
        }
    }, function(err) {
        $('#' + statusId).text('Location access denied or failed: ' + err.message);
        console.error('Geolocation error:', err);
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

});
// Check URL for ?open=create to show offcanvas
if (window.location.search.includes('open=create')) {
    const offcanvasEl = document.getElementById('createTaskOffcanvas');
    if (offcanvasEl) {
        const bsOffcanvas = new bootstrap.Offcanvas(offcanvasEl);
        bsOffcanvas.show();
    }
}
