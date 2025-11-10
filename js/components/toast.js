// Toast Manager (toastManager.js)

function showToast(message, type, duration = 3000) {
    let icon;
    if (type === "danger") icon = "error";
    else if (type === "warning") icon = "warning";
    else if (type === "success") icon = "success";
    else icon = type;
    Swal.fire({
        toast: true,
        position: "top-end",
        icon: icon,
        title: message,
        showConfirmButton: false,
        timer: duration,
    });
}

export { showToast };


function showCusToast(message, type = 'success', delay = 3000) {
    const toastContainer = document.getElementById('toast-container');
  
    const toast = document.createElement('div');
    toast.classList.add('toast', `bg-${type}`, 'align-items-center', 'text-white', 'border-0', 'mb-2');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
  
    // Append toast to the container
    toastContainer.appendChild(toast);
  
    // Initialize and show the toast
    const toastInstance = new bootstrap.Toast(toast);
    toastInstance.show();
  
    // Remove the toast after a certain time (optional)
    setTimeout(() => {
        toast.remove();
    }, delay);
}

export { showCusToast };