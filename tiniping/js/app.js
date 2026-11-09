document.addEventListener('DOMContentLoaded', () => {
    // ===== AUDIO SYSTEM (Web Audio API Synthesizer) =====
    let audioCtx = null;
    let soundEnabled = true;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Sound 1: Pact Opening Magical Arpeggio
    function playPactOpenSound() {
        if (!soundEnabled) return;
        initAudio();
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.07);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.07 + 0.5);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + idx * 0.07);
            osc.stop(audioCtx.currentTime + idx * 0.07 + 0.5);
        });
    }

    // Sound 2: Cute Pop / Chime for Button & Card Click
    function playPopSound() {
        if (!soundEnabled) return;
        initAudio();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        const now = audioCtx.currentTime;
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(1300, now + 0.09);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    // Sound 3: Sparkle Burst Sound for Heart Catch & Random Draw
    function playSparkleSound() {
        if (!soundEnabled) return;
        initAudio();
        const now = audioCtx.currentTime;
        [1046.5, 1318.5, 1567.98, 2093].forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.1, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.28);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.28);
        });
    }

    // Sound Toggle Button
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            soundEnabled = !soundEnabled;
            if (soundEnabled) {
                soundToggleBtn.classList.remove('muted');
                soundToggleBtn.querySelector('.sound-icon').textContent = '🎵';
                soundToggleBtn.querySelector('.sound-text').textContent = '사운드 ON';
                playPopSound();
            } else {
                soundToggleBtn.classList.add('muted');
                soundToggleBtn.querySelector('.sound-icon').textContent = '🔇';
                soundToggleBtn.querySelector('.sound-text').textContent = '사운드 OFF';
            }
        });
    }

    // ===== HEART BURST EXPLOSION EFFECT =====
    function createHeartExplosion(x, y) {
        const emojis = ['💖', '✨', '🌸', '⭐', '🍬', '💕', '💫', '💎', '🎀'];
        for (let i = 0; i < 14; i++) {
            const el = document.createElement('div');
            el.className = 'heart-burst-particle';
            el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
            const angle = Math.random() * Math.PI * 2;
            const distance = 40 + Math.random() * 70;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance - 35;
            
            el.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                font-size: ${16 + Math.random() * 14}px;
                pointer-events: none;
                z-index: 30000;
                transition: transform 0.75s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.75s ease;
            `;
            document.body.appendChild(el);
            
            requestAnimationFrame(() => {
                el.style.transform = `translate(${tx}px, ${ty}px) scale(1.3) rotate(${Math.random()*60 - 30}deg)`;
                el.style.opacity = '0';
            });
            
            setTimeout(() => el.remove(), 800);
        }
    }

    // ===== MAGIC WAND CURSOR SPARKLE TRAIL =====
    let lastTrailTime = 0;
    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastTrailTime < 70) return;
        lastTrailTime = now;
        
        const sparkle = document.createElement('div');
        sparkle.innerText = ['✨', '⭐', '💫', '💖', '🌸'][Math.floor(Math.random() * 5)];
        sparkle.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            font-size: ${10 + Math.random() * 10}px;
            pointer-events: none;
            z-index: 25000;
            transition: transform 0.6s ease-out, opacity 0.6s ease-out;
            transform: translate(-50%, -50%) scale(1);
        `;
        document.body.appendChild(sparkle);
        
        requestAnimationFrame(() => {
            sparkle.style.transform = `translate(-50%, ${-15 - Math.random() * 20}px) scale(0.2) rotate(${Math.random() * 90}deg)`;
            sparkle.style.opacity = '0';
        });
        
        setTimeout(() => sparkle.remove(), 650);
    });

    // ===== FAVORITES / CAUGHT STORAGE =====
    let caughtSet = new Set(JSON.parse(localStorage.getItem('tiniping_caught') || '[]'));
    let showingCaughtOnly = false;

    function updateCaughtUI() {
        const countEl = document.getElementById('caughtCount');
        if (countEl) countEl.innerText = caughtSet.size;
        localStorage.setItem('tiniping_caught', JSON.stringify(Array.from(caughtSet)));
    }

    function toggleCatch(name, event) {
        if (event) {
            event.stopPropagation();
            createHeartExplosion(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2);
        }
        if (caughtSet.has(name)) {
            caughtSet.delete(name);
            playPopSound();
        } else {
            caughtSet.add(name);
            playSparkleSound();
        }
        updateCaughtUI();
        applyFilters();
    }

    // ===== PACT INTRO (좌우로 열리는 팩트) =====
    const pactIntro = document.getElementById('pactIntro');
    const pactContainer = document.getElementById('pactContainer');
    const pactFrame = document.getElementById('pactFrame');
    const pactSparkles = document.getElementById('pactSparkles');

    if (pactSparkles) {
        const sparkleEmojis = ['✨', '⭐', '🌟', '💖', '💫', '🦋', '🌸', '💎'];
        for (let i = 0; i < 50; i++) {
            const s = document.createElement('div');
            const size = 8 + Math.random() * 16;
            s.style.cssText = `
                position: absolute;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                font-size: ${size}px;
                opacity: ${0.15 + Math.random() * 0.35};
                animation: floatSparkle ${4 + Math.random() * 6}s ${Math.random() * 4}s ease-in-out infinite alternate;
                pointer-events: none;
            `;
            s.textContent = sparkleEmojis[Math.floor(Math.random() * sparkleEmojis.length)];
            pactSparkles.appendChild(s);
        }
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            @keyframes floatSparkle {
                0% { transform: translateY(10px) scale(0.6) rotate(0deg); opacity: 0.1; }
                100% { transform: translateY(-20px) scale(1.2) rotate(180deg); opacity: 0.5; }
            }
        `;
        document.head.appendChild(styleEl);
    }

    function openPact() {
        if (!pactIntro || pactIntro.classList.contains('opening')) return;
        
        playPactOpenSound();
        
        if (pactFrame) {
            pactFrame.classList.remove('hidden');
            pactFrame.classList.add('visible');
        }
        
        pactIntro.classList.add('opening');
        
        setTimeout(() => {
            pactIntro.classList.add('fade-out');
        }, 800);
        
        setTimeout(() => {
            pactIntro.classList.add('gone');
            pactIntro.style.display = 'none';
        }, 1200);
    }

    if (pactContainer) pactContainer.addEventListener('click', openPact);
    if (pactIntro) pactIntro.addEventListener('click', openPact);

    // ===== APP STATE =====
    let appData = { seasons: [], tinipings: [] };
    let filteredData = [];
    let currentSeasonId = 'all';
    let activeGrades = new Set(['로열', '일반', '레전드', '빌런']);
    let searchQuery = '';
    let currentModalTp = null;

    // DOM Elements
    const grid = document.getElementById('tinipingGrid');
    const seasonTabs = document.getElementById('seasonTabs');
    const searchInput = document.getElementById('searchInput');
    const gradeBtns = document.querySelectorAll('.grade-btn');
    const caughtFilterBtn = document.getElementById('caughtFilterBtn');
    const randomDrawBtn = document.getElementById('randomDrawBtn');
    const statsCounter = document.getElementById('statsCounter');
    
    const modal = document.getElementById('detailModal');
    const closeBtn = document.querySelector('.close-btn');
    const modalCatchBtn = document.getElementById('modalCatchBtn');

    // ===== GLOBAL APP BRIDGE FOR MINIGAMES =====
    window.TinipingAppBridge = {
        getCurrentTp: () => currentModalTp || (appData.tinipings && appData.tinipings[0]) || null,
        getAllTinipings: () => appData.tinipings || [],
        getSeasons: () => appData.seasons || [],
        isCaught: (name) => caughtSet.has(name),
        catchTiniping: (name) => {
            if (!name) return;
            if (!caughtSet.has(name)) {
                caughtSet.add(name);
                playSparkleSound();
                updateCaughtUI();
                applyFilters();
                if (currentModalTp && currentModalTp.name === name) {
                    updateModalCatchBtn(name);
                }
            }
        },
        createHeartExplosion: (x, y) => createHeartExplosion(x || window.innerWidth / 2, y || window.innerHeight / 2),
        playPopSound: () => playPopSound(),
        playSparkleSound: () => playSparkleSound(),
        playPactOpenSound: () => playPactOpenSound()
    };

    const modalMinigameBtn = document.getElementById('modalMinigameBtn');
    if (modalMinigameBtn) {
        modalMinigameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playSparkleSound();
            if (window.TpMiniGames) {
                window.TpMiniGames.openHub(currentModalTp);
            }
        });
    }

    const heroMinigameBtn = document.getElementById('heroMinigameBtn');
    if (heroMinigameBtn) {
        heroMinigameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playSparkleSound();
            if (window.TpMiniGames) {
                const defaultTp = currentModalTp ||
                    (appData.tinipings && appData.tinipings.find(t => t.name === '하츄핑')) ||
                    (appData.tinipings && appData.tinipings[0]) ||
                    null;
                window.TpMiniGames.openHub(defaultTp);
            }
        });
    }

    // Load Data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            appData = data;
            initApp();
        })
        .catch(err => {
            console.error("Error loading data:", err);
            grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">데이터를 불러오는데 실패했습니다.</p>';
        });

    function initApp() {
        updateCaughtUI();
        renderSeasonTabs();
        applyFilters();
        
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            applyFilters();
        });

        gradeBtns.forEach(btn => {
            if (btn.id === 'caughtFilterBtn') return;
            btn.addEventListener('click', (e) => {
                playPopSound();
                const grade = btn.dataset.grade;
                if (activeGrades.has(grade)) {
                    activeGrades.delete(grade);
                    btn.classList.remove('active');
                } else {
                    activeGrades.add(grade);
                    btn.classList.add('active');
                }
                applyFilters();
            });
        });

        if (caughtFilterBtn) {
            caughtFilterBtn.addEventListener('click', () => {
                playPopSound();
                showingCaughtOnly = !showingCaughtOnly;
                if (showingCaughtOnly) {
                    caughtFilterBtn.classList.add('active');
                } else {
                    caughtFilterBtn.classList.remove('active');
                }
                applyFilters();
            });
        }

        if (randomDrawBtn) {
            randomDrawBtn.addEventListener('click', (e) => {
                drawRandomTeenieping(e);
            });
        }

        if (modalCatchBtn) {
            modalCatchBtn.addEventListener('click', (e) => {
                if (currentModalTp) {
                    toggleCatch(currentModalTp.name, e);
                    updateModalCatchBtn(currentModalTp.name);
                }
            });
        }

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    function drawRandomTeenieping(e) {
        if (!appData.tinipings || appData.tinipings.length === 0) return;
        playSparkleSound();
        const clientX = e ? e.clientX : window.innerWidth / 2;
        const clientY = e ? e.clientY : window.innerHeight / 2;
        createHeartExplosion(clientX, clientY);
        
        const randomTp = appData.tinipings[Math.floor(Math.random() * appData.tinipings.length)];
        openModal(randomTp);
    }

    function renderSeasonTabs() {
        seasonTabs.innerHTML = '';
        const seasonIcons = ['✨','💎','🔑','🍰','⭐','👑','💎'];
        
        const allBtn = document.createElement('button');
        allBtn.className = 'season-btn active';
        allBtn.style.setProperty('--season-color', 'var(--pink-500)');
        allBtn.style.setProperty('--season-glow', 'rgba(255,105,180,0.35)');
        allBtn.innerHTML = '<span>✨ 전체</span>';
        allBtn.addEventListener('click', () => {
            playPopSound();
            document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
            allBtn.classList.add('active');
            currentSeasonId = 'all';
            applyFilters();
        });
        seasonTabs.appendChild(allBtn);

        appData.seasons.forEach((season, i) => {
            const btn = document.createElement('button');
            btn.className = 'season-btn';
            btn.style.setProperty('--season-color', season.color);
            btn.style.setProperty('--season-glow', season.color + '55');
            const icon = seasonIcons[i] || '🌟';
            btn.innerHTML = `<span>${icon} ${season.id}기 ${season.theme}</span>`;
            btn.addEventListener('click', () => {
                playPopSound();
                document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentSeasonId = season.id;
                applyFilters();
            });
            seasonTabs.appendChild(btn);
        });
    }

    function applyFilters() {
        filteredData = appData.tinipings.filter(tp => {
            const matchSeason = currentSeasonId === 'all' || tp.mainSeason == currentSeasonId;
            const matchGrade = activeGrades.has(tp.grade);
            const matchSearch = tp.name.includes(searchQuery) || tp.nameEn.toLowerCase().includes(searchQuery);
            const matchCaught = !showingCaughtOnly || caughtSet.has(tp.name);

            return matchSeason && matchGrade && matchSearch && matchCaught;
        });

        renderGrid();
        updateStats();
    }

    function renderGrid() {
        grid.innerHTML = '';
        
        if (filteredData.length === 0) {
            grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 2rem; color: #666; font-family: \'Jua\', sans-serif;">조건에 맞는 티니핑이 없습니다 😢</p>';
            return;
        }

        filteredData.forEach((tp, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.setProperty('--card-color', tp.color);
            
            const nameChars = tp.name.replace('핑','');
            const displayChar = nameChars.length <= 2 ? nameChars : nameChars.substring(0,2);
            
            let gradeIcon = '⭐';
            let gradeDecor = '';
            if(tp.grade === '로열') { gradeIcon = '👑'; gradeDecor = '<span class="grade-crown">👑</span>'; }
            else if(tp.grade === '레전드') { gradeIcon = '🌈'; gradeDecor = '<span class="grade-crown">🌟</span>'; }
            else if(tp.grade === '빌런') { gradeIcon = '😈'; gradeDecor = '<span class="grade-crown">😈</span>'; }
            
            const genderEmoji = tp.gender === '여' ? '🎀' : '⚡';
            const mainSeasonObj = appData.seasons.find(s => s.id === tp.mainSeason);
            const seasonBadgeStyle = mainSeasonObj ? `background-color: ${mainSeasonObj.color}` : 'background-color: #ccc';

            const hasImage = tp.image && !tp.image.includes('catch-teenieping/images');
            const avatarContent = hasImage 
                ? `<img class="avatar-img" src="${tp.image}" alt="${tp.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                   <span class="avatar-letter" style="display:none">${displayChar}</span>`
                : `<span class="avatar-letter">${displayChar}</span>`;

            const isCaught = caughtSet.has(tp.name);

            card.innerHTML = `
                <span class="card-catch-heart ${isCaught ? 'caught' : ''}" title="내 도감에 캐치!">
                    ${isCaught ? '💖' : '🤍'}
                </span>
                <div class="avatar-container" style="background: linear-gradient(135deg, ${tp.color}, ${tp.color}CC);">
                    ${avatarContent}
                    ${gradeDecor}
                    <span class="avatar-gender">${genderEmoji}</span>
                </div>
                <h3 class="tiniping-name">${tp.name}</h3>
                <p class="tiniping-name-en">${tp.nameEn}</p>
                <div class="badge-row">
                    <span class="badge grade-${tp.grade}">${gradeIcon} ${tp.grade}</span>
                    <span class="badge emotion">${tp.emotion}</span>
                    <span class="badge" style="${seasonBadgeStyle}">${tp.mainSeason}기</span>
                </div>
            `;

            setTimeout(() => {
                card.classList.add('visible');
            }, index * 25);

            // Heart click event
            const heartBtn = card.querySelector('.card-catch-heart');
            if (heartBtn) {
                heartBtn.addEventListener('click', (e) => {
                    toggleCatch(tp.name, e);
                });
            }

            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('card-catch-heart')) return;
                playPopSound();
                createHeartExplosion(e.clientX, e.clientY);
                openModal(tp);
            });
            grid.appendChild(card);
        });
    }

    function updateStats() {
        statsCounter.innerText = `총 ${filteredData.length}마리의 티니핑`;
    }

    function updateModalCatchBtn(name) {
        if (!modalCatchBtn) return;
        const isCaught = caughtSet.has(name);
        if (isCaught) {
            modalCatchBtn.classList.add('caught');
            modalCatchBtn.querySelector('.heart-icon').textContent = '💖';
            modalCatchBtn.querySelector('.catch-text').textContent = '캐치 완료!';
        } else {
            modalCatchBtn.classList.remove('caught');
            modalCatchBtn.querySelector('.heart-icon').textContent = '🤍';
            modalCatchBtn.querySelector('.catch-text').textContent = '캐치하기!';
        }
    }

    function openModal(tp) {
        currentModalTp = tp;
        const nameChars = tp.name.replace('핑','');
        const displayChar = nameChars.length <= 2 ? nameChars : nameChars.substring(0,2);
        const avatarContainer = document.getElementById('modalAvatar');
        const hasImage = tp.image && tp.image.includes('i.namu.wiki');
        
        avatarContainer.style.background = hasImage 
            ? 'transparent' 
            : `linear-gradient(135deg, ${tp.color}, ${tp.color}CC)`;
        
        avatarContainer.innerHTML = hasImage
            ? `<img src="${tp.image}" alt="${tp.name}" style="width:100%;height:100%;object-fit:contain;padding:6px;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               <span class="avatar-fallback" style="display:none">${displayChar}</span>`
            : `<span class="avatar-fallback">${displayChar}</span>`;

        document.getElementById('modalNameKo').innerText = tp.name;
        document.getElementById('modalNameEn').innerText = tp.nameEn;
        
        let gradeIcon = '';
        if(tp.grade === '로열') gradeIcon = '👑';
        else if(tp.grade === '레전드') gradeIcon = '🌈';
        else if(tp.grade === '빌런') gradeIcon = '😈';
        else gradeIcon = '💫';

        const gradeBadge = document.getElementById('modalGrade');
        gradeBadge.className = `badge grade-${tp.grade}`;
        gradeBadge.innerText = `${gradeIcon} ${tp.grade}`;

        const emotionBadge = document.getElementById('modalEmotion');
        emotionBadge.className = 'badge emotion';
        emotionBadge.innerText = tp.emotion;

        const mainSeasonObj = appData.seasons.find(s => s.id === tp.mainSeason);
        const seasonBadge = document.getElementById('modalSeason');
        seasonBadge.className = 'badge';
        seasonBadge.style.backgroundColor = mainSeasonObj ? mainSeasonObj.color : '#ccc';
        seasonBadge.innerText = `${tp.mainSeason}기 ${mainSeasonObj ? mainSeasonObj.theme : ''}`;

        document.getElementById('modalDescription').innerText = tp.description;

        const genderIndicator = document.getElementById('modalGender');
        genderIndicator.className = `gender-indicator gender-${tp.gender}`;
        genderIndicator.innerText = tp.gender === '여' ? '♀ 여' : '♂ 남';

        updateModalCatchBtn(tp.name);

        modal.classList.add('show');
    }

    function closeModal() {
        playPopSound();
        modal.classList.remove('show');
    }
});
