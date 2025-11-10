import CONFIG from "../../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;
import { showCusToast } from "../../components/toast.js";

window.onload = function() {
    // Check for access token
    const accessToken = localStorage.getItem('access_token');
    const customer_id = localStorage.getItem('customer_id');
    if (!accessToken || !customer_id) {
        showCusToast('Vui lòng đăng nhập để xem thông tin hồ sơ.', 'info');
        setTimeout(() => {
            window.location.href = '/pages/customer/login.html';
        }, 1000);
        return;
    }

    // Function to fetch and display customer profile data
    function fetchProfile() {
        fetch(`${BASE_URL}/api/accounts/customer/profile/?id=${customer_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch profile data');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success' && data.data) {
                    // Populate profile information
                    document.getElementById('full-name').textContent = data.data.full_name || 'N/A';
                    document.getElementById('phone-number').textContent = data.data.phone_number || 'N/A';
                    document.getElementById("username").textContent = data.data.username || 'Không có';
                    document.getElementById('email').textContent = data.data.email || 'N/A';
                    document.getElementById('created-at').textContent = data.data.created_at 
                        ? new Date(data.data.created_at).toLocaleString('vi-VN', { 
                            dateStyle: 'short', 
                            timeStyle: 'short' 
                          }) 
                        : 'N/A';
                    document.getElementById('updated-at').textContent = data.data.updated_at 
                        ? new Date(data.data.updated_at).toLocaleString('vi-VN', { 
                            dateStyle: 'short', 
                            timeStyle: 'short' 
                          }) 
                        : 'N/A';

                    // Populate modal form with current data
                    document.getElementById('edit-full-name').value = data.data.full_name || '';
                    document.getElementById('edit-phone-number').value = data.data.phone_number || '';
                    document.getElementById('edit-email').value = data.data.email || '';
                } else {
                    showCusToast('Không thể tải thông tin hồ sơ.', 'danger');
                }
            })
            .catch(error => {
                console.error('Error fetching profile data:', error);
                if (error.message.includes('Unauthorized')) {
                    showCusToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'danger');
                    setTimeout(() => {
                        window.location.href = '/pages/customer/login.html';
                    }, 1000);
                } else {
                    showCusToast('Có lỗi xảy ra khi tải thông tin hồ sơ.', 'danger');
                }
            });
    }

    // Initial fetch of profile data
    fetchProfile();

    // Handle save changes in the profile modal
    document.getElementById('save-profile-btn').addEventListener('click', function() {
        const form = document.getElementById('edit-profile-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
    
        const updatedData = {
            full_name: document.getElementById('edit-full-name').value.trim(),
            phone_number: document.getElementById('edit-phone-number').value.trim(),
            email: document.getElementById('edit-email').value.trim()
        };

        fetch(`${BASE_URL}/api/accounts/customer/update/?id=${customer_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData)
        })
            .then(response => {
                if (!response.ok) {
                    console.error('Error updating profile:', response.statusText);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    showCusToast('Cập nhật thông tin cá nhân thành công!', 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
                    modal.hide();
                    fetchProfile();
                } else {
                    if (data.errors) {
                        let delay = 0;
                        for (const field in data.errors) {
                            const messages = data.errors[field];
                            messages.forEach(msg => {
                                setTimeout(() => {
                                    showCusToast(`${msg}`, 'danger');
                                }, delay);
                                delay += 500;
                            });
                        }
                    } else {
                        showCusToast(data.message || 'Không thể cập nhật thông tin cá nhân.', 'danger');
                    }
                }
            })
            .catch(error => {
                console.error('Error updating profile:', error);
                showCusToast('Có lỗi xảy ra khi cập nhật thông tin.', 'danger');
            });
    });

    // Handle save changes in the password modal
    document.getElementById('save-password-btn').addEventListener('click', function() {
        const form = document.getElementById('change-password-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const passwordData = {
            old_password: document.getElementById('old-password').value,
            new_password: document.getElementById('new-password').value,
            confirm_new_password: document.getElementById('confirm-new-password').value
        };

        if (passwordData.new_password !== passwordData.confirm_new_password) {
            showCusToast('Mật khẩu mới và xác nhận mật khẩu không khớp.', 'danger');
            return;
        }

        fetch(`${BASE_URL}/api/accounts/customer/change-password/?id=${customer_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(passwordData)
        })
            .then(response => {
                if (!response.ok) {
                    console.error('Error changing password:', response.statusText);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    showCusToast(data.message || 'Thay đổi mật khẩu thành công.', 'success');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                    modal.hide();
                    form.reset();
                } else {
                    if (data.errors) {
                        let delay = 0;
                        for (const field in data.errors) {
                            const messages = data.errors[field];
                            messages.forEach(msg => {
                                setTimeout(() => {
                                    showCusToast(`${msg}`, 'danger');
                                }, delay);
                                delay += 500;
                            });
                        }
                    } else {
                        showCusToast(data.message || 'Không thể đổi mật khẩu.', 'danger');
                    }
                }
            })
            .catch(error => {
                console.error('Error changing password:', error);
                showCusToast('Có lỗi xảy ra khi đổi mật khẩu.', 'danger');
            });
    });

    // Reset forms when modals are closed
    document.getElementById('editProfileModal').addEventListener('hidden.bs.modal', function() {
        const form = document.getElementById('edit-profile-form');
        form.reset();
        fetchProfile();
    });

    document.getElementById('changePasswordModal').addEventListener('hidden.bs.modal', function() {
        const form = document.getElementById('change-password-form');
        form.reset();
    });
};


document.querySelectorAll('.password-toggle').forEach(icon => {
    icon.addEventListener('click', function () {
        const input = document.querySelector(this.getAttribute('toggle'));
        const isPassword = input.getAttribute('type') === 'password';
        input.setAttribute('type', isPassword ? 'text' : 'password');
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});
