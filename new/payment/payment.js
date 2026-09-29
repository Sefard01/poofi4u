let qrCodeInstance = null;

function openPaymentModal() {
    const user = window.firebaseAuth.currentUser;
    if (!user) {
        showToast("Please login with Google first!", "warning");
        return;
    }
    closeSidePanel();
    document.getElementById("paymentModal").classList.add("show");

    if (isMobileDevice()) {
        document.getElementById("mobilePaymentArea").style.display = "block";
    } else {
        document.getElementById("mobilePaymentArea").style.display = "none";
    }
    updatePaymentUI();
}
window.openPaymentModal = openPaymentModal;

function closePaymentModal() {
    document.getElementById("paymentModal").classList.remove("show");
    document.getElementById("utrInput").value = "";
    document.getElementById("upiIdInput").value = "";
}
window.closePaymentModal = closePaymentModal;

function switchTab(tab) {
    const sendTabBtn = document.getElementById("sendTabBtn");
    const receiveTabBtn = document.getElementById("receiveTabBtn");
    const sendContent = document.getElementById("sendTabContent");
    const receiveContent = document.getElementById("receiveTabContent");

    if (tab === 'send') {
        sendTabBtn.classList.add("active");
        receiveTabBtn.classList.remove("active");
        sendContent.style.display = "block";
        receiveContent.style.display = "none";
    } else {
        receiveTabBtn.classList.add("active");
        sendTabBtn.classList.remove("active");
        receiveContent.style.display = "block";
        sendContent.style.display = "none";
    }
}
window.switchTab = switchTab;

function updatePaymentUI() {
    const amount = document.getElementById("customAmount").value || "50";
    const upiUrl = `upi://pay?pa=${window.UPI_ID}&pn=${encodeURIComponent(window.UPI_PAYEE_NAME)}&am=${amount}&cu=INR`;

    if (isMobileDevice()) {
        document.getElementById("upiLinkBtn").href = upiUrl;
    }

    const qrContainer = document.getElementById("qrcodeContainer");
    qrContainer.innerHTML = "";
    qrCodeInstance = new QRCode(qrContainer, {
        text: upiUrl,
        width: 130,
        height: 130,
        colorDark: "#2c2422",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}
window.updatePaymentUI = updatePaymentUI;

function updateRedeemInfo() {
    const tokens = document.getElementById("redeemTokensInput").value || 0;
    document.getElementById("redeemInfoText").textContent = `You will receive: ₹${tokens} within 1-30 mins`;
}
window.updateRedeemInfo = updateRedeemInfo;

async function verifyAndClaimTokens() {
    const utr = document.getElementById("utrInput").value.trim();
    const amount = Number(document.getElementById("customAmount").value) || 50;
    const user = window.firebaseAuth.currentUser;

    if (!user) { showToast("Please login first.", "warning"); return; }
    if (!utr) { showToast("Please enter UTR / Transaction ID.", "warning"); return; }

    try {
        const userRef = window.dbRef(window.firebaseDb, 'users/' + user.uid);
        const snapshot = await window.dbGet(userRef);
        const currentTokens = snapshot.exists() ? (snapshot.val().tokens || 0) : 0;

        await window.dbUpdate(userRef, {
            tokens: currentTokens + amount,
            lastUtr: utr,
            lastRechargeAmount: amount,
            lastRechargeDate: new Date().toLocaleString()
        });

        showToast(`Success! ${amount} Tokens added to your wallet.`, "success");
        closePaymentModal();
        updateTokenUI(currentTokens + amount);
    } catch (error) {
        console.error("Error:", error);
        showToast("Failed to claim tokens.", "error");
    }
}
window.verifyAndClaimTokens = verifyAndClaimTokens;

async function requestRedemption() {
    const tokensToRedeem = Number(document.getElementById("redeemTokensInput").value) || 0;
    const upiId = document.getElementById("upiIdInput").value.trim();
    const user = window.firebaseAuth.currentUser;

    if (!user) { showToast("Please login first.", "warning"); return; }
    if (tokensToRedeem <= 0) { showToast("Enter valid tokens to redeem.", "warning"); return; }
    if (!upiId) { showToast("Enter your UPI ID or Mobile Number.", "warning"); return; }

    try {
        const userRef = window.dbRef(window.firebaseDb, 'users/' + user.uid);
        const snapshot = await window.dbGet(userRef);
        const userData = snapshot.exists() ? snapshot.val() : {};
        const currentTokens = userData.tokens || 0;

        if (currentTokens < tokensToRedeem) {
            showToast("You don't have enough tokens in your wallet!", "error");
            return;
        }

        await window.dbUpdate(userRef, {
            tokens: currentTokens - tokensToRedeem,
            lastRedeemUPI: upiId,
            lastRedeemAmount: tokensToRedeem,
            redeemStatus: "Pending",
            redeemDate: new Date().toLocaleString()
        });

        showToast(`Redemption request submitted successfully! ₹${tokensToRedeem} will be sent to ${upiId}.`, "success");
        closePaymentModal();
        updateTokenUI(currentTokens - tokensToRedeem);
    } catch (error) {
        console.error("Error:", error);
        showToast("Redemption failed.", "error");
    }
}
window.requestRedemption = requestRedemption;