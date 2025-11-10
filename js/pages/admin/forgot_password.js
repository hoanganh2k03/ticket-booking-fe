import CONFIG from "../../utils/settings.js";
import { showToast } from "../../components/toast.js";
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const form = document.getElementById('forgotForm');

// API endpoints
const API_BASE = CONFIG.BASE_URL + '/api/accounts';
const API_FORGOT = `${API_BASE}/employee/forgot-password/`;
const API_RESET = `${API_BASE}/employee/reset-password/`;

// Gửi OTP
sendOtpBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    if (!email) return showToast('Nhập email hợp lệ.', 'error');
    sendOtpBtn.disabled = true;
    try {
        const res = await fetch(API_FORGOT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            showToast(data.message, 'success');
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
        } else {
            showToast(data.message || 'Thất bại.', 'error');
        }
    } catch {
        showToast('Server không phản hồi.', 'error');
    } finally {
        sendOtpBtn.disabled = false;
    }
});

// Đặt lại mật khẩu
form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const otp = document.getElementById('otp').value.trim();
    const newPwd = document.getElementById('newPassword').value;
    const confPwd = document.getElementById('confirmPassword').value;

    if (!otp) return showToast('Nhập OTP.', 'error');
    if (newPwd.length < 6 || newPwd.length > 20)
        return showToast('Mật khẩu có từ 6 - 20 ký tự.', 'error');

    if (newPwd !== confPwd)
        return showToast('Xác nhận không khớp.', 'error');

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        const res = await fetch(API_RESET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, new_password: newPwd })
        });

        let data = {};
        try {
            // Attempt to parse JSON; if it fails, data remains an empty object.
            data = await res.json();
        } catch (jsonError) {
            console.error("JSON parse error:", jsonError);
        }

        if (res.ok && data.status === 'success') {
            showToast("Thay đổi mật khẩu thành công! Hãy tiến hành đăng nhập lại.", "success");
            setTimeout(() => {
                window.location.href = '/pages/login_empl.html';
            }, 2000);
        } else {
            showToast(data.message || 'Thất bại.', 'error', 2000);
        }
    } catch (error) {
        showToast('Server không phản hồi.', 'error', 2000);
        console.error("Request error:", error);
    } finally {
        btn.disabled = false;
    }
});
