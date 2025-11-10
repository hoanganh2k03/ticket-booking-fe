function handleLogout() {
    localStorage.removeItem('refresh');
    localStorage.removeItem('access');
    localStorage.removeItem('username');
    localStorage.removeItem('full_name');
    localStorage.removeItem('role');

    // Chuyển về trang đăng nhập 
    window.location.href = '/pages/login_empl.html';
}

export { handleLogout };

// window.handleLogout = handleLogout;  