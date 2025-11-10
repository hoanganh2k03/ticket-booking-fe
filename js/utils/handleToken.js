import CONFIG from "../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;


export function fetchWithToken(url, options = {}) {
    // Lấy access token từ localStorage
    const accessToken = localStorage.getItem('access');

    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${accessToken}`;

    return fetch(url, options)
        .then(response => {
            if (response.status === 401) {
                return refreshAccessToken().then(newAccessToken => {
                    options.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    return fetch(url, options);
                });
            }
            return response;
        });
}

// Hàm làm mới access token sử dụng refresh token
function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh');
    
    if (!refreshToken) {
        // Nếu không có refresh token, yêu cầu người dùng đăng nhập lại
        window.location.href = '/pages/login_empl.html';
        return Promise.reject('No refresh token available');
    }

    // Gửi yêu cầu làm mới access token
    return fetch(`${BASE_URL}/api/accounts/auth/token/refresh/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access) {
            // Lưu access token mới vào localStorage
            const newAccessToken = data.access;
            localStorage.setItem('access', newAccessToken);
            return newAccessToken;
        } else {
            // Nếu làm mới token thất bại, yêu cầu người dùng đăng nhập lại
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            window.location.href = '/pages/login_empl.html';
            return Promise.reject('Failed to refresh token');
        }
    })
    .catch(error => {
        console.error('Error refreshing token:', error);
        // Nếu có lỗi trong quá trình làm mới token, yêu cầu người dùng đăng nhập lại
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = '/pages/login_empl.html';
        return Promise.reject('Error refreshing token');
    });
}