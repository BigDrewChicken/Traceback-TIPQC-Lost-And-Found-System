let isAdmin = false; 
let currentCategory = ""; // To track what's currently being viewed
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let isToggling = false;

const itemDatabase = {
    Current: [
        { id: "C001", desc: "Red Backpack", date: "2024-05-10", loc: "Library" },
        { id: "C002", desc: "Scientific Calculator", date: "2024-05-12", loc: "Room 302" }
    ],
    Found: [
        { id: "F001", desc: "Gold Wristwatch", date: "2024-05-08", loc: "Gymnasium" }
    ],
    Discarded: [
        { id: "D001", desc: "Broken Umbrella", date: "2024-04-20", loc: "Gate 2" }
    ]
};

async function renderTable(type) {
    currentCategory = type;
    const mainArea = document.getElementById('main-content');

    try {
        const response = await fetch(`http://localhost:3000/api/items/${type}`);
        const items = await response.json();

        let html = ``;

        items.forEach(item => {
            html += `
                <tr class="border-b border-gray-100">
                    <td class="p-5">${item.id}</td>
                    <td class="p-5">${item.item_desc}</td>
                    <td class="p-5">${item.item_date}</td>
                    <td class="p-5">${item.location}</td>
                    </tr>`;
        });
        
        mainArea.innerHTML = html + `</tbody></table></div>`;
    } catch (error) {
        console.error("Failed to fetch data:", error);
        mainArea.innerHTML = "<p class='p-10 text-red-500'>Error connecting to server.</p>";
    }
}

function handleLogin() {
    const userField = document.getElementById('username').value.trim();
    const passField = document.getElementById('password').value.trim();

    // Check credentials
    if (userField === "AdminGoose1625" && passField === "@dm1ntestt") {
        isAdmin = true;
        alert("Admin Mode Active: Database write privileges granted.");
    } else {
        isAdmin = false;
        alert("Access Denied or Standard User Mode.");
    }

    toggleModal();
    
    // Clear fields
    document.getElementById('username').value = "";
    document.getElementById('password').value = "";
    
    // REFRESH THE VIEW
    // If they already clicked a category, re-render it to show admin buttons.
    // If they haven't clicked anything yet, default to 'Current'.
    if (currentCategory) {
        renderTable(currentCategory);
    } else {
        renderTable('Current');
    }
}

// --- KEEP YOUR EXISTING toggleDarkMode() AND toggleModal() BELOW ---
async function toggleDarkMode() {
    if (isToggling) return;
    isToggling = true;
    document.body.classList.toggle('dark');
    const modeText = document.getElementById('modeText');
    const modeIcon = document.getElementById('modeIcon');
    if (document.body.classList.contains('dark')) {
        modeText.innerText = "Light Mode";
        modeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
        modeText.innerText = "Dark Mode";
        modeIcon.classList.replace('fa-sun', 'fa-moon');
    }
    await sleep(500);
    isToggling = false;
}

function toggleModal() {
    document.getElementById('loginModal').classList.toggle('hidden');
}