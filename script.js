let currentCategory = "";
let isLoggedIn = false;

// INIT
document.addEventListener("DOMContentLoaded", () => {
    fetchLocations();
});

async function fetchLocations() {
    try {
        const res = await fetch("http://localhost:3000/api/locations");
        const locations = await res.json();
        const datalist = document.getElementById("locationOptions");

        if (datalist && locations.length > 0) {
            datalist.innerHTML = "";
            locations.forEach(loc => {
                const option = document.createElement("option");
                option.value = loc.Location_ID_PK; 
                datalist.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Failed to load locations:", err);
    }
}

// MODALS
function toggleModal() {
    const modal = document.getElementById("loginModal");
    modal.classList.toggle("hidden");
}

function toggleItemModal() {
    const modal = document.getElementById("itemModal");
    modal.classList.toggle("hidden");
}

// DARK
function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById("modeIcon");
    const text = document.getElementById("modeText");

    body.classList.toggle("dark");
    const isDark = body.classList.contains("dark");

    icon.classList.toggle("fa-moon", !isDark);
    icon.classList.toggle("fa-sun", isDark);
    text.innerText = isDark ? "Light Mode" : "Dark Mode";

    if (currentCategory) renderTable(currentCategory);
}

// LOGIN
async function handleLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch("http://localhost:3000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success) {
            isLoggedIn = true;
            document.getElementById("adminBtn").classList.add("hidden");
            toggleModal();
            alert("Welcome Admin");
            if (currentCategory) renderTable(currentCategory);
        } else {
            alert("Invalid credentials");
        }
    } catch (err) {
        console.error("Login failed:", err);
        alert("Server error during login.");
    }
}

// TABLE
async function renderTable(type) {
    currentCategory = type;
    const main = document.getElementById("main-content");
    const isDark = document.body.classList.contains("dark");

    main.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-black ${isDark ? "text-yellow-400" : "text-black"}">${type} Records</h1>
            ${type === "Current" && isLoggedIn ? `
                <button onclick="toggleItemModal()" class="bg-yellow-400 text-black px-5 py-2 rounded font-bold hover:bg-yellow-500 transition-colors">
                    <i class="fas fa-plus mr-2"></i> Add Record
                </button>` : ""}
        </div>
        <div id="table-container" class="overflow-x-auto">Loading...</div>`;

    try {
        const res = await fetch(`http://localhost:3000/api/items/${type}`);
        const data = await res.json();

        if (!data || !data.length) {
            document.getElementById("table-container").innerHTML = `<div class="text-center text-gray-400 p-10">No records found in ${type}</div>`;
            return;
        }

        const keys = Object.keys(data[0]);
        const showActions = isLoggedIn;

        let html = `
        <table class="w-full border-collapse ${isDark ? "text-yellow-400" : "text-black"}">
            <thead>
                <tr class="bg-yellow-400 text-black">
                    ${keys.map(k => `<th class="p-3 border text-left uppercase text-xs">${k.replace(/_/g, ' ')}</th>`).join("")}
                    ${showActions ? `<th class="p-3 border text-center">Actions</th>` : ""}
                </tr>
            </thead>
            <tbody>`;

        data.forEach(row => {
            const id = row.Item_ID_PK || row.Item_ID_FK;
            html += `<tr class="${isDark ? "hover:bg-zinc-900" : "hover:bg-gray-50"} transition-colors">`;
            
            keys.forEach(k => {
                html += `<td class="p-3 border text-sm">${row[k] ?? "-"}</td>`;
            });

            if (showActions) {
                html += `<td class="p-3 border"><div class="flex gap-2 justify-center">`;
                
                if (type === "Current") {
                    html += `
                        <button title="Mark Found" onclick="handleAction('Found', '${id}')" class="btn-action bg-green-500 text-white rounded"><i class="fas fa-check"></i></button>
                        <button title="Discard" onclick="handleAction('Discard', '${id}')" class="btn-action bg-orange-500 text-white rounded"><i class="fas fa-trash"></i></button>
                        <button title="Permanent Delete" onclick="handleAction('Delete', '${id}')" class="btn-action bg-red-600 text-white rounded"><i class="fas fa-xmark"></i></button>`;
                } else {
                    html += `<button title="Restore" onclick="handleAction('Restore', '${id}')" class="btn-action bg-blue-500 text-white rounded"><i class="fas fa-rotate-left"></i></button>`;
                    html += `<button title="Permanent Delete" onclick="handleAction('Delete', '${id}')" class="btn-action bg-red-600 text-white rounded"><i class="fas fa-xmark"></i></button>`;
                }
                html += `</div></td>`;
            }
            html += `</tr>`;
        });

        document.getElementById("table-container").innerHTML = html + `</tbody></table>`;
    } catch (err) {
        document.getElementById("table-container").innerHTML = `<div class="text-red-500 p-10">Failed to load data.</div>`;
    }
}

// ADD
async function saveItem() {
    const itemData = {
        name: document.getElementById("in-name").value,
        desc: document.getElementById("in-desc").value,
        student_id: document.getElementById("in-stud").value,
        date: document.getElementById("in-date").value,
        location: document.getElementById("locationInput").value,
        category: document.getElementById("in-cat").value
    };

    try {
        const res = await fetch("http://localhost:3000/api/items/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemData)
        });

        if (res.ok) {
            toggleItemModal();
            renderTable("Current");
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (err) {
        alert("Could not connect to server.");
    }
}

// ACTION
async function handleAction(action, id) {
    if (!confirm(`Are you sure you want to ${action} this item?`)) return;

    let url = "";
    let body = {};

    if (action === "Found") {
        url = `/api/items/found/${id}`;
        const claimant = prompt("Enter Student ID of the claimant:");
        if (!claimant) return;
        body = { student_id: claimant };
    } else if (action === "Discard") {
        url = `/api/items/discard/${id}`;
        body = { reason: prompt("Reason for discarding?") || "No reason" };
    } else if (action === "Restore") {
        url = `/api/items/restore/${id}`;
    } else if (action === "Delete") {
        url = `/api/items/delete/${id}`;
    }

    try {
        const res = await fetch(`http://localhost:3000${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: Object.keys(body).length ? JSON.stringify(body) : undefined
        });

        if (res.ok) {
            renderTable(currentCategory);
        } else {
            const errData = await res.json();
            alert(errData.error || "Action failed");
        }
    } catch (err) {
        alert("Server connection failed.");
    }
}