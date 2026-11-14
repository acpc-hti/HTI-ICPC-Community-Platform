/**
 * HTI ICPC Community Platform - Student Application Form Controller
 */

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('application-form');
  const alertBox = document.getElementById('alert-box');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');
  const formContainer = document.getElementById('form-container');
  const successContainer = document.getElementById('success-container');

  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    hideAlert();

    // Check HTML5 validity
    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      showAlert('Please fill in all required fields accurately.', 'danger');
      return;
    }

    const commitment = document.getElementById('regularAttendanceCommitment');
    if (!commitment.checked) {
      showAlert('You must agree to the attendance commitment.', 'warning');
      return;
    }

    // Construct form data
    const langSelect = document.getElementById('programmingLanguages');
    const langValue = langSelect.value === 'أخرى'
      ? (document.getElementById('otherLangInput').value.trim() || 'أخرى')
      : langSelect.value;

    const formData = {
      fullName: document.getElementById('fullName').value.trim(),
      studentId: document.getElementById('studentId').value.trim(),
      universityEmail: document.getElementById('universityEmail').value.trim(),
      personalEmail: document.getElementById('universityEmail').value.trim(), // same email, kept for backend compatibility
      phoneNumber: document.getElementById('phoneNumber').value.trim(),
      department: document.getElementById('department').value,
      academicYear: document.getElementById('academicYear').value,
      programmingExperience: document.getElementById('programmingExperience').value,
      programmingLanguages: langValue,
      previousContestExperience: document.getElementById('previousContestExperience').value.trim(),
      codeforcesUsername: document.getElementById('codeforcesUsername').value.trim(),
      leetcodeProfile: document.getElementById('leetcodeProfile').value.trim(),
      githubProfile: document.getElementById('githubProfile').value.trim(),
      whyJoin: document.getElementById('whyJoin').value.trim(),
      goals: document.getElementById('goals').value.trim(),
      expectations: document.getElementById('expectations').value.trim(),
      regularAttendanceCommitment: true
    };

    // UI Loading state
    submitBtn.disabled = true;
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');

    try {
      const result = await ApiService.submitApplication(formData);

      // Transition to Success State
      formContainer.classList.add('d-none');
      successContainer.classList.remove('d-none');

      document.getElementById('disp-app-id').textContent = result.applicationId;
      document.getElementById('disp-token').textContent = formData.studentId;
      
      const userEl = document.getElementById('disp-registered-user');
      if (userEl) {
        userEl.textContent = formData.universityEmail;
      }

      const portalDirectBtn = document.getElementById('portal-direct-btn');
      if (portalDirectBtn) {
        portalDirectBtn.href = `portal.html?email=${encodeURIComponent(formData.universityEmail)}&studentId=${encodeURIComponent(formData.studentId)}`;
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('Submission failed:', err);
      showAlert(err.message || 'Failed to submit application. Please verify your data and try again.', 'danger');
      submitBtn.disabled = false;
      btnText.classList.remove('d-none');
      btnSpinner.classList.add('d-none');
    }
  });

  function showAlert(msg, type = 'danger') {
    alertBox.className = `alert alert-${type} mb-4`;
    alertBox.innerHTML = `<i class="fa-solid fa-triangle-exclamation me-2"></i> ${msg}`;
    alertBox.classList.remove('d-none');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function hideAlert() {
    alertBox.classList.add('d-none');
  }
});

function copyText(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const text = el.textContent || el.innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert('Copied to clipboard: ' + text);
  }).catch(() => {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    alert('Copied to clipboard: ' + text);
  });
}

