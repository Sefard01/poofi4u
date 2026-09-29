let allUsersCache = [];

async function openAdminDashboard() {
    closeSidePanel();
    document.getElementById("adminModal").classList.add("show");
    await fetchAdminData();
}
window.openAdminDashboard = openAdminDashboard;

function closeAdminDashboard() {
    document.getElementById("adminModal").classList.remove("show");
}
window.closeAdminDashboard = closeAdminDashboard;

async function fetchAdminData() {
    try {
        const usersRef = window.dbRef(window.firebaseDb, 'users');
        const snapshot = await window.dbGet(usersRef);

        const rechargeTableBody = document.getElementById("adminRechargeTableBody");
        const redeemContainer = document.getElementById("adminRedeemContainer");

        rechargeTableBody.innerHTML = "";
        redeemContainer.innerHTML = "";
        allUsersCache = [];

        if (!snapshot.exists()) {
            rechargeTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No data found</td></tr>`;
            redeemContainer.innerHTML = `<p style="text-align:center;">No requests found</p>`;
            return;
        }

        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            allUsersCache.push(userData);

            if (userData.lastRechargeAmount) {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><strong>${userData.name || "Unknown"}</strong></td>
                    <td>₹${userData.lastRechargeAmount}</td>
                    <td>${userData.lastUtr || "N/A"}</td>
                    <td>${userData.lastRechargeDate || "N/A"}</td>
                `;
                rechargeTableBody.appendChild(tr);
            }

            if (userData.redeemStatus === "Pending" && userData.lastRedeemAmount) {
                const card = document.createElement("div");
                card.className = "request-card";
                const manualUpiLink = `upi://pay?pa=${userData.lastRedeemUPI}&pn=${encodeURIComponent(userData.name || 'User')}&am=${userData.lastRedeemAmount}&cu=INR`;

                card.innerHTML = `
                    <p><strong>Name:</strong> ${userData.name || "Unknown"}</p>
                    <p><strong>Amount:</strong> ₹${userData.lastRedeemAmount}</p>
                    <p><strong>UPI/Mobile:</strong> ${userData.lastRedeemUPI}</p>
                    <p><strong>Date:</strong> ${userData.redeemDate || "N/A"}</p>
                    <div style="display: flex; gap: 6px; margin-top: 6px;">
                        <a href="${manualUpiLink}" target="_blank" style="flex:1; background:#4a7c59; color:white; padding:6px; text-decoration:none; border-radius:6px; text-align:center; font-weight:700; font-size:11px;">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Pay Manually
                        </a>
                        <button onclick="markRedeemComplete('${userData.uid}')" style="background:#eef3ef; color:#2f4f36; border-color:#b5c9b8; padding:6px 10px; font-size:11px;">Approve</button>
                    </div>
                `;
                redeemContainer.appendChild(card);
            }
        });

        if (rechargeTableBody.innerHTML === "") {
            rechargeTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No recharges recorded yet</td></tr>`;
        }
        if (redeemContainer.innerHTML === "") {
            redeemContainer.innerHTML = `<p style="text-align:center; color:#8c5d19; padding: 10px;">No pending withdrawal requests.</p>`;
        }

    } catch (error) {
        console.error("Error loading admin data:", error);
    }
}
window.fetchAdminData = fetchAdminData;

function filterAdminData() {
    const query = document.getElementById("adminSearchInput").value.toLowerCase();
    const rechargeTableBody = document.getElementById("adminRechargeTableBody");
    rechargeTableBody.innerHTML = "";

    const filtered = allUsersCache.filter(u => u.name && u.name.toLowerCase().includes(query) && u.lastRechargeAmount);

    if (filtered.length === 0) {
        rechargeTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No matching records</td></tr>`;
        return;
    }

    filtered.forEach(userData => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${userData.name}</strong></td>
            <td>₹${userData.lastRechargeAmount}</td>
            <td>${userData.lastUtr || "N/A"}</td>
            <td>${userData.lastRechargeDate || "N/A"}</td>
        `;
        rechargeTableBody.appendChild(tr);
    });
}
window.filterAdminData = filterAdminData;

async function markRedeemComplete(uid) {
    try {
        const userRef = window.dbRef(window.firebaseDb, 'users/' + uid);
        await window.dbUpdate(userRef, {
            redeemStatus: "Completed"
        });
        showToast("Marked as Completed!", "success");
        fetchAdminData();
    } catch (err) {
        console.error(err);
        showToast("Failed to update status.", "error");
    }
}
window.markRedeemComplete = markRedeemComplete;