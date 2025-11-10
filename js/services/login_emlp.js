import { showToast } from '../components/toast.js';
import CONFIG from "../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;

document.getElementById('login-form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent default form submission

    // Get username and password values
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Prepare the data to be sent in the API request
    const requestData = {
        username: username,
        password: password
    };

    // Send POST request to API (replace with your actual API URL)
    fetch(`${BASE_URL}/api/accounts/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if (data.access) {
                // Handle successful login (e.g., redirect or show success message)
                localStorage.setItem('refresh', data.refresh);
                localStorage.setItem('access', data.access);
                localStorage.setItem('employee_id', data.employee_id);
                localStorage.setItem('full_name', data.full_name);
                localStorage.setItem('role', data.role);
                showToast('Đăng nhập thành công.', 'success');

                if (data.role === 'admin') {
                    window.location.href = '/pages/admin/base.html';
                } else if (data.role === 'staff') {
                    window.location.href = '/pages/staff/base.html'; // Redirect to staff dashboard
                }
            } else {

                const errorMessage = Object.keys(data)
                    .filter(key => Array.isArray(data[key]) && data[key].length > 0)
                    .map(key => data[key][0])[0]
                    || data.detail
                    || 'Có lỗi xảy ra. Vui lòng thử lại.';
                showToast(errorMessage, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('Có lỗi xảy ra. Vui lòng thử lại.', 'danger');
        });
});
