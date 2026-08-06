const PokedexApp = {
  state: {
    currentPokemonId: 1,
    currentGen: 1,
    isLoading: false,
    isIntroVisible: true,
    generationCache: new Map(),
    imageVariants: [],
    imageIndex: 0,
    tcgLoaded: false,
    autoCry: true,
    bgmPlaying: false,
    bgmAudio: null,
    favorites: new Set(JSON.parse(localStorage.getItem('pokeFavorites') || '[]')),
  },

  BGM_URLS: {
    1: 'https://play.pokemonshowdown.com/audio/dpp-rival.mp3',
    2: 'https://play.pokemonshowdown.com/audio/dpp-rival.mp3',
    3: 'https://play.pokemonshowdown.com/audio/oras-trainer.mp3',
    4: 'https://play.pokemonshowdown.com/audio/dpp-trainer.mp3',
    5: 'https://play.pokemonshowdown.com/audio/bw-trainer.mp3',
    6: 'https://play.pokemonshowdown.com/audio/xy-trainer.mp3',
    7: 'https://play.pokemonshowdown.com/audio/sm-trainer.mp3',
    8: 'https://play.pokemonshowdown.com/audio/xy-rival.mp3',
    9: 'https://play.pokemonshowdown.com/audio/sm-rival.mp3',
  },

  els: {},

  init() {
    this.els = {
      introOverlay: document.getElementById('intro-overlay'),
      loadingOverlay: document.getElementById('loading-overlay'),
      pokedexDevice: document.getElementById('pokedex-device'),
      mainScreen: document.getElementById('main-screen'),
      pokemonImage: document.getElementById('pokemon-image'),
      pokemonImageContainer: document.getElementById('pokemon-image-container'),
      pokemonNumber: document.getElementById('pokemon-number'),
      pokemonNameKr: document.getElementById('pokemon-name-kr'),
      screenGlow: document.getElementById('screen-glow'),
      typeBadges: document.getElementById('type-badges'),
      speakerBtn: document.getElementById('speaker-btn'),
      
      pokemonNameEn: document.getElementById('pokemon-name-en'),
      pokemonHeight: document.getElementById('pokemon-height'),
      pokemonWeight: document.getElementById('pokemon-weight'),
      pokemonAbilities: document.getElementById('pokemon-abilities'),
      pokemonExp: document.getElementById('pokemon-exp'),
      
      statsContainer: document.getElementById('stats-container'),
      statsTotalValue: document.getElementById('stats-total-value'),
      
      evolutionChain: document.getElementById('evolution-chain'),
      descriptionText: document.getElementById('description-text'),
      
      searchInput: document.getElementById('search-input'),
      searchResults: document.getElementById('search-results'),
      
      dpadUp: document.getElementById('dpad-up'),
      dpadDown: document.getElementById('dpad-down'),
      dpadLeft: document.getElementById('dpad-left'),
      dpadRight: document.getElementById('dpad-right'),
      dpadCenter: document.getElementById('dpad-center'),
      
      genButtons: document.querySelectorAll('.gen-btn'),
      
      ledRed: document.getElementById('led-red'),
      ledYellow: document.getElementById('led-yellow'),
      ledGreen: document.getElementById('led-green'),
      favBtn: document.getElementById('fav-btn'),
      bgmBtn: document.getElementById('bgm-btn'),
      typeEffectiveness: document.getElementById('type-effectiveness'),
    };

    // Bind event listeners
    this.els.introOverlay.addEventListener('click', () => this.handleIntroTap());
    
    this.els.genButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchGeneration(parseInt(e.target.dataset.gen, 10)));
    });
    
    this.setupDpad();
    this.setupKeyboard();
    this.setupSwipe();
    this.setupSearch();
    
    this.els.speakerBtn.addEventListener('click', () => this.playCry(this.state.currentCryUrl));

    // 이미지 클릭으로 스타일 전환
    this.els.pokemonImage.addEventListener('click', () => this.cycleImage());
    this.els.pokemonImage.style.cursor = 'pointer';

    // 즐겨찾기 버튼 (없으면 무시)
    if (this.els.favBtn) this.els.favBtn.addEventListener('click', () => this.toggleFavorite());

    // BGM 토글 (없으면 무시)
    if (this.els.bgmBtn) this.els.bgmBtn.addEventListener('click', () => this.toggleBGM());
    
    // 전 세대 리스트 백그라운드 프리로드
    const totalGens = Object.keys(PokeAPI.GENERATION_RANGES).length;
    for (let g = 1; g <= totalGens; g++) {
      this.preloadGenerationList(g);
    }
  },

  handleIntroTap() {
    this.state.isIntroVisible = false;
    this.els.introOverlay.classList.add('fade-out');
    setTimeout(() => {
      this.els.introOverlay.classList.add('hidden');
    }, 500);
    this.els.pokedexDevice.classList.remove('hidden');
    this.loadPokemon(1);
  },

  async preloadGenerationList(gen) {
    if (this.state.generationCache.has(gen)) return;
    try {
      const [min, max] = PokeAPI.GENERATION_RANGES[gen];
      const limit = max - min + 1;
      const url = `${PokeAPI.BASE_URL}/pokemon?limit=${limit}&offset=${min - 1}`;
      const data = await PokeAPI.fetchWithCache(url);
      const list = data.results.map((p, i) => ({
        name: p.name,
        id: min + i,
        nameKr: null
      }));
      this.state.generationCache.set(gen, list);
      // 백그라운드로 한글 이름 로드
      this.loadKoreanNames(gen, list);
    } catch (e) {
      console.error('Failed to preload generation list', e);
    }
  },

  async loadKoreanNames(gen, list) {
    const batchSize = 15;
    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize);
      const names = await Promise.all(
        batch.map(p => PokeAPI.getSpeciesName(p.id))
      );
      batch.forEach((p, idx) => { p.nameKr = names[idx]; });
    }
  },

  async loadPokemon(id) {
    if (this.state.isLoading) return;
    this.state.isLoading = true;
    this.setLedState('loading');
    
    try {
      const data = await PokeAPI.getPokemonFullData(id);
      this.state.currentPokemonId = data.id;
      this.state.currentCryUrl = data.cryUrl;
      
      this.updateMainScreen(data);
      this.updateTypeDisplay(data.types);
      this.updateInfoSection(data);
      this.updateStatsSection(data.stats);
      this.updateDescriptionSection(data.flavorTextKr);
      this.updateEvolutionSection(data.evolutionChainUrl);
      this.updateTypeEffectiveness(data.types);
      this.updateFavButton();
      
      // 울음소리 자동재생
      if (this.state.autoCry && data.cryUrl) {
        this.playCry(data.cryUrl);
      }
      
      this.setLedState('success');
      PokeAPI.preloadAdjacent(id, this.state.currentGen);
    } catch (e) {
      console.error(e);
      this.setLedState('error');
    } finally {
      this.state.isLoading = false;
    }
  },

  updateMainScreen(data) {
    const img = this.els.pokemonImage;
    img.classList.remove('entering');
    void img.offsetWidth;
    
    // 이미지 변형 저장
    this.state.imageVariants = data.imageVariants || [];
    this.state.imageIndex = 0;
    this.state.tcgLoaded = false;
    
    img.src = data.artworkUrl || data.spriteUrl;
    img.alt = data.nameKr || data.nameEn;
    img.classList.add('entering');
    
    this.els.pokemonNumber.textContent = this.formatNumber(data.id);
    this.els.pokemonNameKr.textContent = data.nameKr;

    // 인디케이터 업데이트
    this.updateImageLabel();
    
    // 백그라운드로 TCG 카드 로드
    this.loadTCGCards(data.nameEn);
  },

  updateImageLabel() {
    let bar = this.els.mainScreen.querySelector('.image-mode-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'image-mode-bar';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'image-nav-btn';
      prevBtn.textContent = '◀';
      prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.cycleImage(-1); });

      const label = document.createElement('span');
      label.className = 'image-mode-label';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'image-nav-btn';
      nextBtn.textContent = '▶';
      nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.cycleImage(1); });

      bar.appendChild(prevBtn);
      bar.appendChild(label);
      bar.appendChild(nextBtn);
      this.els.mainScreen.appendChild(bar);
    }
    const label = bar.querySelector('.image-mode-label');
    const variant = this.state.imageVariants[this.state.imageIndex];
    const total = this.state.imageVariants.length;
    label.textContent = `${variant ? variant.label : '공식 일러스트'} (${this.state.imageIndex + 1}/${total})`;
  },

  cycleImage(direction = 1) {
    if (this.state.imageVariants.length <= 1) return;
    let next = this.state.imageIndex + direction;
    if (next >= this.state.imageVariants.length) next = 0;
    if (next < 0) next = this.state.imageVariants.length - 1;
    this.state.imageIndex = next;
    const variant = this.state.imageVariants[this.state.imageIndex];
    
    const img = this.els.pokemonImage;
    img.classList.remove('entering');
    void img.offsetWidth;
    img.src = variant.url;
    img.classList.add('entering');
    
    // 픽셀아트 스프라이트 감지 → 선명 확대
    const isPixel = variant.label.includes('스프라이트') || variant.label.includes('도트');
    img.classList.toggle('pixel-art', isPixel);
    
    this.updateImageLabel();
  },

  async loadTCGCards(nameEn) {
    if (!nameEn) return;
    const pokemonId = this.state.currentPokemonId;
    try {
      const cards = await PokeAPI.getTCGCard(nameEn, pokemonId);
      // 아직 같은 포켓몬을 보고 있는지 확인
      if (cards.length > 0 && this.state.currentPokemonId === pokemonId) {
        this.state.imageVariants.push(...cards);
        this.state.tcgLoaded = true;
        this.updateImageLabel();
      }
    } catch (e) {
      console.log('TCG load failed', e);
    }
  },

  updateTypeDisplay(types) {
    this.els.typeBadges.innerHTML = '';
    types.forEach(t => {
      const badge = document.createElement('span');
      badge.className = 'type-badge';
      // Korean type name
      badge.textContent = PokeAPI.getTypeNameKr(t.type.name);
      badge.style.backgroundColor = PokeAPI.getTypeColor(t.type.name);
      this.els.typeBadges.appendChild(badge);
    });
    
    if (types.length > 0) {
      const color = PokeAPI.getTypeColor(types[0].type.name);
      this.els.screenGlow.style.setProperty('--type-color', color);
      this.els.screenGlow.classList.add('active');
    }
  },

  updateInfoSection(data) {
    // Show Korean name in the info section
    this.els.pokemonNameEn.textContent = data.nameKr || data.nameEn || 'N/A';
    this.els.pokemonHeight.textContent = `${(data.height / 10).toFixed(1)}m`;
    this.els.pokemonWeight.textContent = `${(data.weight / 10).toFixed(1)}kg`;
    // Korean ability names
    this.els.pokemonAbilities.textContent = data.abilityNamesKr ? data.abilityNamesKr.join(', ') : data.abilities.map(a => a.ability.name).join(', ');
    this.els.pokemonExp.textContent = data.baseExp || '-';
  },

  updateStatsSection(stats) {
    this.els.statsContainer.innerHTML = '';
    const statNames = { 'hp': 'HP', 'attack': '공격', 'defense': '방어', 'special-attack': '특공', 'special-defense': '특방', 'speed': '스피드' };
    
    let total = 0;
    stats.forEach(s => {
      const val = s.base_stat;
      total += val;
      const label = statNames[s.stat.name] || s.stat.name.toUpperCase();
      
      const row = document.createElement('div');
      row.className = 'stat-row';
      
      const labelEl = document.createElement('span');
      labelEl.className = 'stat-label';
      labelEl.textContent = label;
      
      const barContainer = document.createElement('div');
      barContainer.className = 'stat-bar-container';
      
      const bar = document.createElement('div');
      bar.className = 'stat-bar';
      
      let color = '#00c853';
      if (val < 50) color = '#ff4444';
      else if (val < 90) color = '#ffaa00';
      
      bar.style.backgroundColor = color;
      bar.style.width = '0%';
      
      const valEl = document.createElement('span');
      valEl.className = 'stat-value';
      valEl.textContent = val;
      
      barContainer.appendChild(bar);
      row.appendChild(labelEl);
      row.appendChild(barContainer);
      row.appendChild(valEl);
      
      this.els.statsContainer.appendChild(row);
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.width = `${Math.min(100, (val / 255) * 100)}%`;
        });
      });
    });
    
    this.els.statsTotalValue.textContent = total;
  },

  async updateEvolutionSection(evolutionChainUrl) {
    this.els.evolutionChain.innerHTML = '<div style="color:#88B; text-align:center; padding-top: 10px; font-size:11px;">로딩중...</div>';
    try {
      const chain = await PokeAPI.getEvolutionChain(evolutionChainUrl);
      this.els.evolutionChain.innerHTML = '';
      
      chain.forEach((stage, idx) => {
        // Arrow before each non-first stage
        if (idx > 0) {
          const arrow = document.createElement('div');
          arrow.className = 'evo-arrow';
          arrow.innerHTML = `→<br><span class="evo-condition">${stage.condition_text}</span>`;
          this.els.evolutionChain.appendChild(arrow);
        }
        
        const stageDiv = document.createElement('div');
        stageDiv.className = 'evo-stage';
        
        const img = document.createElement('img');
        img.src = stage.sprite_url;
        img.alt = stage.nameKr || stage.name;
        img.className = 'evo-img';
        
        const name = document.createElement('span');
        name.className = 'evo-name';
        name.textContent = stage.nameKr || stage.name;
        
        stageDiv.appendChild(img);
        stageDiv.appendChild(name);
        
        stageDiv.addEventListener('click', () => {
          let targetGen = 1;
          for (const [gen, range] of Object.entries(PokeAPI.GENERATION_RANGES)) {
            if (stage.id >= range[0] && stage.id <= range[1]) {
              targetGen = parseInt(gen, 10);
              break;
            }
          }
          if (targetGen !== this.state.currentGen) {
            this.switchGeneration(targetGen, stage.id);
          } else {
            this.loadPokemon(stage.id);
          }
        });
        
        this.els.evolutionChain.appendChild(stageDiv);
      });
      
    } catch (e) {
      this.els.evolutionChain.innerHTML = '<div style="color:#F95587; text-align:center; padding-top: 10px; font-size:11px;">진화 정보를 불러오지 못했습니다.</div>';
    }
  },

  updateDescriptionSection(text) {
    this.els.descriptionText.textContent = text || '설명이 없습니다.';
  },

  navigatePokemon(direction) {
    const [min, max] = PokeAPI.GENERATION_RANGES[this.state.currentGen];
    let nextId = this.state.currentPokemonId + direction;
    
    if (nextId > max) nextId = min;
    if (nextId < min) nextId = max;
    
    if (this.navTimeout) clearTimeout(this.navTimeout);
    this.navTimeout = setTimeout(() => {
      this.loadPokemon(nextId);
    }, 200);
  },

  switchGeneration(gen, targetId = null) {
    this.state.currentGen = gen;
    this.els.genButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.gen, 10) === gen);
    });
    this.preloadGenerationList(gen);
    
    // BGM 전환
    if (this.state.bgmPlaying) {
      this.playBGM(gen);
    }
    
    const [min] = PokeAPI.GENERATION_RANGES[gen];
    this.loadPokemon(targetId || min);
  },

  setupDpad() {
    // 좌/우: 포켓몬 번호 이동, 상/하: 세대 변경
    this.els.dpadLeft.addEventListener('click', () => this.navigatePokemon(-1));
    this.els.dpadRight.addEventListener('click', () => this.navigatePokemon(1));
    this.els.dpadUp.addEventListener('click', () => this.cycleGeneration(-1));
    this.els.dpadDown.addEventListener('click', () => this.cycleGeneration(1));
    this.els.dpadCenter.addEventListener('click', () => this.showFavorites());
  },

  showFavorites() {
    // 기존 모달 제거
    const existing = document.getElementById('fav-modal');
    if (existing) { existing.remove(); return; }

    const favIds = [...this.state.favorites].sort((a, b) => a - b);

    const modal = document.createElement('div');
    modal.id = 'fav-modal';
    modal.className = 'fav-modal';

    const inner = document.createElement('div');
    inner.className = 'fav-modal-inner';

    // 헤더
    const header = document.createElement('div');
    header.className = 'fav-modal-header';
    header.innerHTML = `<span>⭐ 즐겨찾기 (${favIds.length})</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'fav-close-btn';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => modal.remove());
    header.appendChild(closeBtn);
    inner.appendChild(header);

    if (favIds.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'fav-empty';
      empty.textContent = '즐겨찾기한 포켓몬이 없어요!\n☆ 버튼을 눌러 추가해보세요';
      inner.appendChild(empty);
    } else {
      const grid = document.createElement('div');
      grid.className = 'fav-grid';
      favIds.forEach(id => {
        const card = document.createElement('div');
        card.className = 'fav-card';
        const img = document.createElement('img');
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
        img.alt = `#${id}`;
        img.loading = 'lazy';
        const label = document.createElement('span');
        label.className = 'fav-card-label';
        label.textContent = `#${String(id).padStart(3, '0')}`;
        card.appendChild(img);
        card.appendChild(label);
        card.addEventListener('click', () => {
          // 세대 자동 전환
          for (const [gen, [min, max]] of Object.entries(PokeAPI.GENERATION_RANGES)) {
            if (id >= min && id <= max) {
              this.switchGeneration(parseInt(gen), id);
              break;
            }
          }
          modal.remove();
        });
        grid.appendChild(card);
      });
      inner.appendChild(grid);
    }

    modal.appendChild(inner);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  cycleGeneration(direction) {
    const totalGens = Object.keys(PokeAPI.GENERATION_RANGES).length;
    let nextGen = this.state.currentGen + direction;
    if (nextGen > totalGens) nextGen = 1;
    if (nextGen < 1) nextGen = totalGens;
    this.switchGeneration(nextGen);
  },

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (this.state.isIntroVisible) return;
      if (document.activeElement === this.els.searchInput) return;
      
      switch(e.key) {
        case 'ArrowLeft': e.preventDefault(); this.navigatePokemon(-1); break;
        case 'ArrowRight': e.preventDefault(); this.navigatePokemon(1); break;
        case 'ArrowUp': e.preventDefault(); this.cycleGeneration(-1); break;
        case 'ArrowDown': e.preventDefault(); this.cycleGeneration(1); break;
        case 'Enter': e.preventDefault(); this.playCry(this.state.currentCryUrl); break;
      }
    });
  },

  setupSwipe() {
    let startX = 0;
    let startY = 0;
    const threshold = 50;
    
    const onTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };
    
    this.els.mainScreen.addEventListener('touchstart', onTouchStart, { passive: true });
    this.els.mainScreen.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    this.els.mainScreen.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffY = endY - startY;
      
      if (Math.abs(diffY) > threshold) {
        if (diffY > 0) this.navigatePokemon(-1);
        else this.navigatePokemon(1);
      }
    });
  },

  setupSearch() {
    this.els.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        this.els.searchResults.classList.add('hidden');
        return;
      }
      
      // 전 세대 캐시를 합쳐서 검색
      const allMatches = [];
      for (const [gen, list] of this.state.generationCache.entries()) {
        const filtered = list.filter(p => 
          p.name.includes(query) || 
          p.id.toString() === query || 
          this.formatNumber(p.id).includes(query) ||
          (p.nameKr && p.nameKr.includes(query))
        );
        filtered.forEach(p => allMatches.push({ ...p, gen: parseInt(gen, 10) }));
      }
      // ID 순 정렬 후 최대 10개
      allMatches.sort((a, b) => a.id - b.id);
      const matches = allMatches.slice(0, 10);
      
      if (matches.length > 0) {
        this.els.searchResults.innerHTML = '';
        matches.forEach(m => {
          const div = document.createElement('div');
          div.className = 'search-result-item';
          const genLabel = `[${m.gen}세대]`;
          div.innerHTML = `${this.formatNumber(m.id)} ${m.nameKr || m.name} <span class="search-gen-tag">${genLabel}</span>`;
          div.addEventListener('mousedown', () => {
            // 세대 자동 전환
            if (m.gen !== this.state.currentGen) {
              this.switchGeneration(m.gen, m.id);
            } else {
              this.loadPokemon(m.id);
            }
            this.els.searchInput.value = '';
            this.els.searchResults.classList.add('hidden');
          });
          this.els.searchResults.appendChild(div);
        });
        this.els.searchResults.classList.remove('hidden');
      } else {
        this.els.searchResults.classList.add('hidden');
      }
    });
    
    this.els.searchInput.addEventListener('blur', () => {
      setTimeout(() => this.els.searchResults.classList.add('hidden'), 100);
    });
  },

  playCry(url) {
    if (!url) return;
    this.els.speakerBtn.classList.add('active');
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play failed', e));
    audio.onended = () => {
      this.els.speakerBtn.classList.remove('active');
    };
  },

  setLedState(state) {
    this.els.ledRed.classList.remove('active', 'blink');
    this.els.ledYellow.classList.remove('active', 'blink');
    this.els.ledGreen.classList.remove('active', 'blink');
    
    if (state === 'loading') {
      this.els.ledYellow.classList.add('blink');
    } else if (state === 'success') {
      this.els.ledGreen.classList.add('active');
    } else if (state === 'error') {
      this.els.ledRed.classList.add('active');
    }
  },

  formatNumber(num) {
    return `#${String(num).padStart(3, '0')}`;
  },

  // ===== 타입 상성 =====
  updateTypeEffectiveness(types) {
    const el = this.els.typeEffectiveness;
    if (!el) return;
    const eff = PokeAPI.getTypeEffectiveness(types);
    el.innerHTML = '';

    const renderRow = (label, typeList, cssClass) => {
      if (typeList.length === 0) return;
      const row = document.createElement('div');
      row.className = 'eff-row';
      const lbl = document.createElement('span');
      lbl.className = `eff-label ${cssClass}`;
      lbl.textContent = label;
      row.appendChild(lbl);
      typeList.forEach(t => {
        const badge = document.createElement('span');
        badge.className = `type-badge type-${t}`;
        badge.textContent = PokeAPI.TYPE_NAMES_KR[t] || t;
        row.appendChild(badge);
      });
      el.appendChild(row);
    };

    renderRow('×4', eff.x4, 'eff-x4');
    renderRow('×2', eff.x2, 'eff-x2');
    renderRow('×½', eff.x05, 'eff-half');
    renderRow('×¼', eff.x025, 'eff-quarter');
    renderRow('×0', eff.x0, 'eff-immune');
  },

  // ===== 즐겨찾기 =====
  toggleFavorite() {
    const id = this.state.currentPokemonId;
    if (this.state.favorites.has(id)) {
      this.state.favorites.delete(id);
    } else {
      this.state.favorites.add(id);
    }
    localStorage.setItem('pokeFavorites', JSON.stringify([...this.state.favorites]));
    this.updateFavButton();
  },

  updateFavButton() {
    if (!this.els.favBtn) return;
    const isFav = this.state.favorites.has(this.state.currentPokemonId);
    this.els.favBtn.textContent = isFav ? '★' : '☆';
    this.els.favBtn.classList.toggle('active', isFav);
  },

  // ===== BGM =====
  toggleBGM() {
    if (this.state.bgmPlaying) {
      this.stopBGM();
    } else {
      this.playBGM(this.state.currentGen);
    }
  },

  playBGM(gen) {
    this.stopBGM();
    const url = this.BGM_URLS[gen];
    if (!url) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0.15;
    audio.play().catch(() => {});
    this.state.bgmAudio = audio;
    this.state.bgmPlaying = true;
    if (this.els.bgmBtn) {
      this.els.bgmBtn.classList.add('active');
      this.els.bgmBtn.textContent = '🎵';
    }
  },

  stopBGM() {
    if (this.state.bgmAudio) {
      this.state.bgmAudio.pause();
      this.state.bgmAudio.currentTime = 0;
      this.state.bgmAudio = null;
    }
    this.state.bgmPlaying = false;
    if (this.els.bgmBtn) {
      this.els.bgmBtn.classList.remove('active');
      this.els.bgmBtn.textContent = '🎵';
    }
  },
};

document.addEventListener('DOMContentLoaded', () => {
  PokedexApp.init();
  
  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration failed:', err);
    });
  }
});
