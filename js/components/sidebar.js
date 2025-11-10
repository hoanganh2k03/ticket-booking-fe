document.addEventListener('DOMContentLoaded', () => {
    fetch('/pages/admin/sidebar.html') // Thay bằng đường dẫn thực tế đến side.html
        .then(response => {
            if (!response.ok) {
                throw new Error('Không thể tải sidebar: ' + response.statusText);
            }
            return response.text();
        })
        .then(data => {
            document.getElementById('sidebar').innerHTML = data;
            // Gắn lại sự kiện cho toggle button sau khi sidebar được tải
            const toggleBtn = document.querySelector('.toggle-btn');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', toggleSidebar);
            }
            // Gắn sự kiện cho logout (nếu cần)
            const logoutLink = document.querySelector('.sidebar-footer .sidebar-link');
            if (logoutLink) {
                logoutLink.addEventListener('click', handleLogout);
            }
            // Đánh dấu link active cho trang hiện tại
            const sidebarLinks = document.querySelectorAll('.sidebar-link');
            sidebarLinks.forEach(link => {
                if (link.textContent.includes('Thông tin người dùng')) {
                    link.classList.add('active');
                }
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải sidebar:', error);
            document.getElementById('sidebar').innerHTML = `
                <div class="text-center p-3">
                    <p class="text-white">Lỗi tải sidebar. Vui lòng thử lại.</p>
                </div>
            `;
        });
});

// Hàm toggle sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.querySelector('.content').classList.toggle('collapsed');
}

// Hàm xử lý đăng xuất
function handleLogout() {
    // Thêm logic đăng xuất ở đây (ví dụ: gọi API, xóa token, chuyển hướng)
    console.log('Đăng xuất');
    // Ví dụ: window.location.href = '/logout';
}