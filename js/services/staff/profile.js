import { fetchWithToken } from '../../utils/handleToken.js';
import CONFIG from "../../utils/settings.js";
const BASE_URL = CONFIG.BASE_URL;


document.addEventListener("DOMContentLoaded", function() {
    // Lấy thông tin người dùng khi trang được tải
    fetchUserProfile();

    // Lưu thông tin thay đổi khi người dùng nhấn nút lưu
    const saveButton = document.querySelector('.edit-btn');
    saveButton.addEventListener('click', saveProfileChanges);
});

// Lấy thông tin người dùng từ API và điền vào form
function fetchUserProfile() {
    // Gọi API để lấy thông tin người dùng, sử dụng fetchWithToken để quản lý token
    fetchWithToken(`${BASE_URL}/api/accounts/employee/profile/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success" && data.data) {
            const profile = data.data;
            // Điền thông tin vào các trường trong form

            // Điền thông tin vào phần "Tên người dùng" (profile header)
            document.getElementById('full-name').textContent = profile.full_name;
            document.getElementById('role').textContent = profile.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
            const profileImage = document.getElementById('profile-image');
            if (profile.image) {
                profileImage.src = `${BASE_URL}` + profile.image; // Đảm bảo bạn có một thẻ <img> với id="profile-image"
            }

            // Điền thông tin vào phần "Thông tin cá nhân" (info section)
            document.getElementById('user-id').textContent = profile.id;
            document.getElementById('user-full-name').textContent = profile.full_name;
            document.getElementById('user-birthdate').textContent = profile.date_of_birth;
            document.getElementById('user-gender').textContent = profile.gender ? 'Nữ' : 'Nam';
            document.getElementById('user-phone').textContent = profile.phone_number;
            document.getElementById('user-email').textContent = profile.email;
            document.getElementById('user-citizen-id').textContent = profile.citizen_id;
            document.getElementById('user-address').textContent = profile.address;
            document.getElementById('user-username').textContent = profile.username;
            document.getElementById('user-role').textContent = profile.role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
            document.getElementById('user-created-at').textContent = new Date(profile.created_at).toLocaleString();
        } else {
            showToast('Không thể tải thông tin người dùng.', 'danger');
        }
    })
    .catch(error => {
        console.error('Error fetching profile:', error);
        showToast('Có lỗi xảy ra khi tải thông tin.', 'danger');
    });
}

// Lưu thông tin thay đổi khi người dùng nhấn nút lưu
function saveProfileChanges() {
    // Thu thập các giá trị từ form
    const updatedProfile = {
        full_name: document.getElementById('full_name').value,
        date_of_birth: document.getElementById('date_of_birth').value,
        gender: document.getElementById('gender').value,
        phone_number: document.getElementById('phone_number').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
    };

    // Lấy ảnh từ input file
    const imageInput = document.getElementById('image');
    const imageFile = imageInput.files[0]; // Lấy file đầu tiên nếu có

    // Tạo FormData để gửi ảnh và dữ liệu form
    const formData = new FormData();
    formData.append('full_name', updatedProfile.full_name);
    formData.append('date_of_birth', updatedProfile.date_of_birth);
    formData.append('gender', updatedProfile.gender);
    formData.append('phone_number', updatedProfile.phone_number);
    formData.append('email', updatedProfile.email);
    formData.append('address', updatedProfile.address);

    // Nếu có ảnh, thêm vào FormData
    if (imageFile) {
        formData.append('image', imageFile);
    }

    // Gửi yêu cầu cập nhật thông tin người dùng tới API
    fetchWithToken(`${BASE_URL}/api/accounts/employee/profile/update/`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
        body: formData // Sử dụng FormData thay vì JSON
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === "success" && data.data) {
            showToast(data.message, 'success');
            setTimeout(function() {
                location.reload();
            }, 1000);
        } else {
            if (data.data) {
                // Lặp qua tất cả các trường trong data.data và hiển thị từng lỗi
                for (const field in data.data) {
                    if (data.data[field] && data.data[field].length > 0) {
                        // Lấy thông báo lỗi đầu tiên của từng trường
                        const errorMessage = `${data.data[field][0]}`;
                        showToast(errorMessage, 'danger'); // Hiển thị lỗi cho mỗi trường
                    }
                }
            } else {
                showToast(data.message, 'danger');
            }
        }
    })
    .catch(error => {
        console.error('Error saving profile:', error);
        showToast('Có lỗi xảy ra khi lưu thay đổi.', 'danger');
    });
}