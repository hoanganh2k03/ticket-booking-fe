import CONFIG from "../../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;
import { showCusToast } from "../../components/toast.js";

// Initialize Google Sign-In (Identity Services)
function handleCredentialResponse(response) {
    // response.credential is the ID token (JWT)
    const id_token = response.credential;

    fetch(`${BASE_URL}/api/accounts/auth/customer/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token })
    }).then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
            showCusToast('Đăng nhập bằng Google thành công!', 'success');
            localStorage.clear();
            localStorage.setItem('access_token', data.data.access_token);
            localStorage.setItem('refresh_token', data.data.refresh_token);
            localStorage.setItem('customer_id', data.data.customer.customer_id);
            localStorage.setItem('full_name', data.data.customer.full_name);
            localStorage.setItem('email', data.data.customer.email);
            window.location.href = '/pages/customer/index.html';
        } else {
            showCusToast(data.message || 'Đăng nhập Google thất bại', 'danger');
        }
      }).catch(err => {
        showCusToast('Lỗi khi kết nối đến server cho Google Sign-In', 'danger');
        console.error(err);
      });
}

// Wait for the Google Identity Services script to be available, then render the button
function setupGoogleSignIn() {
    try {
        // eslint-disable-next-line no-undef
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
            // GSI not loaded yet; try again shortly
            setTimeout(setupGoogleSignIn, 300);
            return;
        }

        // import CONFIG lazily to avoid circular issues
        import('../../utils/settings.js').then(({ default: CONFIG }) => {
            const clientId = CONFIG.GOOGLE_CLIENT_ID || '<YOUR_GOOGLE_CLIENT_ID>';

            // Initialize
            google.accounts.id.initialize({
                client_id: clientId,
                callback: handleCredentialResponse
            });

            // Render the button
            google.accounts.id.renderButton(
                document.getElementById('google-signin-button'),
                { theme: 'outline', size: 'large', text: 'signin_with' }
            );

            // Optionally prompt one-tap
            // google.accounts.id.prompt();
        });
    } catch (e) {
        console.warn('Google Sign-In injection failed, will not render button', e);
    }
}

setupGoogleSignIn();

// Initialize Facebook SDK (optional if FACEBOOK_APP_ID in CONFIG)
function setupFacebookSDK() {
    import('../../utils/settings.js').then(({ default: CONFIG }) => {
        const facebookAppId = CONFIG.FACEBOOK_APP_ID || '';
        if (!facebookAppId) return; // not configured

        // Inject FB SDK script
        if (!window.fbAsyncInit) {
            window.fbAsyncInit = function() {
                FB.init({
                    appId: facebookAppId,
                    cookie: true,
                    xfbml: false,
                    version: 'v16.0'
                });
            };

            (function(d, s, id){
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) {return;}
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/vi_VN/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        }
    }).catch(err => console.warn('Unable to setup Facebook SDK', err));
}

setupFacebookSDK();

function postFacebookAccessToken(access_token) {
    fetch(`${BASE_URL}/api/accounts/auth/customer/facebook/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token })
    }).then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
            showCusToast('Đăng nhập bằng Facebook thành công!', 'success');
            localStorage.clear();
            localStorage.setItem('access_token', data.data.access_token);
            localStorage.setItem('refresh_token', data.data.refresh_token);
            localStorage.setItem('customer_id', data.data.customer.customer_id);
            localStorage.setItem('full_name', data.data.customer.full_name);
            localStorage.setItem('email', data.data.customer.email);
            window.location.href = '/pages/customer/index.html';
        } else {
            showCusToast(data.message || 'Đăng nhập Facebook thất bại', 'danger');
        }
      }).catch(err => {
        showCusToast('Lỗi khi kết nối đến server cho Facebook Sign-In', 'danger');
        console.error(err);
      });
}

// Attach click listener on facebook button
document.getElementById('facebook-signin-button').addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof FB !== 'undefined') {
        FB.login(function(response) {
            if (response.authResponse) {
                const access_token = response.authResponse.accessToken;
                postFacebookAccessToken(access_token);
            } else {
                showCusToast('Quyền Facebook không được cấp.', 'danger');
            }
        }, { scope: 'public_profile,email' });
    } else {
        showCusToast('Facebook SDK chưa được cấu hình.', 'warning');
    }
});

let lastRegisteredEmail = "";

// Form Đăng nhập
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.querySelector('input[aria-label="Username"]').value;
    const password = e.target.querySelector('input[aria-label="Password"]').value;

    try {
        const res = await fetch(`${BASE_URL}/api/accounts/auth/customer/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        // --- ĐOẠN DEBUG QUAN TRỌNG ---
        if (!res.ok) {
            // Nếu server trả về lỗi (400, 404, 500)
            const text = await res.text(); // Đọc dạng text trước xem nó là gì
            console.error("Lỗi từ Server (Raw Text):", text); // In ra console để đọc
            
            try {
                const jsonError = JSON.parse(text); // Thử ép sang JSON
                showCusToast(jsonError.message || "Có lỗi xảy ra", 'danger');
            } catch {
                // Nếu không ép được sang JSON, nghĩa là Server trả về HTML (Lỗi 500 hoặc 404)
                showCusToast(`Lỗi Server (${res.status}): Vui lòng xem Console (F12)`, 'danger');
            }
            return; // Dừng luôn
        }
        // -----------------------------
        const data = await res.json();
        if (data.status === 'success') {
            showCusToast('Đăng nhập thành công!', 'success');
            localStorage.clear();
            localStorage.setItem('access_token', data.data.access_token);
            localStorage.setItem('refresh_token', data.data.refresh_token);
            localStorage.setItem('customer_id', data.data.customer.customer_id);
            localStorage.setItem('full_name', data.data.customer.full_name);
            localStorage.setItem('email', data.data.customer.email);
            window.location.href = '/pages/customer/index.html';
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
                showCusToast(data.message || 'Đăng nhập thất bại', 'danger');

                if (data.message.toLowerCase().includes("xác thực")) {
                    // showCusToast("Vui lòng kiểm tra email của bạn để nhận mã OTP.", 'warning');
                    document.getElementById('login-form').style.display = 'none';
                    document.getElementById('otp-form').style.display = 'block';
                    sendOTP(username);
                }
            }
        }
    } catch (error) {
        showCusToast('Lỗi kết nối đến server!', 'danger');
    }
});

// Gửi OTP
async function sendOTP(username) {
    try {
        const res = await fetch(`${BASE_URL}/api/accounts/auth/customer/send-otp/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username })
        });

        const data = await res.json();
        if (data.status === 'success') {
            showCusToast('Mã OTP đã được gửi đến email của bạn!', 'success');
            lastRegisteredEmail = data.data.email;
        } else {
            showCusToast(data.message || 'Gửi OTP thất bại', 'danger');
        }
    } catch (error) {
        showCusToast('Lỗi kết nối đến server khi gửi OTP!', 'danger');
    }
}

// Form Đăng ký
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = e.target.querySelector('input[aria-label="Username"]').value;
    const fullname = e.target.querySelector('input[aria-label="Full Name"]').value;
    const email = e.target.querySelector('input[aria-label="Email"]').value;
    const phone = e.target.querySelector('input[aria-label="Phone Number"]').value;
    const password = e.target.querySelector('input[aria-label="Password"]').value;
    const confirmPassword = e.target.querySelector('input[aria-label="Confirm Password"]').value;

    if (password !== confirmPassword) {
        showCusToast('Mật khẩu xác nhận không khớp!', 'danger');
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/api/accounts/auth/customer/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                full_name: fullname,
                phone_number: phone,
                password
            })
        });

        const data = await res.json();
        if (data.status === 'success') {
        showCusToast(data.message || 'Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP.', 'success');
            lastRegisteredEmail = data.data.email;
            document.getElementById('register-form').style.display = 'none';
            document.getElementById('otp-form').style.display = 'block';
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
                showCusToast(data.message || 'Đăng ký thất bại', 'danger');
            }
        }
    } catch (error) {
        showCusToast('Lỗi kết nối đến server!', 'error');
    }
});

// Form Xác thực OTP
document.getElementById('otp-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const otpInput = this.querySelector('input[type="text"]');
    const otpValue = otpInput.value.trim();
    const email = lastRegisteredEmail;

    try {
        const response = await fetch(`${BASE_URL}/api/accounts/auth/customer/verify-otp/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email, otp: otpValue }),
        });

        const data = await response.json();

        if (data.status === 'success') {
            showCusToast(data.message || 'Xác thực thành công!', 'success');
            setTimeout(() => {
                document.getElementById('otp-form').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
            }, 1500);
        } else {
            showCusToast(data.message || 'Mã OTP không chính xác.', 'danger');
        }
    } catch (error) {
        showCusToast('Lỗi kết nối đến máy chủ.', 'danger');
        console.error(error);
    }
});

// Form Quên mật khẩu
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = e.target.querySelector('input[aria-label="Email"]').value;

    try {
        const res = await fetch(`${BASE_URL}/api/accounts/customer/forgot-password/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (data.status === 'success') {
            showCusToast('Mã OTP đã được gửi đến email của bạn!', 'success');
            lastRegisteredEmail = email;
            document.getElementById('forgot-password-form').style.display = 'none';
            document.getElementById('reset-password-form').style.display = 'block';
        } else {
            showCusToast(data.message || 'Gửi yêu cầu thất bại', 'danger');
        }
    } catch (error) {
        showCusToast('Lỗi kết nối đến server!', 'danger');
    }
});

// Form Đặt lại mật khẩu
document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const otp = e.target.querySelector('input[aria-label="OTP"]').value;
    const newPassword = e.target.querySelector('input[aria-label="New Password"]').value;
    const confirmNewPassword = e.target.querySelector('input[aria-label="Confirm New Password"]').value;
    const email = lastRegisteredEmail;

    if (newPassword !== confirmNewPassword) {
        showCusToast('Mật khẩu xác nhận không khớp!', 'danger');
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/api/accounts/customer/reset-password/`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, otp, new_password: newPassword })
        });

        const data = await res.json();
        if (data.status === 'success') {
            showCusToast(data.message || 'Đặt lại mật khẩu thành công!', 'success');
            setTimeout(() => {
                document.getElementById('reset-password-form').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
            }, 1500);
        } else {
            showCusToast(data.message || 'Đặt lại mật khẩu thất bại', 'danger');
        }
    } catch (error) {
        showCusToast('Lỗi kết nối đến server!', 'danger');
    }
});

// Chuyển đổi giữa các form
document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
});

document.getElementById('show-forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'block';
});

document.getElementById('back-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
});

document.getElementById('back-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('otp-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
});

document.getElementById('back-to-forgot-password').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('reset-password-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'block';
});


document.querySelectorAll('.toggle-password').forEach(function (eyeIcon) {
    eyeIcon.addEventListener('click', function () {
        const input = document.querySelector(this.getAttribute('toggle'));
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);

        // Đổi icon:
        if (type === 'text') {
            this.classList.remove('fa-eye');
            this.classList.add('fa-eye-slash');
        } else {
            this.classList.remove('fa-eye-slash');
            this.classList.add('fa-eye');
        }
    });
});