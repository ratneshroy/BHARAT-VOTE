const abi = [
    "function startElection()",
    "function endElection()",
    "function electionActive() view returns (bool)",
    "function addCandidate(string,string,string)",
    "function addRegisteredVoter(string)",
    "function vote(string,string)",
    "function getCandidates() view returns (string[],string[],string[])",
    "function getCandidatesVotes() view returns (string[],string[],string[],uint256[])"
];

let contract;

async function init() {
    try {
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        const contractAddress = config.contractAddress;
        const privateKey = config.privateKey;

        const { ethers } = window;
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");
        const wallet = new ethers.Wallet(privateKey, provider);
        contract = new ethers.Contract(contractAddress, abi, wallet);

        await provider.getNetwork();

        const statusEl = document.getElementById("status");
        statusEl.innerHTML = '<span class="material-symbols-outlined text-green-600 shadow-none text-lg">wifi</span> Connected (Ganache)';
        statusEl.className = "flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full font-bold text-sm text-green-700 border border-green-200 shadow-sm transition-all";

        loadCandidates();
        updateElectionStatusButton();

    } catch (e) {
        console.error("Initialization error:", e);
        const statusEl = document.getElementById("status");
        statusEl.innerHTML = '<span class="material-symbols-outlined text-red-600 shadow-none text-lg">wifi_off</span> Connection Failed';
        statusEl.className = "flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full font-bold text-sm text-red-700 border border-red-200 shadow-sm transition-all";
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast-enter pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-xl shadow-lg border text-sm font-semibold max-w-sm transition-all";

    let bgClass, borderClass, textClass, icon;
    if (type === 'success') {
        bgClass = 'bg-green-50/90 backdrop-blur-md';
        borderClass = 'border-green-200';
        textClass = 'text-green-800';
        icon = 'check_circle';
    } else if (type === 'error') {
        bgClass = 'bg-red-50/90 backdrop-blur-md';
        borderClass = 'border-red-200';
        textClass = 'text-red-800';
        icon = 'error';
    } else {
        bgClass = 'bg-blue-50/90 backdrop-blur-md';
        borderClass = 'border-blue-200';
        textClass = 'text-blue-800';
        icon = 'info';
    }

    bgClass.split(' ').forEach(cls => toast.classList.add(cls));
    toast.classList.add(borderClass, textClass);
    toast.innerHTML = `
        <span class="material-symbols-outlined text-[20px] shrink-0">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

async function runTx(actionName, fn) {
    try {
        if (!contract) throw new Error("Contract not initialized! Ensure Ganache is running.");
        const tx = await fn();
        await tx.wait();
        showToast(`Success: ${actionName}`, 'success');
        return true;
    } catch (e) {
        console.error(e);
        showToast(`Error: ${e.reason || e.message}`, 'error');
        return false;
    }
}

async function addCandidate() {
    const idEl = document.getElementById("cand-id");
    const nameEl = document.getElementById("cand-name");
    const partyEl = document.getElementById("cand-party");

    const id = idEl.value.trim();
    const name = nameEl.value.trim();
    const party = partyEl.value.trim();
    if (!id || !name || !party) return showToast("Fill all candidate fields!", "error");

    const btn = document.getElementById("add-cand-btn");
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm shadow-none">sync</span> Adding...`;

    try {
        const success = await runTx("Candidate Added", () => contract.addCandidate(id, name, party));
        if (success) {
            idEl.value = "";
            nameEl.value = "";
            partyEl.value = "";
            loadCandidates();
        }
    } catch (e) {
        console.error(e);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

async function registerVoter() {
    const voterIdEl = document.getElementById("reg-voter-id");
    const id = voterIdEl.value.trim();
    if (!id) return showToast("Enter Voter ID", "error");

    const btn = document.getElementById("register-voter-btn");
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm shadow-none">sync</span> Approving...`;

    try {
        const success = await runTx("Voter Registered", () => contract.addRegisteredVoter(id));
        if (success) {
            voterIdEl.value = "";
            loadStats();
        }
    } catch (e) {
        console.error(e);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

let isElectionActive = false;

async function updateElectionStatusButton() {
    if (!contract) return;
    try {
        isElectionActive = await contract.electionActive();
        const btn = document.getElementById("lifecycle-btn");
        if (isElectionActive) {
            btn.innerHTML = `<span class="material-symbols-outlined text-[18px] shadow-none">stop</span> End Election`;
            btn.className = "w-full text-white font-bold py-3 rounded-lg transition active:scale-95 shadow-md flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500";
        } else {
            btn.innerHTML = `<span class="material-symbols-outlined text-[18px] shadow-none">play_arrow</span> Start Election`;
            btn.className = "w-full text-white font-bold py-3 rounded-lg transition active:scale-95 shadow-md flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600";
        }
    } catch (e) {
        console.error("Error updating election button status:", e);
    }
}

async function toggleElection() {
    if (!contract) return showToast("Contract not initialized!", "error");
    const btn = document.getElementById("lifecycle-btn");
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm shadow-none">sync</span> Processing...`;

    try {
        if (isElectionActive) {
            await runTx("Election Ended", () => contract.endElection());
        } else {
            await runTx("Election Started", () => contract.startElection());
        }
    } catch (e) {
        console.error(e);
    } finally {
        await updateElectionStatusButton();
        btn.disabled = false;
    }
}

async function castVote() {
    const vIdEl = document.getElementById("vote-voter-id");
    const cIdEl = document.getElementById("vote-cand-id");

    const vId = vIdEl.value.trim();
    const cId = cIdEl.value.trim();
    if (!vId || !cId) return showToast("Fill Voter and Candidate IDs", "error");

    const btn = document.getElementById("cast-vote-btn");
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm shadow-none">sync</span> Executing...`;

    try {
        const success = await runTx("Mock Vote Casted", () => contract.vote(vId, cId));
        if (success) {
            vIdEl.value = "";
            cIdEl.value = "";
            loadCandidates();
        }
    } catch (e) {
        console.error(e);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

async function loadCandidates() {
    if (!contract) return;
    try {
        const data = await contract.getCandidatesVotes();
        const list = document.getElementById("candidates-list");
        list.innerHTML = "";

        if (data[0].length === 0) {
            list.innerHTML = "<p class='text-slate-400 text-center mt-4 italic'>No candidates found.</p>";
            loadStats();
            return;
        }

        data[0].forEach((id, i) => {
            const name = data[1][i];
            const party = data[2][i];
            const votes = data[3][i].toString();
            list.innerHTML += `
            <div class="p-3 bg-white border border-slate-200 shadow-sm rounded-lg flex justify-between items-center transition hover:border-blue-300">
                <div class="flex flex-col">
                    <span class="font-bold text-slate-800">${name}</span>
                    <span class="text-xs text-slate-400 font-mono mt-0.5">#${id} • ${party}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider border border-blue-100">${votes} Votes</span>
                </div>
            </div>`;
        });
        loadStats();
    } catch (e) {
        console.error(e);
    }
}

function autofillCandidate() {
    const firstNames = ['Amit', 'Rahul', 'Arvind', 'Narendra', 'Mamata', 'Mayawati', 'Akhilesh', 'Sharad', 'Uddhav', 'Tejashwi'];
    const parties = ['BJP', 'INC', 'AAP', 'TMC', 'BSP', 'SP', 'NCP', 'SS', 'RJD', 'IND'];
    const id = Math.floor(0 + Math.random() * 10)
    const randomId = 'c' + Math.floor(1 + Math.random() * 99);


    document.getElementById('cand-id').value = randomId;
    document.getElementById('cand-name').value = firstNames[id];
    document.getElementById('cand-party').value = parties[id];
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        if (data.success) {
            document.getElementById('voter-count-display').innerText = data.totalVoters.toLocaleString();
            document.getElementById('vote-count-display').innerText = data.totalVotes.toLocaleString();
        }
    } catch (e) {
        console.error("Failed to load registration stats:", e);
    }
}

window.addEventListener('load', () => {
    init();
    const autofillIcon = document.getElementById('autofill-cand-icon');
    if (autofillIcon) {
        autofillIcon.addEventListener('click', autofillCandidate);
    }

    const mockVoterBtn = document.getElementById('create-mock-voter-btn');
    if (mockVoterBtn) {
        mockVoterBtn.addEventListener('click', async () => {
            const countInput = prompt("Enter the number of mock voters to register:", "5");
            if (countInput === null) return;
            const count = parseInt(countInput);
            if (isNaN(count) || count <= 0) {
                return showToast("Please enter a valid positive number", "error");
            }

            mockVoterBtn.disabled = true;
            const originalHTML = mockVoterBtn.innerHTML;
            mockVoterBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm shadow-none">sync</span> Registering...`;

            try {
                const response = await fetch('/api/register-mock-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ count })
                });
                const data = await response.json();
                if (data.success) {
                    showToast(`Successfully registered ${data.count} mock voters!`, 'success');
                    loadStats();
                } else {
                    showToast(`Registration failed: ${data.message}`, 'error');
                }
            } catch (e) {
                console.error(e);
                showToast("Server connection error", "error");
            } finally {
                mockVoterBtn.innerHTML = originalHTML;
                mockVoterBtn.disabled = false;
            }
        });
    }

    const simulateVoteBtn = document.getElementById('simulate-voting-btn');
    if (simulateVoteBtn) {
        simulateVoteBtn.addEventListener('click', async () => {
            simulateVoteBtn.disabled = true;
            const originalHTML = simulateVoteBtn.innerHTML;
            simulateVoteBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-sm shadow-none">sync</span> Simulating...`;

            showToast("Casting votes on blockchain...", "info");

            try {
                const response = await fetch('/api/simulate-voting', { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    showToast(
                        `Done! ${data.votescast} votes cast`,
                        'success'
                    );
                    loadCandidates();
                    loadStats();
                } else {
                    showToast(`Simulation failed: ${data.message}`, 'error');
                }
            } catch (e) {
                console.error(e);
                showToast("Server connection error during simulation", "error");
            } finally {
                simulateVoteBtn.innerHTML = originalHTML;
                simulateVoteBtn.disabled = false;
            }
        });
    }
});
