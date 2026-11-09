/**
 * 포켓몬 미니게임 오락실 코어 허브 (window.PokeMiniGames)
 * 6~7세 어린이를 위한 직관적인 전체화면 게임 런처, 캐릭터 컨텍스트 빌더,
 * 공통 러너 애니메이션 변환기, Web Audio 효과음 신디사이저 및 결과/보상 오버레이 제공
 */
(function (global) {
  'use strict';

  const TYPE_EMOJIS = {
    fire: '🔥',
    water: '💧',
    grass: '🍃',
    electric: '⚡',
    ice: '❄️',
    fighting: '🥊',
    poison: '☠️',
    ground: '⛰️',
    flying: '🪽',
    psychic: '🔮',
    bug: '🐞',
    rock: '🪨',
    ghost: '👻',
    dragon: '🐉',
    dark: '🌙',
    steel: '⚙️',
    fairy: '💖',
    normal: '⭐'
  };

  const TYPE_NAMES_KR_FALLBACK = {
    normal: '노말', fire: '불꽃', water: '물', grass: '풀',
    electric: '전기', ice: '얼음', fighting: '격투', poison: '독',
    ground: '땅', flying: '비행', psychic: '에스퍼', bug: '벌레',
    rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악',
    steel: '강철', fairy: '페어리'
  };

  const TYPE_COLORS_FALLBACK = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705898',
    steel: '#B7B7CE', fairy: '#D685AD'
  };

  const GAME_ORDER = ['runner', 'berry', 'catch', 'seesaw', 'memory', 'flipbattle'];

  const DEFAULT_GAME_META = {
    runner: {
      id: 'runner',
      title: '우당탕탕 달리기!',
      subtitle: '점프하고 숙여서 장애물을 피해 달려요!',
      icon: '🏃‍♂️',
      themeColor: '#FF6B4A'
    },
    berry: {
      id: 'berry',
      title: '냠냠 열매 받아먹기!',
      subtitle: '하늘에서 떨어지는 맛있는 열매를 쏙쏙 받아요!',
      icon: '🍓',
      themeColor: '#4ECDC4'
    },
    catch: {
      id: 'catch',
      title: '몬스터볼 쏙! 캐치!',
      subtitle: '타이밍에 맞춰 버튼을 눌러 포켓몬과 친구가 되어요!',
      icon: '🔴',
      themeColor: '#FFD166'
    },
    seesaw: {
      id: 'seesaw',
      title: '기우뚱 시소 몸무게 퀴즈!',
      subtitle: '포켓몬의 키와 몸무게를 비교해 시소 균형을 맞춰요!',
      icon: '⚖️',
      themeColor: '#A78BFA'
    },
    memory: {
      id: 'memory',
      title: '포켓몬 카드 짝맞추기!',
      subtitle: '카드를 뒤집어 내 포켓몬과 진화 친구들을 찾아요!',
      icon: '🃏',
      themeColor: '#AB47BC'
    },
    flipbattle: {
      id: 'flipbattle',
      title: '후다닥! 판 뒤집기 대결!',
      subtitle: '로켓단보다 먼저 카드를 내 포켓몬으로 뒤집어요!',
      icon: '⚡',
      themeColor: '#FF7043'
    }
  };

  // Node.js 테스트 환경 폴백 스토리지
  const memoryStorage = new Map();
  function getStorage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function') {
        return localStorage;
      }
      if (global && global.localStorage && typeof global.localStorage.getItem === 'function') {
        return global.localStorage;
      }
    } catch (_) {
      // SecurityError 등 무시
    }
    return {
      getItem: (k) => (memoryStorage.has(k) ? memoryStorage.get(k) : null),
      setItem: (k, v) => memoryStorage.set(k, String(v)),
      removeItem: (k) => memoryStorage.delete(k)
    };
  }

  function getPokedexApp() {
    if (typeof PokedexApp !== 'undefined') return PokedexApp;
    if (global && global.PokedexApp) return global.PokedexApp;
    return null;
  }

  function getPokeAPI() {
    if (typeof PokeAPI !== 'undefined') return PokeAPI;
    if (global && global.PokeAPI) return global.PokeAPI;
    return null;
  }

  /**
   * 받침 유무에 따른 조사('와'/'과') 선택
   */
  function withCompanionParticle(name) {
    if (!name || typeof name !== 'string') return '피카츄와';
    const lastCode = name.charCodeAt(name.length - 1);
    if (lastCode >= 0xAC00 && lastCode <= 0xD7A3) {
      const jong = (lastCode - 0xAC00) % 28;
      return name + (jong === 0 ? '와' : '과');
    }
    return name + '와';
  }

  /**
   * 전 포켓몬 공통 달리기/점프/숙이기 CSS Transform 계산 순수 함수
   */
  function computeRunTransform(state = {}, tick = 0) {
    const {
      yOffset = 0,
      isJumping = false,
      isDucking = false,
      isHit = false,
      flipX = true
    } = state || {};

    const dirX = flipX ? -1 : 1;
    let bobY = 0;
    let tilt = 0;
    let sx = 1;
    let sy = 1;

    if (isJumping) {
      bobY = yOffset;
      sx = 0.88;
      sy = 1.16;
      tilt = flipX ? 10 : -10;
    } else if (isDucking) {
      bobY = 8;
      sx = 1.32;
      sy = 0.56;
      tilt = flipX ? -12 : 12;
    } else {
      bobY = Math.abs(Math.sin(tick * 0.35)) * -10;
      tilt = Math.sin(tick * 0.35) * 6;
      sx = 1 + Math.sin(tick * 0.7) * 0.06;
      sy = 1 - Math.sin(tick * 0.7) * 0.06;
    }

    const shadowScale = isJumping
      ? Math.max(0.35, 1 - Math.abs(yOffset) / 140)
      : (isDucking ? 1.25 : 0.95 - Math.abs(bobY) * 0.02);

    const filter = isHit
      ? (Math.floor(tick / 3) % 2 === 0 ? 'brightness(2.2) saturate(0.3)' : 'opacity(0.45)')
      : 'drop-shadow(0 6px 8px rgba(0,0,0,0.45))';

    return {
      transform: `translateY(${Math.round(bobY)}px) rotate(${tilt.toFixed(1)}deg) scale(${(sx * dirX).toFixed(2)}, ${sy.toFixed(2)})`,
      filter,
      shadowScale,
      scaleY: sy
    };
  }

  // Web Audio API 신디사이저
  let sharedAudioCtx = null;
  function getAudioContext() {
    try {
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
      }
      return sharedAudioCtx;
    } catch (_) {
      return null;
    }
  }

  function playSfx(type = 'pop', noteIdx = 0) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const scaleNotes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
      const baseFreq = scaleNotes[Math.abs(noteIdx) % scaleNotes.length] || 523.25;

      if (type === 'jump') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.16);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'duck') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(210, now + 0.12);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.start(now);
        osc.stop(now + 0.13);
      } else if (type === 'collect') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.setValueAtTime(baseFreq * 1.25, now + 0.06);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.linearRampToValueAtTime(95, now + 0.22);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === 'win') {
        osc.type = 'triangle';
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        });
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.start(now);
        osc.stop(now + 0.42);
      } else if (type === 'bounce') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.18);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else {
        // 'pop' 및 기타 기본 효과음
        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(760, now + 0.09);
        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }
    } catch (_) {
      // 오디오 미지원 환경 안전 무시
    }
  }

  const PokeMiniGames = {
    isOpen: false,
    games: new Map(),
    gameOrder: [...GAME_ORDER],
    activeGameId: null,
    activeCleanup: null,
    charCtx: null,
    overlayEl: null,

    TYPE_EMOJIS,
    computeRunTransform,

    /**
     * 미니게임 모듈 등록
     */
    register(id, gameDef) {
      if (!id || !gameDef) return;
      const defaultMeta = DEFAULT_GAME_META[id] || {};
      const merged = {
        id,
        title: gameDef.title || gameDef.name || defaultMeta.title || id,
        subtitle: gameDef.subtitle || gameDef.description || defaultMeta.subtitle || '',
        icon: gameDef.icon || gameDef.emoji || defaultMeta.icon || '🎮',
        themeColor: gameDef.themeColor || gameDef.color || defaultMeta.themeColor || '#FFD600',
        ...gameDef
      };
      this.games.set(id, merged);
      if (!this.gameOrder.includes(id)) {
        this.gameOrder.push(id);
      }
      if (this.isOpen && !this.activeGameId) {
        this.renderHubView();
      }
    },

    /**
     * 현재 도감에 로드된 포켓몬을 기반으로 게임용 컨텍스트 생성
     */
    buildCharContext() {
      const app = getPokedexApp();
      const api = getPokeAPI();
      const rawData = (app && app.state && app.state.currentPokemonData) ? app.state.currentPokemonData : null;

      const data = rawData || {
        id: 25,
        nameKr: '피카츄',
        nameEn: 'Pikachu',
        types: [{ type: { name: 'electric' } }],
        height: 4,
        weight: 60,
        artworkUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
        spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
        imageVariants: [
          {
            label: '배틀 스프라이트',
            url: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif'
          }
        ],
        cryUrl: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg'
      };

      const id = Number(data.id) || 25;
      const variants = Array.isArray(data.imageVariants) ? data.imageVariants : [];
      const showdownVariant = variants.find((v) => v && v.label === '배틀 스프라이트' && v.url);

      let runnerSpriteUrl = '';
      if (showdownVariant && showdownVariant.url) {
        runnerSpriteUrl = showdownVariant.url;
      } else if (id >= 1 && id <= 649) {
        runnerSpriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
      } else {
        runnerSpriteUrl =
          data.spriteUrl ||
          data.artworkUrl ||
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
      }

      const primaryType =
        (data.types && data.types[0] && data.types[0].type && data.types[0].type.name) || 'electric';

      const typeNameKr =
        (api && typeof api.getTypeNameKr === 'function' ? api.getTypeNameKr(primaryType) : null) ||
        TYPE_NAMES_KR_FALLBACK[primaryType] ||
        '전기';

      const typeColor =
        (api && typeof api.getTypeColor === 'function' ? api.getTypeColor(primaryType) : null) ||
        TYPE_COLORS_FALLBACK[primaryType] ||
        '#F7D02C';

      const typeEmoji = TYPE_EMOJIS[primaryType] || '⭐';

      const artworkUrl =
        data.artworkUrl ||
        data.spriteUrl ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

      const spriteUrl =
        data.spriteUrl ||
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

      const rawEvoChain =
        app && app.state && Array.isArray(app.state.currentEvolutionChain) && app.state.currentEvolutionChain.length > 0
          ? app.state.currentEvolutionChain
          : [{ id, nameKr: data.nameKr || '피카츄', sprite_url: spriteUrl || artworkUrl }];

      const evolutionChain = rawEvoChain.map((stage) => ({
        ...stage,
        id: Number(stage.id) || id,
        nameKr: stage.nameKr || stage.name || data.nameKr || '피카츄',
        sprite_url: stage.sprite_url || stage.spriteUrl || spriteUrl || artworkUrl
      }));

      return {
        id,
        nameKr: data.nameKr || '피카츄',
        nameEn: data.nameEn || 'Pikachu',
        artworkUrl,
        spriteUrl,
        runnerSpriteUrl,
        isAnimatedGif: Boolean(runnerSpriteUrl && runnerSpriteUrl.toLowerCase().endsWith('.gif')),
        primaryType,
        typeNameKr,
        typeColor,
        typeEmoji,
        height: Number(data.height) || 4,
        weight: Number(data.weight) || 60,
        cryUrl: data.cryUrl || null,
        evolutionChain
      };
    },

    /**
     * 공통 헬퍼 객체
     */
    helpers: {
      playSfx(type, noteIdx = 0) {
        playSfx(type, noteIdx);
      },

      playCry() {
        const ctx = PokeMiniGames.charCtx || PokeMiniGames.buildCharContext();
        if (ctx && ctx.cryUrl && typeof Audio !== 'undefined') {
          try {
            const audio = new Audio(ctx.cryUrl);
            audio.volume = 0.55;
            audio.play().catch(() => playSfx('win'));
            return;
          } catch (_) {
            // 폴백 효과음 재생
          }
        }
        playSfx('win');
      },

      computeRunTransform(state, tick) {
        return computeRunTransform(state, tick);
      },

      getHighScore(gameId) {
        if (!gameId) return 0;
        const store = getStorage();
        const raw = store.getItem('poke_mg_high_' + gameId);
        const parsed = parseInt(raw, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      },

      saveHighScore(gameId, score) {
        if (!gameId) return false;
        const numericScore = Math.floor(Number(score) || 0);
        const currentBest = this.getHighScore(gameId);
        if (numericScore > currentBest) {
          const store = getStorage();
          store.setItem('poke_mg_high_' + gameId, String(numericScore));
          return true;
        }
        return false;
      },

      rewardCharacter() {
        const ctx = PokeMiniGames.charCtx || PokeMiniGames.buildCharContext();
        const app = getPokedexApp();
        const store = getStorage();

        if (app && app.state && app.state.favorites) {
          app.state.favorites.add(ctx.id);
          try {
            store.setItem('pokeFavorites', JSON.stringify([...app.state.favorites]));
          } catch (_) {}
          if (typeof app.updateFavButton === 'function') {
            app.updateFavButton();
          }
        } else {
          try {
            const favList = JSON.parse(store.getItem('pokeFavorites') || '[]');
            if (!favList.includes(ctx.id)) favList.push(ctx.id);
            store.setItem('pokeFavorites', JSON.stringify(favList));
          } catch (_) {}
        }

        playSfx('win');
        PokeMiniGames.showToastBanner(`⭐ ${ctx.nameKr} 친구가 내 즐겨찾기에 등록되었어요!`);
      },

      showResultOverlay(stageEl, options = {}) {
        if (!stageEl || typeof document === 'undefined') return;
        const {
          score = 0,
          bestScore,
          highScore,
          isNewRecord,
          stars = 3,
          title = '참 잘했어요!',
          message = '',
          summary = '',
          onReplay,
          onRestart,
          onBackToHub
        } = options || {};

        const finalMessage = message || summary;
        const replayCallback = onReplay || onRestart;
        const passedBest = typeof bestScore === 'number' && bestScore > 0 ? bestScore : (typeof highScore === 'number' && highScore > 0 ? highScore : 0);
        const activeId = PokeMiniGames.activeGameId;
        const autoNewRecord = activeId ? this.saveHighScore(activeId, score) : false;
        const finalNewRecord = typeof isNewRecord === 'boolean' ? (isNewRecord || autoNewRecord) : autoNewRecord;
        const finalBest =
          passedBest > 0
            ? Math.max(passedBest, score)
            : Math.max(activeId ? this.getHighScore(activeId) : 0, score);

        const ctx = PokeMiniGames.charCtx || PokeMiniGames.buildCharContext();
        const starCount = Math.max(1, Math.min(3, Math.round(Number(stars) || 3)));
        const starsHtml = Array.from({ length: 3 }, (_, idx) =>
          `<span class="mg-result-star ${idx < starCount ? 'earned' : 'empty'}">⭐</span>`
        ).join('');

        playSfx('win');

        const existing = stageEl.querySelector('.mg-result-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'mg-result-overlay';
        overlay.innerHTML = `
          <div class="mg-result-card">
            <div class="mg-result-stars">${starsHtml}</div>
            <h2 class="mg-result-title">${title}</h2>
            ${finalMessage ? `<p class="mg-result-message">${finalMessage}</p>` : ''}
            <div class="mg-result-char-wrap">
              <img class="mg-result-char-img" src="${ctx.runnerSpriteUrl || ctx.artworkUrl}" alt="${ctx.nameKr}" onerror="this.onerror=null;this.src='${ctx.artworkUrl}';" />
            </div>
            <div class="mg-result-score-box">
              <div class="mg-result-score-main">
                <span class="mg-result-score-label">이번 점수</span>
                <span class="mg-result-score-value">${score}점</span>
              </div>
              <div class="mg-result-best-badge ${finalNewRecord ? 'new-record' : ''}">
                🏆 최고 기록: ${finalBest}점 ${finalNewRecord ? '<span class="mg-new-record-pill">🎉 신기록!</span>' : ''}
              </div>
            </div>
            <div class="mg-result-actions">
              <button type="button" class="mg-ctrl-btn mg-btn-replay">🔄 한 번 더 놀기!</button>
              <button type="button" class="mg-ctrl-btn mg-btn-hub">🎮 다른 게임 고르기</button>
            </div>
          </div>
        `;

        const replayBtn = overlay.querySelector('.mg-btn-replay');
        const hubBtn = overlay.querySelector('.mg-btn-hub');

        if (replayBtn) {
          replayBtn.addEventListener('click', () => {
            playSfx('pop');
            overlay.remove();
            if (typeof replayCallback === 'function') {
              replayCallback();
            } else if (PokeMiniGames.activeGameId) {
              PokeMiniGames.launchGame(PokeMiniGames.activeGameId);
            }
          });
        }

        if (hubBtn) {
          hubBtn.addEventListener('click', () => {
            playSfx('pop');
            overlay.remove();
            if (typeof onBackToHub === 'function') {
              onBackToHub();
            } else {
              PokeMiniGames.showHubView();
            }
          });
        }

        stageEl.appendChild(overlay);
      }
    },

    /**
     * 상단 축하 배너 토스트 표시
     */
    showToastBanner(text) {
      if (typeof document === 'undefined') return;
      const host = this.overlayEl || document.body;
      const existing = host.querySelector('.mg-reward-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'mg-reward-toast';
      toast.textContent = text;
      host.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 400);
      }, 2800);
    },

    /**
     * 활성 게임 클린업 실행
     */
    _runActiveCleanup() {
      if (typeof this.activeCleanup === 'function') {
        try {
          this.activeCleanup();
        } catch (err) {
          console.error('MiniGame cleanup error:', err);
        }
      } else if (this.activeCleanup && typeof this.activeCleanup.cleanup === 'function') {
        try {
          this.activeCleanup.cleanup();
        } catch (_) {}
      } else if (this.activeCleanup && typeof this.activeCleanup.unmount === 'function') {
        try {
          this.activeCleanup.unmount();
        } catch (_) {}
      }
      this.activeCleanup = null;
    },

    /**
     * 모달 DOM 보장
     */
    _ensureOverlay() {
      if (typeof document === 'undefined') return null;
      let overlay = document.getElementById('poke-minigame-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'poke-minigame-overlay';
        overlay.className = 'poke-minigame-overlay hidden';
        document.body.appendChild(overlay);
      }
      this.overlayEl = overlay;
      return overlay;
    },

    /**
     * 오락실 허브 열기
     */
    openHub() {
      this._runActiveCleanup();
      this.activeGameId = null;
      this.charCtx = this.buildCharContext();
      this.isOpen = true;

      const overlay = this._ensureOverlay();
      if (!overlay) return;

      overlay.classList.remove('hidden');
      overlay.style.setProperty('--mg-type-color', this.charCtx.typeColor || '#FFD600');
      playSfx('pop');
      this.renderHubView();
    },

    /**
     * 게임 실행 중 허브(2x2 선택 화면)로 복귀
     */
    showHubView() {
      this._runActiveCleanup();
      this.activeGameId = null;
      this.charCtx = this.buildCharContext();
      if (!this.overlayEl) return;
      this.renderHubView();
    },

    /**
     * 오락실 모달 닫기
     */
    closeHub() {
      this._runActiveCleanup();
      this.activeGameId = null;
      this.isOpen = false;
      playSfx('duck');
      if (this.overlayEl) {
        this.overlayEl.classList.add('hidden');
        this.overlayEl.innerHTML = '';
      }
    },

    /**
     * 메인 허브 화면 렌더링 (상단 포켓몬 응원 헤더 + 2x2 대형 게임 카드)
     */
    renderHubView() {
      const overlay = this._ensureOverlay();
      if (!overlay) return;

      const ctx = this.charCtx || this.buildCharContext();
      const companionText = withCompanionParticle(ctx.nameKr);
      const numStr = `#${String(ctx.id).padStart(3, '0')}`;

      const cardsHtml = this.gameOrder
        .map((gameId) => {
          const def = this.games.get(gameId) || DEFAULT_GAME_META[gameId];
          if (!def) return '';
          const best = this.helpers.getHighScore(gameId);
          return `
            <button type="button" class="mg-game-card" data-game-id="${gameId}" style="--card-accent: ${def.themeColor || '#FFD600'}">
              <div class="mg-card-top">
                <span class="mg-card-icon">${def.icon || '🎮'}</span>
                <span class="mg-card-record">🏆 최고 기록: ${best}점</span>
              </div>
              <div class="mg-card-body">
                <h3 class="mg-card-title">${def.title}</h3>
                <p class="mg-card-subtitle">${def.subtitle || ''}</p>
              </div>
              <div class="mg-card-footer">
                <span class="mg-card-start-pill">▶ 시작하기!</span>
              </div>
            </button>
          `;
        })
        .join('');

      overlay.innerHTML = `
        <div class="mg-hub-shell">
          <header class="mg-hub-header">
            <div class="mg-hub-char">
              <div class="mg-hub-avatar-wrap">
                <img
                  class="mg-hub-avatar"
                  src="${ctx.runnerSpriteUrl || ctx.artworkUrl}"
                  alt="${ctx.nameKr}"
                  onerror="this.onerror=null;this.src='${ctx.artworkUrl}';"
                />
              </div>
              <div class="mg-hub-char-meta">
                <div class="mg-hub-name-row">
                  <span class="mg-hub-num">${numStr}</span>
                  <span class="mg-hub-name">${ctx.nameKr}</span>
                  <span class="mg-hub-type-badge" style="background:${ctx.typeColor}">
                    ${ctx.typeEmoji} ${ctx.typeNameKr}
                  </span>
                </div>
                <div class="mg-hub-bubble">
                  💬 "${companionText} 함께 어떤 게임을 할까? 신나게 놀아보자!"
                </div>
              </div>
            </div>
            <div class="mg-hub-header-actions">
              <button type="button" id="mg-cry-btn" class="mg-header-btn mg-cry-btn">
                🔊 울음소리 듣기
              </button>
              <button type="button" id="mg-close-btn" class="mg-header-btn mg-close-btn">
                ✖ 도감으로 돌아가기
              </button>
            </div>
          </header>

          <main class="mg-hub-grid" role="region" aria-label="미니게임 목록">
            ${cardsHtml}
          </main>
        </div>
      `;

      const cryBtn = overlay.querySelector('#mg-cry-btn');
      if (cryBtn) {
        cryBtn.addEventListener('click', () => {
          this.helpers.playCry();
        });
      }

      const closeBtn = overlay.querySelector('#mg-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.closeHub();
        });
      }

      overlay.querySelectorAll('.mg-game-card').forEach((card) => {
        card.addEventListener('click', () => {
          const gameId = card.getAttribute('data-game-id');
          if (gameId) this.launchGame(gameId);
        });
      });
    },

    /**
     * 개별 미니게임 실행
     */
    launchGame(id) {
      this._runActiveCleanup();
      this.charCtx = this.buildCharContext();
      this.activeGameId = id;
      this.isOpen = true;

      const overlay = this._ensureOverlay();
      if (!overlay) return;
      overlay.classList.remove('hidden');

      const gameDef = this.games.get(id) || DEFAULT_GAME_META[id];
      const title = gameDef ? `${gameDef.icon || '🎮'} ${gameDef.title}` : '🎮 미니게임';

      overlay.innerHTML = `
        <div class="mg-game-shell">
          <header class="mg-game-topbar">
            <button type="button" id="mg-back-hub-btn" class="mg-topbar-btn mg-back-btn">
              ◀ 게임 고르기
            </button>
            <div class="mg-topbar-title">
              <span class="mg-topbar-game-name">${title}</span>
              <span class="mg-topbar-char-tag" style="border-color:${this.charCtx.typeColor}">
                ${this.charCtx.typeEmoji} ${this.charCtx.nameKr}
              </span>
            </div>
            <button type="button" id="mg-exit-btn" class="mg-topbar-btn mg-exit-btn">
              ✖ 닫기
            </button>
          </header>
          <div id="mg-stage-container" class="mg-stage-container"></div>
        </div>
      `;

      const backBtn = overlay.querySelector('#mg-back-hub-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          playSfx('pop');
          this.showHubView();
        });
      }

      const exitBtn = overlay.querySelector('#mg-exit-btn');
      if (exitBtn) {
        exitBtn.addEventListener('click', () => {
          this.closeHub();
        });
      }

      const stageEl = overlay.querySelector('#mg-stage-container');
      playSfx('pop');

      if (gameDef && typeof gameDef.mount === 'function') {
        try {
          const cleanupOrInstance = gameDef.mount(stageEl, this.charCtx, this.helpers);
          if (typeof cleanupOrInstance === 'function' || (cleanupOrInstance && typeof cleanupOrInstance === 'object')) {
            this.activeCleanup = cleanupOrInstance;
          } else if (typeof gameDef.unmount === 'function') {
            this.activeCleanup = () => gameDef.unmount(stageEl);
          } else if (typeof gameDef.cleanup === 'function') {
            this.activeCleanup = () => gameDef.cleanup(stageEl);
          }
        } catch (err) {
          console.error(`Failed to mount minigame "${id}":`, err);
          stageEl.innerHTML = `
            <div class="mg-stage-placeholder">
              <p>앗! 게임을 불러오는 중 문제가 생겼어요 😢</p>
              <button type="button" class="mg-ctrl-btn" id="mg-err-back">◀ 다른 게임 고르기</button>
            </div>
          `;
          const errBack = stageEl.querySelector('#mg-err-back');
          if (errBack) errBack.addEventListener('click', () => this.showHubView());
        }
      } else {
        stageEl.innerHTML = `
          <div class="mg-stage-placeholder">
            <img src="${this.charCtx.runnerSpriteUrl || this.charCtx.artworkUrl}" alt="${this.charCtx.nameKr}" style="width:96px;height:96px;object-fit:contain;" />
            <p>${this.charCtx.nameKr}와 함께하는 게임을 준비 중이에요!</p>
          </div>
        `;
      }
    }
  };

  global.PokeMiniGames = PokeMiniGames;
  if (typeof globalThis !== 'undefined') {
    globalThis.PokeMiniGames = PokeMiniGames;
  }
})(typeof window !== 'undefined' ? window : globalThis);
