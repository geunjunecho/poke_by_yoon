/**
 * ✨ 조은의 샤랄라 티니핑 도감 — 미니게임 코어 허브 & 공통 헬퍼 (minigames-core.js)
 * 6~7세 어린이 눈높이에 맞춘 마법 팩트 오락실 허브, 2D 퍼펫 모션, Web Audio 효과음 및 게임 라이프사이클 관리
 */
(function (global) {
    'use strict';

    const SEASON_META = {
        1: { theme: '큐브', emoji: '💖', color: '#FF69B4' },
        2: { theme: '보석', emoji: '💎', color: '#9B59B6' },
        3: { theme: '열쇠', emoji: '🔑', color: '#3498DB' },
        4: { theme: '디저트', emoji: '🍰', color: '#E74C3C' },
        5: { theme: '스타', emoji: '⭐', color: '#F1C40F' },
        6: { theme: '프린세스', emoji: '👑', color: '#E91E63' },
        7: { theme: '쥬얼스타', emoji: '🌟', color: '#00BCD4' }
    };

    const DEFAULT_TP = {
        name: '하츄핑',
        nameEn: 'Heartsping',
        image: 'https://i.namu.wiki/i/JNFG7ZDLqAgHRQO-fgGX8tWuB0sVNHpFFmltnb690_I0R4B6MdzkWcuUO4PdAoJ3trizG7u7dWjxNaTu0CI6og.webp',
        color: '#FF69B4',
        grade: '로열',
        emotion: '사랑',
        gender: '여',
        mainSeason: 1
    };

    const FALLBACK_POOL = [
        DEFAULT_TP,
        { name: '바로핑', nameEn: 'Dadaping', image: 'https://i.namu.wiki/i/etpV9E_TB58IgNeHhZPzBBJeDL4eUhVK-E0p0NW9ZmOAUidPVu_t960-hmdLNc-8dmT58ccwpYilf7UjRSUdcQ.webp', color: '#60A5FA', grade: '로열', emotion: '정의', gender: '남', mainSeason: 1 },
        { name: '아자핑', nameEn: 'Gogoping', image: 'https://i.namu.wiki/i/xa9AQqJkpupMyglCkuEc7cFRknSvTlRY2q_PMxHXF-LEphXjh-JuVtFJZn824uyjLKRc3A_lj1qro0jul4Ol5A.webp', color: '#FBBF24', grade: '로열', emotion: '용기', gender: '남', mainSeason: 1 },
        { name: '차차핑', nameEn: 'Chachaping', image: 'https://i.namu.wiki/i/A2p7Knse0sx3Ao9g3kH25wYsra1bEeofsSSvnbaSghzqjd_OakBoNIEB7RAfpfc3s0Q_kwGewbjvF1hKjJGnlQ.webp', color: '#34D399', grade: '로열', emotion: '선행', gender: '여', mainSeason: 1 },
        { name: '라라핑', nameEn: 'Lalaping', image: 'https://i.namu.wiki/i/L0mi1RtJt7PmseKUiC_RCTE4enecZ6tsFG8LXdaSSOvofu8ONghQ1EtSUq8eAsPRLBsRLdLD3pJVJhU6h0s5VQ.webp', color: '#C084FC', grade: '로열', emotion: '기쁨', gender: '여', mainSeason: 1 },
        { name: '해핑', nameEn: 'Happying', image: 'https://i.namu.wiki/i/9FrV8-zxMiTdRyHoYGwIYmI9SjdsW8XGVuU5W-8kWOXN2zY-xQ6opEKL0to-xmlYgm5egJbY2wvXMVErvGWhQg.webp', color: '#F472B6', grade: '로열', emotion: '행복', gender: '여', mainSeason: 1 },
        { name: '키키핑', nameEn: 'Kikiping', image: 'https://i.namu.wiki/i/lboKKbGdozuTuJfAj4YpUVGlGLXa7VdHazSEv2zBZbiTRIWuz4z5KaL8d5KbT1BgOo4bngkNRKNIn7vfMONzvA.webp', color: '#FB923C', grade: '일반', emotion: '웃음', gender: '남', mainSeason: 1 },
        { name: '투투핑', nameEn: 'Tutuping', image: 'https://i.namu.wiki/i/bowkELFMgih_NKHrsWdPqbHPye2V5WNYmGaZjZ0P_MQarwLgZwM4c9vhr6m0rT-DOx6JgXBaKryxuERwb1X3SA.webp', color: '#F87171', grade: '일반', emotion: '울음', gender: '여', mainSeason: 1 },
        { name: '그림핑', nameEn: 'Artping', image: 'https://i.namu.wiki/i/dr3HtKOmrDRdYZobwZZvWFNTlS97iTIyFzIRdHyO0uVaFiec74-lA1XqF8CBxSqOq1T0meYeV5GjmI3rs_mxNg.webp', color: '#38BDF8', grade: '일반', emotion: '상상', gender: '남', mainSeason: 1 },
        { name: '베베핑', nameEn: 'Bebeping', image: 'https://i.namu.wiki/i/iPShOLmZUn8yt8_r--67Gz1L54p8c2T3P2124YHedXp4OU4bpuQnnqdkt9NNxLigBd2H8TX25qgNWhe-CBMsRA.webp', color: '#F9A8D4', grade: '일반', emotion: '아기', gender: '여', mainSeason: 1 }
    ];

    const DEFAULT_GAME_CARDS = [
        {
            id: 'runner',
            title: '무지개 구름 달리기',
            subtitle: '구름 위를 통통 달리며 반짝이는 하트를 모아요!',
            icon: '🌈',
            badge: '점프 & 숙이기',
            gradient: 'linear-gradient(135deg, #FF69B4 0%, #FF85B3 50%, #FBBF24 100%)'
        },
        {
            id: 'parfait',
            title: '새콤달콤 파르페 쌓기',
            subtitle: '하늘에서 내려오는 달콤한 과일과 크림을 받아요!',
            icon: '🍨',
            badge: '요리 & 캐치',
            gradient: 'linear-gradient(135deg, #F472B6 0%, #FB7185 50%, #FDE047 100%)'
        },
        {
            id: 'bubble',
            title: '도레미 마법 비눗방울',
            subtitle: '방울을 톡톡 터뜨려 예쁜 실로폰 노래를 연주해요!',
            icon: '🫧',
            badge: '음악 & 터치',
            gradient: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%)'
        },
        {
            id: 'memory',
            title: '반짝반짝 친구 찾기',
            subtitle: '마법 카드를 뒤집어 숨어있는 단짝 티니핑을 찾아요!',
            icon: '🃏',
            badge: '기억력 놀이',
            gradient: 'linear-gradient(135deg, #A855F7 0%, #EC4899 50%, #F59E0B 100%)'
        },
        {
            id: 'flipbattle',
            title: '샤랄라! 마법 판 뒤집기!',
            subtitle: '악동핑보다 먼저 카드를 내 티니핑 빛깔로 뒤집어요!',
            icon: '⚡',
            badge: '스피드 판 뒤집기',
            gradient: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #FBBF24 100%)'
        }
    ];

    // Node.js 환경 폴백 스토리지
    const memoryStorage = new Map();

    function getStorageItem(key) {
        try {
            if (global.localStorage && typeof global.localStorage.getItem === 'function') {
                return global.localStorage.getItem(key);
            }
        } catch (_) { /* ignore */ }
        return memoryStorage.has(key) ? memoryStorage.get(key) : null;
    }

    function setStorageItem(key, value) {
        const strVal = String(value);
        memoryStorage.set(key, strVal);
        try {
            if (global.localStorage && typeof global.localStorage.setItem === 'function') {
                global.localStorage.setItem(key, strVal);
            }
        } catch (_) { /* ignore */ }
    }

    // 한글 조사(과/와) 자연스럽게 판별
    function getWithParticle(word) {
        if (!word || typeof word !== 'string') return '와';
        const lastChar = word.charCodeAt(word.length - 1);
        if (lastChar < 0xAC00 || lastChar > 0xD7A3) return '와';
        const hasJongseong = (lastChar - 0xAC00) % 28 !== 0;
        return hasJongseong ? '과' : '와';
    }

    /**
     * 티니핑 정지 일러스트를 살아 움직이는 요정처럼 보이게 하는 절차적 2D 퍼펫 모션 순수 함수
     */
    function computeRunTransform(state = {}, tick = 0) {
        const {
            yOffset = 0,
            isJumping = false,
            isDucking = false,
            isHit = false,
            jumpProgress = 0
        } = state || {};

        let bobY = 0;
        let waddleDeg = 0;
        let spinDeg = 0;
        let sx = 1;
        let sy = 1;

        if (isDucking && !isJumping) {
            bobY = 10;
            sx = 1.34;
            sy = 0.55;
            waddleDeg = 10;
        } else if (isJumping) {
            bobY = yOffset;
            spinDeg = jumpProgress ? jumpProgress * 360 : (tick * 12) % 360;
            sx = 0.92;
            sy = 1.14;
        } else {
            bobY = Math.abs(Math.sin(tick * 0.38)) * -12;
            waddleDeg = Math.sin(tick * 0.38) * 8;
            sx = 1 + Math.sin(tick * 0.76) * 0.07;
            sy = 1 - Math.sin(tick * 0.76) * 0.07;
        }

        const wingFlap = Math.sin(tick * 0.65) * 28;
        const wingLeftTransform = 'rotate(' + (-15 + wingFlap).toFixed(1) + 'deg) scale(' + (isDucking ? 0.7 : 1) + ')';
        const wingRightTransform = 'scaleX(-1) rotate(' + (-15 + wingFlap).toFixed(1) + 'deg) scale(' + (isDucking ? 0.7 : 1) + ')';
        const roundedBobY = Math.round(bobY) || 0;

        return {
            transform: `translateY(${roundedBobY}px) rotate(${(isJumping ? spinDeg : waddleDeg).toFixed(1)}deg) scale(${sx.toFixed(2)}, ${sy.toFixed(2)})`,
            filter: isHit ? (Math.floor(tick / 3) % 2 === 0 ? 'brightness(2) hue-rotate(45deg)' : 'opacity(0.4)') : 'drop-shadow(0 6px 12px rgba(255,105,180,0.45))',
            shadowScale: isJumping ? Math.max(0.3, 1 - Math.abs(yOffset) / 140) : (isDucking ? 1.3 : 0.95),
            wingLeftTransform,
            wingRightTransform,
            scaleY: sy
        };
    }

    // ===== WEB AUDIO SYNTHESIZER =====
    let audioCtx = null;

    function getAudioCtx() {
        if (typeof global.AudioContext === 'undefined' && typeof global.webkitAudioContext === 'undefined') {
            return null;
        }
        if (!audioCtx) {
            const Ctx = global.AudioContext || global.webkitAudioContext;
            try {
                audioCtx = new Ctx();
            } catch (_) {
                return null;
            }
        }
        if (audioCtx && audioCtx.state === 'suspended' && typeof audioCtx.resume === 'function') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    const SCALE_NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];

    function playTone(freq, type, duration, startOffset = 0, peakGain = 0.12, endFreq = null) {
        const ctx = getAudioCtx();
        if (!ctx) return;
        try {
            const now = ctx.currentTime + startOffset;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, now);
            if (endFreq) {
                osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
            }
            gain.gain.setValueAtTime(peakGain, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + duration);
        } catch (_) { /* ignore audio errors */ }
    }

    function playSfx(type, noteIdx = 0) {
        switch (type) {
            case 'jump':
                playTone(440, 'sine', 0.16, 0, 0.13, 880);
                break;
            case 'duck':
                playTone(520, 'triangle', 0.12, 0, 0.11, 280);
                break;
            case 'collect':
            case 'match':
                playTone(880, 'triangle', 0.1, 0, 0.12, 1174.66);
                playTone(1318.5, 'sine', 0.18, 0.06, 0.12, 1760);
                break;
            case 'hit':
            case 'wrong':
                playTone(260, 'sawtooth', 0.18, 0, 0.09, 140);
                break;
            case 'win':
            case 'clear':
                [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, idx) => {
                    playTone(freq, 'triangle', 0.28, idx * 0.065, 0.12);
                });
                break;
            case 'pop':
                playTone(700, 'sine', 0.1, 0, 0.12, 1320);
                break;
            case 'sparkle':
                [1046.5, 1318.5, 1567.98, 2093].forEach((freq, idx) => {
                    playTone(freq, 'triangle', 0.24, idx * 0.05, 0.1);
                });
                break;
            case 'note': {
                const safeIdx = Math.abs(Math.floor(Number(noteIdx) || 0)) % SCALE_NOTES.length;
                const freq = SCALE_NOTES[safeIdx];
                playTone(freq, 'sine', 0.34, 0, 0.15);
                playTone(freq * 2, 'triangle', 0.18, 0, 0.05);
                break;
            }
            default:
                playTone(660, 'sine', 0.1, 0, 0.1, 990);
                break;
        }
    }

    function playCry() {
        const harpNotes = [587.33, 739.99, 880.00, 1174.66, 1479.98, 1760.00];
        harpNotes.forEach((freq, idx) => {
            playTone(freq, 'sine', 0.36, idx * 0.055, 0.11);
        });
    }

    function getDisplayInitials(name) {
        if (!name) return '하츄';
        const stripped = String(name).replace(/핑$/, '');
        if (!stripped) return '티니';
        return stripped.length <= 2 ? stripped : stripped.substring(0, 2);
    }

    function renderAvatarHtml(tp, sizeClass = '') {
        const target = tp || DEFAULT_TP;
        const name = target.name || '하츄핑';
        const color = target.color || '#FF69B4';
        const initials = getDisplayInitials(name);
        const hasValidImg = Boolean(target.image && !String(target.image).includes('catch-teenieping/images'));
        const cls = ['tp-mg-avatar', sizeClass].filter(Boolean).join(' ');

        if (hasValidImg) {
            return `<div class="${cls}" style="background: linear-gradient(135deg, ${color}, ${color}CC);">
                <img class="tp-mg-avatar-img" src="${target.image}" alt="${name}" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">
                <span class="tp-mg-avatar-fallback" style="display:none;">${initials}</span>
            </div>`;
        }
        return `<div class="${cls}" style="background: linear-gradient(135deg, ${color}, ${color}CC);">
            <span class="tp-mg-avatar-fallback" style="display:flex;">${initials}</span>
        </div>`;
    }

    function showToast(message) {
        if (typeof document === 'undefined' || !document.body) return;
        let toast = document.getElementById('tp-mg-reward-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'tp-mg-reward-toast';
            toast.className = 'tp-mg-reward-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<span class="toast-sparkle">✨</span><span>${message}</span><span class="toast-sparkle">✨</span>`;
        toast.classList.add('show');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3200);
    }

    const TpMiniGames = {
        SEASON_META,
        games: new Map(),
        currentTp: null,
        charCtx: null,
        activeGameId: null,
        activeCleanup: null,
        overlayEl: null,

        computeRunTransform,

        register(id, gameDef) {
            if (typeof id === 'object' && id !== null) {
                const objDef = id;
                if (objDef.id) {
                    this.games.set(objDef.id, objDef);
                }
                return objDef;
            }
            if (!id || !gameDef) return null;
            const normalized = Object.assign({ id }, gameDef);
            this.games.set(id, normalized);
            return normalized;
        },

        getGame(id) {
            return this.games.get(id) || null;
        },

        buildCharContext(tp) {
            const bridge = global.TinipingAppBridge;
            const rawTarget = tp ||
                this.currentTp ||
                (bridge && typeof bridge.getCurrentTp === 'function' ? bridge.getCurrentTp() : null) ||
                DEFAULT_TP;

            const mainSeason = Number(rawTarget.mainSeason) || 1;
            const meta = SEASON_META[mainSeason] || SEASON_META[1];
            const color = rawTarget.color || meta.color || '#FF69B4';

            const target = {
                name: rawTarget.name || '하츄핑',
                nameEn: rawTarget.nameEn || 'Heartsping',
                image: rawTarget.image || '',
                color,
                grade: rawTarget.grade || '로열',
                emotion: rawTarget.emotion || '사랑',
                gender: rawTarget.gender || '여',
                mainSeason
            };

            const allTinipings = (bridge && typeof bridge.getAllTinipings === 'function' ? bridge.getAllTinipings() : []) || [];
            const sourcePool = allTinipings.length > 0 ? allTinipings : FALLBACK_POOL;

            const normalizePoolItem = (item) => {
                const sId = Number(item && item.mainSeason) || 1;
                const sMeta = SEASON_META[sId] || SEASON_META[1];
                return {
                    name: (item && item.name) || '하츄핑',
                    nameEn: (item && item.nameEn) || 'Heartsping',
                    image: (item && item.image) || '',
                    color: (item && item.color) || sMeta.color || '#FF69B4',
                    grade: (item && item.grade) || '일반',
                    emotion: (item && item.emotion) || '사랑',
                    gender: (item && item.gender) || '여',
                    mainSeason: sId
                };
            };

            const pool = [target];
            const seenNames = new Set([target.name]);

            // 1차: 같은 시즌 티니핑 우선 추출
            for (const item of sourcePool) {
                if (!item || !item.name || seenNames.has(item.name)) continue;
                if (Number(item.mainSeason || 1) === mainSeason) {
                    pool.push(normalizePoolItem(item));
                    seenNames.add(item.name);
                }
            }

            // 2차: 최소 8마리 미만이면 전체 티니핑에서 보충
            if (pool.length < 8) {
                for (const item of sourcePool) {
                    if (pool.length >= 12) break;
                    if (!item || !item.name || seenNames.has(item.name)) continue;
                    pool.push(normalizePoolItem(item));
                    seenNames.add(item.name);
                }
            }

            // 3차: 그래도 8마리 미만이면 기본 폴백 풀에서 보충
            if (pool.length < 8) {
                for (const item of FALLBACK_POOL) {
                    if (pool.length >= 8) break;
                    if (!item || !item.name || seenNames.has(item.name)) continue;
                    pool.push(normalizePoolItem(item));
                    seenNames.add(item.name);
                }
            }

            return {
                name: target.name,
                nameEn: target.nameEn,
                image: target.image,
                color: target.color,
                grade: target.grade,
                emotion: target.emotion,
                gender: target.gender,
                mainSeason: target.mainSeason,
                seasonTheme: meta.theme,
                seasonEmoji: meta.emoji,
                pool
            };
        },

        helpers: {
            playSfx,
            playCry,
            computeRunTransform,

            getHighScore(gameId) {
                if (!gameId) return 0;
                const val = getStorageItem('tp_mg_high_' + gameId);
                const parsed = parseInt(val, 10);
                return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
            },

            saveHighScore(gameId, score) {
                if (!gameId) return 0;
                const numScore = Math.max(0, Math.floor(Number(score) || 0));
                const prev = TpMiniGames.helpers.getHighScore(gameId);
                const best = Math.max(prev, numScore);
                setStorageItem('tp_mg_high_' + gameId, String(best));
                return best;
            },

            rewardCharacter(tpName) {
                const ctx = TpMiniGames.charCtx || TpMiniGames.buildCharContext(TpMiniGames.currentTp);
                const name = tpName || (ctx && ctx.name) || '하츄핑';
                if (global.TinipingAppBridge && typeof global.TinipingAppBridge.catchTiniping === 'function') {
                    global.TinipingAppBridge.catchTiniping(name);
                }
                const message = `💖 ${name} 친구가 내 캐치 도감에 쏙 들어왔어요! 츄~♥`;
                showToast(message);
                return message;
            },

            createHeartExplosion(x, y) {
                if (global.TinipingAppBridge && typeof global.TinipingAppBridge.createHeartExplosion === 'function') {
                    global.TinipingAppBridge.createHeartExplosion(x, y);
                }
            },

            renderAvatarHtml,

            showResultOverlay(stageElOrOptions, maybeOptions = {}) {
                let stageEl = stageElOrOptions;
                let options = maybeOptions;
                if (stageElOrOptions && typeof stageElOrOptions.appendChild !== 'function') {
                    options = stageElOrOptions;
                    stageEl = typeof document !== 'undefined'
                        ? (document.getElementById('tp-game-stage-body') || document.getElementById('tp-minigame-stage'))
                        : null;
                }
                if (!stageEl) return null;
                const {
                    gameId = null,
                    score = 0,
                    bestScore = 0,
                    highScore = 0,
                    isNewRecord = false,
                    stars = 3,
                    title = '샤랄라 대성공! 💖',
                    message = '',
                    summary = '',
                    onReplay = null,
                    onRestart = null,
                    onRetry = null,
                    onBackToHub = null
                } = options || {};

                const ctx = TpMiniGames.charCtx || TpMiniGames.buildCharContext(TpMiniGames.currentTp);
                const safeStars = Math.max(1, Math.min(3, Math.round(Number(stars) || 3)));
                const starHtml = '⭐'.repeat(safeStars) + '☆'.repeat(3 - safeStars);
                const targetGameId = gameId || TpMiniGames.activeGameId;
                const activeHigh = targetGameId ? TpMiniGames.helpers.getHighScore(targetGameId) : 0;
                const finalBest = Math.max(Number(score) || 0, Number(bestScore) || 0, Number(highScore) || 0, activeHigh);
                const finalMsg = message || summary || `${ctx.name}${getWithParticle(ctx.name)} 함께해서 정말 즐거웠어~ 츄! 💕`;
                const replayHandler = onReplay || onRestart || onRetry;

                playSfx('win');
                const rewardMsg = TpMiniGames.helpers.rewardCharacter(ctx.name);
                TpMiniGames.helpers.createHeartExplosion();

                const existing = stageEl.querySelector('.tp-mg-result-overlay');
                if (existing) existing.remove();

                const overlay = document.createElement('div');
                overlay.className = 'tp-mg-result-overlay';
                overlay.innerHTML = `
                    <div class="tp-mg-result-card">
                        <div class="tp-mg-result-sparkles">✨ 💖 🌟 💖 ✨</div>
                        <div class="tp-mg-result-avatar-wrap">
                            ${renderAvatarHtml(ctx, 'tp-mg-avatar-lg')}
                        </div>
                        <h3 class="tp-mg-result-title">${title}</h3>
                        <div class="tp-mg-result-stars" aria-label="별점 ${safeStars}개">${starHtml}</div>
                        <p class="tp-mg-result-msg">${finalMsg}</p>
                        <div class="tp-mg-result-scores">
                            <div class="tp-mg-score-box">
                                <span class="score-label">이번 점수</span>
                                <strong class="score-value">${score}점</strong>
                            </div>
                            <div class="tp-mg-score-box best">
                                <span class="score-label">${isNewRecord ? '👑 최고 신기록!' : '🏆 최고 기록'}</span>
                                <strong class="score-value">${finalBest}점</strong>
                            </div>
                        </div>
                        <div class="tp-mg-result-reward-banner">${rewardMsg}</div>
                        <div class="tp-mg-result-actions">
                            <button type="button" class="tp-ctrl-btn tp-result-replay-btn">🔄 한 번 더 놀기!</button>
                            <button type="button" class="tp-ctrl-btn tp-result-hub-btn">🎮 다른 게임 고르기</button>
                        </div>
                    </div>
                `;

                stageEl.appendChild(overlay);

                const bindActionBtn = (btn, actionFn) => {
                    if (!btn) return;
                    let handled = false;
                    const onActivate = (e) => {
                        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
                        if (e && (e.type === 'touchend' || e.type === 'click') && typeof e.preventDefault === 'function') {
                            e.preventDefault();
                        }
                        if (handled) return;
                        handled = true;
                        actionFn();
                    };
                    btn.addEventListener('click', onActivate);
                    btn.addEventListener('touchend', onActivate);
                };

                const replayBtn = overlay.querySelector('.tp-result-replay-btn');
                bindActionBtn(replayBtn, () => {
                    playSfx('pop');
                    overlay.remove();
                    if (typeof replayHandler === 'function') {
                        replayHandler();
                    } else if (targetGameId) {
                        TpMiniGames.launchGame(targetGameId);
                    }
                });

                const hubBtn = overlay.querySelector('.tp-result-hub-btn');
                bindActionBtn(hubBtn, () => {
                    playSfx('pop');
                    overlay.remove();
                    if (typeof onBackToHub === 'function') {
                        onBackToHub();
                    } else {
                        TpMiniGames.showHubView();
                    }
                });

                return overlay;
            },

            backToHub() {
                TpMiniGames.showHubView();
            },

            openHub(tp) {
                return TpMiniGames.openHub(tp);
            }
        },

        playSfx,
        playCry,
        renderAvatarHtml,
        getHighScore(gameId) { return TpMiniGames.helpers.getHighScore(gameId); },
        saveHighScore(gameId, score) { return TpMiniGames.helpers.saveHighScore(gameId, score); },
        rewardCharacter(tpName) { return TpMiniGames.helpers.rewardCharacter(tpName); },
        showResultOverlay(stageEl, options) { return TpMiniGames.helpers.showResultOverlay(stageEl, options); },
        backToHub() { return TpMiniGames.showHubView(); },

        ensureOverlay() {
            if (typeof document === 'undefined' || !document.body) return null;
            let overlay = document.getElementById('tp-minigame-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'tp-minigame-overlay';
                overlay.className = 'tp-minigame-overlay';
                document.body.appendChild(overlay);
            }
            this.overlayEl = overlay;
            return overlay;
        },

        stopActiveGame() {
            if (typeof this.activeCleanup === 'function') {
                try {
                    this.activeCleanup();
                } catch (_) { /* ignore */ }
            } else if (this.activeCleanup && typeof this.activeCleanup === 'object') {
                const fn = this.activeCleanup.cleanup || this.activeCleanup.stop || this.activeCleanup.destroy || this.activeCleanup.unmount;
                if (typeof fn === 'function') {
                    try { fn.call(this.activeCleanup); } catch (_) { /* ignore */ }
                }
            }
            if (this.activeGameId && this.games.has(this.activeGameId)) {
                const def = this.games.get(this.activeGameId);
                const defCleanup = def && (def.cleanup || def.stop || def.destroy || def.unmount);
                if (typeof defCleanup === 'function') {
                    try { defCleanup.call(def); } catch (_) { /* ignore */ }
                }
            }
            this.activeCleanup = null;
            this.activeGameId = null;
        },

        openHub(tp) {
            this.stopActiveGame();
            if (tp) {
                this.currentTp = tp;
            } else if (!this.currentTp) {
                const bridge = global.TinipingAppBridge;
                this.currentTp = (bridge && typeof bridge.getCurrentTp === 'function' ? bridge.getCurrentTp() : null) || DEFAULT_TP;
            }
            this.charCtx = this.buildCharContext(this.currentTp);
            playCry();

            const overlay = this.ensureOverlay();
            if (!overlay) return this.charCtx;

            overlay.classList.remove('is-playing');
            overlay.classList.add('open');
            this.renderHubContent();
            return this.charCtx;
        },

        showHubView() {
            this.stopActiveGame();
            this.charCtx = this.buildCharContext(this.currentTp);
            const overlay = this.ensureOverlay();
            if (!overlay) return;
            overlay.classList.remove('is-playing');
            overlay.classList.add('open');
            this.renderHubContent();
        },

        closeHub() {
            this.stopActiveGame();
            playSfx('pop');
            const overlay = (typeof document !== 'undefined' && document.getElementById('tp-minigame-overlay')) || this.overlayEl;
            if (overlay) {
                overlay.classList.remove('is-playing');
                overlay.classList.remove('open');
            }
        },

        renderHubContent() {
            const overlay = this.ensureOverlay();
            if (!overlay) return;

            const ctx = this.charCtx || this.buildCharContext(this.currentTp);
            const bridge = global.TinipingAppBridge;
            const allList = (bridge && typeof bridge.getAllTinipings === 'function' && bridge.getAllTinipings().length > 0)
                ? bridge.getAllTinipings()
                : ctx.pool;

            const particle = getWithParticle(ctx.name);
            const optionsHtml = allList.map(item => {
                const selected = item.name === ctx.name ? 'selected' : '';
                return `<option value="${item.name}" ${selected}>${item.name} (${item.mainSeason || 1}기 · ${item.emotion || '마법'})</option>`;
            }).join('');

            const cardsHtml = DEFAULT_GAME_CARDS.map(cardMeta => {
                const reg = this.games.get(cardMeta.id) || {};
                const title = reg.title || reg.name || cardMeta.title;
                const subtitle = reg.subtitle || reg.description || reg.desc || cardMeta.subtitle;
                const icon = reg.icon || reg.emoji || cardMeta.icon;
                const badge = reg.badge || cardMeta.badge;
                const highScore = this.helpers.getHighScore(cardMeta.id);

                return `
                    <button type="button" class="tp-hub-game-card" data-game-id="${cardMeta.id}" style="--card-grad: ${cardMeta.gradient};">
                        <div class="tp-hub-card-top">
                            <span class="tp-hub-card-icon">${icon}</span>
                            <span class="tp-hub-card-badge">${badge}</span>
                        </div>
                        <h3 class="tp-hub-card-title">${title}</h3>
                        <p class="tp-hub-card-desc">${subtitle}</p>
                        <div class="tp-hub-card-footer">
                            <span class="tp-hub-card-record">🏆 최고 ${highScore}점</span>
                            <span class="tp-hub-card-play">놀러가기 ▶</span>
                        </div>
                    </button>
                `;
            }).join('');

            overlay.innerHTML = `
                <div class="tp-minigame-shell">
                    <div class="tp-mg-header">
                        <div class="tp-mg-companion">
                            ${renderAvatarHtml(ctx, 'tp-mg-avatar-md')}
                            <div class="tp-mg-companion-info">
                                <div class="tp-mg-companion-badges">
                                    <span class="tp-mg-pill grade">${ctx.grade}</span>
                                    <span class="tp-mg-pill emotion">${ctx.seasonEmoji} ${ctx.emotion}</span>
                                    <span class="tp-mg-pill season">${ctx.mainSeason}기 ${ctx.seasonTheme}</span>
                                </div>
                                <h2 class="tp-mg-companion-title">💖 ${ctx.name}의 샤랄라 마법 오락실 💖</h2>
                                <p class="tp-mg-speech-bubble">"${ctx.name}${particle} 함께 신나는 마법 놀이를 해볼까~ 츄? 💖"</p>
                            </div>
                        </div>
                        <div class="tp-mg-header-controls">
                            <div class="tp-mg-switcher">
                                <label for="tpMgCharSelect" class="sr-only">티니핑 친구 선택</label>
                                <select id="tpMgCharSelect" class="tp-mg-char-select" title="함께 놀 티니핑 친구 고르기">
                                    ${optionsHtml}
                                </select>
                                <button type="button" id="tpMgRandomCharBtn" class="tp-mg-random-btn">
                                    🎲 다른 티니핑 친구 고르기
                                </button>
                            </div>
                            <button type="button" id="tpMgCloseBtn" class="tp-mg-close-btn" title="오락실 닫기">✕ 닫기</button>
                        </div>
                    </div>

                    <div id="tp-minigame-stage" class="tp-minigame-stage">
                        <div class="tp-hub-grid">
                            ${cardsHtml}
                        </div>
                    </div>
                </div>
            `;

            const closeBtn = overlay.querySelector('#tpMgCloseBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeHub());
            }

            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    this.closeHub();
                }
            };

            const selectEl = overlay.querySelector('#tpMgCharSelect');
            if (selectEl) {
                selectEl.addEventListener('change', (e) => {
                    const chosenName = e.target.value;
                    const found = allList.find(t => t.name === chosenName);
                    if (found) {
                        playSfx('sparkle');
                        this.currentTp = found;
                        this.charCtx = this.buildCharContext(found);
                        this.renderHubContent();
                    }
                });
            }

            const randomBtn = overlay.querySelector('#tpMgRandomCharBtn');
            if (randomBtn) {
                randomBtn.addEventListener('click', () => {
                    if (!allList || allList.length === 0) return;
                    const candidates = allList.filter(t => t.name !== ctx.name);
                    const pickPool = candidates.length > 0 ? candidates : allList;
                    const randomTp = pickPool[Math.floor(Math.random() * pickPool.length)];
                    playSfx('sparkle');
                    this.helpers.createHeartExplosion();
                    this.currentTp = randomTp;
                    this.charCtx = this.buildCharContext(randomTp);
                    this.renderHubContent();
                });
            }

            const gameCards = overlay.querySelectorAll('.tp-hub-game-card');
            gameCards.forEach(card => {
                card.addEventListener('click', () => {
                    const gameId = card.getAttribute('data-game-id');
                    playSfx('pop');
                    this.launchGame(gameId);
                });
            });
        },

        launchGame(id, customStageEl = null) {
            this.stopActiveGame();
            if (!this.charCtx) {
                this.charCtx = this.buildCharContext(this.currentTp);
            }

            const gameDef = this.games.get(id);
            const cardMeta = DEFAULT_GAME_CARDS.find(c => c.id === id) || { title: '샤랄라 미니게임', icon: '🎮' };
            this.activeGameId = id;

            let stageContainer = customStageEl;
            if (!stageContainer && typeof document !== 'undefined') {
                const overlay = this.ensureOverlay();
                if (overlay) {
                    overlay.classList.add('open');
                    overlay.classList.add('is-playing');
                    if (!overlay.querySelector('#tp-minigame-stage')) {
                        this.renderHubContent();
                        overlay.classList.add('is-playing');
                    }
                    stageContainer = overlay.querySelector('#tp-minigame-stage');
                }
            }

            if (!stageContainer) {
                return null;
            }

            const gameTitle = (gameDef && (gameDef.title || gameDef.name)) || cardMeta.title;
            const gameIcon = (gameDef && (gameDef.icon || gameDef.emoji)) || cardMeta.icon;

            stageContainer.innerHTML = `
                <div class="tp-game-active-bar">
                    <button type="button" class="tp-game-back-btn" id="tpGameBackToHubBtn">
                        ◀ 게임 고르기
                    </button>
                    <div class="tp-game-active-title">
                        <span>${gameIcon}</span>
                        <strong>${gameTitle}</strong>
                        <span class="tp-game-char-tag" style="background:${this.charCtx.color};">${this.charCtx.name}</span>
                    </div>
                    <div class="tp-game-active-actions">
                        <button type="button" class="tp-game-restart-btn" id="tpGameQuickRestartBtn">
                            🔄 다시 시작
                        </button>
                        <button type="button" class="tp-game-exit-btn" id="tpGameExitBtn">
                            ✕ 닫기
                        </button>
                    </div>
                </div>
                <div class="tp-game-stage-body" id="tp-game-stage-body"></div>
            `;

            const backBtn = stageContainer.querySelector('#tpGameBackToHubBtn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    playSfx('pop');
                    this.showHubView();
                });
            }

            const restartBtn = stageContainer.querySelector('#tpGameQuickRestartBtn');
            if (restartBtn) {
                restartBtn.addEventListener('click', () => {
                    playSfx('pop');
                    this.launchGame(id, customStageEl);
                });
            }

            const exitBtn = stageContainer.querySelector('#tpGameExitBtn');
            if (exitBtn) {
                exitBtn.addEventListener('click', () => {
                    this.closeHub();
                });
            }

            const stageBody = stageContainer.querySelector('#tp-game-stage-body') || stageContainer;

            if (!gameDef) {
                stageBody.innerHTML = `
                    <div class="tp-game-placeholder">
                        <p>✨ 마법 게임을 불러오고 있어요! 잠시만 기다려주세요~ 츄! 💖</p>
                    </div>
                `;
                return null;
            }

            const entryFn = gameDef.mount || gameDef.start || gameDef.init || gameDef.render;
            if (typeof entryFn === 'function') {
                const cleanupOrInstance = entryFn.call(gameDef, stageBody, this.charCtx, this.helpers);
                this.activeCleanup = cleanupOrInstance || null;
                return cleanupOrInstance;
            }
            return null;
        }
    };

    global.TpMiniGames = TpMiniGames;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TpMiniGames;
    }
})(typeof window !== 'undefined' ? window : globalThis);
