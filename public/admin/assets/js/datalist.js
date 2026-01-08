$(document).ready(function() {
    ////Roles Table List
// Make sure showAlert function is available (same as users)
function showAlert(title, message, icon = 'success') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            text: message,
            icon: icon,
            timer: 3000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } else {
        alert(`${title}: ${message}`);
    }
}

if ($('.rolesList').length) {
    // Initialize DataTable
    var roleTable = $('.rolesList').DataTable({
        serverSide: true,
        processing: true,
        responsive: true,
        rowReorder: {
            selector: 'td:nth-child(2)'
        },
        dom: "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
        language: {
            lengthMenu: '<select class="form-select">'+
                            '<option value="10">10</option>'+
                            '<option value="25">25</option>'+
                            '<option value="50">50</option>'+
                            '<option value="100">100</option>'+
                        '</select>'
        },
        buttons: [
            {
                extend: 'collection',
                text: '<i class="bi bi-download"></i>',
                className: 'btn btn-light dropdown-toggle',
                buttons: [
                    {
                        extend: 'csv',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2] }
                    },
                    {
                        extend: 'excel',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2] }
                    },
                    {
                        extend: 'pdf',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2] }
                    },
                    {
                        extend: 'print',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2] }
                    }
                ]
            }
        ],
        ajax: {
            url: rolesUrl
        },
        columns: [
            { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
            { data: 'name', name: 'name' },
            { data: 'action', name: 'action', orderable: false, searchable: false }
        ]
    });

    // AJAX Store Role
    $('#roleForm').on('submit', function(e) {
        e.preventDefault();

        var formData = new FormData(this);
        var submitBtn = $('#submitBtn');

        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');

        $.ajax({
            url: storeRoleUrl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            beforeSend: function() {
                submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
            },
            success: function(response) {
                if (response.success) {
                    // Reset form
                    $('#roleForm')[0].reset();
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show success message
                    showAlert('Success!', 'Role created successfully.', 'success');

                    // Reload DataTable
                    roleTable.ajax.reload();
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON.errors;
                if (errors) {
                    // Clear previous errors
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show new errors
                    $.each(errors, function(key, value) {
                        $(`#${key}`).addClass('is-invalid');
                        $(`#${key}Error`).text(value[0]);
                    });
                } else {
                    showAlert('Error!', 'Failed to create role.', 'error');
                }
            },
            complete: function() {
                submitBtn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add Role');
            }
        });
    });

    // Edit Role Modal
    $(document).on('click', '.edit-role', function() {
        var roleId = $(this).data('id');

        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');

        // Fetch role data
        $.ajax({
            url: editRoleUrl.replace(':id', roleId),
            type: 'GET',
            success: function(response) {
                if (response.success) {
                    // Populate form fields
                    $('#edit_role_id').val(response.data.id);
                    $('#edit_name').val(response.data.name);

                    // Show modal
                    $('#editRoleModal').modal('show');
                }
            },
            error: function(xhr) {
                showAlert('Error!', 'Failed to load role data.', 'error');
            }
        });
    });

    // Update Role
    $('#updateRoleBtn').click(function() {
        var roleId = $('#edit_role_id').val();
        var formData = new FormData($('#editRoleForm')[0]);
        var updateBtn = $('#updateRoleBtn');

        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');

        $.ajax({
            url: updateRoleUrl.replace(':id', roleId),
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            beforeSend: function() {
                updateBtn.prop('disabled', true).html('Updating...');
            },
            success: function(response) {
                if (response.success) {
                    // Hide modal
                    $('#editRoleModal').modal('hide');

                    // Reset form
                    $('#editRoleForm')[0].reset();
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show success message
                    showAlert('Success!', 'Role updated successfully.', 'success');

                    // Reload DataTable
                    roleTable.ajax.reload();
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON.errors;
                if (errors) {
                    // Clear previous errors
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show new errors
                    $.each(errors, function(key, value) {
                        $(`#edit_${key}`).addClass('is-invalid');
                        $(`#edit_${key}Error`).text(value[0]);
                    });
                } else {
                    showAlert('Error!', 'Failed to update role.', 'error');
                }
            },
            complete: function() {
                updateBtn.prop('disabled', false).html('Update Role');
            }
        });
    });

    // Delete Role Confirmation
    $(document).on('click', '.delete-role', function() {
        var roleId = $(this).data('id');
        var roleName = $(this).data('name');

        Swal.fire({
            title: 'Are you sure?',
            text: `You want to delete role "${roleName}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteRole(roleId);
            }
        });
    });

    function deleteRole(roleId) {
        $.ajax({
            url: deleteRoleUrl.replace(':id', roleId),
            type: 'DELETE',
            data: {
                _token: $('meta[name="csrf-token"]').attr('content')
            },
            success: function(response) {
                if (response.success) {
                    // Show success message
                    showAlert('Success!', 'Role deleted successfully.', 'success');

                    // Reload DataTable
                    roleTable.ajax.reload();
                }
            },
            error: function(xhr) {
                if (xhr.status === 422) {
                    showAlert('Error!', xhr.responseJSON.error, 'error');
                } else {
                    showAlert('Error!', 'Failed to delete role.', 'error');
                }
            }
        });
    }

    // Reset forms when modals are closed
    $('#editRoleModal').on('hidden.bs.modal', function() {
        $('#editRoleForm')[0].reset();
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');
    });
}
    ///User Table List
   // Add this showAlert function at the top
function showAlert(title, message, icon = 'success') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            text: message,
            icon: icon,
            timer: 3000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } else {
        // Fallback to basic alert if SweetAlert is not available
        alert(`${title}: ${message}`);
    }
}

if ($('.userList').length) {
    // Initialize DataTable
    var userTable = $('.userList').DataTable({
        serverSide: true,
        processing: true,
        responsive: true,
        rowReorder: {
            selector: 'td:nth-child(2)'
        },
        dom: "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
        "<'row'<'col-sm-12'tr>>" +
        "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
        language: {
            lengthMenu: '<select class="form-select">'+
                            '<option value="10">10</option>'+
                            '<option value="25">25</option>'+
                            '<option value="50">50</option>'+
                            '<option value="100">100</option>'+
                        '</select>'
        },
        buttons: [
            {
                extend: 'collection',
                text: '<i class="bi bi-download"></i>',
                className: 'btn btn-light dropdown-toggle',
                buttons: [
                    {
                        extend: 'csv',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2, 3] }
                    },
                    {
                        extend: 'excel',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2, 3] }
                    },
                    {
                        extend: 'pdf',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2, 3] }
                    },
                    {
                        extend: 'print',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2, 3] }
                    }
                ]
            }
        ],
        ajax: {
            url: userUrl
        },
        columns: [
            { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
            { data: 'name', name: 'name' },
            { data: 'email', name: 'email' },
                    { data: 'phone', name: 'phone' },

            { data: 'roles', name: 'roles', orderable: false, searchable: false },
            { data: 'action', name: 'action', orderable: false, searchable: false }
        ]
    });

    // AJAX Store User
    $('#userForm').on('submit', function(e) {
        e.preventDefault();

        var formData = new FormData(this);
        var submitBtn = $('#submitBtn');

        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');
        $('.error-text').text('');

        $.ajax({
            url: storeUserUrl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            beforeSend: function() {
                submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
            },
            success: function(response) {
                if (response.success) {
                    // Reset form
                    $('#userForm')[0].reset();
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show success message
                    showAlert('Success!', 'User created successfully.', 'success');

                    // Reload DataTable
                    userTable.ajax.reload();
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON.errors;
                if (errors) {
                    // Clear previous errors
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show new errors
                    $.each(errors, function(key, value) {
                        $(`#${key}`).addClass('is-invalid');
                        $(`#${key}Error`).text(value[0]);
                    });
                } else {
                    showAlert('Error!', 'Failed to create user.', 'error');
                }
            },
            complete: function() {
                submitBtn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add User');
            }
        });
    });

    // Edit User Modal
    $(document).on('click', '.edit-user', function() {
        var userId = $(this).data('id');

        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');
        $('.error-text').text('');

        // Fetch user data
        $.ajax({
            url: editUserUrl.replace(':id', userId),
            type: 'GET',
           success: function(response) {
    // Populate form fields
    $('#edit_user_id').val(response.user.id);
    $('#edit_name').val(response.user.name);
    $('#edit_email').val(response.user.email);
    $('#edit_phone').val(response.user.phone ?? '');

    // Set selected roles
    $('#edit_roles').val(response.userRoles);

    // Show modal
    $('#editUserModal').modal('show');
},

            error: function(xhr) {
                showAlert('Error!', 'Failed to load user data.', 'error');
            }
        });
    });

    // Update User
    $('#updateUserBtn').click(function() {
        var userId = $('#edit_user_id').val();
        var formData = new FormData($('#editUserForm')[0]);
        var updateBtn = $('#updateUserBtn');

        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');
        $('.error-text').text('');

        $.ajax({
            url: updateUserUrl.replace(':id', userId),
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            beforeSend: function() {
                updateBtn.prop('disabled', true).html('Updating...');
            },
            success: function(response) {
                if (response.success) {
                    // Hide modal
                    $('#editUserModal').modal('hide');

                    // Reset form
                    $('#editUserForm')[0].reset();
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show success message
                    showAlert('Success!', 'User updated successfully.', 'success');

                    // Reload DataTable
                    userTable.ajax.reload();
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON.errors;
                if (errors) {
                    // Clear previous errors
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show new errors
                   $.each(errors, function(key, value) {
    var inputId = key;
    // for mapping to edit input ids: e.g. department_id => edit_department_id
    if ($('#edit_' + key).length) {
        $(`#edit_${key}`).addClass('is-invalid');
        $(`#edit_${key}Error`).text(value[0]);
    } else if ($(`#${key}`).length) {
        $(`#${key}`).addClass('is-invalid');
        $(`#${key}Error`).text(value[0]);
    }
});

                } else {
                    showAlert('Error!', 'Failed to update user.', 'error');
                }
            },
            complete: function() {
                updateBtn.prop('disabled', false).html('Update User');
            }
        });
    });

    // Delete User Confirmation
    var deleteUserId;
    var deleteUserName;

    $(document).on('click', '.delete-user', function() {
        deleteUserId = $(this).data('id');
        deleteUserName = $(this).data('name');

        // Use SweetAlert for confirmation instead of Bootstrap modal
        Swal.fire({
            title: 'Are you sure?',
            text: `You want to delete user "${deleteUserName}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteUser();
            }
        });
    });

    function deleteUser() {
        $.ajax({
            url: deleteUserUrl.replace(':id', deleteUserId),
            type: 'DELETE',
            data: {
                _token: $('meta[name="csrf-token"]').attr('content')
            },
            beforeSend: function() {
                // Show loading state if needed
            },
            success: function(response) {
                if (response.success) {
                    // Show success message
                    showAlert('Success!', 'User deleted successfully.', 'success');

                    // Reload DataTable
                    userTable.ajax.reload();
                }
            },
            error: function(xhr) {
                if (xhr.status === 422) {
                    showAlert('Error!', xhr.responseJSON.error, 'error');
                } else {
                    showAlert('Error!', 'Failed to delete user.', 'error');
                }
            }
        });
    }

    // Reset forms when modals are closed
    $('#editUserModal').on('hidden.bs.modal', function() {
        $('#editUserForm')[0].reset();
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');
    });
}

////Permissioms Table List
// Make sure showAlert function is available
function showAlert(title, message, icon = 'success') {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            text: message,
            icon: icon,
            timer: 3000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    } else {
        alert(`${title}: ${message}`);
    }
}

if ($('.permissionsList').length) {
    // Initialize DataTable
    var permissionTable = $('.permissionsList').DataTable({
        serverSide: true,
        processing: true,
        responsive: true,
        rowReorder: {
            selector: 'td:nth-child(2)'
        },
        dom: "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
        language: {
            lengthMenu: '<select class="form-select">'+
                            '<option value="10">10</option>'+
                            '<option value="25">25</option>'+
                            '<option value="50">50</option>'+
                            '<option value="100">100</option>'+
                        '</select>'
        },
        buttons: [
            {
                extend: 'collection',
                text: '<i class="bi bi-download"></i>',
                className: 'btn btn-light dropdown-toggle',
                buttons: [
                    {
                        extend: 'csv',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2] }
                    },
                    {
                        extend: 'excel',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2] }
                    },
                    {
                        extend: 'pdf',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2] }
                    },
                    {
                        extend: 'print',
                        className: 'dropdown-item',
                        exportOptions: { columns: [0, 1, 2] }
                    }
                ]
            }
        ],
        ajax: {
            url: permissionsUrl
        },
        columns: [
            { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
            { data: 'name', name: 'name' },
            { data: 'created_at', name: 'created_at' },
            { data: 'action', name: 'action', orderable: false, searchable: false }
        ]
    });

    // AJAX Store Permission
    $('#permissionForm').on('submit', function(e) {
        e.preventDefault();

        var formData = new FormData(this);
        var submitBtn = $('#submitBtn');

        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');

        $.ajax({
            url: storePermissionUrl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            beforeSend: function() {
                submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
            },
            success: function(response) {
                if (response.success) {
                    // Reset form
                    $('#permissionForm')[0].reset();
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show success message
                    showAlert('Success!', 'Permission created successfully.', 'success');

                    // Reload DataTable
                    permissionTable.ajax.reload();
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON.errors;
                if (errors) {
                    // Clear previous errors
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show new errors
                    $.each(errors, function(key, value) {
                        $(`#${key}`).addClass('is-invalid');
                        $(`#${key}Error`).text(value[0]);
                    });
                } else {
                    showAlert('Error!', 'Failed to create permission.', 'error');
                }
            },
            complete: function() {
                submitBtn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add Permission');
            }
        });
    });

    // Edit Permission Modal
    $(document).on('click', '.edit-permission', function() {
        var permissionId = $(this).data('id');

        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');

        // Fetch permission data
        $.ajax({
            url: editPermissionUrl.replace(':id', permissionId),
            type: 'GET',
            success: function(response) {
                if (response.success) {
                    // Populate form fields
                    $('#edit_permission_id').val(response.permission.id);
                    $('#edit_name').val(response.permission.name);

                    // Show modal
                    $('#editPermissionModal').modal('show');
                }
            },
            error: function(xhr) {
                showAlert('Error!', 'Failed to load permission data.', 'error');
            }
        });
    });

    // Update Permission
    $('#updatePermissionBtn').click(function() {
        var permissionId = $('#edit_permission_id').val();
        var formData = new FormData($('#editPermissionForm')[0]);
        var updateBtn = $('#updatePermissionBtn');

        // Clear previous errors
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');

        $.ajax({
            url: updatePermissionUrl.replace(':id', permissionId),
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            beforeSend: function() {
                updateBtn.prop('disabled', true).html('Updating...');
            },
            success: function(response) {
                if (response.success) {
                    // Hide modal
                    $('#editPermissionModal').modal('hide');

                    // Reset form
                    $('#editPermissionForm')[0].reset();
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show success message
                    showAlert('Success!', 'Permission updated successfully.', 'success');

                    // Reload DataTable
                    permissionTable.ajax.reload();
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON.errors;
                if (errors) {
                    // Clear previous errors
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');

                    // Show new errors
                    $.each(errors, function(key, value) {
                        $(`#edit_${key}`).addClass('is-invalid');
                        $(`#edit_${key}Error`).text(value[0]);
                    });
                } else {
                    showAlert('Error!', 'Failed to update permission.', 'error');
                }
            },
            complete: function() {
                updateBtn.prop('disabled', false).html('Update Permission');
            }
        });
    });

    // Delete Permission Confirmation
    $(document).on('click', '.delete-permission', function() {
        var permissionId = $(this).data('id');
        var permissionName = $(this).data('name');

        Swal.fire({
            title: 'Are you sure?',
            text: `You want to delete permission "${permissionName}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                deletePermission(permissionId);
            }
        });
    });

    function deletePermission(permissionId) {
        $.ajax({
            url: deletePermissionUrl.replace(':id', permissionId),
            type: 'DELETE',
            data: {
                _token: $('meta[name="csrf-token"]').attr('content')
            },
            success: function(response) {
                if (response.success) {
                    // Show success message
                    showAlert('Success!', 'Permission deleted successfully.', 'success');

                    // Reload DataTable
                    permissionTable.ajax.reload();
                } else {
                    showAlert('Error!', response.message, 'error');
                }
            },
            error: function(xhr) {
                if (xhr.status === 422) {
                    showAlert('Error!', xhr.responseJSON.message, 'error');
                } else {
                    showAlert('Error!', 'Failed to delete permission.', 'error');
                }
            }
        });
    }

    // Reset forms when modals are closed
    $('#editPermissionModal').on('hidden.bs.modal', function() {
        $('#editPermissionForm')[0].reset();
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').text('');
    });
}

///Brand List
 if ($('.brandsList').length) {
        var brandsTable = $('.brandsList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            rowReorder: {
                selector: 'td:nth-child(2)'
            },
            dom: "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
                "<'row'<'col-sm-12'tr>>" +
                "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
            language: {
                lengthMenu: '<select class="form-select">'+
                                '<option value="10">10</option>'+
                                '<option value="25">25</option>'+
                                '<option value="50">50</option>'+
                                '<option value="100">100</option>'+
                            '</select>'
            },
            buttons: [
                {
                    extend: 'collection',
                    text: '<i class="bi bi-download"></i>',
                    className: 'btn btn-light dropdown-toggle',
                    buttons: [
                        { extend: 'csv', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'excel', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'pdf', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'print', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } }
                    ]
                }
            ],
            ajax: {
                url: brandsUrl
            },
            columns: [
                { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'name', name: 'name' },
                { data: 'status', name: 'status', orderable: false, searchable: false },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ]
        });

        // helper to clear frontend validation UI
        function clearFormErrors(formSelector) {
            $(formSelector + ' .is-invalid').removeClass('is-invalid');
            $(formSelector + ' .invalid-feedback').text('');
        }

        // CREATE brand
        $('#brandForm').on('submit', function(e) {
            e.preventDefault();
            var formData = new FormData(this);
            var submitBtn = $('#submitBtn');

            clearFormErrors('#brandForm');

            $.ajax({
                url: storeBrandUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#brandForm')[0].reset();
                        clearFormErrors('#brandForm');
                        showAlert('Success!', response.message || 'Brand created successfully.', 'success');
                        brandsTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to create brand.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            $(`#${key}`).addClass('is-invalid');
                            $(`#${key}Error`).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to create brand.', 'error');
                    }
                },
                complete: function() {
                    submitBtn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add Brand');
                }
            });
        });

        // OPEN edit modal and populate
        $(document).on('click', '.edit-brand', function() {
            var brandId = $(this).data('id');

            clearFormErrors('#editBrandForm');

            $.ajax({
                url: editBrandUrl.replace(':id', brandId),
                type: 'GET',
                success: function(response) {
                    if (response.success) {
                        $('#edit_brand_id').val(response.data.id);
                        $('#edit_name').val(response.data.name);
                        $('#edit_brand_img').val(''); // clear file input
                        $('#edit_description').val(response.data.description || '');
                        // populate status (0 or 1)
                        $('#edit_status').val(response.data.status != null ? String(response.data.status) : '');

                        // Show current image if exists
                        var currentImageContainer = $('#current_image_container');
                        currentImageContainer.empty();
                        if (response.data.brand_img) {
                            var imageUrl = '/' + response.data.brand_img;
                            currentImageContainer.html('<p><strong>Current Image:</strong></p><img src="' + imageUrl + '" alt="Current Brand Image" style="max-width: 200px; max-height: 200px;" class="img-thumbnail">');
                        } else {
                            currentImageContainer.html('<p>No image uploaded</p>');
                        }

                        $('#editBrandModal').modal('show');
                    } else {
                        showAlert('Error!', response.message || 'Failed to load brand data.', 'error');
                    }
                },
                error: function() {
                    showAlert('Error!', 'Failed to load brand data.', 'error');
                }
            });
        });

        // UPDATE brand
        $('#updateBrandBtn').on('click', function() {
            var brandId = $('#edit_brand_id').val();
            var formData = new FormData($('#editBrandForm')[0]);
            var updateBtn = $('#updateBrandBtn');

            clearFormErrors('#editBrandForm');

            $.ajax({
                url: updateBrandUrl.replace(':id', brandId),
                type: 'POST', // FormData contains _method=PUT from @method('PUT')
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    updateBtn.prop('disabled', true).text('Updating...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#editBrandModal').modal('hide');
                        $('#editBrandForm')[0].reset();
                        clearFormErrors('#editBrandForm');
                        showAlert('Success!', response.message || 'Brand updated successfully.', 'success');
                        brandsTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to update brand.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            $(`#edit_${key}`).addClass('is-invalid');
                            $(`#edit_${key}Error`).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to update brand.', 'error');
                    }
                },
                complete: function() {
                    updateBtn.prop('disabled', false).text('Update Brand');
                }
            });
        });

        // DELETE brand
        $(document).on('click', '.delete-brand', function() {
            var brandId = $(this).data('id');
            var brandName = $(this).data('name');

            Swal.fire({
                title: 'Are you sure?',
                text: `You want to delete brand "${brandName}"? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: deleteBrandUrl.replace(':id', brandId),
                        type: 'DELETE',
                        data: {
                            _token: $('meta[name="csrf-token"]').attr('content')
                        },
                        success: function(response) {
                            if (response.success) {
                                showAlert('Success!', response.message || 'Brand deleted successfully.', 'success');
                                brandsTable.ajax.reload(null, false);
                            } else {
                                showAlert('Error!', response.message || 'Failed to delete brand.', 'error');
                            }
                        },
                        error: function(xhr) {
                            if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.error) {
                                showAlert('Error!', xhr.responseJSON.error, 'error');
                            } else {
                                showAlert('Error!', 'Failed to delete brand.', 'error');
                            }
                        }
                    });
                }
            });
        });

        // reset form on modal close
        $('#editBrandModal').on('hidden.bs.modal', function() {
            $('#editBrandForm')[0].reset();
            clearFormErrors('#editBrandForm');
        });

    }

    ///Unit Category List
    if ($('.unitCategoriesList').length) {
        var ucTable = $('.unitCategoriesList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            rowReorder: {
                selector: 'td:nth-child(2)'
            },
            dom: "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
                "<'row'<'col-sm-12'tr>>" +
                "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
            language: {
                lengthMenu: '<select class="form-select">'+
                                '<option value="10">10</option>'+
                                '<option value="25">25</option>'+
                                '<option value="50">50</option>'+
                                '<option value="100">100</option>'+
                            '</select>'
            },
            buttons: [
                {
                    extend: 'collection',
                    text: '<i class="bi bi-download"></i>',
                    className: 'btn btn-light dropdown-toggle',
                    buttons: [
                        { extend: 'csv', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'excel', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'pdf', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'print', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } }
                    ]
                }
            ],
            ajax: {
                url: ucListUrl
            },
            columns: [
                { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'name', name: 'name' },
                { data: 'status', name: 'status', orderable: false, searchable: false },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ]
        });

        function clearErrors(formSelector) {
            $(formSelector + ' .is-invalid').removeClass('is-invalid');
            $(formSelector + ' .invalid-feedback').text('');
        }

        // CREATE
        $('#unitCategoryForm').on('submit', function(e) {
            e.preventDefault();
            var formData = new FormData(this);
            var btn = $('#uc_submitBtn');

            clearErrors('#unitCategoryForm');

            $.ajax({
                url: ucStoreUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#unitCategoryForm')[0].reset();
                        clearErrors('#unitCategoryForm');
                        showAlert('Success!', response.message || 'Unit Category created successfully.', 'success');
                        ucTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to create unit category.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            var fieldId = (key === 'name') ? '#uc_name' : '#uc_' + key;
                            var errId = (key === 'name') ? '#uc_nameError' : '#uc_' + key + 'Error';
                            $(fieldId).addClass('is-invalid');
                            $(errId).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to create unit category.', 'error');
                    }
                },
                complete: function() {
                    btn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add Unit Category');
                }
            });
        });

        // OPEN EDIT
        $(document).on('click', '.edit-unit', function() {
            var id = $(this).data('id');
            clearErrors('#editUnitCategoryForm');

            $.ajax({
                url: ucListUrl.replace('/unit-categories', '/unit-categories/' + id + '/edit'), // simpler pattern
                type: 'GET',
                success: function(response) {
                    if (response.success) {
                        $('#edit_uc_id').val(response.data.id);
                        $('#edit_uc_name').val(response.data.name);
                        $('#edit_uc_status').val(response.data.status != null ? String(response.data.status) : '');
                        $('#editUnitCategoryModal').modal('show');
                    } else {
                        showAlert('Error!', response.message || 'Failed to load data.', 'error');
                    }
                },
                error: function() {
                    showAlert('Error!', 'Failed to load data.', 'error');
                }
            });
        });

        // UPDATE
        $('#updateUcBtn').on('click', function() {
            var id = $('#edit_uc_id').val();
            var formData = new FormData($('#editUnitCategoryForm')[0]);
            var btn = $('#updateUcBtn');

            clearErrors('#editUnitCategoryForm');

            $.ajax({
                url: ucUpdateUrl.replace(':id', id),
                type: 'POST', // using _method PUT in form
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    btn.prop('disabled', true).text('Updating...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#editUnitCategoryModal').modal('hide');
                        $('#editUnitCategoryForm')[0].reset();
                        clearErrors('#editUnitCategoryForm');
                        showAlert('Success!', response.message || 'Unit Category updated successfully.', 'success');
                        ucTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to update unit category.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            var fieldId = (key === 'name') ? '#edit_uc_name' : '#edit_uc_' + key;
                            var errId = (key === 'name') ? '#edit_uc_nameError' : '#edit_uc_' + key + 'Error';
                            $(fieldId).addClass('is-invalid');
                            $(errId).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to update unit category.', 'error');
                    }
                },
                complete: function() {
                    btn.prop('disabled', false).text('Update Unit Category');
                }
            });
        });

        // DELETE
        $(document).on('click', '.delete-unit', function() {
            var id = $(this).data('id');
            var name = $(this).data('name');

            Swal.fire({
                title: 'Are you sure?',
                text: `You want to delete unit category "${name}"? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: ucDeleteUrl.replace(':id', id),
                        type: 'DELETE',
                        data: {
                            _token: $('meta[name="csrf-token"]').attr('content')
                        },
                        success: function(response) {
                            if (response.success) {
                                showAlert('Success!', response.message || 'Unit Category deleted successfully.', 'success');
                                ucTable.ajax.reload(null, false);
                            } else {
                                showAlert('Error!', response.message || 'Failed to delete unit category.', 'error');
                            }
                        },
                        error: function(xhr) {
                            if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.error) {
                                showAlert('Error!', xhr.responseJSON.error, 'error');
                            } else {
                                showAlert('Error!', 'Failed to delete unit category.', 'error');
                            }
                        }
                    });
                }
            });
        });

        // reset modal form
        $('#editUnitCategoryModal').on('hidden.bs.modal', function() {
            $('#editUnitCategoryForm')[0].reset();
            clearErrors('#editUnitCategoryForm');
        });

    }

    /////Product Category list
    if ($('.productCategoriesList').length) {
        var pcTable = $('.productCategoriesList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            rowReorder: {
                selector: 'td:nth-child(2)'
            },
            dom: "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
                "<'row'<'col-sm-12'tr>>" +
                "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
            language: {
                lengthMenu: '<select class="form-select">'+
                                '<option value="10">10</option>'+
                                '<option value="25">25</option>'+
                                '<option value="50">50</option>'+
                                '<option value="100">100</option>'+
                            '</select>'
            },
            buttons: [
                {
                    extend: 'collection',
                    text: '<i class="bi bi-download"></i>',
                    className: 'btn btn-light dropdown-toggle',
                    buttons: [
                        { extend: 'csv', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'excel', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'pdf', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'print', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } }
                    ]
                }
            ],
            ajax: {
                url: pcListUrl
            },
            columns: [
                { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'name', name: 'name' },
                { data: 'status', name: 'status', orderable: false, searchable: false },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ]
        });

        function clearErrors(formSelector) {
            $(formSelector + ' .is-invalid').removeClass('is-invalid');
            $(formSelector + ' .invalid-feedback').text('');
        }

        // CREATE
        $('#productCategoryForm').on('submit', function(e) {
            e.preventDefault();
            var formData = new FormData(this);
            var btn = $('#pc_submitBtn');

            clearErrors('#productCategoryForm');

            $.ajax({
                url: pcStoreUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#productCategoryForm')[0].reset();
                        clearErrors('#productCategoryForm');
                        showAlert('Success!', response.message || 'Product Category created successfully.', 'success');
                        pcTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to create product category.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            var fieldId = (key === 'name') ? '#pc_name' : '#pc_' + key;
                            var errId = (key === 'name') ? '#pc_nameError' : '#pc_' + key + 'Error';
                            $(fieldId).addClass('is-invalid');
                            $(errId).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to create product category.', 'error');
                    }
                },
                complete: function() {
                    btn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add Product Category');
                }
            });
        });

        // OPEN EDIT
        $(document).on('click', '.edit-pc', function() {
            var id = $(this).data('id');
            clearErrors('#editProductCategoryForm');

            $.ajax({
                url: pcListUrl.replace('/product-categories', '/product-categories/' + id + '/edit'),
                type: 'GET',
                success: function(response) {
                    if (response.success) {
                        $('#edit_pc_id').val(response.data.id);
                        $('#edit_pc_name').val(response.data.name);
                        $('#edit_pc_img').val(''); // clear file input
                        $('#edit_pc_description').val(response.data.description || '');
                        $('#edit_pc_status').val(response.data.status != null ? String(response.data.status) : '');

                        // Show current image if exists
                        var currentImageContainer = $('#edit_current_image_container');
                        currentImageContainer.empty();
                        if (response.data.product_category_img) {
                            var imageUrl = '/' + response.data.product_category_img;
                            currentImageContainer.html('<p><strong>Current Image:</strong></p><img src="' + imageUrl + '" alt="Current Product Category Image" style="max-width: 200px; max-height: 200px;" class="img-thumbnail">');
                        } else {
                            currentImageContainer.html('<p>No image uploaded</p>');
                        }

                        $('#editProductCategoryModal').modal('show');
                    } else {
                        showAlert('Error!', response.message || 'Failed to load data.', 'error');
                    }
                },
                error: function() {
                    showAlert('Error!', 'Failed to load data.', 'error');
                }
            });
        });

        // UPDATE
        $('#updatePcBtn').on('click', function() {
            var id = $('#edit_pc_id').val();
            var formData = new FormData($('#editProductCategoryForm')[0]);
            var btn = $('#updatePcBtn');

            clearErrors('#editProductCategoryForm');

            $.ajax({
                url: pcUpdateUrl.replace(':id', id),
                type: 'POST', // using _method PUT in form
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    btn.prop('disabled', true).text('Updating...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#editProductCategoryModal').modal('hide');
                        $('#editProductCategoryForm')[0].reset();
                        clearErrors('#editProductCategoryForm');
                        showAlert('Success!', response.message || 'Product Category updated successfully.', 'success');
                        pcTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to update product category.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            var fieldId = (key === 'name') ? '#edit_pc_name' : '#edit_pc_' + key;
                            var errId = (key === 'name') ? '#edit_pc_nameError' : '#edit_pc_' + key + 'Error';
                            $(fieldId).addClass('is-invalid');
                            $(errId).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to update product category.', 'error');
                    }
                },
                complete: function() {
                    btn.prop('disabled', false).text('Update Product Category');
                }
            });
        });

        // DELETE
        $(document).on('click', '.delete-pc', function() {
            var id = $(this).data('id');
            var name = $(this).data('name');

            Swal.fire({
                title: 'Are you sure?',
                text: `You want to delete product category "${name}"? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: pcDeleteUrl.replace(':id', id),
                        type: 'DELETE',
                        data: {
                            _token: $('meta[name="csrf-token"]').attr('content')
                        },
                        success: function(response) {
                            if (response.success) {
                                showAlert('Success!', response.message || 'Product Category deleted successfully.', 'success');
                                pcTable.ajax.reload(null, false);
                            } else {
                                showAlert('Error!', response.message || 'Failed to delete product category.', 'error');
                            }
                        },
                        error: function(xhr) {
                            if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.error) {
                                showAlert('Error!', xhr.responseJSON.error, 'error');
                            } else {
                                showAlert('Error!', 'Failed to delete product category.', 'error');
                            }
                        }
                    });
                }
            });
        });

        // reset modal form
        $('#editProductCategoryModal').on('hidden.bs.modal', function() {
            $('#editProductCategoryForm')[0].reset();
            clearErrors('#editProductCategoryForm');
        });

    } // end if .productCategoriesList


    ///Complaint Type
 if ($('.complaintTypesList').length) {
        var typesTable = $('.complaintTypesList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            rowReorder: {
                selector: 'td:nth-child(2)'
            },
            dom: "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
                "<'row'<'col-sm-12'tr>>" +
                "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
            language: {
                lengthMenu: '<select class="form-select">'+
                                '<option value="10">10</option>'+
                                '<option value="25">25</option>'+
                                '<option value="50">50</option>'+
                                '<option value="100">100</option>'+
                            '</select>'
            },
            buttons: [
                {
                    extend: 'collection',
                    text: '<i class="bi bi-download"></i>',
                    className: 'btn btn-light dropdown-toggle',
                    buttons: [
                        { extend: 'csv', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'excel', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'pdf', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'print', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } }
                    ]
                }
            ],
            ajax: {
                url: complaintTypesUrl
            },
            columns: [
                { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'name', name: 'name' },
                { data: 'status', name: 'status', orderable: false, searchable: false },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ]
        });

        // helper to clear frontend validation UI
        function clearFormErrors(formSelector) {
            $(formSelector + ' .is-invalid').removeClass('is-invalid');
            $(formSelector + ' .invalid-feedback').text('');
        }

        // CREATE brand
        $('#complaintTypeForm').on('submit', function(e) {
            e.preventDefault();
            var formData = new FormData(this);
            var submitBtn = $('#submitBtn');

            clearFormErrors('#complaintTypeForm');

            $.ajax({
                url: storecomplaintTypesUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#complaintTypeForm')[0].reset();
                        clearFormErrors('#complaintTypeForm');
                        showAlert('Success!', response.message || 'Complaint Type created successfully.', 'success');
                        typesTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to create complaint type.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            $(`#${key}`).addClass('is-invalid');
                            $(`#${key}Error`).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to create complaint type.', 'error');
                    }
                },
                complete: function() {
                    submitBtn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add Complaint Type');
                }
            });
        });

        // OPEN edit modal and populate
        $(document).on('click', '.edit-type', function() {
            var typeId = $(this).data('id');

            clearFormErrors('#editcomplaintTypesForm');

            $.ajax({
                url: editcomplaintTypesUrl.replace(':id', typeId),
                type: 'GET',
                success: function(response) {
                    if (response.success) {
                        $('#edit_complaintTypes_id').val(response.data.id);
                        $('#edit_name').val(response.data.name);
                        // populate status (0 or 1)
                        $('#edit_status').val(response.data.status != null ? String(response.data.status) : '');
                        $('#editcomplaintTypesModal').modal('show');
                    } else {
                        showAlert('Error!', response.message || 'Failed to load complaint type data.', 'error');
                    }
                },
                error: function() {
                    showAlert('Error!', 'Failed to load complaint type data.', 'error');
                }
            });
        });

        // UPDATE brand
        $('#updatecomplaintTypesBtn').on('click', function() {
            var typeId = $('#edit_complaintTypes_id').val();
            var formData = new FormData($('#editcomplaintTypesForm')[0]);
            var updateBtn = $('#updatecomplaintTypesBtn');

            clearFormErrors('#editcomplaintTypesForm');

            $.ajax({
                url: updatecomplaintTypesUrl.replace(':id', typeId),
                type: 'POST', // FormData contains _method=PUT from @method('PUT')
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    updateBtn.prop('disabled', true).text('Updating...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#editcomplaintTypesModal').modal('hide');
                        $('#editcomplaintTypesForm')[0].reset();
                        clearFormErrors('#editcomplaintTypesForm');
                        showAlert('Success!', response.message || 'Complaint type updated successfully.', 'success');
                        typesTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to update complaint type.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            $(`#edit_${key}`).addClass('is-invalid');
                            $(`#edit_${key}Error`).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to update complaint type.', 'error');
                    }
                },
                complete: function() {
                    updateBtn.prop('disabled', false).text('Update Complaint Type');
                }
            });
        });

        // DELETE brand
        $(document).on('click', '.delete-type', function() {
            var typeId = $(this).data('id');
            var typeName = $(this).data('name');

            Swal.fire({
                title: 'Are you sure?',
                text: `You want to delete complaint type "${typeName}"? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: deletecomplaintTypesUrl.replace(':id', typeId),
                        type: 'DELETE',
                        data: {
                            _token: $('meta[name="csrf-token"]').attr('content')
                        },
                        success: function(response) {
                            if (response.success) {
                                showAlert('Success!', response.message || 'Complaint type deleted successfully.', 'success');
                                brandsTable.ajax.reload(null, false);
                            } else {
                                showAlert('Error!', response.message || 'Failed to delete complaint type.', 'error');
                            }
                        },
                        error: function(xhr) {
                            if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.error) {
                                showAlert('Error!', xhr.responseJSON.error, 'error');
                            } else {
                                showAlert('Error!', 'Failed to delete complaint type.', 'error');
                            }
                        }
                    });
                }
            });
        });

        // reset form on modal close
        $('#editcomplaintTypesModal').on('hidden.bs.modal', function() {
            $('#editcomplaintTypesForm')[0].reset();
            clearFormErrors('#editcomplaintTypesForm');
        });

    }

    ////Tax Management
     if ($('.taxList').length) {
        var taxTable = $('.taxList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            rowReorder: {
                selector: 'td:nth-child(2)'
            },
            dom: "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
                "<'row'<'col-sm-12'tr>>" +
                "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
            language: {
                lengthMenu: '<select class="form-select">'+
                                '<option value="10">10</option>'+
                                '<option value="25">25</option>'+
                                '<option value="50">50</option>'+
                                '<option value="100">100</option>'+
                            '</select>'
            },
            buttons: [
                {
                    extend: 'collection',
                    text: '<i class="bi bi-download"></i>',
                    className: 'btn btn-light dropdown-toggle',
                    buttons: [
                        { extend: 'csv', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'excel', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'pdf', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'print', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } }
                    ]
                }
            ],
            ajax: {
                url: taxUrl
            },
            columns: [
                { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'name', name: 'name' },
                { data: 'percent', name: 'percent' },
                { data: 'status', name: 'status', orderable: false, searchable: false },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ]
        });

        // helper to clear frontend validation UI
        function clearFormErrors(formSelector) {
            $(formSelector + ' .is-invalid').removeClass('is-invalid');
            $(formSelector + ' .invalid-feedback').text('');
        }

        // CREATE brand
        $('#taxForm').on('submit', function(e) {
            e.preventDefault();
            var formData = new FormData(this);
            var submitBtn = $('#submitBtn');

            clearFormErrors('#taxForm');

            $.ajax({
                url: storeTaxUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#taxForm')[0].reset();
                        clearFormErrors('#taxForm');
                        showAlert('Success!', response.message || 'Tax created successfully.', 'success');
                        taxTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to create tax.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            $(`#${key}`).addClass('is-invalid');
                            $(`#${key}Error`).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to create tax.', 'error');
                    }
                },
                complete: function() {
                    submitBtn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add tax');
                }
            });
        });

        // OPEN edit modal and populate
        $(document).on('click', '.edit-tax', function() {
            var taxId = $(this).data('id');

            clearFormErrors('#editTaxForm');

            $.ajax({
                url: editTaxUrl.replace(':id', taxId),
                type: 'GET',
                success: function(response) {
                    if (response.success) {
                        $('#edit_tax_id').val(response.data.id);
                        $('#edit_name').val(response.data.name);
                        $('#edit_percent').val(response.data.percent);
                        // populate status (0 or 1)
                        $('#edit_status').val(response.data.status != null ? String(response.data.status) : '');
                        $('#editTaxModal').modal('show');
                    } else {
                        showAlert('Error!', response.message || 'Failed to load tax data.', 'error');
                    }
                },
                error: function() {
                    showAlert('Error!', 'Failed to load tax data.', 'error');
                }
            });
        });

        // UPDATE brand
        $('#updateTaxBtn').on('click', function() {
            var taxId = $('#edit_tax_id').val();
            var formData = new FormData($('#editTaxForm')[0]);
            var updateBtn = $('#updateTaxBtn');

            clearFormErrors('#editTaxForm');

            $.ajax({
                url: updateTaxUrl.replace(':id', taxId),
                type: 'POST', // FormData contains _method=PUT from @method('PUT')
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    updateBtn.prop('disabled', true).text('Updating...');
                },
                success: function(response) {
                    if (response.success) {
                        $('#editTaxModal').modal('hide');
                        $('#editTaxForm')[0].reset();
                        clearFormErrors('#editTaxForm');
                        showAlert('Success!', response.message || 'Tax updated successfully.', 'success');
                        taxTable.ajax.reload(null, false);
                    } else {
                        showAlert('Error!', response.message || 'Failed to update tax.', 'error');
                    }
                },
                error: function(xhr) {
                    const errors = xhr.responseJSON && xhr.responseJSON.errors;
                    if (errors) {
                        $.each(errors, function(key, value) {
                            $(`#edit_${key}`).addClass('is-invalid');
                            $(`#edit_${key}Error`).text(value[0]);
                        });
                    } else {
                        showAlert('Error!', 'Failed to update tax.', 'error');
                    }
                },
                complete: function() {
                    updateBtn.prop('disabled', false).text('Update Tax');
                }
            });
        });

        // DELETE brand
        $(document).on('click', '.delete-tax', function() {
            var taxId = $(this).data('id');
            var taxName = $(this).data('name');

            Swal.fire({
                title: 'Are you sure?',
                text: `You want to delete tax "${taxName}"? This action cannot be undone.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: deleteTaxUrl.replace(':id', taxId),
                        type: 'DELETE',
                        data: {
                            _token: $('meta[name="csrf-token"]').attr('content')
                        },
                        success: function(response) {
                            if (response.success) {
                                showAlert('Success!', response.message || 'Tax deleted successfully.', 'success');
                                brandsTable.ajax.reload(null, false);
                            } else {
                                showAlert('Error!', response.message || 'Failed to delete tax.', 'error');
                            }
                        },
                        error: function(xhr) {
                            if (xhr.status === 422 && xhr.responseJSON && xhr.responseJSON.error) {
                                showAlert('Error!', xhr.responseJSON.error, 'error');
                            } else {
                                showAlert('Error!', 'Failed to delete tax.', 'error');
                            }
                        }
                    });
                }
            });
        });

        // reset form on modal close
        $('#editTaxModal').on('hidden.bs.modal', function() {
            $('#editTaxForm')[0].reset();
            clearFormErrors('#editTaxForm');
        });

    }

    ///Task Type Management
 if ($('.taskTypeList').length) {
        var taskTypeTable = $('.taskTypeList').DataTable({
            serverSide: true,
            processing: true,
            responsive: true,
            rowReorder: {
                selector: 'td:nth-child(2)'
            },
            dom: "<'row mb-3'<'col-sm-4'l><'col-sm-8 d-flex justify-content-end align-items-center gap-2'fB>>" +
                "<'row'<'col-sm-12'tr>>" +
                "<'row mt-2'<'col-sm-6'i><'col-sm-6 d-flex justify-content-end'p>>",
            language: {
                lengthMenu: '<select class="form-select">'+
                                '<option value="10">10</option>'+
                                '<option value="25">25</option>'+
                                '<option value="50">50</option>'+
                                '<option value="100">100</option>'+
                            '</select>'
            },
            buttons: [
                {
                    extend: 'collection',
                    text: '<i class="bi bi-download"></i>',
                    className: 'btn btn-light dropdown-toggle',
                    buttons: [
                        { extend: 'csv', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'excel', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'pdf', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } },
                        { extend: 'print', className: 'dropdown-item', exportOptions: { columns: [0, 1, 2] } }
                    ]
                }
            ],
            ajax: {
                url: taskTypeUrl
            },
            columns: [
                { data: 'DT_RowIndex', name: 'DT_RowIndex', orderable: false, searchable: false },
                { data: 'name', name: 'name' },
                { data: 'status', name: 'status', orderable: false, searchable: false },
                { data: 'action', name: 'action', orderable: false, searchable: false }
            ]
        });
    }

    function clearFormErrors(formSelector) {
        $(formSelector + ' .is-invalid').removeClass('is-invalid');
        $(formSelector + ' .invalid-feedback').text('');
    }

    // CREATE task type
    $('#taskTypeForm').on('submit', function(e) {
        e.preventDefault();
        var formData = new FormData(this);
        var submitBtn = $('#submitTaskTypeBtn');

        clearFormErrors('#taskTypeForm');

        $.ajax({
            url: storeTaskTypeUrl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            beforeSend: function() {
                submitBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Adding...');
            },
            success: function(response) {
                if (response.success) {
                    $('#taskTypeForm')[0].reset();
                    clearFormErrors('#taskTypeForm');
                    showAlert('Success!', response.message || 'Task type created successfully.', 'success');
                    if (typeof taskTypeTable !== 'undefined') taskTypeTable.ajax.reload(null, false);
                } else {
                    showAlert('Error!', response.message || 'Failed to create task type.', 'error');
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON && xhr.responseJSON.errors;
                if (errors) {
                    $.each(errors, function(key, value) {
                        $(`#${key}`).addClass('is-invalid');
                        $(`#${key}Error`).text(value[0]);
                    });
                } else {
                    showAlert('Error!', 'Failed to create task type.', 'error');
                }
            },
            complete: function() {
                submitBtn.prop('disabled', false).html('<i class="fas fa-plus-circle me-2"></i>Add');
            }
        });
    });

    // OPEN edit modal and populate
    $(document).on('click', '.edit-tasktype', function() {
        var id = $(this).data('id');

        clearFormErrors('#editTaskTypeForm');

        $.ajax({
            url: editTaskTypeUrl.replace(':id', id),
            type: 'GET',
            success: function(response) {
                if (response.success) {
                    $('#edit_task_type_id').val(response.data.id);
                    $('#edit_name').val(response.data.name);
                    $('#edit_status').val(response.data.status != null ? String(response.data.status) : '');
                    $('#editTaskTypeModal').modal('show');
                } else {
                    showAlert('Error!', response.message || 'Failed to load data.', 'error');
                }
            },
            error: function() {
                showAlert('Error!', 'Failed to load data.', 'error');
            }
        });
    });

    // UPDATE task type
    $('#updateTaskTypeBtn').on('click', function() {
        var id = $('#edit_task_type_id').val();
        var formData = new FormData($('#editTaskTypeForm')[0]);
        var updateBtn = $('#updateTaskTypeBtn');

        clearFormErrors('#editTaskTypeForm');

        $.ajax({
            url: updateTaskTypeUrl.replace(':id', id),
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            beforeSend: function() {
                updateBtn.prop('disabled', true).text('Updating...');
            },
            success: function(response) {
                if (response.success) {
                    $('#editTaskTypeModal').modal('hide');
                    $('#editTaskTypeForm')[0].reset();
                    clearFormErrors('#editTaskTypeForm');
                    showAlert('Success!', response.message || 'Task type updated successfully.', 'success');
                    if (typeof taskTypeTable !== 'undefined') taskTypeTable.ajax.reload(null, false);
                } else {
                    showAlert('Error!', response.message || 'Failed to update task type.', 'error');
                }
            },
            error: function(xhr) {
                const errors = xhr.responseJSON && xhr.responseJSON.errors;
                if (errors) {
                    $.each(errors, function(key, value) {
                        $(`#edit_${key}`).addClass('is-invalid');
                        $(`#edit_${key}Error`).text(value[0]);
                    });
                } else {
                    showAlert('Error!', 'Failed to update task type.', 'error');
                }
            },
            complete: function() {
                updateBtn.prop('disabled', false).text('Update');
            }
        });
    });

    // DELETE task type
    $(document).on('click', '.delete-tasktype', function() {
        var id = $(this).data('id');
        var name = $(this).data('name') || `Task Type #${id}`;

        Swal.fire({
            title: 'Are you sure?',
            text: `Delete "${name}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: deleteTaskTypeUrl.replace(':id', id),
                    type: 'DELETE',
                    data: { _token: $('meta[name="csrf-token"]').attr('content') },
                    success: function(response) {
                        if (response.success) {
                            showAlert('Success!', response.message || 'Deleted successfully.', 'success');
                            if (typeof taskTypeTable !== 'undefined') taskTypeTable.ajax.reload(null, false);
                        } else {
                            showAlert('Error!', response.message || 'Failed to delete.', 'error');
                        }
                    },
                    error: function(xhr) {
                        showAlert('Error!', 'Failed to delete.', 'error');
                    }
                });
            }
        });
    });

    // reset edit form on modal close
    $('#editTaskTypeModal').on('hidden.bs.modal', function() {
        $('#editTaskTypeForm')[0].reset();
        clearFormErrors('#editTaskTypeForm');
    });

    // small global alert helper (if not present)
    function showAlert(title, message, type) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ title: title, text: message, icon: (type==='success'?'success':'error'), timer: 1400, showConfirmButton: false, toast: true, position: 'top-end' });
        } else {
            alert(title + "\n" + message);
        }
    }


});


