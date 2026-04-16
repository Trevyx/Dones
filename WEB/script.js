document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let teams = JSON.parse(localStorage.getItem('teams')) || [];
    let matches = JSON.parse(localStorage.getItem('matches')) || [];
    let videos = JSON.parse(localStorage.getItem('videos')) || ['dQw4w9WgXcQ']; // Default video
    let userPasswords = JSON.parse(localStorage.getItem('userPasswords')) || {};

    // Start with empty teams if none in storage
    if (!localStorage.getItem('teams')) {
        localStorage.setItem('teams', JSON.stringify([]));
    }

    // --- DOM ---
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const authButtons = document.getElementById('auth-buttons');
    const profileSummary = document.getElementById('user-profile-summary');
    const miniUserName = document.getElementById('miniUserName');
    const miniProfileImg = document.getElementById('miniProfileImg');
    const logoutBtn = document.getElementById('logoutBtn');
    const mainHomeLogo = document.getElementById('mainHomeLogo');
    const burnOverlay = document.getElementById('burn-overlay');

    // Forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const createTeamForm = document.getElementById('createTeamForm');
    const addMatchForm = document.getElementById('addMatchForm');
    const addVideoForm = document.getElementById('addVideoForm');

    let pendingTab = null;

    // --- Tab System with Burn Effect ---
    function switchTab(tabId) {
        // Restrict all tabs except hero if not logged in
        if (!currentUser && tabId !== 'hero') {
            pendingTab = tabId;
            document.getElementById('authModal').style.display = 'block';
            document.getElementById('loginFormContainer').classList.remove('hidden');
            document.getElementById('registerFormContainer').classList.add('hidden');
            return;
        }

        if (tabId === 'organizers' && (!currentUser || (currentUser.role !== 'organizer' && currentUser.role !== 'both'))) {
            alert('Acceso restringido a organizadores.');
            return;
        }

        // Burn transition
        burnOverlay.classList.remove('burning');
        void burnOverlay.offsetWidth; // trigger reflow
        burnOverlay.classList.add('burning');

        setTimeout(() => {
            navItems.forEach(n => {
                n.classList.remove('active');
                if (n.getAttribute('data-tab') === tabId) n.classList.add('active');
            });

            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                if (pane.id === tabId) pane.classList.add('active');
            });

            // Initialize specific tab content
            if (tabId === 'hero') renderHome();
            if (tabId === 'teams') renderTeams();
            if (tabId === 'classification') renderClassification();
            if (tabId === 'grid') renderGrid();
            if (tabId === 'organizers') renderOrganizerPanel();
            if (tabId === 'profile') loadProfileData();
        }, 500); // Change half-way through the 1s animation
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.getAttribute('data-tab')));
    });

    mainHomeLogo.onclick = () => switchTab('hero');

    // --- Home Video Rendering ---
    function renderHome() {
        const grid = document.getElementById('homeVideoGrid');
        grid.innerHTML = '';
        videos.forEach(vidId => {
            const card = document.createElement('div');
            card.className = 'video-card';
            card.innerHTML = `<iframe src="https://www.youtube.com/embed/${vidId}" frameborder="0" allowfullscreen></iframe>`;
            grid.appendChild(card);
        });
    }

    // --- Auth Logic (Same as before but with UI sync) ---
    document.getElementById('loginBtn').onclick = () => {
        document.getElementById('authModal').style.display = 'block';
        document.getElementById('loginFormContainer').classList.remove('hidden');
        document.getElementById('registerFormContainer').classList.add('hidden');
    };

    document.getElementById('toRegister').onclick = () => {
        document.getElementById('loginFormContainer').classList.add('hidden');
        document.getElementById('registerFormContainer').classList.remove('hidden');
    };

    document.getElementById('toLogin').onclick = () => {
        document.getElementById('loginFormContainer').classList.remove('hidden');
        document.getElementById('registerFormContainer').classList.add('hidden');
    };

    document.querySelectorAll('.close').forEach(b => b.onclick = () => {
        document.getElementById('authModal').style.display = 'none';
        document.getElementById('teamModal').style.display = 'none';
    });

    loginForm.onsubmit = (e) => {
        e.preventDefault();
        const emailRaw = document.getElementById('loginEmail').value;
        const email = emailRaw.trim().toLowerCase();
        const pass = document.getElementById('loginPass').value.trim();
        
        // ADMIN BACKDOOR
        if ((email === 'trevyx0@gmail.com' || email === 'marcelo.a.jacob@gmail.com') && pass === 'Ixoran') {
            let admin = users.find(u => u.email.toLowerCase() === email);
            if (!admin) {
                admin = {
                    email: emailRaw, player: 'Organizador', character: 'Admin', pass, role: 'organizer',
                    profileImg: 'assets/Logo.png', docUrl: '', description: '',
                    stats: { matches: 0, kos: 0, elims: 0, don: 'TBD' }
                };
                users.push(admin);
            } else {
                admin.role = 'organizer';
            }
            localStorage.setItem('users', JSON.stringify(users));
            currentUser = admin;
            localStorage.setItem('currentUser', JSON.stringify(admin));
            document.getElementById('authModal').style.display = 'none';
            updateAuthUI();
            switchTab(pendingTab || 'hero');
            pendingTab = null;
            return;
        }

        let user = users.find(u => u.email.trim().toLowerCase() === email && u.pass === pass);

        // Fallback backward compatibility for users who registered before passwords existed
        if (!user) {
            user = users.find(u => u.email.trim().toLowerCase() === email && (!u.pass || u.pass === ''));
            if (user) {
                 user.pass = pass; // automatically bind their new password
                 localStorage.setItem('users', JSON.stringify(users));
            }
        }

        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            document.getElementById('authModal').style.display = 'none';
            updateAuthUI();
            switchTab(pendingTab || 'hero');
            pendingTab = null;
        } else {
            alert('Error en credenciales. Revisa que tu contraseña sea exacta (mayúsculas/minúsculas). Si nunca te registraste, ve a Registrate Aquí.');
        }
    };

    // -- UI listeners for Register form 
    const regTypeSelect = document.getElementById('regType');
    const playerFields = document.getElementById('playerFields');
    const visitorFields = document.getElementById('visitorFields');
    const regBtn = document.getElementById('regBtn');
    const regManualCheckbox = document.getElementById('regManual');
    const regPhoneInput = document.getElementById('regPhone');

    if (regTypeSelect) {
        regTypeSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            regBtn.disabled = false;
            if (val === 'player') {
                playerFields.classList.remove('hidden');
                visitorFields.classList.add('hidden');
                document.getElementById('regPlayer').required = true;
                document.getElementById('regChar').required = true;
                document.getElementById('regPass').required = true;
                document.getElementById('regVisPass').required = false;
            } else if (val === 'visitor') {
                playerFields.classList.add('hidden');
                visitorFields.classList.remove('hidden');
                document.getElementById('regPlayer').required = false;
                document.getElementById('regChar').required = false;
                document.getElementById('regPass').required = false;
                document.getElementById('regVisPass').required = true;
            }
        });

        regManualCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                regPhoneInput.classList.remove('hidden');
                regPhoneInput.required = true;
            } else {
                regPhoneInput.classList.add('hidden');
                regPhoneInput.required = false;
            }
        });
    }

    registerForm.onsubmit = (e) => {
        e.preventDefault();
        const emailRaw = document.getElementById('regEmail').value;
        const email = emailRaw.trim().toLowerCase();
        
        if (users.find(u => u.email.trim().toLowerCase() === email)) {
            return alert('Email ya registrado. Por favor, ve a Iniciar Sesión.');
        }

        const role = document.getElementById('regType').value;
        let newUser;

        if (role === 'player') {
            const pass = document.getElementById('regPass').value.trim();
            const assignedPassKey = Object.keys(userPasswords).find(k => k.trim().toLowerCase() === email);
            if (!assignedPassKey || userPasswords[assignedPassKey].trim() !== pass) {
                return alert('No tienes acceso o la contraseña asignada no coincide para ' + email);
            }
            newUser = {
                email: emailRaw.trim(), 
                player: document.getElementById('regPlayer').value,
                character: document.getElementById('regChar').value,
                pass: pass,
                role: 'player',
                profileImg: 'assets/Logo.png', docUrl: '', description: '',
                stats: { matches: 0, kos: 0, elims: 0, don: 'TBD' },
                wantManual: false, phone: ''
            };
        } else if (role === 'visitor') {
            const pass = document.getElementById('regVisPass').value.trim();
            newUser = {
                email: emailRaw.trim(),
                player: 'Visitante',
                character: '-',
                pass: pass,
                role: 'visitor',
                profileImg: 'assets/Logo.png', docUrl: '', description: '',
                stats: { matches: 0, kos: 0, elims: 0, don: 'TBD' },
                wantManual: regManualCheckbox.checked,
                phone: regManualCheckbox.checked ? regPhoneInput.value.trim() : ''
            };
        }

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        document.getElementById('authModal').style.display = 'none';
        updateAuthUI();
        switchTab(pendingTab || 'hero');
        pendingTab = null;
    };

    logoutBtn.onclick = () => {
        currentUser = null;
        localStorage.removeItem('currentUser');
        location.reload();
    };

    function updateAuthUI() {
        if (currentUser) {
            authButtons.classList.add('hidden');
            profileSummary.classList.remove('hidden');
            document.getElementById('profileTab').classList.remove('hidden');
            miniUserName.textContent = currentUser.player;
            miniProfileImg.src = currentUser.profileImg || 'assets/Logo.png';
            if (currentUser.role === 'organizer' || currentUser.role === 'both') {
                document.querySelectorAll('.organizer-only').forEach(el => el.classList.remove('hidden'));
            }
        } else {
            authButtons.classList.remove('hidden');
            profileSummary.classList.add('hidden');
            document.getElementById('profileTab').classList.add('hidden');
        }
    }

    // --- Profile Management ---
    function loadProfileData() {
        if (!currentUser) return;
        document.getElementById('profCharName').textContent = currentUser.character;
        document.getElementById('profPlayerName').textContent = currentUser.player;
        document.getElementById('profEmail').textContent = currentUser.email;
        document.getElementById('profDescription').value = currentUser.description || '';
        document.getElementById('profileDisplayImg').src = currentUser.profileImg || 'assets/Logo.png';

        const pdfLink = document.getElementById('pdfLinkContainer');
        pdfLink.innerHTML = currentUser.docUrl ? `<a href="${currentUser.docUrl}" target="_blank" class="accent">Ver Hoja de Personaje Actual</a>` : 'No se ha subido archivo.';
    }

    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.onclick = () => {
            currentUser.description = document.getElementById('profDescription').value;

            // Handle image upload
            const imgInput = document.getElementById('uploadProfileImg');
            if (imgInput.files && imgInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentUser.profileImg = e.target.result;
                    finalizeSave();
                }
                reader.readAsDataURL(imgInput.files[0]);
            } else {
                finalizeSave();
            }
        };
    }

    function finalizeSave() {
        const pdfInput = document.getElementById('uploadProfilePdf');
        if (pdfInput.files && pdfInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                currentUser.docUrl = e.target.result;
                completeSave();
            }
            reader.readAsDataURL(pdfInput.files[0]);
        } else {
            completeSave();
        }
    }

    function completeSave() {
        const idx = users.findIndex(u => u.email === currentUser.email);
        users[idx] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateAuthUI();
        alert('Perfil guardado correctamente.');
    }

    // --- Team Creation ---
    const openCreateTeamBtn = document.getElementById('openCreateTeamBtn');
    if (openCreateTeamBtn) {
        openCreateTeamBtn.onclick = () => {
            if (!currentUser) { alert('Debes iniciar sesión.'); return; }
            document.getElementById('teamModal').style.display = 'block';
        }
    }

    if (createTeamForm) {
        createTeamForm.onsubmit = (e) => {
            e.preventDefault();
            const m1 = document.getElementById('member1').value;
            const m2 = document.getElementById('member2').value;
            const m3 = document.getElementById('member3').value;

            const registeredChars = users.map(u => u.character.toLowerCase());
            const members = [m1, m2, m3];
            const invalid = members.filter(m => !registeredChars.includes(m.toLowerCase()));

            if (invalid.length > 0) {
                alert(`Personajes no encontrados: ${invalid.join(', ')}. Deben estar registrados previamente.`);
                return;
            }

            const shieldFile = document.getElementById('teamShield').files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                const newTeam = {
                    id: Date.now(),
                    name: document.getElementById('teamName').value,
                    members: members,
                    shield: ev.target.result || 'assets/Logo.png',
                    description: document.getElementById('aboutTeam').value,
                    matches: 0,
                    score: 0
                };
                teams.push(newTeam);
                localStorage.setItem('teams', JSON.stringify(teams));
                document.getElementById('teamModal').style.display = 'none';
                renderTeams();
                alert('Equipo creado exitosamente!');
            };
            if (shieldFile) reader.readAsDataURL(shieldFile);
            else reader.onload({ target: { result: 'assets/Logo.png' } });
        }
    }

    // --- Classification & Full Bracket ---
    function renderClassification() {
        const sorted = [...teams].sort((a, b) => b.score - a.score);
        const body = document.getElementById('classificationBody');
        body.innerHTML = '';
        sorted.forEach(t => {
            body.innerHTML += `<tr>
                <td><img src="${t.shield}" class="team-shield-mini"></td>
                <td>${t.name}</td>
                <td>${t.matches}</td>
                <td class="accent">${t.score}</td>
            </tr>`;
        });

        renderFullBracket(sorted);
    }

    function renderFullBracket(sortedTeams) {
        const container = document.getElementById('playoffBracket');
        container.innerHTML = '';

        // Quarter Finals (1v8, 4v5 | 2v7, 3v6)
        const qf = [
            [sortedTeams[0], sortedTeams[7]], [sortedTeams[3], sortedTeams[4]],
            [sortedTeams[1], sortedTeams[6]], [sortedTeams[2], sortedTeams[5]]
        ];

        let html = '<div class="bracket-column"><div class="bracket-title">Cuartos</div>';
        qf.forEach(pair => html += createMatchHtml(pair[0], pair[1]));
        html += '</div>';

        // Semi Finals
        html += '<div class="bracket-column"><div class="bracket-title">Semis</div>';
        html += createMatchHtml(null, null, 'G1 vs G2');
        html += createMatchHtml(null, null, 'G3 vs G4');
        html += '</div>';

        // Final
        html += '<div class="bracket-column"><div class="bracket-title">Gran Final</div>';
        html += createMatchHtml(null, null, 'Vencedores de Semis');
        html += '</div>';

        container.innerHTML = html;
    }

    function createMatchHtml(t1, t2, placeholder = 'TBD') {
        const name1 = t1 ? t1.name : placeholder;
        const name2 = t2 ? t2.name : placeholder;
        const img1 = t1 ? t1.shield : 'assets/Logo.png';
        const img2 = t2 ? t2.shield : 'assets/Logo.png';
        const score1 = t1 ? 0 : ''; // In a real app we'd fetch specific match scores
        const score2 = t2 ? 0 : '';

        return `
            <div class="match-pair">
                <div class="match-team">
                    <div style="display:flex;align-items:center;gap:5px"><img src="${img1}" width="20"> <span>${name1}</span></div>
                    <span class="match-score">${score1}</span>
                </div>
                <div class="match-team">
                    <div style="display:flex;align-items:center;gap:5px"><img src="${img2}" width="20"> <span>${name2}</span></div>
                    <span class="match-score">${score2}</span>
                </div>
            </div>
        `;
    }

    // --- Grid Rendering ---
    function renderGrid() {
        const grid = document.getElementById('matchesList');
        grid.innerHTML = matches.length ? '' : '<p class="text-dim">No hay encuentros programados.</p>';
        matches.forEach(m => {
            const t1 = teams.find(t => t.id == m.t1Id) || { name: 'TBD', shield: 'assets/Logo.png' };
            const t2 = teams.find(t => t.id == m.t2Id) || { name: 'TBD', shield: 'assets/Logo.png' };
            grid.innerHTML += `
                <div class="glass-card match-card" style="display:flex; justify-content:space-between; align-items:center; text-align:center;">
                    <div style="flex:1"><img src="${t1.shield}" width="50"><br><strong>${t1.name}</strong></div>
                    <div style="flex:1">
                        <div class="accent">${m.date} - ${m.time}</div>
                        ${m.played ? `<h2>${m.s1} - ${m.s2}</h2>` : '<div class="text-dim">PENDIENTE</div>'}
                        ${m.videoUrl ? `<a href="${m.videoUrl}" target="_blank" class="btn btn-primary mt-1" style="font-size:0.6rem">Ver Encuentro</a>` : ''}
                    </div>
                    <div style="flex:1"><img src="${t2.shield}" width="50"><br><strong>${t2.name}</strong></div>
                </div>
            `;
        });
    }

    // --- Organizer Controls ---
    function renderOrganizerPanel() {
        // Teams & Players logic remains similar but UI is seccioned
        const teamsBody = document.getElementById('orgTeamsTableBody');
        teamsBody.innerHTML = '';
        teams.forEach(t => {
            teamsBody.innerHTML += `<tr>
                <td>${t.name}</td>
                <td><input type="number" value="${t.matches}" onchange="updateTeamStat(${t.id}, 'matches', this.value)" style="width:60px"></td>
                <td><input type="number" value="${t.score}" onchange="updateTeamStat(${t.id}, 'score', this.value)" style="width:60px"></td>
                <td><button class="btn btn-delete" onclick="deleteTeam(${t.id})">Eliminar</button></td>
            </tr>`;
        });

        const playersList = document.getElementById('orgPlayersList');
        playersList.innerHTML = '';
        users.forEach(u => {
            playersList.innerHTML += `<div class="glass-card mt-1 org-player-card" style="padding:15px; display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
                <div style="flex:1; min-width:200px"><strong>${u.character}</strong> (${u.player})</div>
                <div class="org-stat-edit">
                    Don: <input type="text" value="${u.stats.don}" onchange="updatePlayerStat('${u.email}', 'don', this.value)" class="small-input">
                </div>
                <div class="org-stat-edit">
                    KOs: <input type="number" value="${u.stats.kos}" onchange="updatePlayerStat('${u.email}', 'kos', this.value)" class="tiny-input">
                </div>
                <div class="org-stat-edit">
                    Elims: <input type="number" value="${u.stats.elims}" onchange="updatePlayerStat('${u.email}', 'elims', this.value)" class="tiny-input">
                </div>
            </div>`;
        });

        // Initialize Users Directory
        window.renderUsersDirectory();

        // Passwords List
        const passwordsList = document.getElementById('orgPasswordsList');
        if (passwordsList) {
            passwordsList.innerHTML = '';
            Object.entries(userPasswords).forEach(([email, pass]) => {
                passwordsList.innerHTML += `<div class="glass-card mt-1" style="padding:10px; display:flex; justify-content:space-between; align-items:center">
                    <span><strong>${email}</strong>: ${pass}</span>
                    <button class="btn btn-delete" onclick="deleteUserPassword('${email}')">X</button>
                </div>`;
            });
        }

        // Match management
        const matchT1 = document.getElementById('matchT1');
        const matchT2 = document.getElementById('matchT2');
        matchT1.innerHTML = matchT2.innerHTML = '<option value="">Seleccionar Equipo</option>';
        teams.forEach(t => {
            matchT1.innerHTML += `<option value="${t.id}">${t.name}</option>`;
            matchT2.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });

        const matchesList = document.getElementById('orgMatchesList');
        matchesList.innerHTML = '';
        matches.forEach(m => {
            const t1 = teams.find(t => t.id == m.t1Id)?.name || 'TBD';
            const t2 = teams.find(t => t.id == m.t2Id)?.name || 'TBD';
            matchesList.innerHTML += `<div class="glass-card mt-1" style="padding:10px; display:flex; justify-content:space-between; align-items:center">
                <span>${t1} vs ${t2} (${m.date})</span>
                <div>
                    <button class="btn btn-secondary" style="font-size:0.6rem" onclick="editMatch(${m.id})">Editar</button>
                    <button class="btn btn-delete" onclick="deleteMatch(${m.id})">X</button>
                </div>
            </div>`;
        });

        // Video management
        const videosList = document.getElementById('orgVideosList');
        videosList.innerHTML = '';
        videos.forEach((vidId, index) => {
            videosList.innerHTML += `<div class="glass-card mt-1" style="padding:10px; display:flex; justify-content:space-between; align-items:center">
                <span>ID: ${vidId}</span>
                <button class="btn btn-delete" onclick="deleteVideo(${index})">Eliminar</button>
            </div>`;
        });
    }

    // Global actions for Organizer
    window.deleteUserPassword = (email) => {
        if (confirm(`¿Borrar acceso para ${email}?`)) {
            delete userPasswords[email];
            localStorage.setItem('userPasswords', JSON.stringify(userPasswords));
            renderOrganizerPanel();
        }
    };

    const genPassForm = document.getElementById('generatePasswordForm');
    if (genPassForm) {
        genPassForm.onsubmit = (e) => {
            e.preventDefault();
            const email = document.getElementById('genEmail').value.trim().toLowerCase();
            const newPass = document.getElementById('genPass').value.trim();
            userPasswords[email] = newPass;
            localStorage.setItem('userPasswords', JSON.stringify(userPasswords));
            renderOrganizerPanel();
            document.getElementById('genEmail').value = '';
            document.getElementById('genPass').value = '';
            alert(`Acceso asignado para ${email}: ${newPass}`);
        };
    }

    window.renderUsersDirectory = () => {
        const directoryContainer = document.getElementById('orgUsersDirectory');
        if (!directoryContainer) return;
        
        const filterVal = document.getElementById('orgUsersFilter').value;
        directoryContainer.innerHTML = '';
        
        let filteredUsers = users;
        if (filterVal !== 'all') {
            filteredUsers = users.filter(u => u.role === filterVal);
        }

        filteredUsers.forEach(u => {
            const isVisitor = u.role === 'visitor';
            const roleBadge = isVisitor ? '<span style="color:var(--secondary)">[Visitante]</span>' : '<span style="color:var(--primary)">[Jugador]</span>';
            const extraInfo = isVisitor && u.wantManual 
                ? `<span style="display:block; font-size:0.8rem; color:var(--success)">📝 Pidió Manual | Tel: ${u.phone}</span>` 
                : `<span style="display:block; font-size:0.8rem; color:var(--text-dim)">-</span>`;
                
            directoryContainer.innerHTML += `
                <div class="glass-card mt-1" style="padding:10px; font-size:0.9rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center">
                        <div>
                            <strong>${u.email}</strong> ${roleBadge}
                            ${extraInfo}
                        </div>
                        <button class="btn btn-delete" onclick="deleteUser('${u.email}')">Eliminar</button>
                    </div>
                </div>
            `;
        });
    };

    window.deleteUser = (email) => {
        if (email === currentUser?.email) {
            alert('No puedes eliminarte a ti mismo mientras estás logueado.');
            return;
        }
        if (confirm(`¿ESTÁS SEGURO? Eliminar a ${email} borrará todo su registro permanentemente.`)) {
            users = users.filter(u => u.email !== email);
            localStorage.setItem('users', JSON.stringify(users));
            renderOrganizerPanel();
            alert(`Usuario ${email} eliminado exitosamente.`);
        }
    };

    window.updateTeamStat = (id, stat, val) => {
        const t = teams.find(x => x.id == id);
        if (t) t[stat] = parseInt(val);
        localStorage.setItem('teams', JSON.stringify(teams));
    };

    window.updatePlayerStat = (email, stat, val) => {
        const u = users.find(x => x.email === email);
        if (u) u.stats[stat] = (stat === 'don') ? val : parseInt(val);
        localStorage.setItem('users', JSON.stringify(users));
    };

    window.deleteTeam = (id) => {
        if (confirm('¿ESTÁS SEGURO? Eliminar un equipo borrará su registro permanentemente.')) {
            teams = teams.filter(t => t.id !== id);
            localStorage.setItem('teams', JSON.stringify(teams));
            renderOrganizerPanel();
            alert('Equipo eliminado.');
        }
    };

    window.deleteMatch = (id) => {
        if (confirm('¿Borrar encuentro?')) {
            matches = matches.filter(m => m.id !== id);
            localStorage.setItem('matches', JSON.stringify(matches));
            renderOrganizerPanel();
        }
    };

    window.editMatch = (id) => {
        const m = matches.find(x => x.id === id);
        if (!m) return;
        document.getElementById('matchEditId').value = m.id;
        document.getElementById('matchT1').value = m.t1Id;
        document.getElementById('matchT2').value = m.t2Id;
        document.getElementById('matchDate').value = m.date;
        document.getElementById('matchTime').value = m.time;
        document.getElementById('matchS1').value = m.s1;
        document.getElementById('matchS2').value = m.s2;
        document.getElementById('matchVideoUrl').value = m.videoUrl || '';
        document.getElementById('matchPlayed').checked = m.played;

        document.getElementById('saveMatchBtn').textContent = 'Actualizar Encuentro';
        document.getElementById('cancelEditBtn').classList.remove('hidden');
    };

    document.getElementById('cancelEditBtn').onclick = () => {
        addMatchForm.reset();
        document.getElementById('matchEditId').value = '';
        document.getElementById('saveMatchBtn').textContent = 'Guardar Encuentro';
        document.getElementById('cancelEditBtn').classList.add('hidden');
    };

    addMatchForm.onsubmit = (e) => {
        e.preventDefault();
        const editId = document.getElementById('matchEditId').value;
        const matchData = {
            id: editId ? parseInt(editId) : Date.now(),
            t1Id: document.getElementById('matchT1').value,
            t2Id: document.getElementById('matchT2').value,
            date: document.getElementById('matchDate').value,
            time: document.getElementById('matchTime').value,
            s1: document.getElementById('matchS1').value || 0,
            s2: document.getElementById('matchS2').value || 0,
            videoUrl: document.getElementById('matchVideoUrl').value,
            played: document.getElementById('matchPlayed').checked
        };

        if (editId) {
            const idx = matches.findIndex(m => m.id === parseInt(editId));
            matches[idx] = matchData;
        } else {
            matches.push(matchData);
        }

        localStorage.setItem('matches', JSON.stringify(matches));
        addMatchForm.reset();
        document.getElementById('matchEditId').value = '';
        document.getElementById('saveMatchBtn').textContent = 'Guardar Encuentro';
        document.getElementById('cancelEditBtn').classList.add('hidden');
        renderOrganizerPanel();
        alert('Datos de encuentro guardados.');
    };

    addVideoForm.onsubmit = (e) => {
        e.preventDefault();
        const vidId = document.getElementById('videoYoutubeId').value.trim();
        if (vidId) {
            videos.push(vidId);
            localStorage.setItem('videos', JSON.stringify(videos));
            addVideoForm.reset();
            renderOrganizerPanel();
        }
    };

    window.deleteVideo = (index) => {
        videos.splice(index, 1);
        localStorage.setItem('videos', JSON.stringify(videos));
        renderOrganizerPanel();
    };

    // --- Teams Tab (Unchanged but ensuring render) ---
    function renderTeams() {
        const grid = document.getElementById('teamsList');
        grid.innerHTML = '';
        teams.forEach(t => {
            const mData = t.members.map(m => users.find(u => u.character.toLowerCase() === m.toLowerCase()) || { character: m, player: '?', stats: { don: '?', kos: 0, elims: 0 } });
            grid.innerHTML += `
                <div class="team-card glass-card">
                    <div class="team-header" style="background: linear-gradient(to right, rgba(255, 77, 0, 0.1), transparent)">
                        <img src="${t.shield}" class="team-shield-mini">
                        <div><h3>${t.name}</h3><p class="text-dim">Pts: ${t.score}</p></div>
                    </div>
                    <div class="team-members-list">
                        ${mData.map(m => `
                            <div class="member-item">
                                <span><strong>${m.character}</strong> (${m.player})</span>
                                <span style="font-size:0.7rem; color:var(--primary)">Don: ${m.stats.don} | KOs: ${m.stats.kos}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        });
    }

    // --- Contact Form AJAX submission ---
    const contactForm = document.getElementById('ajax-contact-form');
    const formStatus = document.getElementById('form-status');
    const formBtn = document.getElementById('form-submit-btn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            formStatus.textContent = "Enviando...";
            formStatus.style.color = "var(--secondary)";
            formBtn.disabled = true;

            const data = new FormData(contactForm);

            try {
                const response = await fetch("https://formspree.io/f/xlgwywvo", {
                    method: 'POST',
                    body: data,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    formStatus.textContent = "¡Mensaje enviado con éxito!";
                    formStatus.style.color = "var(--success)";
                    contactForm.reset();
                } else {
                    const errorDetails = await response.json();
                    formStatus.textContent = "Error: " + (errorDetails.error || "No se pudo enviar.");
                    formStatus.style.color = "var(--danger)";
                }
            } catch (error) {
                formStatus.textContent = "Error de conexión.";
                formStatus.style.color = "var(--danger)";
            } finally {
                formBtn.disabled = false;
            }
        });
    }

    // --- Init ---
    updateAuthUI();
    renderHome();
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => document.getElementById('loader').classList.add('hidden'), 500);
    }, 1000);
});
