const navbarTemplates = {
    template: `
        <div class="logo" class="logo-link" onclick="window.location.href='/pages/customer/index.html'">
            <img src="/assets/images/logo.png" alt="WEBOOK Logo" />
            <span>SportsTix</span>
        </div>
        <div class="user-actions nav-links">
            <a id="login-link" href="#">Đăng nhập</a>
            <a id="logout-link" href="#">Đăng xuất</a>
            <a id="user-icon" href="#"><i class="fas fa-user"></i></a>
        
            <div id="user-dropdown" class="dropdown-menu">
                <a href="#" id="personal-info">Thông tin cá nhân</a>
                <a href="#" id="booked-tickets">Vé đã đặt</a>
                <a href="#" id="ticket-returns">Đổi trả vé</a>
            </div>
        </div>
    `,
};

function loadNavbar(selector) {

    const container = document.querySelector(selector); // Lấy phần tử container của navbar
    container.innerHTML = navbarTemplates['template']; // Chèn template navbar phù hợp

    // Kiểm tra token đăng nhập từ localStorage và điều chỉnh giao diện navbar
    const accessToken = localStorage.getItem('access_token');
    const loginLink = document.getElementById('login-link');
    const logoutLink = document.getElementById('logout-link');
    const userIcon = document.getElementById('user-icon');

    if (accessToken) {
        loginLink.style.display = 'none'; // Ẩn nút đăng nhập
        logoutLink.style.display = 'block'; // Hiển thị nút đăng xuất
        userIcon.style.display = 'block'; // Hiển thị icon người dùng
    } else {
        loginLink.style.display = 'block'; // Hiển thị nút đăng nhập
        logoutLink.style.display = 'none'; // Ẩn nút đăng xuất
        userIcon.style.display = 'none'; // Ẩn icon người dùng
    }

    // Thêm sự kiện cho nút đăng xuất
    logoutLink.addEventListener('click', () => {
        // Xóa access_token khỏi localStorage khi người dùng đăng xuất
        localStorage.clear();
        window.location.href = '/pages/customer/index.html'; // Tải lại trang để cập nhật giao diện
    });

    loginLink.addEventListener('click', () => {
        localStorage.clear();
        // Chuyển hướng đến trang đăng nhập
        window.location.href = '/pages/customer/login.html';
    });

    // Thêm sự kiện cho dropdown user
    const userDropdown = document.getElementById('user-dropdown');
    userIcon.addEventListener('click', () => {
        userDropdown.classList.toggle('active'); // Mở/đóng dropdown
    });

    // Đóng dropdown khi click ra ngoài
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
}

document.addEventListener('DOMContentLoaded', () => {
    loadNavbar('#navbar-placeholder'); // Tải navbar vào placeholder
});
