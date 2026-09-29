// JS - App core: Firebase backend init, Toast UI, Side Panel, and Game logic
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, child } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { firebaseConfig, ADMIN_EMAILS, UPI_ID, UPI_PAYEE_NAME } from "../env/config.js";

// ---- Firebase init (uses env config) ----
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Expose globally so admin.js / payment.js (plain scripts) can use them
window.firebaseAuth = auth;
window.firebaseDb = db;
window.googleProvider = googleProvider;
window.signInWithPopup = signInWithPopup;
window.signOut = signOut;
window.dbRef = ref;
window.dbGet = get;
window.dbSet = set;
window.dbUpdate = update;
window.dbChild = child;
window.ADMIN_EMAILS = ADMIN_EMAILS;
window.UPI_ID = UPI_ID;
window.UPI_PAYEE_NAME = UPI_PAYEE_NAME;

onAuthStateChanged(auth, async (user) => {
    const panelProfileName = document.getElementById("panelProfileName");
    const adminPanelBtn = document.getElementById("adminPanelBtn");

    if (user) {
        document.getElementById("authBtnText").textContent = "Logout";
        document.getElementById("authIcon").className = "fa-solid fa-right-from-bracket";

        panelProfileName.textContent = user.displayName ? user.displayName : "User";

        if (user.email && ADMIN_EMAILS.includes(user.email)) {
            adminPanelBtn.style.display = "flex";
        } else {
            adminPanelBtn.style.display = "none";
        }

        const userRef = ref(db, 'users/' + user.uid);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            const initialData = {
                uid: user.uid,
                name: user.displayName || "User",
                email: user.email || "",
                tokens: 50,
                createdAt: Date.now()
            };
            await set(userRef, initialData);
            updateTokenUI(50);
        } else {
            const userData = snapshot.val();
            updateTokenUI(userData.tokens || 0);
        }
    } else {
        document.getElementById("authBtnText").textContent = "Google Login";
        document.getElementById("authIcon").className = "fa-solid fa-right-to-bracket";
        panelProfileName.textContent = "Not Logged In";
        adminPanelBtn.style.display = "none";
        updateTokenUI(0);
    }
});

// TOAST NOTIFICATION SYSTEM (Replaces alert)
function showToast(message, type = 'info') {
    const container = document.getElementById("toastContainer");

    const toast = document.createElement("div");
    toast.className = `toast-item ${type}`;

    let icon = "fa-circle-info";
    if(type === 'success') icon = "fa-circle-check";
    if(type === 'error') icon = "fa-triangle-exclamation";
    if(type === 'warning') icon = "fa-circle-exclamation";

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close-btn" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
    `;

    container.appendChild(toast);

    setTimeout(() => { toast.classList.add("show"); }, 10);

    let startX = 0;
    toast.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; });
    toast.addEventListener("touchmove", (e) => {
        let diff = e.touches[0].clientX - startX;
        if(Math.abs(diff) > 50) {
            toast.style.transform = `translateX(${diff}px)`;
            toast.style.opacity = "0.5";
        }
    });
    toast.addEventListener("touchend", (e) => {
        let diff = e.changedTouches[0].clientX - startX;
        if(Math.abs(diff) > 100) {
            toast.remove();
        } else {
            toast.style.transform = "";
            toast.style.opacity = "1";
        }
    });

    const autoCloseTimer = setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 5000);

    toast.querySelector(".toast-close-btn").addEventListener("click", () => {
        clearTimeout(autoCloseTimer);
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    });
}
window.showToast = showToast;


// SIDE PANEL, NAVBAR & AUTH UI
const openSidePanelBtn = document.getElementById("openSidePanelBtn");
const closeSidePanelBtn = document.getElementById("closeSidePanelBtn");
const sidePanel = document.getElementById("sidePanel");
const sidePanelOverlay = document.getElementById("sidePanelOverlay");

openSidePanelBtn.addEventListener("click", () => {
    sidePanel.classList.add("show");
    sidePanelOverlay.classList.add("show");
});
closeSidePanelBtn.addEventListener("click", closeSidePanel);
sidePanelOverlay.addEventListener("click", closeSidePanel);

function closeSidePanel() {
    sidePanel.classList.remove("show");
    sidePanelOverlay.classList.remove("show");
}
window.closeSidePanel = closeSidePanel;

function handleAuthClick() {
    const user = window.firebaseAuth.currentUser;
    if (user) {
        window.signOut(window.firebaseAuth).then(() => {
            showToast("Logged out successfully.", "success");
            closeSidePanel();
        });
    } else {
        window.signInWithPopup(window.firebaseAuth, window.googleProvider).then(() => {
            showToast("Logged in successfully!", "success");
            closeSidePanel();
        }).catch((error) => {
            console.error("Login failed", error);
            showToast("Login failed. Check authorized domains.", "error");
        });
    }
}
window.handleAuthClick = handleAuthClick;

function updateTokenUI(tokens) {
    document.getElementById("tokenCount").textContent = tokens;
}
window.updateTokenUI = updateTokenUI;

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
window.isMobileDevice = isMobileDevice;

// TOWER OF HANOI GAME
let numberOfDisks = 3;
const MIN_DISKS = 1;
const MAX_DISKS = 5;
let towers = [[], [], []];
let selectedTower = null;
let moves = 0;
let isSolving = false;

function startGame() {
    if (isSolving) return;
    towers = [[], [], []];
    selectedTower = null;
    moves = 0;
    for (let disk = numberOfDisks; disk >= 1; disk--) {
        towers[0].push(disk);
    }
    updateUI();
}

function updateUI() {
    const towerElements = document.querySelectorAll(".tower");
    towerElements.forEach((towerElement, towerIndex) => {
        const container = towerElement.querySelector(".disks");
        container.innerHTML = "";

        towers[towerIndex].forEach((disk, diskIndex) => {
            const element = document.createElement("div");
            element.className = "disk disk-" + disk;
            element.textContent = disk;
            element.dataset.disk = disk;
            element.dataset.tower = towerIndex;

            const isTopDisk = diskIndex === towers[towerIndex].length - 1;
            if (selectedTower === towerIndex && isTopDisk) {
                element.classList.add("selected-disk");
            }

            if (isTopDisk && !isSolving) {
                addDragListeners(element, towerIndex);
            }

            container.appendChild(element);
        });
    });

    document.getElementById("movesText").textContent = "Moves: " + moves;
    document.getElementById("diskCount").textContent = numberOfDisks;
    document.getElementById("minMovesText").textContent = "Min: " + (Math.pow(2, numberOfDisks) - 1);
}

function addDragListeners(element, towerIndex) {
    let startX, startY;

    element.addEventListener("pointerdown", (e) => {
        if (isSolving) return;
        e.stopPropagation();
        startX = e.clientX;
        startY = e.clientY;
        selectedTower = towerIndex;
        updateUI();

        const onPointerMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            element.style.transform = `translate(${dx}px, ${dy}px) translateY(-8px)`;
            element.style.zIndex = "1000";
        };

        const onPointerUp = (upEvent) => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);

            element.style.transform = "";
            element.style.zIndex = "";

            const elemBelow = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
            const targetTowerEl = elemBelow ? elemBelow.closest(".tower") : null;

            if (targetTowerEl) {
                const targetIndex = Number(targetTowerEl.dataset.tower);
                if (selectedTower !== null && selectedTower !== targetIndex) {
                    moveDisk(selectedTower, targetIndex);
                } else {
                    selectedTower = null;
                    updateUI();
                }
            } else {
                selectedTower = null;
                updateUI();
            }
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    });
}

document.querySelectorAll(".tower").forEach(tower => {
    tower.addEventListener("click", () => {
        if (isSolving) return;
        const index = Number(tower.dataset.tower);
        handleTowerClick(index);
    });
});

function handleTowerClick(index) {
    if (selectedTower === null) {
        if (towers[index].length === 0) {
            document.getElementById("message").textContent = "Pillar is empty. Choose a ring.";
            return;
        }
        selectedTower = index;
        document.getElementById("message").textContent = "Ring lifted! Tap target pillar.";
        updateUI();
        return;
    }

    if (selectedTower === index) {
        selectedTower = null;
        document.getElementById("message").textContent = "Selection released.";
        updateUI();
        return;
    }

    moveDisk(selectedTower, index);
}

function moveDisk(from, to) {
    const source = towers[from];
    const destination = towers[to];
    const disk = source[source.length - 1];
    const top = destination[destination.length - 1];

    if (top !== undefined && disk > top) {
        triggerError();
        return;
    }

    source.pop();
    destination.push(disk);
    moves++;
    selectedTower = null;

    document.getElementById("message").textContent = "Placed smoothly!";
    updateUI();
    checkWin();
}

function triggerError() {
    const gameEl = document.getElementById("game");
    const msgEl = document.getElementById("message");
    gameEl.classList.add("danger-flash");
    msgEl.textContent = "Larger ring cannot go on smaller one!";

    setTimeout(() => {
        gameEl.classList.remove("danger-flash");
        msgEl.textContent = "Try again.";
        selectedTower = null;
        updateUI();
    }, 700);
}

function checkWin() {
    const victoryModal = document.getElementById("victoryModal");
    if (towers[2].length === numberOfDisks) {
        document.getElementById("victoryText").textContent = `Completed in ${moves} moves!`;
        victoryModal.classList.add("show");
    }
}

function resetGame() {
    if (isSolving) return;
    startGame();
    document.getElementById("message").textContent = "Game restarted.";
    document.getElementById("victoryModal").classList.remove("show");
}
window.resetGame = resetGame;

function addDisk() {
    if (isSolving || numberOfDisks >= MAX_DISKS) return;
    numberOfDisks++;
    startGame();
}
window.addDisk = addDisk;

function removeDisk() {
    if (isSolving || numberOfDisks <= MIN_DISKS) return;
    numberOfDisks--;
    startGame();
}
window.removeDisk = removeDisk;

function closeVictoryModal() {
    document.getElementById("victoryModal").classList.remove("show");
    resetGame();
}
window.closeVictoryModal = closeVictoryModal;

function getHanoiMoves(n, from, to, aux, movesList = []) {
    if (n === 0) return movesList;
    getHanoiMoves(n - 1, from, aux, to, movesList);
    movesList.push({ from, to });
    getHanoiMoves(n - 1, aux, to, from, movesList);
    return movesList;
}

function autoSolve() {
    if (isSolving) return;
    resetGame();
    isSolving = true;
    selectedTower = null;

    const steps = getHanoiMoves(numberOfDisks, 0, 2, 1);
    let stepIndex = 0;

    document.getElementById("message").textContent = "Auto-solving puzzle...";

    const solveInterval = setInterval(() => {
        if (stepIndex >= steps.length) {
            clearInterval(solveInterval);
            isSolving = false;
            document.getElementById("message").textContent = "Puzzle auto-solved!";
            return;
        }

        const move = steps[stepIndex];
        const source = towers[move.from];
        const destination = towers[move.to];
        const disk = source.pop();
        destination.push(disk);
        moves++;
        updateUI();
        checkWin();

        stepIndex++;
    }, 500);
}
window.autoSolve = autoSolve;

startGame();