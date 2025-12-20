document.addEventListener('DOMContentLoaded', () => {
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');
    const userIcon = document.getElementById('user-icon');

    // Kiểm tra xem access_token có tồn tại trong localStorage không
    const accessToken = localStorage.getItem('access_token');

    if (accessToken) {
        // Nếu có access_token, hiển thị Đăng xuất và icon user
        if(loginLink) loginLink.style.display = 'none'; // Ẩn nút đăng nhập
        if(logoutLink) logoutLink.style.display = 'block'; // Hiển thị nút đăng xuất
        if(userIcon) userIcon.style.display = 'block'; // Hiển thị icon user
    } else {
        // Nếu không có access_token, hiển thị Đăng nhập
        if(loginLink) loginLink.style.display = 'block'; // Hiển thị nút đăng nhập
        if(logoutLink) logoutLink.style.display = 'none'; // Ẩn nút đăng xuất
        if(userIcon) userIcon.style.display = 'none'; // Ẩn icon user
    }

    // Thêm sự kiện cho nút đăng xuất
    if(logoutLink) {
        logoutLink.addEventListener('click', () => {
            // Xóa access_token khỏi localStorage khi người dùng đăng xuất
            localStorage.clear();
            window.location.href = '/pages/customer/index.html'; // Tải lại trang để cập nhật giao diện
        });
    }

    if(loginLink) {
        loginLink.addEventListener('click', () => {
            // (Tuỳ chọn) Xóa token cũ để đảm bảo đăng nhập mới sạch sẽ
            localStorage.clear(); 
            window.location.href = '/pages/customer/login.html'; 
        });
    }

    // --- XỬ LÝ DROPDOWN USER ---
    const userDropdown = document.getElementById('user-dropdown');
    
    // Lắng nghe sự kiện click vào icon người dùng
    if(userIcon && userDropdown) {
        userIcon.addEventListener('click', () => {
            // Toggle hiển thị dropdown
            userDropdown.classList.toggle('active');
        });

        // Lắng nghe sự kiện click ra ngoài dropdown để đóng dropdown
        document.addEventListener('click', (event) => {
            if (!userIcon.contains(event.target) && !userDropdown.contains(event.target)) {
                userDropdown.classList.remove('active');
            }
        });
    }

    // Các link trong dropdown
    const personalInfoLink = document.getElementById('personal-info');
    if(personalInfoLink) {
        personalInfoLink.addEventListener('click', () => {
            window.location.href = '/pages/customer/profile.html'; 
        });
    }

    const bookedTicketsLink = document.getElementById('booked-tickets');
    if(bookedTicketsLink) {
        bookedTicketsLink.addEventListener('click', () => {
            window.location.href = '/pages/customer/booked-tickets.html'; 
        });
    }

    const ticketReturnsLink = document.getElementById('ticket-returns');
    if(ticketReturnsLink) {
        ticketReturnsLink.addEventListener('click', () => {
            window.location.href = '/pages/customer/return_ticket.html'; 
        });
    }

    // --- MỚI: XỬ LÝ NÚT HẠNG THÀNH VIÊN ---
    const loyaltyBtn = document.getElementById('loyalty-btn');
    if (loyaltyBtn) {
        // (Tuỳ chọn) Nếu muốn ẩn nút khi chưa đăng nhập thì bỏ comment dòng dưới
        // if (!accessToken) loyaltyBtn.style.display = 'none';

        loyaltyBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Ngăn chặn hành vi mặc định
            
            // Kiểm tra lại token mới nhất (đề phòng user vừa logout ở tab khác)
            const currentToken = localStorage.getItem('access_token');

            if (currentToken) {
                // Đã đăng nhập -> Chuyển trang
                window.location.href = '/pages/customer/loyalty.html';
            } else {
                // Chưa đăng nhập -> Hiện thông báo SweetAlert2
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Yêu cầu đăng nhập',
                        text: "Vui lòng đăng nhập để xem hạng thành viên và điểm thưởng!",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Đăng nhập ngay',
                        cancelButtonText: 'Để sau'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = '/pages/customer/login.html';
                        }
                    });
                } else {
                    // Fallback nếu chưa nhúng SweetAlert
                    alert("Vui lòng đăng nhập để xem hạng thành viên!");
                    window.location.href = '/pages/customer/login.html';
                }
            }
        });
    }
});