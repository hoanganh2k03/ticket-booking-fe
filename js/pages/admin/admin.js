// js/pages/admin/admin.js
import { handleLogout } from "../../services/logout.js";

const HTML_BASE = "/pages/admin/";      // đường dẫn chứa các file HTML
const JS_BASE = "/js/pages/admin/";   // đường dẫn chứa các module JS

// 1) Fetch một file text (HTML hoặc JS) với cache‑busting
async function fetchText(path) {
    const res = await fetch(path + "?t=" + Date.now());
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.text();
}

// 2) Load HTML fragment vào content-container
async function renderHTML(href) {
    const htmlPath = HTML_BASE + href;
    const htmlText = await fetchText(htmlPath);
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    document.getElementById("content-container").innerHTML = doc.body.innerHTML;
}

// 3) Dynamic import module JS tương ứng
async function runModule(href) {
    // href ví dụ "returns/returns.html" -> jsModule = "/js/pages/admin/returns/returns.js"
    const jsModule = JS_BASE + href.replace(/\.html$/, ".js");
    try {
        await import(jsModule + "?t=" + Date.now());
    } catch (err) {
        console.error(`Failed to import module ${jsModule}:`, err);
    }
}

// 4) Tổng hợp: render HTML xong rồi import module
async function loadPage(href) {
    await renderHTML(href);
    await runModule(href);
}

// 5) Khởi tạo sidebar và gắn event cho từng link
async function initSidebar() {
    const sidebarHtml = await fetchText(HTML_BASE + "sidebar.html");
    document.getElementById("sidebar-container").innerHTML = sidebarHtml;

    document
        .querySelectorAll("#sidebar-container #sidebar .sidebar-link")
        .forEach((a) => {
            const href = a.getAttribute("href");
            if (href === "#logout") {
                // logout
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    handleLogout();
                });
            } else if (href.endsWith(".html")) {
                // internal page
                a.addEventListener("click", (e) => {
                    e.preventDefault();
                    window.location.hash = href.replace(/\.html$/, "");
                    loadPage(href);
                });
            }
            // các href khác (external links) vẫn giữ nguyên
        });
}

// 6) Toggle sidebar (luu trạng thái vào localStorage)
function initSidebarToggle() {
    const sidebar = document.getElementById("sidebar");
    const content = document.getElementById("content-container");
    const toggleBtn = document.querySelector("#sidebar-container .toggle-btn");

    // Khôi phục
    if (localStorage.getItem("sidebarExpanded") === "true") {
        sidebar.classList.add("expand");
        content.style.marginLeft = "280px";
    } else {
        content.style.marginLeft = "70px";
    }

    toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("expand");
        const expanded = sidebar.classList.contains("expand");
        content.style.marginLeft = expanded ? "280px" : "70px";
        localStorage.setItem("sidebarExpanded", expanded);
    });
}

// 7) Khởi tạo toàn bộ
async function init() {
    // A) Load sidebar và gắn event
    await initSidebar();
    initSidebarToggle();

    // B) Xác định page ban đầu: lấy từ hash hoặc default sang profile.html
    const initial = window.location.hash.slice(1) || "profile";
    await loadPage(initial + ".html");

    // C) Bắt sự kiện back/forward
    window.addEventListener("hashchange", () => {
        const key = window.location.hash.slice(1);
        if (key) loadPage(key + ".html");
    });
}

init();
