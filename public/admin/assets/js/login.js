(function () {
      'use strict';

      // helper: toggle focus class for a floating wrapper
      function toggleFocus(wrapper, add) {
        if (!wrapper) return;
        if (add) wrapper.classList.add('focused');
        else wrapper.classList.remove('focused');
      }

      // initialize inputs
      const floatGroups = [
        { wrap: document.getElementById('emailWrap'), input: document.getElementById('email') },
        { wrap: document.getElementById('passwordWrap'), input: document.getElementById('password') }
      ];

      floatGroups.forEach(group => {
        if (!group.wrap || !group.input) return;

        // if input already has value (server returned old value), show as focused
        if (group.input.value && group.input.value.trim() !== '') {
          toggleFocus(group.wrap, true);
        }

        // on focus
        group.input.addEventListener('focus', function () {
          toggleFocus(group.wrap, true);
        });

        // on blur
        group.input.addEventListener('blur', function () {
          if (!this.value || this.value.trim() === '') {
            toggleFocus(group.wrap, false);
          }
        });

        // clicking label focuses input (a11y)
        const lbl = group.wrap.querySelector('label');
        if (lbl) {
          lbl.addEventListener('click', function () {
            group.input.focus();
          });
        }
      });

      // optional: prevent double-submit (basic)
      const form = document.querySelector('form[method="POST"]');
      if (form) {
        form.addEventListener('submit', function (e) {
          const btn = form.querySelector('button[type="submit"]');
          if (btn) {
            btn.disabled = true;
            btn.setAttribute('aria-disabled', 'true');
            btn.innerHTML = 'Logging in...';
          }
        });
      }
    })();
