document.addEventListener('DOMContentLoaded', () => {
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');
    const userIcon = document.getElementById('user-icon');

    // Kiểm tra xem access_token có tồn tại trong localStorage không
    const accessToken = localStorage.getItem('access_token');

    if (accessToken) {
        // Nếu có access_token, hiển thị Đăng xuất và icon user
        loginLink.style.display = 'none'; // Ẩn nút đăng nhập
        logoutLink.style.display = 'block'; // Hiển thị nút đăng xuất
        userIcon.style.display = 'block'; // Hiển thị icon user
    } else {
        // Nếu không có access_token, hiển thị Đăng nhập
        loginLink.style.display = 'block'; // Hiển thị nút đăng nhập
        logoutLink.style.display = 'none'; // Ẩn nút đăng xuất
        userIcon.style.display = 'none'; // Ẩn icon user
    }

    // Thêm sự kiện cho nút đăng xuất
    logoutLink.addEventListener('click', () => {
        // Xóa access_token khỏi localStorage khi người dùng đăng xuất
        localStorage.clear();
        window.location.href = '/pages/customer/index.html'; // Tải lại trang để cập nhật giao diện
    });

    loginLink.addEventListener('click', () => {
        // Xóa access_token khỏi localStorage khi người dùng đăng xuất
        localStorage.clear();
        window.location.href = '/pages/customer/login.html'; // Tải lại trang để cập nhật giao diện
    });


    const userDropdown = document.getElementById('user-dropdown');
    
    // Lắng nghe sự kiện click vào icon người dùng
    userIcon.addEventListener('click', () => {
        // Toggle hiển thị dropdown
        userDropdown.classList.toggle('active');
    });

    // Lắng nghe sự kiện click ra ngoài dropdown để đóng dropdown nếu người dùng click bên ngoài
    document.addEventListener('click', (event) => {
        if (!userIcon.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.remove('active');
        }
    });

    document.getElementById('personal-info').addEventListener('click', () => {
        window.location.href = '/pages/customer/profile.html'; // Chuyển tới trang thông tin cá nhân
    });

    document.getElementById('booked-tickets').addEventListener('click', () => {
        window.location.href = '/pages/customer/booked-tickets.html'; // Chuyển tới trang vé đã đặt
    });

    document.getElementById('ticket-returns').addEventListener('click', () => {
        window.location.href = '/pages/customer/return_ticket.html'; // Chuyển tới trang đổi trả vé
    });
});