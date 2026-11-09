/**
 * 티니핑 미니게임 T5: 샤랄라! 마법 판 뒤집기! (tp-flipbattle.js)
 * 6~7세 아이들을 위한 유치원 운동회 스타일 4x4 마법 보석 판 뒤집기 대결 놀이
 */
(function (global) {
  'use strict';

  var GAME_ID = 'flipbattle';
  var TOTAL_TILES = 16;
  var GRID_SIZE = 4;
  var INITIAL_TIME_SEC = 25;
  var VILLAIN_INTERVAL_MS = 1150;
  var WAND_SPAWN_INTERVAL_MS = 4200;
  var SOLFEGE_NAMES = ['도', '레', '미', '파', '솔', '라', '시', '높은 도'];

  var ALARM_CLOCK_SVG =
    '<svg class="tp-arcade-clock-svg" viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">' +
      '<path d="M10 18 C6 12, 14 4, 22 10 L18 20 Z" fill="#FACC15" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M54 18 C58 12, 50 4, 42 10 L46 20 Z" fill="#FACC15" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<rect x="29" y="5" width="6" height="8" rx="3" fill="#EAB308" stroke="#FFFFFF" stroke-width="2"/>' +
      '<path d="M18 52 L13 59 M46 52 L51 59" stroke="#FACC15" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="32" cy="35" r="22" fill="#FACC15" stroke="#FFFFFF" stroke-width="3"/>' +
      '<circle cx="32" cy="35" r="17" fill="#FFFFFF" stroke="#EAB308" stroke-width="2"/>' +
      '<path d="M32 35 L32 24 M32 35 L25 40" stroke="#334155" stroke-width="2.8" stroke-linecap="round"/>' +
      '<circle cx="32" cy="35" r="2.6" fill="#334155"/>' +
    '</svg>';

  var VILLAIN_FACE_SVG =
    '<svg class="tp-flipbattle-villain-svg" viewBox="0 0 80 80" width="62" height="62" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="tpVillainHeadGrad" cx="38%" cy="32%" r="65%">' +
          '<stop offset="0%" stop-color="#F87171"/>' +
          '<stop offset="62%" stop-color="#DC2626"/>' +
          '<stop offset="100%" stop-color="#991B1B"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<path d="M16 28 L12 10 L29 19 Z" fill="#DC2626"/>' +
      '<path d="M64 28 L68 10 L51 19 Z" fill="#DC2626"/>' +
      '<circle cx="40" cy="43" r="28" fill="url(#tpVillainHeadGrad)"/>' +
      '<ellipse cx="40" cy="54" rx="21" ry="14" fill="#FECDD3"/>' +
      '<path d="M26 33 L35 36" stroke="#450A0A" stroke-width="2.8" stroke-linecap="round"/>' +
      '<path d="M54 33 L45 36" stroke="#450A0A" stroke-width="2.8" stroke-linecap="round"/>' +
      '<circle cx="31" cy="41" r="3.4" fill="#450A0A"/>' +
      '<circle cx="49" cy="41" r="3.4" fill="#450A0A"/>' +
      '<ellipse cx="40" cy="48" rx="4.8" ry="3.4" fill="#7F1D1D"/>' +
      '<path d="M35 55 Q40 59 45 55" stroke="#7F1D1D" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  function injectFlipBattleStyles() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('tp-flipbattle-inline-styles')) return;

    var styleEl = document.createElement('style');
    styleEl.id = 'tp-flipbattle-inline-styles';
    styleEl.textContent = [
      '.tp-flipbattle-wrap {',
      '  position: relative; width: 100%; height: 100%; min-height: 450px;',
      '  display: flex; flex-direction: column; justify-content: space-between; gap: 6px;',
      '  background:',
      '    radial-gradient(circle at 14% 25%, rgba(255, 255, 255, 0.55) 1.5px, transparent 2.5px),',
      '    radial-gradient(circle at 84% 30%, rgba(255, 255, 255, 0.5) 1.5px, transparent 2.5px),',
      '    radial-gradient(circle at 22% 76%, rgba(255, 255, 255, 0.45) 1.5px, transparent 2.5px),',
      '    radial-gradient(circle at 88% 72%, rgba(255, 255, 255, 0.4) 1.5px, transparent 2.5px),',
      '    linear-gradient(180deg, #433352 0%, #6A4F73 55%, #583F62 100%);',
      '  border-radius: 22px; padding: 0 16px 12px 16px; box-sizing: border-box; overflow: hidden;',
      '  user-select: none; -webkit-user-select: none; touch-action: none;',
      '  font-family: "Jua", "Pretendard", "Malgun Gothic", sans-serif; color: #FFFFFF;',
      '}',
      '.tp-flipbattle-hud {',
      '  display: flex; flex-direction: column; gap: 4px; padding: 0; background: transparent; border: none; box-shadow: none; margin-bottom: 2px;',
      '}',
      '.tp-flipbattle-top-row {',
      '  display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 58px;',
      '}',
      '.tp-flipbattle-hud-stat, .tp-flipbattle-hud-clock, .tp-flipbattle-hud-right {',
      '  display: flex; align-items: center; gap: 10px;',
      '}',
      '.tp-flipbattle-hud-avatar {',
      '  width: 52px; height: 52px; border-radius: 50%; overflow: hidden; flex-shrink: 0;',
      '  background: radial-gradient(circle at 35% 30%, #7DD3FC 0%, #38BDF8 60%, #0284C7 100%);',
      '  border: 3px solid rgba(255,255,255,0.92); box-shadow: 0 4px 10px rgba(0,0,0,0.35);',
      '  display: flex; align-items: center; justify-content: center;',
      '}',
      '.tp-flipbattle-hud-avatar img { width: 86%; height: 86%; object-fit: contain; }',
      '.tp-flipbattle-big-num {',
      '  font-family: "Jua", "Outfit", "Arial Black", sans-serif; font-size: 38px; font-weight: 900; line-height: 1;',
      '  color: #FFFFFF; text-shadow: 0 3px 0 #2A1B38, 0 5px 12px rgba(0,0,0,0.45);',
      '}',
      '.tp-flipbattle-corner-ribbon {',
      '  background: linear-gradient(180deg, #38BDF8 0%, #3299C7 100%); color: #FFFFFF;',
      '  font-weight: 900; font-size: 19px; padding: 10px 24px 12px 26px; border-radius: 0 0 0 32px;',
      '  box-shadow: -2px 4px 12px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.45);',
      '  text-shadow: 0 2px 4px rgba(0,0,0,0.25); margin-right: -16px; margin-top: -6px; white-space: nowrap;',
      '}',
      '.tp-flipbattle-subrow {',
      '  display: flex; align-items: center; justify-content: space-between; gap: 10px;',
      '  background: rgba(35, 22, 48, 0.48); border: 1.5px solid rgba(255,255,255,0.18);',
      '  border-radius: 12px; padding: 4px 12px;',
      '}',
      '.tp-flipbattle-banner {',
      '  flex: 1.2; text-align: left; font-size: 13px; font-weight: 800; color: #FDE68A;',
      '  background: transparent; border: none; padding: 0; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
      '}',
      '.tp-flipbattle-tug { flex: 1; min-width: 190px; display: flex; flex-direction: column; gap: 2px; }',
      '.tp-flipbattle-tug-labels { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; }',
      '.tp-tug-hero-label { color: #7DD3FC; }',
      '.tp-tug-vs { color: #FFFFFF; font-size: 11px; opacity: 0.85; }',
      '.tp-tug-villain-label { color: #FCA5A5; }',
      '.tp-flipbattle-tug-bar {',
      '  width: 100%; height: 10px; border-radius: 999px; background: #EF4444; border: 1.5px solid rgba(255,255,255,0.55); overflow: hidden;',
      '}',
      '.tp-flipbattle-tug-fill-hero { height: 100%; background: linear-gradient(90deg, #38BDF8, #60A5FA); transition: width 0.22s ease; }',
      '.tp-flipbattle-grid {',
      '  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;',
      '  width: 100%; max-width: 480px; margin: 0 auto; flex: 1; align-content: center; perspective: 800px;',
      '}',
      '.tp-flipbattle-tile {',
      '  position: relative; width: 100%; aspect-ratio: 1 / 1; height: auto; min-height: 82px; max-height: 106px;',
      '  margin: 0 auto; border-radius: 8px; cursor: pointer; padding: 0;',
      '  background: transparent; border: none; outline: none;',
      '  perspective: 800px; overflow: visible; touch-action: none; box-sizing: border-box;',
      '}',
      '.tp-flipbattle-tile-card {',
      '  width: 100%; height: 100%; position: relative; border-radius: 8px;',
      '  transform-style: preserve-3d; -webkit-transform-style: preserve-3d;',
      '  transition: transform 0.34s cubic-bezier(0.22, 1.15, 0.36, 1), box-shadow 0.24s ease;',
      '}',
      '.tp-flipbattle-tile.is-hero .tp-flipbattle-tile-card { transform: rotateY(0deg); }',
      '.tp-flipbattle-tile.is-villain .tp-flipbattle-tile-card { transform: rotateY(180deg); }',
      '.tp-flipbattle-tile.is-flipping.is-hero .tp-flipbattle-tile-card,',
      '.tp-flipbattle-tile.is-hero:hover .tp-flipbattle-tile-card {',
      '  transform: rotateY(0deg) rotate(-4deg) scale(1.06);',
      '}',
      '.tp-flipbattle-tile.is-villain:hover .tp-flipbattle-tile-card {',
      '  transform: rotateY(180deg) rotate(-4deg) scale(1.06);',
      '}',
      '.tp-flipbattle-tile-inner {',
      '  position: absolute; inset: 0; width: 100%; height: 100%;',
      '  border-radius: 8px; padding: 6px; box-sizing: border-box;',
      '  background: #7A8288; border: 3px solid #52585E;',
      '  box-shadow: 0 6px 0 #3E4348, 0 10px 18px rgba(0,0,0,0.38);',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  backface-visibility: hidden; -webkit-backface-visibility: hidden; pointer-events: none; overflow: hidden;',
      '}',
      '.tp-flipbattle-tile.is-flipping .tp-flipbattle-tile-inner {',
      '  box-shadow: 8px 12px 18px rgba(0,0,0,0.45), 0 6px 0 #3E4348;',
      '}',
      '.tp-flipbattle-tile-inner.tp-tile-hero { transform: rotateY(0deg); z-index: 2; }',
      '.tp-flipbattle-tile-inner.tp-tile-villain { transform: rotateY(180deg); z-index: 1; }',
      '.tp-flipbattle-tile.is-villain .tp-flipbattle-tile-inner.tp-tile-villain { z-index: 3; }',
      '.tp-flipbattle-well {',
      '  width: 100%; height: 100%; border-radius: 4px; background: #E5E9EC;',
      '  box-shadow: inset 0 2px 5px rgba(0,0,0,0.14);',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  position: relative; overflow: hidden; padding: 2px; box-sizing: border-box;',
      '}',
      '.tp-flipbattle-well-hero { background: radial-gradient(circle, #F0F9FF 0%, #D8ECF8 100%); }',
      '.tp-flipbattle-well-villain { background: radial-gradient(circle, #FFF1F2 0%, #F5D0D6 100%); }',
      '.tp-flipbattle-tile.has-magic-wand .tp-flipbattle-tile-inner {',
      '  border-color: #FFD700;',
      '  box-shadow: 0 0 20px rgba(255, 215, 0, 0.9), 0 6px 0 #B45309;',
      '}',
      '.tp-flipbattle-avatar-wrap {',
      '  width: 60px; height: 60px; min-width: 54px; min-height: 54px;',
      '  display: flex; align-items: center; justify-content: center; overflow: hidden;',
      '}',
      '.tp-flipbattle-avatar-wrap .tp-mg-avatar {',
      '  width: 56px !important; height: 56px !important; border-width: 2.5px;',
      '  background: radial-gradient(circle at 35% 30%, #7DD3FC 0%, #38BDF8 65%, #0284C7 100%);',
      '}',
      '.tp-flipbattle-tile-name {',
      '  position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);',
      '  font-size: 10px; font-weight: 900; color: #1E293B; background: rgba(255,255,255,0.82);',
      '  padding: 0 5px; border-radius: 999px; line-height: 1.2; white-space: nowrap;',
      '}',
      '.tp-flipbattle-wand-badge {',
      '  display: none; align-items: center; justify-content: center;',
      '}',
      '.tp-flipbattle-tile.has-magic-wand .tp-flipbattle-wand-badge {',
      '  display: inline-flex;',
      '}',
      '@media (max-width: 720px) {',
      '  .tp-flipbattle-tile { min-height: 72px; max-height: 86px; }',
      '  .tp-flipbattle-avatar-wrap { width: 48px; height: 48px; min-width: 44px; min-height: 44px; }',
      '  .tp-flipbattle-big-num { font-size: 28px; }',
      '}'
    ].join('\n');
    document.head.appendChild(styleEl);
  }

  function safeRenderAvatar(helpers, tp, sizeClass) {
    if (helpers && typeof helpers.renderAvatarHtml === 'function') {
      try {
        var html = helpers.renderAvatarHtml(tp, sizeClass || 'tp-mg-avatar-sm');
        if (html) return html;
      } catch (_e) {
        // fallback below
      }
    }
    var name = (tp && tp.name) ? tp.name : '하츄핑';
    var img = (tp && tp.image) ? tp.image : '';
    var emoji = (tp && tp.seasonEmoji) ? tp.seasonEmoji : '💖';
    if (img) {
      return '<img src="' + img + '" alt="' + name + '" style="width:100%;height:100%;object-fit:contain;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.18));" />';
    }
    return '<span style="font-size:36px;line-height:1;">' + emoji + '</span>';
  }

  var gameDef = {
    id: GAME_ID,
    title: '샤랄라! 마법 판 뒤집기!',
    subtitle: '악동핑보다 먼저 카드를 내 티니핑 빛깔로 뒤집어요!',
    icon: '⚡',
    badge: '스피드 판 뒤집기',
    badgeColor: '#EC4899',

    mount: function (stageEl, charCtx, helpers) {
      if (!stageEl) {
        return function () {};
      }

      injectFlipBattleStyles();

      var ctx = Object.assign({
        name: '하츄핑',
        nameEn: 'Heartsping',
        image: '',
        color: '#EC4899',
        grade: '로열',
        emotion: '사랑',
        gender: '여',
        mainSeason: 1,
        seasonTheme: '큐브',
        seasonEmoji: '💖'
      }, charCtx || {});

      var h = Object.assign({
        playSfx: function () {},
        playCry: function () {},
        computeRunTransform: function () { return ''; },
        getHighScore: function () { return 0; },
        saveHighScore: function () {},
        rewardCharacter: function () {},
        createHeartExplosion: function () {},
        renderAvatarHtml: null,
        showResultOverlay: function () {}
      }, helpers || {});

      var state = {
        score: 0,
        highScore: Number(h.getHighScore(GAME_ID)) || 0,
        timeLeft: INITIAL_TIME_SEC,
        comboCount: 0,
        maxCombo: 0,
        heroCount: 8,
        villainCount: 8,
        magicWandCount: 0,
        isPointerDown: false,
        isGameOver: false,
        bannerMessage: '⚡ 심술핑 카드를 터치하거나 손가락으로 쓱~ 문질러 뒤집어요!'
      };

      // 4x4 (16장) 초기 보드 생성: 8장 hero, 8장 villain (체커보드 교차 배치로 0번은 villain)
      var tiles = [];
      for (var i = 0; i < TOTAL_TILES; i++) {
        var r = Math.floor(i / GRID_SIZE);
        var c = i % GRID_SIZE;
        var isHeroStart = (r + c) % 2 === 1;
        tiles.push({
          index: i,
          owner: isHeroStart ? 'hero' : 'villain',
          hasMagicWand: i === 5, // 시작 시 5번 타일에 첫 로열 마법봉 배지 반짝!
          flipCount: 0,
          justFlipped: false,
          el: null
        });
      }

      var villainTimerId = null;
      var secondTimerId = null;
      var wandTimerId = null;
      var docPointerUpHandler = null;

      stageEl.innerHTML = [
        '<div class="tp-flipbattle-wrap" data-role="wrap" style="--hero-color: ' + (ctx.color || '#EC4899') + ';">',
        '  <div class="tp-flipbattle-hud">',
        '    <div class="tp-flipbattle-top-row">',
        '      <div class="tp-flipbattle-hud-stat">',
        '        <div class="tp-flipbattle-hud-avatar">' + safeRenderAvatar(h, ctx, 'tp-mg-avatar-sm') + '</div>',
        '        <span class="tp-flipbattle-big-num" data-role="hud-hero-num">8</span>',
        '      </div>',
        '      <div class="tp-flipbattle-hud-clock">',
        '        ' + ALARM_CLOCK_SVG,
        '        <span class="tp-flipbattle-big-num" data-role="hud-timer-num">25</span>',
        '        <div class="tp-flipbattle-timer-pill sr-only" data-role="timer">⏰ 25초</div>',
        '      </div>',
        '      <div class="tp-flipbattle-hud-right">',
        '        <div class="tp-flipbattle-score-pill" data-role="score">💖 0점</div>',
        '        <button type="button" class="tp-flipbattle-finish-btn" data-role="finish-btn">🏁 결과</button>',
        '        <div class="tp-flipbattle-corner-ribbon">카드 뒤집기</div>',
        '      </div>',
        '    </div>',
        '    <div class="tp-flipbattle-subrow">',
        '      <div class="tp-flipbattle-banner" data-role="banner">' + state.bannerMessage + '</div>',
        '      <div class="tp-flipbattle-tug">',
        '        <div class="tp-flipbattle-tug-labels">',
        '          <span class="tp-tug-hero-label" data-role="hero-label">💖 ' + ctx.name + ' 8장</span>',
        '          <span class="tp-tug-vs">⚡ 줄다리기 대결 ⚡</span>',
        '          <span class="tp-tug-villain-label" data-role="villain-label">😈 심술핑 8장</span>',
        '        </div>',
        '        <div class="tp-flipbattle-tug-bar">',
        '          <div class="tp-flipbattle-tug-fill-hero" data-role="tug-fill" style="width: 50%;"></div>',
        '        </div>',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <div class="tp-flipbattle-grid" data-role="grid"></div>',
        '</div>'
      ].join('');

      var timerEl = stageEl.querySelector ? stageEl.querySelector('[data-role="timer"]') : null;
      var hudHeroNumEl = stageEl.querySelector ? stageEl.querySelector('[data-role="hud-hero-num"]') : null;
      var hudTimerNumEl = stageEl.querySelector ? stageEl.querySelector('[data-role="hud-timer-num"]') : null;
      var scoreEl = stageEl.querySelector ? stageEl.querySelector('[data-role="score"]') : null;
      var heroLabelEl = stageEl.querySelector ? stageEl.querySelector('[data-role="hero-label"]') : null;
      var villainLabelEl = stageEl.querySelector ? stageEl.querySelector('[data-role="villain-label"]') : null;
      var tugFillEl = stageEl.querySelector ? stageEl.querySelector('[data-role="tug-fill"]') : null;
      var bannerEl = stageEl.querySelector ? stageEl.querySelector('[data-role="banner"]') : null;
      var gridEl = stageEl.querySelector ? stageEl.querySelector('[data-role="grid"]') : null;
      var finishBtnEl = stageEl.querySelector ? stageEl.querySelector('[data-role="finish-btn"]') : null;

      function recountTiles() {
        var hCnt = 0;
        var vCnt = 0;
        for (var idx = 0; idx < tiles.length; idx++) {
          if (tiles[idx].owner === 'hero') hCnt += 1;
          else vCnt += 1;
        }
        state.heroCount = hCnt;
        state.villainCount = vCnt;
      }

      function updateHud() {
        recountTiles();
        if (timerEl) {
          timerEl.textContent = '⏰ ' + state.timeLeft + '초';
        }
        if (hudTimerNumEl) {
          hudTimerNumEl.textContent = String(state.timeLeft);
        }
        if (hudHeroNumEl) {
          hudHeroNumEl.textContent = String(state.heroCount);
        }
        if (scoreEl) {
          scoreEl.textContent = '💖 ' + state.score + '점';
        }
        if (heroLabelEl) {
          heroLabelEl.textContent = '💖 ' + ctx.name + ' ' + state.heroCount + '장';
        }
        if (villainLabelEl) {
          villainLabelEl.textContent = '😈 심술핑 ' + state.villainCount + '장';
        }
        if (tugFillEl && tugFillEl.style) {
          var heroPct = Math.round((state.heroCount / TOTAL_TILES) * 100);
          tugFillEl.style.width = heroPct + '%';
        }
        if (bannerEl) {
          bannerEl.textContent = state.bannerMessage;
        }
      }

      function buildTileInnerHtml(tile) {
        var wandStyle = tile.hasMagicWand ? 'display:inline-flex;' : 'display:none;';
        return [
          '<span class="tp-flipbattle-wand-badge" data-role="wand-badge" style="' + wandStyle + '">👑 로열 마법봉!</span>',
          '<div class="tp-flipbattle-tile-card">',
          '  <div class="tp-flipbattle-tile-inner tp-tile-hero">',
          '    <div class="tp-flipbattle-well tp-flipbattle-well-hero">',
          '      <div class="tp-flipbattle-avatar-wrap">' + safeRenderAvatar(h, ctx, 'tp-mg-avatar-sm') + '</div>',
          '      <span class="tp-flipbattle-tile-name">💖 ' + ctx.name + '</span>',
          '    </div>',
          '  </div>',
          '  <div class="tp-flipbattle-tile-inner tp-tile-villain">',
          '    <div class="tp-flipbattle-well tp-flipbattle-well-villain">',
          '      <div class="tp-flipbattle-avatar-wrap">' + VILLAIN_FACE_SVG + '</div>',
          '      <span class="tp-flipbattle-tile-name">심술핑</span>',
          '    </div>',
          '  </div>',
          '</div>'
        ].join('');
      }

      function updateSingleTileDom(tile) {
        if (!tile || !tile.el) return;
        if (!tile._domInitialized) {
          tile.el.innerHTML = buildTileInnerHtml(tile);
          tile._domInitialized = true;
          tile.wandBadgeEl = tile.el.querySelector ? tile.el.querySelector('[data-role="wand-badge"]') : null;
        }
        var cls = ['tp-flipbattle-tile'];
        cls.push(tile.owner === 'hero' ? 'is-hero' : 'is-villain');
        if (tile.hasMagicWand) cls.push('has-magic-wand');
        if (tile.justFlipped) cls.push('is-flipping');
        tile.el.className = cls.join(' ');
        tile.el.setAttribute('data-owner', tile.owner);
        tile.el.setAttribute('data-wand', tile.hasMagicWand ? 'true' : 'false');
        if (tile.wandBadgeEl && tile.wandBadgeEl.style) {
          tile.wandBadgeEl.style.display = tile.hasMagicWand ? 'inline-flex' : 'none';
        }
      }

      function renderBoard() {
        updateHud();
        if (!gridEl) return;
        gridEl.innerHTML = '';

        for (var i = 0; i < tiles.length; i++) {
          (function (tile) {
            if (typeof document === 'undefined' || !document.createElement) return;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.setAttribute('data-tile-index', String(tile.index));
            tile.el = btn;
            tile._domInitialized = false;
            updateSingleTileDom(tile);

            var lastPointerDownTime = 0;
            if (btn.addEventListener) {
              btn.addEventListener('pointerdown', function (ev) {
                if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
                lastPointerDownTime = Date.now();
                state.isPointerDown = true;
                handleUserTileInteract(tile.index);
              });
              btn.addEventListener('pointerenter', function () {
                if (!state.isPointerDown) return;
                handleUserTileSwipe(tile.index);
              });
              btn.addEventListener('click', function () {
                if (Date.now() - lastPointerDownTime < 450) return;
                handleUserTileInteract(tile.index);
              });
            }

            if (gridEl.appendChild) {
              gridEl.appendChild(btn);
            }
          })(tiles[i]);
        }
      }

      function handleUserTileInteract(index) {
        if (state.isGameOver) return;
        var tile = tiles[index];
        if (!tile) return;
        if (tile.hasMagicWand) {
          triggerMagicWand(index);
        } else {
          flipTile(index);
        }
      }

      function handleUserTileSwipe(index) {
        if (state.isGameOver) return;
        var tile = tiles[index];
        if (!tile) return;
        if (tile.hasMagicWand) {
          triggerMagicWand(index);
        } else if (tile.owner !== 'hero') {
          flipTile(index);
        }
      }

      function flipTile(index) {
        if (state.isGameOver) return false;

        var targetIdx = index;
        if (targetIdx === undefined || targetIdx === null) {
          targetIdx = -1;
          for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].owner === 'villain') {
              targetIdx = i;
              break;
            }
          }
          if (targetIdx === -1) targetIdx = 0;
        }

        var idx = Number(targetIdx);
        if (isNaN(idx) || idx < 0 || idx >= tiles.length) return false;

        var tile = tiles[idx];
        if (!tile) return false;

        tile.owner = 'hero';
        tile.flipCount += 1;
        tile.justFlipped = true;

        state.score += 15;
        state.comboCount += 1;
        if (state.comboCount > state.maxCombo) {
          state.maxCombo = state.comboCount;
        }

        var noteIdx = (state.comboCount - 1) % SOLFEGE_NAMES.length;
        var solfege = SOLFEGE_NAMES[noteIdx];
        h.playSfx('note', noteIdx);

        state.bannerMessage = '💖 샤랄라 뒤집기! +15점 (🎵' + solfege + ' · ' + state.comboCount + '연속!)';
        updateSingleTileDom(tile);
        updateHud();
        return true;
      }

      function triggerMagicWand(index) {
        if (state.isGameOver) return [];

        var targetIdx = index;
        if (targetIdx === undefined || targetIdx === null) {
          targetIdx = -1;
          for (var w = 0; w < tiles.length; w++) {
            if (tiles[w].hasMagicWand) {
              targetIdx = w;
              break;
            }
          }
          if (targetIdx === -1) targetIdx = 5;
        }

        var idx = Number(targetIdx);
        if (isNaN(idx) || idx < 0 || idx >= tiles.length) return [];

        var centerRow = Math.floor(idx / GRID_SIZE);
        var centerCol = idx % GRID_SIZE;
        var affectedIndices = [];

        for (var i = 0; i < tiles.length; i++) {
          var r = Math.floor(i / GRID_SIZE);
          var c = i % GRID_SIZE;
          tiles[i].hasMagicWand = false;
          if (r === centerRow || c === centerCol) {
            tiles[i].owner = 'hero';
            tiles[i].flipCount += 1;
            tiles[i].justFlipped = true;
            affectedIndices.push(i);
          }
          updateSingleTileDom(tiles[i]);
        }

        state.score += 80;
        state.magicWandCount += 1;
        state.comboCount += 1;
        if (state.comboCount > state.maxCombo) {
          state.maxCombo = state.comboCount;
        }

        h.playSfx('sparkle');
        h.playSfx('note', (state.comboCount - 1) % SOLFEGE_NAMES.length);
        h.createHeartExplosion(50, 50);

        state.bannerMessage = '👑 로열 마법봉 십자(+) 대폭발!! 가로·세로 줄 변신! (+80점 보너스!)';
        updateHud();
        return affectedIndices;
      }

      function villainFlip(forcedIndex) {
        if (state.isGameOver) return -1;

        var targetTile = null;
        if (forcedIndex !== undefined && forcedIndex !== null) {
          var fIdx = Number(forcedIndex);
          if (!isNaN(fIdx) && fIdx >= 0 && fIdx < tiles.length) {
            targetTile = tiles[fIdx];
          }
        }

        if (!targetTile) {
          var heroTiles = [];
          for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].owner === 'hero' && !tiles[i].hasMagicWand) {
              heroTiles.push(tiles[i]);
            }
          }
          if (heroTiles.length === 0) {
            for (var j = 0; j < tiles.length; j++) {
              if (tiles[j].owner === 'hero') {
                heroTiles.push(tiles[j]);
              }
            }
          }
          if (heroTiles.length === 0) return -1;
          targetTile = heroTiles[Math.floor(Math.random() * heroTiles.length)];
        }

        targetTile.owner = 'villain';
        targetTile.justFlipped = true;
        updateSingleTileDom(targetTile);

        state.bannerMessage = '😈 앗! 심술핑이 카드를 보라색 먹구름으로 뒤집었어요! 다시 뒤집어봐요!';
        updateHud();
        return targetTile.index;
      }

      function spawnMagicWand(forcedIndex) {
        if (state.isGameOver) return -1;

        for (var i = 0; i < tiles.length; i++) {
          if (tiles[i].hasMagicWand) return tiles[i].index;
        }

        var idx = (forcedIndex !== undefined && forcedIndex !== null)
          ? Number(forcedIndex)
          : Math.floor(Math.random() * tiles.length);
        if (isNaN(idx) || idx < 0 || idx >= tiles.length) idx = 5;

        tiles[idx].hasMagicWand = true;
        updateSingleTileDom(tiles[idx]);
        state.bannerMessage = '👑 반짝반짝! 보드에 [로열 마법봉]이 나타났어요! 터치해보세요!';
        updateHud();
        return idx;
      }

      function stepSecond() {
        if (state.isGameOver) return state.timeLeft;
        state.timeLeft = Math.max(0, state.timeLeft - 1);
        if (state.timeLeft > 0 && state.timeLeft % 5 === 0) {
          spawnMagicWand();
        }
        updateHud();
        if (state.timeLeft <= 0) {
          finishGame('time_up');
        }
        return state.timeLeft;
      }

      function stopAllTimers() {
        if (villainTimerId) {
          clearInterval(villainTimerId);
          villainTimerId = null;
        }
        if (secondTimerId) {
          clearInterval(secondTimerId);
          secondTimerId = null;
        }
        if (wandTimerId) {
          clearInterval(wandTimerId);
          wandTimerId = null;
        }
      }

      function finishGame(reason) {
        if (state.isGameOver) return;
        state.isGameOver = true;
        state.isPointerDown = false;
        stopAllTimers();
        recountTiles();

        var isHeroWin = state.heroCount > state.villainCount;
        var bonusScore = isHeroWin ? 100 : 50;
        state.score += bonusScore;

        var resultMessage = isHeroWin
          ? '🎉 샤랄라 대승리! 마법 판을 사랑으로 가득 채웠어요~ 츄! (+100점 승리 보너스)'
          : '💖 우와~ 손가락이 번개처럼 빨랐어요! 참 잘했어요~ (+50점 격려 보너스)';

        state.bannerMessage = resultMessage;
        updateHud();

        if (state.score > state.highScore) {
          state.highScore = state.score;
        }
        h.saveHighScore(GAME_ID, state.score);
        h.rewardCharacter();

        h.showResultOverlay(stageEl, {
          gameId: GAME_ID,
          title: isHeroWin ? '샤랄라 마법 판 뒤집기 대승리! ⚡💖' : '샤랄라 마법 판 뒤집기 완료! 💖',
          score: state.score,
          highScore: state.highScore,
          stars: isHeroWin ? 3 : 2,
          message: resultMessage,
          summary: resultMessage,
          reason: reason || 'finished',
          charCtx: ctx,
          onRestart: function () {
            cleanup();
            gameDef.mount(stageEl, charCtx, helpers);
          }
        });
      }

      if (finishBtnEl && finishBtnEl.addEventListener) {
        finishBtnEl.addEventListener('click', function () {
          finishGame('user_finish');
        });
      }

      if (gridEl && gridEl.addEventListener) {
        gridEl.addEventListener('pointermove', function (ev) {
          if (!state.isPointerDown || state.isGameOver) return;
          if (!ev || typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return;
          if (typeof ev.clientX !== 'number' || typeof ev.clientY !== 'number') return;
          var hitEl = document.elementFromPoint(ev.clientX, ev.clientY);
          while (hitEl && hitEl !== gridEl) {
            if (hitEl.getAttribute && hitEl.getAttribute('data-tile-index') !== null) {
              var hitIdx = Number(hitEl.getAttribute('data-tile-index'));
              if (!isNaN(hitIdx)) {
                handleUserTileSwipe(hitIdx);
              }
              break;
            }
            hitEl = hitEl.parentNode;
          }
        });
      }

      docPointerUpHandler = function () {
        state.isPointerDown = false;
      };
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('pointerup', docPointerUpHandler);
        document.addEventListener('pointercancel', docPointerUpHandler);
      }

      renderBoard();

      villainTimerId = setInterval(function () {
        villainFlip();
      }, VILLAIN_INTERVAL_MS);

      secondTimerId = setInterval(function () {
        stepSecond();
      }, 1000);

      wandTimerId = setInterval(function () {
        spawnMagicWand();
      }, WAND_SPAWN_INTERVAL_MS);

      var api = {
        flipTile: flipTile,
        villainFlip: villainFlip,
        triggerMagicWand: triggerMagicWand,
        spawnMagicWand: spawnMagicWand,
        stepSecond: stepSecond,
        finishGame: finishGame,
        getState: function () {
          recountTiles();
          var wandIdx = -1;
          for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].hasMagicWand) {
              wandIdx = i;
              break;
            }
          }
          return {
            score: state.score,
            highScore: state.highScore,
            timeLeft: state.timeLeft,
            combo: state.comboCount,
            comboCount: state.comboCount,
            maxCombo: state.maxCombo,
            heroCount: state.heroCount,
            villainCount: state.villainCount,
            magicWandIndex: wandIdx,
            magicWandCount: state.magicWandCount,
            isGameOver: state.isGameOver,
            bannerMessage: state.bannerMessage,
            lastMessage: state.bannerMessage,
            tiles: tiles.map(function (t) {
              return {
                index: t.index,
                owner: t.owner,
                hasMagicWand: t.hasMagicWand,
                flipCount: t.flipCount
              };
            })
          };
        }
      };

      stageEl._tpFlipBattleGame = api;

      function cleanup() {
        state.isGameOver = true;
        state.isPointerDown = false;
        stopAllTimers();
        if (typeof document !== 'undefined' && document.removeEventListener && docPointerUpHandler) {
          document.removeEventListener('pointerup', docPointerUpHandler);
          document.removeEventListener('pointercancel', docPointerUpHandler);
          docPointerUpHandler = null;
        }
        if (stageEl._tpFlipBattleGame === api) {
          delete stageEl._tpFlipBattleGame;
        }
      }

      return cleanup;
    }
  };

  global.TpGameFlipBattle = gameDef;
  if (global.TpMiniGames && typeof global.TpMiniGames.register === 'function') {
    global.TpMiniGames.register(gameDef.id, gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
