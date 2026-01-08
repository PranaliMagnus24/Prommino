(function(window, document, $){
    'use strict';

    // avoid redefining if already present (safe include)
    if (window.CommonNotify && window.CommonNotify._isInstalled) {
        // already installed
        return;
    }

    // fallback bootstrap alert creator (used when Swal not available)
    function _createBootstrapAlert(message, type) {
        var wrapper = document.createElement('div');
        wrapper.className = 'alert alert-' + (type === 'error' ? 'danger' : (type === 'info' ? 'info' : 'success')) + ' alert-dismissible fade show position-fixed';
        wrapper.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        var iconClass = (type === 'error') ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill';
        wrapper.innerHTML = '<i class="bi ' + iconClass + ' me-2"></i>' + (message || '') +
            ' <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>';
        document.body.appendChild(wrapper);
        setTimeout(function(){ if (wrapper.parentNode) wrapper.remove(); }, 5000);
    }

    // showSuccessMessage used by fallback showAlert -> success toast-like visual
    function showSuccessMessage(message) {
        _createBootstrapAlert(message, 'success');
    }

    // showAlert: main public function used by modules (title optional)
    function showAlert(titleOrMessage, messageOrType, maybeType) {
        // support both call patterns:
        // showAlert(title, message, type)  OR  showAlert(message, type)
        var title = '';
        var message = '';
        var type = 'success';

        if (maybeType !== undefined) {
            // called as showAlert(title, message, type)
            title = titleOrMessage || '';
            message = messageOrType || '';
            type = maybeType || 'success';
        } else {
            // called as showAlert(message, type) or showAlert(message)
            message = titleOrMessage || '';
            type = messageOrType || 'success';
        }

        // normalize types
        if (type === 'err') type = 'error';
        if (type === 'danger') type = 'error';

        if (typeof Swal !== 'undefined') {
            // Use SweetAlert2 toast style (top-end)
            var swalOptions = {
                title: title || undefined,
                text: message || '',
                icon: (type === 'error' ? 'error' : (type === 'info' ? 'info' : 'success')),
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            };
            // if no title, remove the title key to make compact toast
            if (!title) delete swalOptions.title;
            Swal.fire(swalOptions);
        } else {
            // fallback: bootstrap alert appended to body
            _createBootstrapAlert((title ? (title + ' - ') : '') + message, type);
        }
    }

    // clearFormErrors(selector) - remove visual invalid classes and error text
    function clearFormErrors(selector) {
        try {
            if (!selector) return;
            var $sel = (typeof $ !== 'undefined' && selector && selector.length) ? $(selector) : null;
            if ($sel && $sel.length) {
                $sel.find('.is-invalid').removeClass('is-invalid');
                $sel.find('.invalid-feedback').text('');
            } else {
                // generic: remove everywhere
                if (typeof $ !== 'undefined') {
                    $('.is-invalid').removeClass('is-invalid');
                    $('.invalid-feedback').text('');
                } else {
                    // no jQuery - attempt DOM based clearing for common classes
                    var elems = document.querySelectorAll('.is-invalid');
                    elems.forEach(function(e){ e.classList.remove('is-invalid'); });
                    var feeds = document.querySelectorAll('.invalid-feedback');
                    feeds.forEach(function(f){ f.textContent = ''; });
                }
            }
        } catch (e) {
            // fail silently
            // console.warn('clearFormErrors error', e);
        }
    }

    // handleValidationErrors(errors, formSelector)
    // errors: object from backend like { "field": ["msg"], "items.0.qty": ["msg"] }
    function handleValidationErrors(errors, formSelector) {
        if (!errors) return;

        // If jQuery present, prefer it for easier DOM work
        if (typeof $ !== 'undefined' && formSelector) {
            var $form = $(formSelector);
            if ($form.length) {
                // loop through errors
                $.each(errors, function (key, messages) {
                    var msg = Array.isArray(messages) ? messages[0] : messages;
                    // try direct name match first
                    var $field = $form.find('[name="' + key + '"]');
                    if (!$field.length) {
                        // try prefix match for arrays: items[0][qty] or items.0.qty
                        // convert dot notation to bracket notation if needed
                        var base = key.split('.')[0];
                        $field = $form.find('[name^="' + base + '"]');
                    }
                    if ($field.length) {
                        $field.addClass('is-invalid');
                        // set error text element if exists with id or adjacent invalid-feedback
                        var idSafe = key.replace(/\./g, '_') + 'Error';
                        if ($('#' + idSafe).length) {
                            $('#' + idSafe).text(msg);
                        } else {
                            // put message in existing sibling invalid-feedback or append one
                            if ($field.next('.invalid-feedback').length) {
                                $field.next('.invalid-feedback').text(msg);
                            } else {
                                $field.after('<div class="invalid-feedback">' + msg + '</div>');
                            }
                        }
                    } else {
                        // global message fallback
                        showAlert('Error', msg, 'error');
                    }
                });
                return;
            }
        }

        // DOM-only fallback (no jQuery or selector)
        Object.keys(errors).forEach(function(key){
            var messages = errors[key];
            var msg = Array.isArray(messages) ? messages[0] : messages;
            // try to find element with name attribute
            var el = document.querySelector('[name="' + key + '"]');
            if (!el) {
                var base = key.split('.')[0];
                el = document.querySelector('[name^="' + base + '"]');
            }
            if (el) {
                el.classList.add('is-invalid');
                var idSafe = key.replace(/\./g, '_') + 'Error';
                var label = document.getElementById(idSafe);
                if (label) {
                    label.textContent = msg;
                } else {
                    // append small .invalid-feedback if not present
                    var next = el.nextElementSibling;
                    if (!next || !next.classList.contains('invalid-feedback')) {
                        var fb = document.createElement('div');
                        fb.className = 'invalid-feedback';
                        fb.textContent = msg;
                        el.parentNode.insertBefore(fb, el.nextSibling);
                    } else {
                        next.textContent = msg;
                    }
                }
            } else {
                // show top-level error
                showAlert('Error', msg, 'error');
            }
        });
    }

    // expose API globally
    window.CommonNotify = window.CommonNotify || {};
    window.CommonNotify._isInstalled = true;
    window.CommonNotify.showAlert = showAlert;
    window.CommonNotify.showSuccessMessage = showSuccessMessage;
    window.CommonNotify.clearFormErrors = clearFormErrors;
    window.CommonNotify.handleValidationErrors = handleValidationErrors;

    // also expose simple global names (for compatibility with existing code)
    window.showAlert = window.showAlert || showAlert;
    window.clearFormErrors = window.clearFormErrors || clearFormErrors;
    window.handleValidationErrors = window.handleValidationErrors || handleValidationErrors;

})(window, document, window.jQuery);
