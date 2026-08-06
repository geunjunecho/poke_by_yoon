const PokeAPI = {
  BASE_URL: 'https://pokeapi.co/api/v2',
  cache: new Map(),
  
  GENERATION_RANGES: {
    1: [1, 151],
    2: [152, 251],
    3: [252, 386],
    4: [387, 493],
    5: [494, 649],
    6: [650, 721],
    7: [722, 809],
    8: [810, 905],
    9: [906, 1025]
  },

  TYPE_NAMES_KR: {
    normal: '노말', fire: '불꽃', water: '물', grass: '풀',
    electric: '전기', ice: '얼음', fighting: '격투', poison: '독',
    ground: '땅', flying: '비행', psychic: '에스퍼', bug: '벌레',
    rock: '바위', ghost: '고스트', dragon: '드래곤', dark: '악',
    steel: '강철', fairy: '페어리'
  },

  // 방어 시 상성 (key 타입으로 공격받을 때)
  TYPE_DEFENSE: {
    normal:   { weak: ['fighting'], resist: [], immune: ['ghost'] },
    fire:     { weak: ['water','ground','rock'], resist: ['fire','grass','ice','bug','steel','fairy'], immune: [] },
    water:    { weak: ['electric','grass'], resist: ['fire','water','ice','steel'], immune: [] },
    grass:    { weak: ['fire','ice','poison','flying','bug'], resist: ['water','electric','grass','ground'], immune: [] },
    electric: { weak: ['ground'], resist: ['electric','flying','steel'], immune: [] },
    ice:      { weak: ['fire','fighting','rock','steel'], resist: ['ice'], immune: [] },
    fighting: { weak: ['flying','psychic','fairy'], resist: ['bug','rock','dark'], immune: [] },
    poison:   { weak: ['ground','psychic'], resist: ['fighting','poison','bug','grass','fairy'], immune: [] },
    ground:   { weak: ['water','grass','ice'], resist: ['poison','rock'], immune: ['electric'] },
    flying:   { weak: ['electric','ice','rock'], resist: ['fighting','bug','grass'], immune: ['ground'] },
    psychic:  { weak: ['bug','ghost','dark'], resist: ['fighting','psychic'], immune: [] },
    bug:      { weak: ['fire','flying','rock'], resist: ['fighting','grass','ground'], immune: [] },
    rock:     { weak: ['water','grass','fighting','ground','steel'], resist: ['normal','fire','poison','flying'], immune: [] },
    ghost:    { weak: ['ghost','dark'], resist: ['poison','bug'], immune: ['normal','fighting'] },
    dragon:   { weak: ['ice','dragon','fairy'], resist: ['fire','water','electric','grass'], immune: [] },
    dark:     { weak: ['fighting','bug','fairy'], resist: ['ghost','dark'], immune: ['psychic'] },
    steel:    { weak: ['fire','fighting','ground'], resist: ['normal','grass','ice','flying','psychic','bug','rock','dragon','steel','fairy'], immune: ['poison'] },
    fairy:    { weak: ['poison','steel'], resist: ['fighting','bug','dark'], immune: ['dragon'] },
  },

  getTypeEffectiveness(types) {
    const multipliers = {};
    const allTypes = Object.keys(this.TYPE_DEFENSE);
    allTypes.forEach(t => multipliers[t] = 1);

    types.forEach(typeObj => {
      const typeName = typeObj.type.name;
      const def = this.TYPE_DEFENSE[typeName];
      if (!def) return;
      def.weak.forEach(t => multipliers[t] *= 2);
      def.resist.forEach(t => multipliers[t] *= 0.5);
      def.immune.forEach(t => multipliers[t] *= 0);
    });

    const result = { x4: [], x2: [], x05: [], x025: [], x0: [] };
    allTypes.forEach(t => {
      if (multipliers[t] === 4) result.x4.push(t);
      else if (multipliers[t] === 2) result.x2.push(t);
      else if (multipliers[t] === 0.5) result.x05.push(t);
      else if (multipliers[t] === 0.25) result.x025.push(t);
      else if (multipliers[t] === 0) result.x0.push(t);
    });
    return result;
  },

  async fetchWithCache(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    this.cache.set(url, data);
    return data;
  },
  
  async getPokemon(id) {
    const url = `${this.BASE_URL}/pokemon/${id}`;
    return await this.fetchWithCache(url);
  },
  
  async getSpecies(id) {
    const url = `${this.BASE_URL}/pokemon-species/${id}`;
    const data = await this.fetchWithCache(url);
    
    const nameKr = data.names.find(n => n.language.name === 'ko')?.name;
    const nameEn = data.names.find(n => n.language.name === 'en')?.name;
    
    const flavorTextsKo = data.flavor_text_entries.filter(e => e.language.name === 'ko');
    let flavorTextKr = '';
    if (flavorTextsKo.length > 0) {
      flavorTextKr = flavorTextsKo[flavorTextsKo.length - 1].flavor_text;
    } else {
      const flavorTextsEn = data.flavor_text_entries.filter(e => e.language.name === 'en');
      if (flavorTextsEn.length > 0) {
        flavorTextKr = flavorTextsEn[flavorTextsEn.length - 1].flavor_text;
      }
    }
    flavorTextKr = flavorTextKr.replace(/[\n\f]/g, ' ');
    
    return {
      nameKr: nameKr || nameEn,
      nameEn,
      flavorTextKr,
      evolutionChainUrl: data.evolution_chain?.url,
      generation: data.generation?.name
    };
  },

  async getSpeciesName(id) {
    try {
      const url = `${this.BASE_URL}/pokemon-species/${id}`;
      const data = await this.fetchWithCache(url);
      const nameKr = data.names.find(n => n.language.name === 'ko')?.name;
      const nameEn = data.names.find(n => n.language.name === 'en')?.name;
      return nameKr || nameEn || data.name;
    } catch {
      return null;
    }
  },

  async getAbilityNameKr(abilityName) {
    try {
      const url = `${this.BASE_URL}/ability/${abilityName}`;
      const data = await this.fetchWithCache(url);
      const nameKr = data.names.find(n => n.language.name === 'ko')?.name;
      return nameKr || abilityName;
    } catch {
      return abilityName;
    }
  },

  async getItemNameKr(itemName) {
    try {
      const url = `${this.BASE_URL}/item/${itemName}`;
      const data = await this.fetchWithCache(url);
      const nameKr = data.names.find(n => n.language.name === 'ko')?.name;
      return nameKr || itemName;
    } catch {
      return itemName;
    }
  },
  
  async getEvolutionChain(url) {
    if (!url) return [];
    const data = await this.fetchWithCache(url);
    const chain = [];
    
    const traverse = (node) => {
      const id = node.species.url.split('/').filter(Boolean).pop();
      const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
      const evoDetails = node.evolution_details[0];
      
      let conditionText = '';
      if (evoDetails?.min_level) {
        conditionText = `Lv ${evoDetails.min_level}`;
      } else if (evoDetails?.item?.name) {
        conditionText = evoDetails.item.name; // will be resolved to Korean later
      } else if (evoDetails?.trigger?.name === 'trade') {
        conditionText = '통신교환';
      } else if (evoDetails?.min_happiness) {
        conditionText = '친밀도';
      } else if (evoDetails?.trigger?.name) {
        conditionText = evoDetails.trigger.name;
      }
      
      chain.push({
        id: parseInt(id, 10),
        name: node.species.name,
        sprite_url: spriteUrl,
        min_level: evoDetails?.min_level || null,
        trigger: evoDetails?.trigger?.name || null,
        item: evoDetails?.item?.name || null,
        condition_text: conditionText
      });
      
      if (node.evolves_to && node.evolves_to.length > 0) {
        node.evolves_to.forEach(child => traverse(child));
      }
    };
    
    traverse(data.chain);

    // Resolve Korean names for each stage
    const resolved = await Promise.all(chain.map(async (stage) => {
      const nameKr = await this.getSpeciesName(stage.id);
      let condKr = stage.condition_text;
      if (stage.item) {
        condKr = await this.getItemNameKr(stage.item);
      }
      return { ...stage, nameKr: nameKr || stage.name, condition_text: condKr };
    }));

    return resolved;
  },
  
  async getPokemonFullData(id) {
    const [pokemon, species] = await Promise.all([
      this.getPokemon(id),
      this.getSpecies(id)
    ]);
    
    const s = pokemon.sprites;
    const cryUrl = pokemon.cries?.latest;

    // 모든 이미지 스타일 수집
    const imageVariants = [];
    if (s.other['official-artwork']?.front_default)
      imageVariants.push({ label: '공식 일러스트', url: s.other['official-artwork'].front_default });
    if (s.other.home?.front_default)
      imageVariants.push({ label: 'HOME 3D', url: s.other.home.front_default });
    if (s.other.dream_world?.front_default)
      imageVariants.push({ label: '드림월드', url: s.other.dream_world.front_default });
    if (s.other['official-artwork']?.front_shiny)
      imageVariants.push({ label: '✨ 이로치', url: s.other['official-artwork'].front_shiny });
    if (s.other.home?.front_shiny)
      imageVariants.push({ label: '✨ HOME 이로치', url: s.other.home.front_shiny });
    if (s.other.showdown?.front_default)
      imageVariants.push({ label: '배틀 스프라이트', url: s.other.showdown.front_default });
    if (s.front_default)
      imageVariants.push({ label: '도트 스프라이트', url: s.front_default });
    if (s.front_shiny)
      imageVariants.push({ label: '✨ 도트 이로치', url: s.front_shiny });

    // Fetch Korean ability names
    const abilityNamesKr = await Promise.all(
      pokemon.abilities.map(a => this.getAbilityNameKr(a.ability.name))
    );
    
    return {
      id: pokemon.id,
      nameKr: species.nameKr,
      nameEn: species.nameEn,
      types: pokemon.types,
      stats: pokemon.stats,
      height: pokemon.height,
      weight: pokemon.weight,
      abilities: pokemon.abilities,
      abilityNamesKr: abilityNamesKr,
      spriteUrl: s.front_default,
      artworkUrl: s.other['official-artwork']?.front_default,
      imageVariants: imageVariants,
      cryUrl: cryUrl,
      flavorTextKr: species.flavorTextKr,
      evolutionChainUrl: species.evolutionChainUrl,
      baseExp: pokemon.base_experience
    };
  },

  async getTCGCard(name, pokemonId) {
    try {
      const url = `https://api.pokemontcg.io/v2/cards?q=nationalPokedexNumbers:${pokemonId || ''} name:"${name}"&pageSize=5&orderBy=-set.releaseDate`;
      const res = await fetch(url);
      if (!res.ok) {
        // nationalPokedexNumbers 실패 시 이름만으로 재시도
        const url2 = `https://api.pokemontcg.io/v2/cards?q=name:"${name}"&pageSize=5&orderBy=-set.releaseDate`;
        const res2 = await fetch(url2);
        if (!res2.ok) return [];
        const data2 = await res2.json();
        if (data2.data && data2.data.length > 0) {
          return data2.data.map(card => ({
            label: `🃏 ${card.set.name}`,
            url: card.images.large
          }));
        }
        return [];
      }
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        return data.data.map(card => ({
          label: `🃏 ${card.set.name}`,
          url: card.images.large
        }));
      }
      return [];
    } catch (e) {
      console.log('TCG API error:', e);
      return [];
    }
  },
  
  async preloadAdjacent(currentId, gen) {
    const [min, max] = this.GENERATION_RANGES[gen];
    const prevId = currentId > min ? currentId - 1 : max;
    const nextId = currentId < max ? currentId + 1 : min;
    
    // Fire and forget
    this.getPokemonFullData(prevId).catch(() => {});
    this.getPokemonFullData(nextId).catch(() => {});
  },
  
  getTypeColor(typeName) {
    const colors = {
      normal: '#A8A77A',
      fire: '#EE8130',
      water: '#6390F0',
      electric: '#F7D02C',
      grass: '#7AC74C',
      ice: '#96D9D6',
      fighting: '#C22E28',
      poison: '#A33EA1',
      ground: '#E2BF65',
      flying: '#A98FF3',
      psychic: '#F95587',
      bug: '#A6B91A',
      rock: '#B6A136',
      ghost: '#735797',
      dragon: '#6F35FC',
      dark: '#705898',
      steel: '#B7B7CE',
      fairy: '#D685AD'
    };
    return colors[typeName] || '#A8A77A';
  },

  getTypeNameKr(typeName) {
    return this.TYPE_NAMES_KR[typeName] || typeName;
  }
};
