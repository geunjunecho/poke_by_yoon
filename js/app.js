const PokedexApp = {
  state: {
    currentPokemonId: 1,
    currentGen: 1,
    isLoading: false,
    isIntroVisible: true,
    generationCache: new Map(),
  },

  els: {},

  init() {
    this.els = {
      introOverlay: document.getElementById('intro-overlay'),
      loadingOverlay: document.getElementById('loading-overlay'),
      pokedexDevice: document.getElementById('pokedex-device'),
      mainScreen: document.getElementById('main-screen'),
      pokemonImage: document.getElementById('pokemon-image'),
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
      ledGreen: document.getElementById('led-green')
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
    
    this.preloadGenerationList(1);
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
      this.state.generationCache.set(gen, data.results.map((p, i) => ({
        name: p.name,
        id: min + i
      })));
    } catch (e) {
      console.error('Failed to preload generation list', e);
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
    
    img.src = data.artworkUrl || data.spriteUrl;
    img.alt = data.nameKr || data.nameEn;
    img.classList.add('entering');
    
    this.els.pokemonNumber.textContent = this.formatNumber(data.id);
    this.els.pokemonNameKr.textContent = data.nameKr;
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
    
    const [min] = PokeAPI.GENERATION_RANGES[gen];
    this.loadPokemon(targetId || min);
  },

  setupDpad() {
    // 좌/우: 포켓몬 번호 이동, 상/하: 세대 변경
    this.els.dpadLeft.addEventListener('click', () => this.navigatePokemon(-1));
    this.els.dpadRight.addEventListener('click', () => this.navigatePokemon(1));
    this.els.dpadUp.addEventListener('click', () => this.cycleGeneration(-1));
    this.els.dpadDown.addEventListener('click', () => this.cycleGeneration(1));
    this.els.dpadCenter.addEventListener('click', () => this.playCry(this.state.currentCryUrl));
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
      
      const list = this.state.generationCache.get(this.state.currentGen) || [];
      const matches = list.filter(p => p.name.includes(query) || p.id.toString() === query || this.formatNumber(p.id).includes(query)).slice(0, 8);
      
      if (matches.length > 0) {
        this.els.searchResults.innerHTML = '';
        matches.forEach(m => {
          const div = document.createElement('div');
          div.className = 'search-result-item';
          div.textContent = `${this.formatNumber(m.id)} ${m.name}`;
          div.addEventListener('mousedown', () => {
            this.loadPokemon(m.id);
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
  }
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
