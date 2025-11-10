import { fetchWithToken } from "../../utils/handleToken.js";
import { showToast } from "../../components/toast.js";
import CONFIG from "../../utils/settings.js";

const BASE_URL = CONFIG.BASE_URL;
// Thiết lập giới hạn ngày: chỉ cho phép chọn các ngày trước hoặc bằng (today - 18 năm)
const dateInput = document.getElementById("date_of_birth");
if (dateInput) {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.max = `${yyyy}-${mm}-${dd}`;
}

function fetchUserProfile() {
    fetchWithToken(`${CONFIG.BASE_URL}/api/accounts/employee/profile/`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    })
        .then((res) => res.json())
        .then((json) => {
            if (json.status === "success" && json.data) {
                const p = json.data;

                // Header
                document.getElementById("full-name").textContent = p.full_name;
                document.getElementById("role").textContent =
                    p.role === "admin" ? "Quản trị viên hệ thống" : "Nhân viên";
                const avatar = document.querySelector(".avatar");
                if (p.image) avatar.src = `${BASE_URL}` + p.image;

                // Info section
                document.getElementById("user-id").textContent = p.id;
                document.getElementById("name").textContent = p.full_name;
                document.getElementById("user-birthdate").textContent = p.date_of_birth;
                document.getElementById("user-gender").textContent = p.gender
                    ? "Nữ"
                    : "Nam";
                document.getElementById("user-phone").textContent = p.phone_number;
                document.getElementById("user-email").textContent = p.email;
                document.getElementById("user-citizen-id").textContent = p.citizen_id;
                document.getElementById("user-address").textContent = p.address;

                // Edit form
                document.getElementById("full_name").value = p.full_name;
                document.getElementById("username").value = p.username;
                document.getElementById("date_of_birth").value = p.date_of_birth;
                document.getElementById("gender").value = p.gender ? "1" : "0";
                document.getElementById("phone_number").value = p.phone_number;
                document.getElementById("email").value = p.email;
                document.getElementById("address").value = p.address;
            } else {
                showToast("Không thể tải thông tin người dùng.", "danger");
            }
        })
        .catch((err) => {
            console.error(err);
            showToast("Lỗi khi tải thông tin.", "danger");
        });
}

function saveProfileChanges() {
    const formData = new FormData();
    formData.append("full_name", document.getElementById("full_name").value);
    formData.append(
        "date_of_birth",
        document.getElementById("date_of_birth").value
    );
    formData.append("gender", document.getElementById("gender").value);
    formData.append(
        "phone_number",
        document.getElementById("phone_number").value
    );
    formData.append("email", document.getElementById("email").value);
    formData.append("address", document.getElementById("address").value);

    const fileInput = document.getElementById("image");
    if (fileInput && fileInput.files.length) {
        formData.append("image", fileInput.files[0]);
    }

    fetchWithToken(
        `${BASE_URL}/api/accounts/employee/profile/update/`,
        {
            method: "PATCH",
            body: formData,
        }
    )
        .then((res) => res.json())
        .then((json) => {
            if (json.status === "success") {
                showToast(json.message, "success");
                setTimeout(() => location.reload(), 1000);
            } else {
                if (json.data && Object.keys(json.data).length > 0) {
                    const firstField = Object.keys(json.data)[0];
                    const firstError = Array.isArray(json.data[firstField])
                        ? json.data[firstField][0]
                        : json.data[firstField];
                    showToast(firstError, "danger");
                } else {
                    showToast(json.message || "Lỗi khi lưu thay đổi.", "danger");
                }
            }
        })
        .catch((err) => {
            console.error(err);
            showToast("Lỗi khi lưu thay đổi.", "danger");
        });
}

// 1. Lấy profile và điền vào UI như trước...
fetchUserProfile();

// 2. Toggle edit/info và đổi mật khẩu
const editSection = document.getElementById("edit-info-section");
const passSection = document.getElementById("change-password-section");

function bindProfileActions() {
  const btnEdit = document.getElementById("btn-edit-info");
  const btnPass = document.getElementById("btn-change-password-toggle");
  const editSect = document.getElementById("edit-info-section");
  const passSect = document.getElementById("change-password-section");

  if (btnEdit && !btnEdit._bound) {
    btnEdit.addEventListener("click", () => {
      editSect.classList.toggle("d-none");
      passSect.classList.add("d-none");
    });
    btnEdit._bound = true;
  }
  if (btnPass && !btnPass._bound) {
    btnPass.addEventListener("click", () => {
      passSect.classList.toggle("d-none");
      editSect.classList.add("d-none");
    });
    btnPass._bound = true;
  }
}

// 3. Save thông tin
document
    .getElementById("btn-save-info")
    .addEventListener("click", saveProfileChanges);

// 4. Đổi mật khẩu
document.getElementById("btn-doi-mat-khau").addEventListener("click", () => {
    const old_password = document.getElementById("old_password").value;
    const new_password = document.getElementById("new_password").value;
    const confirm_new_password = document.getElementById(
        "confirm_new_password"
    ).value;

    if (!old_password || !new_password || !confirm_new_password) {
        showToast("Vui lòng điền đầy đủ các trường.", "danger");
        return;
    }
    if (new_password !== confirm_new_password) {
        showToast("Mật khẩu mới và xác nhận không khớp.", "danger");
        return;
    }

    fetchWithToken(
        `${BASE_URL}/api/accounts/employee/change-password/`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ old_password, new_password }),
        }
    )
        .then((res) => res.json())
        .then((json) => {
            if (json.status === "success") {
                showToast("Đổi mật khẩu thành công.", "success");
                document.getElementById("form-change-password").reset();
            } else {
                if (json.data && Object.keys(json.data).length) {
                    Object.values(json.data)
                        .flat()
                        .forEach((msg) => showToast(msg, "danger"));
                } else {
                    showToast(json.message || "Lỗi khi đổi mật khẩu.", "danger");
                }
            }
        })
        .catch((err) => {
            console.error(err);
            showToast("Lỗi khi đổi mật khẩu.", "danger");
        });
});

const localRole = localStorage.getItem('role');
if (localRole === 'staff') {
    const btnEdit = document.getElementById('btn-edit-info');
    if (btnEdit) {
        btnEdit.classList.add('d-none');
    }
}

bindProfileActions();
const observer = new MutationObserver(muts => {
  for (let m of muts) {
    if ([...m.addedNodes].some(n =>
      n.nodeType === 1 && n.querySelector?.("#btn-edit-info")
    )) {
      bindProfileActions();
      break;
    }
  }
});
observer.observe(document.body, { childList: true, subtree: true });