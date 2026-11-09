/**
 * 티니핑 미니게임 T4: 숨바꼭질! 내 티니핑 짝꿍 찾기 (tp-memory.js)
 * 6~7세 아이들을 위한 2.5초 앞면 미리보기 + 마법 힌트 카드 짝맞추기 놀이
 */
(function (global) {
  'use strict';

  var GAME_ID = 'memory';
  var PREVIEW_DURATION_MS = 2500;
  var MISMATCH_HOLD_MS = 800;
  var HINT_DURATION_MS = 1500;

  var DEFAULT_FRIENDS = [
    { name: '방글핑', color: '#BA68C8', emotion: '기쁨', seasonEmoji: '✨' },
    { name: '조아핑', color: '#FFB74D', emotion: '친절', seasonEmoji: '💛' },
    { name: '믿어핑', color: '#4FC3F7', emotion: '믿음', seasonEmoji: '💙' },
    { name: '차차핑', color: '#81C784', emotion: '희망', seasonEmoji: '🍀' },
    { name: '라라핑', color: '#F06292', emotion: '노래', seasonEmoji: '🎵' },
    { name: '해피핑', color: '#FF8A65', emotion: '행복', seasonEmoji: '🌈' },
    { name: '샤샤핑', color: '#4DD0E1', emotion: '시원함', seasonEmoji: '🍦' },
    { name: '포실핑', color: '#F48FB1', emotion: '포근함', seasonEmoji: '☁️' }
  ];

  // 3D 노란 트윈벨 자명종 시계 아이콘 SVG (레퍼런스 이미지 스타일)
  var ALARM_CLOCK_SVG = [
    '<svg class="tp-memory-clock-svg" viewBox="0 0 64 64" width="46" height="46" aria-hidden="true">',
    '  <defs>',
    '    <radialGradient id="tpMemClockBell" cx="35%" cy="30%" r="70%">',
    '      <stop offset="0%" stop-color="#FFF59D"/>',
    '      <stop offset="55%" stop-color="#FBC02D"/>',
    '      <stop offset="100%" stop-color="#F57F17"/>',
    '    </radialGradient>',
    '    <radialGradient id="tpMemClockBody" cx="35%" cy="28%" r="70%">',
    '      <stop offset="0%" stop-color="#FFEE58"/>',
    '      <stop offset="65%" stop-color="#FBC02D"/>',
    '      <stop offset="100%" stop-color="#E65100"/>',
    '    </radialGradient>',
    '  </defs>',
    '  <line x1="20" y1="52" x2="14" y2="60" stroke="#E65100" stroke-width="5" stroke-linecap="round"/>',
    '  <line x1="44" y1="52" x2="50" y2="60" stroke="#E65100" stroke-width="5" stroke-linecap="round"/>',
    '  <rect x="29" y="4" width="6" height="8" rx="2" fill="#F57F17"/>',
    '  <path d="M10 18 A10 10 0 0 1 24 8 L14 22 Z" fill="url(#tpMemClockBell)" stroke="#E65100" stroke-width="2"/>',
    '  <path d="M54 18 A10 10 0 0 0 40 8 L50 22 Z" fill="url(#tpMemClockBell)" stroke="#E65100" stroke-width="2"/>',
    '  <circle cx="32" cy="35" r="22" fill="url(#tpMemClockBody)" stroke="#E65100" stroke-width="2.5"/>',
    '  <circle cx="32" cy="35" r="16.5" fill="#FFFDE7" stroke="#F9A825" stroke-width="2"/>',
    '  <line x1="32" y1="35" x2="32" y2="24" stroke="#5D4037" stroke-width="3.2" stroke-linecap="round"/>',
    '  <line x1="32" y1="35" x2="41" y2="35" stroke="#D84315" stroke-width="3" stroke-linecap="round"/>',
    '  <circle cx="32" cy="35" r="2.8" fill="#5D4037"/>',
    '</svg>'
  ].join('');

  function injectMemoryStyles() {
    if (typeof document === 'undefined' || !document.head) return;
    if (document.getElementById('tp-memory-game-styles')) return;

    var styleEl = document.createElement('style');
    styleEl.id = 'tp-memory-game-styles';
    styleEl.textContent = [
      '.tp-memory-wrap {',
      '  position: relative; width: 100%; height: 100%; min-height: 480px;',
      '  display: flex; flex-direction: column; justify-content: space-between;',
      '  background:',
      '    radial-gradient(circle at 16% 20%, rgba(255,255,255,0.22) 0 1.5px, transparent 2px),',
      '    radial-gradient(circle at 80% 14%, rgba(255,255,255,0.18) 0 2px, transparent 2.5px),',
      '    radial-gradient(circle at 46% 78%, rgba(255,255,255,0.14) 0 1.5px, transparent 2px),',
      '    linear-gradient(180deg, #433352 0%, #6A4F73 55%, #583F62 100%);',
      '  border-radius: 22px; padding: 0 16px 18px 16px; box-sizing: border-box;',
      '  box-shadow: inset 0 2px 14px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(34, 18, 48, 0.35);',
      '  user-select: none; -webkit-user-select: none; overflow: hidden;',
      '  font-family: "Jua", "Pretendard", "Malgun Gothic", sans-serif;',
      '}',
      '.tp-memory-hud {',
      '  display: flex; flex-direction: column; gap: 6px; padding: 8px 0 4px 0; margin-bottom: 4px;',
      '}',
      '.tp-memory-top-row {',
      '  display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 60px;',
      '}',
      '.tp-memory-hud-stat, .tp-memory-hud-clock {',
      '  display: inline-flex; align-items: center; gap: 10px;',
      '}',
      '.tp-memory-hud-avatar {',
      '  width: 52px; height: 52px; border-radius: 50%;',
      '  background: radial-gradient(circle at 35% 30%, #FFFFFF 0%, #FFE4F2 75%, #F8BBD0 100%);',
      '  border: 3px solid #FFFFFF;',
      '  box-shadow: 0 4px 0 #2A1B38, 0 6px 14px rgba(0,0,0,0.4);',
      '  display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;',
      '}',
      '.tp-memory-hud-avatar img { width: 88% !important; height: 88% !important; object-fit: contain; }',
      '.tp-memory-big-num {',
      '  font-size: 40px; font-weight: 900; color: #FFFFFF; line-height: 1; letter-spacing: -0.02em;',
      '  text-shadow: 0 3px 0 #2A1B38, 0 5px 12px rgba(0,0,0,0.45);',
      '  -webkit-text-stroke: 1.5px #2A1B38;',
      '}',
      '.tp-memory-clock-svg { width: 46px; height: 46px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.38)); flex-shrink: 0; }',
      '.tp-memory-hud-right {',
      '  display: flex; align-items: center; gap: 8px; margin-left: auto;',
      '}',
      '.tp-memory-corner-ribbon {',
      '  background: linear-gradient(180deg, #39A9DB 0%, #2B8BB8 100%);',
      '  color: #FFFFFF; font-size: 19px; font-weight: 900;',
      '  padding: 10px 22px 10px 26px; border-radius: 0 0 0 32px;',
      '  margin-top: -10px; margin-right: -16px;',
      '  box-shadow: 0 4px 0 #1E6385, 0 6px 14px rgba(0,0,0,0.32);',
      '  text-shadow: 0 2px 3px rgba(0,0,0,0.28); white-space: nowrap;',
      '}',
      '.tp-memory-subrow {',
      '  display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;',
      '  padding: 5px 12px; border-radius: 999px; background: rgba(34, 21, 46, 0.42);',
      '  border: 1.5px solid rgba(255, 255, 255, 0.16);',
      '}',
      '.tp-memory-info {',
      '  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;',
      '}',
      '.tp-memory-stage-badge {',
      '  background: rgba(255, 167, 38, 0.9); color: #fff; font-weight: 900; font-size: 12px;',
      '  padding: 3px 10px; border-radius: 999px; border: 1.5px solid rgba(255,255,255,0.65);',
      '}',
      '.tp-memory-score-badge {',
      '  background: rgba(236, 72, 153, 0.35); color: #FFF; font-weight: 900; font-size: 12px;',
      '  padding: 3px 10px; border-radius: 999px; border: 1.5px solid rgba(244, 143, 177, 0.65);',
      '}',
      '.tp-memory-pairs-badge {',
      '  background: rgba(56, 189, 248, 0.3); color: #E0F2FE; font-weight: 800; font-size: 12px;',
      '  padding: 3px 10px; border-radius: 999px; border: 1.5px solid rgba(125, 211, 252, 0.55);',
      '}',
      '.tp-memory-hint-btn {',
      '  cursor: pointer; border: 2px solid rgba(255,255,255,0.85); border-radius: 999px;',
      '  background: linear-gradient(135deg, #FFD54F, #FFA000);',
      '  color: #4E342E; font-weight: 900; font-size: 12px; padding: 6px 12px;',
      '  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3); transition: transform 0.15s; white-space: nowrap;',
      '}',
      '.tp-memory-hint-btn:active { transform: scale(0.95); }',
      '.tp-memory-banner {',
      '  font-weight: 800; font-size: 13px; color: #F5E8FF; margin: 0;',
      '}',
      '.tp-memory-grid {',
      '  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;',
      '  flex: 1; align-content: center; max-width: 580px; width: 100%; margin: 4px auto; padding: 4px;',
      '  perspective: 800px;',
      '}',
      '.tp-memory-card {',
      '  position: relative; width: 100%; aspect-ratio: 1 / 1; height: auto; min-height: 88px;',
      '  border-radius: 8px; cursor: pointer; overflow: visible;',
      '  perspective: 800px; padding: 0; background: transparent; border: none;',
      '  box-sizing: border-box; touch-action: manipulation; outline: none;',
      '  transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);',
      '}',
      '.tp-memory-card:hover { transform: translateY(-2px); z-index: 4; }',
      '.tp-memory-card-inner {',
      '  width: 100%; height: 100%; position: relative;',
      '  transform-style: preserve-3d; -webkit-transform-style: preserve-3d;',
      '  transition: transform 0.36s cubic-bezier(0.22, 1.15, 0.36, 1);',
      '  transform: rotateY(0deg);',
      '}',
      '.tp-memory-card.is-face-up .tp-memory-card-inner {',
      '  transform: rotateY(180deg) rotate(-3deg) scale(1.04);',
      '}',
      '.tp-memory-card.is-matched .tp-memory-card-inner {',
      '  transform: rotateY(180deg);',
      '}',
      '.tp-memory-card.is-hinting .tp-memory-card-inner {',
      '  transform: rotateY(180deg) rotate(-4deg) scale(1.06);',
      '}',
      '.tp-memory-card-back,',
      '.tp-memory-card-front {',
      '  position: absolute; inset: 0; width: 100%; height: 100%;',
      '  border-radius: 8px; padding: 6px; box-sizing: border-box;',
      '  background: linear-gradient(145deg, #8B939A 0%, #737B82 55%, #5E666D 100%);',
      '  border: 3px solid #4E555B;',
      '  box-shadow: 0 6px 0 #393E43, 0 10px 18px rgba(0, 0, 0, 0.38), inset 0 2px 1px rgba(255, 255, 255, 0.35);',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  backface-visibility: hidden; -webkit-backface-visibility: hidden;',
      '  overflow: hidden;',
      '}',
      '.tp-memory-card-back {',
      '  transform: rotateY(0deg); z-index: 2;',
      '}',
      '.tp-memory-card-front {',
      '  transform: rotateY(180deg); z-index: 1;',
      '}',
      '.tp-memory-well {',
      '  position: relative; width: 100%; height: 100%; border-radius: 4px;',
      '  background: radial-gradient(circle at 50% 42%, #F4F7F9 0%, #E2E7EB 75%, #D2D9DF 100%);',
      '  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.14);',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  overflow: hidden; padding: 4px; box-sizing: border-box;',
      '}',
      '.tp-memory-well-back {',
      '  background: radial-gradient(circle at 50% 42%, #FFF0F7 0%, #FCE4EC 72%, #F8BBD0 100%);',
      '}',
      '.tp-memory-well-front {',
      '  background: radial-gradient(circle at 50% 42%, #F7FAFC 0%, #E5E9EC 75%, #D5DCE2 100%);',
      '}',
      '.tp-memory-card-back-emblem {',
      '  font-size: 36px; line-height: 1; filter: drop-shadow(0 3px 6px rgba(173, 20, 87, 0.28));',
      '}',
      '.tp-memory-card-back-sub {',
      '  font-size: 9px; font-weight: 800; color: #AD1457;',
      '  margin-top: 4px; letter-spacing: 0.4px;',
      '}',
      '.tp-memory-card.is-face-up .tp-memory-card-front,',
      '.tp-memory-card.is-matched .tp-memory-card-front,',
      '.tp-memory-card.is-hinting .tp-memory-card-front {',
      '  z-index: 3;',
      '}',
      '.tp-memory-card.is-matched .tp-memory-card-front {',
      '  border-color: #38BDF8;',
      '  box-shadow: 0 6px 0 #0284C7, 0 0 18px rgba(56, 189, 248, 0.55);',
      '}',
      '.tp-memory-card.is-matched .tp-memory-well-front {',
      '  background: radial-gradient(circle at 50% 42%, #F0F9FF 0%, #E0F2FE 75%, #BAE6FD 100%);',
      '}',
      '.tp-memory-card.is-hinting .tp-memory-card-front {',
      '  border-color: #FFD600;',
      '  box-shadow: 0 6px 0 #B45309, 0 0 22px rgba(255, 214, 0, 0.9);',
      '}',
      '.tp-memory-card.is-hinting {',
      '  animation: tpCardHintPulse 0.45s ease-in-out infinite alternate;',
      '}',
      '@keyframes tpCardHintPulse {',
      '  0% { transform: scale(1); }',
      '  100% { transform: scale(1.05); }',
      '}',
      '.tp-memory-avatar-box {',
      '  width: 68%; height: 68%; min-width: 44px; min-height: 44px;',
      '  display: flex; align-items: center; justify-content: center; overflow: hidden;',
      '}',
      '.tp-memory-avatar-box img {',
      '  width: 100% !important; height: 100% !important; object-fit: contain;',
      '  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.18));',
      '}',
      '.tp-memory-card-name {',
      '  position: absolute; bottom: 3px; left: 4px; right: 4px;',
      '  font-size: 11px; font-weight: 900; color: #37474F;',
      '  text-align: center; word-break: keep-all; line-height: 1.1;',
      '  text-shadow: 0 1px 0 rgba(255,255,255,0.9);',
      '}',
      '.tp-memory-hero-tag {',
      '  position: absolute; top: 3px; right: 3px;',
      '  font-size: 9px; font-weight: 800; color: #D81B60;',
      '  background: rgba(252, 228, 236, 0.92); padding: 1px 5px; border-radius: 999px; line-height: 1.2;',
      '}',
      '.tp-memory-friend-tag {',
      '  position: absolute; top: 3px; right: 3px;',
      '  font-size: 9px; font-weight: 700; color: #6A1B9A;',
      '  background: rgba(243, 229, 245, 0.92); padding: 1px 5px; border-radius: 999px; line-height: 1.2;',
      '}',
      '@media (max-width: 720px) {',
      '  .tp-memory-grid { gap: 9px; }',
      '  .tp-memory-card { min-height: 72px; }',
      '  .tp-memory-big-num { font-size: 30px; }',
      '  .tp-memory-hud-avatar { width: 42px; height: 42px; }',
      '  .tp-memory-clock-svg { width: 38px; height: 38px; }',
      '  .tp-memory-corner-ribbon { font-size: 15px; padding: 8px 14px 8px 18px; }',
      '}'
    ].join('\n');
    document.head.appendChild(styleEl);
  }

  function safeRenderAvatar(helpers, tp, sizeClass) {
    if (helpers && typeof helpers.renderAvatarHtml === 'function') {
      try {
        var html = helpers.renderAvatarHtml(tp, sizeClass || 'sm');
        if (html) return html;
      } catch (_e) {
        // fallback below
      }
    }
    var name = (tp && tp.name) ? tp.name : '하츄핑';
    var img = (tp && tp.image) ? tp.image : '';
    var emoji = (tp && tp.seasonEmoji) ? tp.seasonEmoji : '💖';
    if (img) {
      return '<img src="' + img + '" alt="' + name + '" style="width:100%;height:100%;object-fit:contain;pointer-events:none;" />';
    }
    return '<span style="font-size:34px;line-height:1;">' + emoji + '</span>';
  }

  function shuffleArray(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  var gameDef = {
    id: GAME_ID,
    title: '숨바꼭질! 내 티니핑 짝꿍 찾기',
    subtitle: '같은 티니핑 친구 카드 두 장을 찾아봐요!',
    icon: '🃏',
    badgeColor: '#FFA726',

    mount: function (stageEl, charCtx, helpers) {
      if (!stageEl) {
        return function () {};
      }

      injectMemoryStyles();

      var ctx = Object.assign({
        name: '하츄핑',
        nameEn: 'Heartsping',
        image: '',
        color: '#FF80AB',
        grade: '로열',
        emotion: '사랑',
        gender: '여',
        mainSeason: 1,
        seasonTheme: '로열 티니핑',
        seasonEmoji: '💖',
        pool: DEFAULT_FRIENDS
      }, charCtx || {});

      var rawPool = Array.isArray(ctx.pool) ? ctx.pool : [];
      var uniqueFriends = [];
      var seenNames = {};
      seenNames[ctx.name] = true;

      for (var pIdx = 0; pIdx < rawPool.length; pIdx++) {
        var item = rawPool[pIdx];
        if (item && item.name && !seenNames[item.name]) {
          seenNames[item.name] = true;
          uniqueFriends.push(item);
        }
      }
      for (var dIdx = 0; dIdx < DEFAULT_FRIENDS.length; dIdx++) {
        var defItem = DEFAULT_FRIENDS[dIdx];
        if (!seenNames[defItem.name]) {
          seenNames[defItem.name] = true;
          uniqueFriends.push(defItem);
        }
      }

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
        stage: 1,
        score: 0,
        highScore: Number(h.getHighScore(GAME_ID)) || 0,
        matchedPairs: 0,
        totalPairs: 4,
        totalMatchedAllStages: 0,
        comboCount: 0,
        maxCombo: 0,
        hintCount: 0,
        isPreviewing: true,
        isGameOver: false,
        bannerMessage: '👀 잘 보고 기억해봐요~! ✨'
      };

      var cards = [];
      var flippedIndices = [];
      var previewTimerId = null;
      var mismatchTimerId = null;
      var hintTimerId = null;
      var stageTransitionTimerId = null;

      stageEl.innerHTML = [
        '<div class="tp-memory-wrap">',
        '  <div class="tp-memory-hud">',
        '    <div class="tp-memory-top-row">',
        '      <div class="tp-memory-hud-stat">',
        '        <div class="tp-memory-hud-avatar">' + safeRenderAvatar(h, ctx, 'sm') + '</div>',
        '        <span class="tp-memory-big-num" data-role="hud-pairs-num">0</span>',
        '      </div>',
        '      <div class="tp-memory-hud-clock">',
        '        ' + ALARM_CLOCK_SVG,
        '        <span class="tp-memory-big-num" data-role="hud-score-num">0</span>',
        '      </div>',
        '      <div class="tp-memory-hud-right">',
        '        <button type="button" class="tp-memory-hint-btn" data-role="hint-btn">🔮 힌트</button>',
        '        <div class="tp-memory-corner-ribbon">카드 뒤집기</div>',
        '      </div>',
        '    </div>',
        '    <div class="tp-memory-subrow">',
        '      <div class="tp-memory-info">',
        '        <span class="tp-memory-stage-badge" data-role="stage-badge">1단계 (4쌍)</span>',
        '        <span class="tp-memory-pairs-badge" data-role="pairs-badge">0 / 4쌍 성공</span>',
        '        <span class="tp-memory-score-badge" data-role="score-badge">0점</span>',
        '      </div>',
        '      <div class="tp-memory-banner" data-role="banner">👀 잘 보고 기억해봐요~! ✨</div>',
        '    </div>',
        '  </div>',
        '  <div class="tp-memory-grid" data-role="grid"></div>',
        '</div>'
      ].join('');

      var stageBadgeEl = stageEl.querySelector ? stageEl.querySelector('[data-role="stage-badge"]') : null;
      var pairsBadgeEl = stageEl.querySelector ? stageEl.querySelector('[data-role="pairs-badge"]') : null;
      var scoreBadgeEl = stageEl.querySelector ? stageEl.querySelector('[data-role="score-badge"]') : null;
      var hudPairsNumEl = stageEl.querySelector ? stageEl.querySelector('[data-role="hud-pairs-num"]') : null;
      var hudScoreNumEl = stageEl.querySelector ? stageEl.querySelector('[data-role="hud-score-num"]') : null;
      var bannerEl = stageEl.querySelector ? stageEl.querySelector('[data-role="banner"]') : null;
      var gridEl = stageEl.querySelector ? stageEl.querySelector('[data-role="grid"]') : null;
      var hintBtnEl = stageEl.querySelector ? stageEl.querySelector('[data-role="hint-btn"]') : null;

      function clearAllTimers() {
        if (previewTimerId) {
          clearTimeout(previewTimerId);
          previewTimerId = null;
        }
        if (mismatchTimerId) {
          clearTimeout(mismatchTimerId);
          mismatchTimerId = null;
        }
        if (hintTimerId) {
          clearTimeout(hintTimerId);
          hintTimerId = null;
        }
        if (stageTransitionTimerId) {
          clearTimeout(stageTransitionTimerId);
          stageTransitionTimerId = null;
        }
      }

      function buildStageDeck(stageNum) {
        var pairCount = stageNum === 1 ? 4 : 6;
        var friendCount = pairCount - 1;
        var pickedFriends = shuffleArray(uniqueFriends).slice(0, friendCount);

        // 첫 번째 쌍은 반드시 내가 고른 주인공 티니핑(charCtx)
        var chosenChars = [
          Object.assign({}, ctx, { isHero: true, charKey: 'hero:' + ctx.name })
        ];
        for (var i = 0; i < pickedFriends.length; i++) {
          var f = pickedFriends[i];
          chosenChars.push(Object.assign({}, f, { isHero: false, charKey: 'friend:' + f.name }));
        }

        var rawDeck = [];
        for (var c = 0; c < chosenChars.length; c++) {
          var ch = chosenChars[c];
          rawDeck.push({
            charKey: ch.charKey,
            name: ch.name,
            image: ch.image || '',
            seasonEmoji: ch.seasonEmoji || '💖',
            color: ch.color || '#FF80AB',
            isHero: Boolean(ch.isHero),
            charObj: ch
          });
          rawDeck.push({
            charKey: ch.charKey,
            name: ch.name,
            image: ch.image || '',
            seasonEmoji: ch.seasonEmoji || '💖',
            color: ch.color || '#FF80AB',
            isHero: Boolean(ch.isHero),
            charObj: ch
          });
        }

        var shuffled = shuffleArray(rawDeck);
        return shuffled.map(function (item, idx) {
          return {
            index: idx,
            charKey: item.charKey,
            name: item.name,
            image: item.image,
            seasonEmoji: item.seasonEmoji,
            color: item.color,
            isHero: item.isHero,
            charObj: item.charObj,
            isFlipped: true, // 시작 전 2.5초 앞면 미리보기
            isMatched: false,
            isHinting: false,
            el: null
          };
        });
      }

      function updateHud() {
        if (stageBadgeEl) {
          stageBadgeEl.textContent = state.stage + '단계 (' + state.totalPairs + '쌍)';
        }
        if (pairsBadgeEl) {
          pairsBadgeEl.textContent = state.matchedPairs + ' / ' + state.totalPairs + '쌍 성공';
        }
        if (scoreBadgeEl) {
          scoreBadgeEl.textContent = state.score + '점';
        }
        if (hudPairsNumEl) {
          hudPairsNumEl.textContent = String(state.matchedPairs);
        }
        if (hudScoreNumEl) {
          hudScoreNumEl.textContent = String(state.score);
        }
        if (bannerEl) {
          bannerEl.textContent = state.bannerMessage;
        }
      }

      function syncSingleCardDom(card) {
        if (!card || !card.el) return;
        var showFace = state.isPreviewing || card.isFlipped || card.isMatched || card.isHinting;
        var classes = ['tp-memory-card'];
        if (showFace) classes.push('is-face-up');
        if (card.isMatched) classes.push('is-matched');
        if (card.isHinting) classes.push('is-hinting');
        card.el.className = classes.join(' ');
        card.el.setAttribute('data-face-up', showFace ? 'true' : 'false');
        card.el.setAttribute('aria-pressed', showFace ? 'true' : 'false');
      }

      function buildStageGridDom() {
        if (!gridEl) return;
        gridEl.innerHTML = '';
        for (var i = 0; i < cards.length; i++) {
          (function (card) {
            if (typeof document === 'undefined' || !document.createElement) return;
            var cardBtn = document.createElement('button');
            cardBtn.type = 'button';
            cardBtn.setAttribute('data-card-index', String(card.index));
            cardBtn.setAttribute('data-char-name', card.name);

            var roleTag = card.isHero
              ? '<span class="tp-memory-hero-tag">👑 내 짝꿍</span>'
              : '<span class="tp-memory-friend-tag">✨ 친구핑</span>';

            cardBtn.innerHTML = [
              '<div class="tp-memory-card-inner">',
              '  <div class="tp-memory-card-back">',
              '    <div class="tp-memory-well tp-memory-well-back">',
              '      <span class="tp-memory-card-back-emblem">💖</span>',
              '      <span class="tp-memory-card-back-sub">✨ ROYAL PACT ✨</span>',
              '    </div>',
              '  </div>',
              '  <div class="tp-memory-card-front">',
              '    <div class="tp-memory-well tp-memory-well-front">',
              '      ' + roleTag,
              '      <div class="tp-memory-avatar-box">' + safeRenderAvatar(h, card.charObj, 'sm') + '</div>',
              '      <span class="tp-memory-card-name">' + card.name + '</span>',
              '    </div>',
              '  </div>',
              '</div>'
            ].join('');

            var lastPointerDownTime = 0;
            if (cardBtn.addEventListener) {
              cardBtn.addEventListener('pointerdown', function (ev) {
                if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
                lastPointerDownTime = Date.now();
                flipCard(card.index);
              });
              cardBtn.addEventListener('click', function () {
                if (Date.now() - lastPointerDownTime < 420) return;
                flipCard(card.index);
              });
            }

            card.el = cardBtn;
            syncSingleCardDom(card);
            if (gridEl.appendChild) {
              gridEl.appendChild(cardBtn);
            }
          })(cards[i]);
        }
      }

      function renderCards() {
        updateHud();
        if (!gridEl) return;

        for (var i = 0; i < cards.length; i++) {
          if (!cards[i].el) {
            buildStageGridDom();
            return;
          }
          syncSingleCardDom(cards[i]);
        }
      }

      function skipPreview() {
        if (previewTimerId) {
          clearTimeout(previewTimerId);
          previewTimerId = null;
        }
        if (!state.isPreviewing) return;

        state.isPreviewing = false;
        for (var i = 0; i < cards.length; i++) {
          if (!cards[i].isMatched) {
            cards[i].isFlipped = false;
          }
        }
        flippedIndices = [];
        state.bannerMessage = '카드를 두 장씩 뒤집어 같은 티니핑 짝꿍을 찾아봐요! 🃏';
        renderCards();
      }

      function startStage(stageNum) {
        clearAllTimers();
        state.stage = stageNum;
        state.totalPairs = stageNum === 1 ? 4 : 6;
        state.matchedPairs = 0;
        state.isPreviewing = true;
        state.bannerMessage = '👀 ' + stageNum + '단계 시작! 잘 보고 기억해봐요~! ✨';
        flippedIndices = [];
        cards = buildStageDeck(stageNum);
        buildStageGridDom();
        renderCards();

        previewTimerId = setTimeout(function () {
          previewTimerId = null;
          skipPreview();
        }, PREVIEW_DURATION_MS);
      }

      function resolvePendingMismatchImmediately() {
        if (!mismatchTimerId) return;
        clearTimeout(mismatchTimerId);
        mismatchTimerId = null;
        for (var i = 0; i < flippedIndices.length; i++) {
          var idx = flippedIndices[i];
          if (cards[idx] && !cards[idx].isMatched) {
            cards[idx].isFlipped = false;
          }
        }
        flippedIndices = [];
      }

      function flipCard(index) {
        if (state.isGameOver) return false;

        // 미리보기 중 호출되면 즉시 미리보기를 건너뛰고 뒤집기 진행
        if (state.isPreviewing) {
          skipPreview();
        }

        // 불일치 카드가 0.8초 대기 중일 때 새 카드를 누르면 즉시 이전 두 카드를 닫고 진행
        if (mismatchTimerId) {
          resolvePendingMismatchImmediately();
        }

        var idx = Number(index);
        if (isNaN(idx) || idx < 0 || idx >= cards.length) return false;

        var card = cards[idx];
        if (!card || card.isMatched || card.isFlipped) return false;
        if (flippedIndices.length >= 2) return false;

        card.isFlipped = true;
        card.isHinting = false;
        flippedIndices.push(idx);

        if (flippedIndices.length === 1) {
          h.playSfx('flip');
          renderCards();
          return true;
        }

        // 두 번째 카드를 뒤집은 경우 매칭 판정
        var firstIdx = flippedIndices[0];
        var secondIdx = flippedIndices[1];
        var cardA = cards[firstIdx];
        var cardB = cards[secondIdx];

        if (cardA.charKey === cardB.charKey) {
          cardA.isMatched = true;
          cardB.isMatched = true;
          flippedIndices = [];

          state.matchedPairs += 1;
          state.totalMatchedAllStages += 1;
          state.comboCount += 1;
          if (state.comboCount > state.maxCombo) {
            state.maxCombo = state.comboCount;
          }

          h.playSfx('note', state.matchedPairs - 1);

          var gained = 50;
          if (state.comboCount >= 2) {
            gained += 20;
          }

          if (cardA.isHero) {
            gained += 100;
            state.score += gained;
            h.createHeartExplosion(50, 50);
            state.bannerMessage = '💖 내 짝꿍을 찾았어! 보너스 +100점!! (총 +' + gained + '점)';
          } else {
            state.score += gained;
            state.bannerMessage = '✨ 짝꿍 성공! ' + cardA.name + ' 친구를 찾았어요! (+' + gained + '점)';
          }

          renderCards();

          // 스테이지 클리어 확인
          if (state.matchedPairs >= state.totalPairs) {
            if (state.stage === 1) {
              state.bannerMessage = '🎉 1단계 클리어! 더 신나는 2단계(6쌍)로 출발해요! ✨';
              updateHud();
              stageTransitionTimerId = setTimeout(function () {
                stageTransitionTimerId = null;
                startStage(2);
              }, 1100);
            } else {
              finishGame('all_stages_cleared');
            }
          }
          return true;
        }

        // 짝이 다른 경우: 감점 전혀 없음! 0.8초 동안 얼굴을 충분히 보여준 뒤 다시 뒤집힘
        state.comboCount = 0;
        state.bannerMessage = '괜찮아요~ 얼굴을 기억해뒀다가 다시 찾아봐요! 💖';
        renderCards();

        mismatchTimerId = setTimeout(function () {
          mismatchTimerId = null;
          cardA.isFlipped = false;
          cardB.isFlipped = false;
          flippedIndices = [];
          renderCards();
        }, MISMATCH_HOLD_MS);

        return true;
      }

      function useHint() {
        if (state.isGameOver) return null;
        if (state.isPreviewing) {
          skipPreview();
        }

        // 아직 맞추지 못한 짝꿍 한 쌍 탐색 (내 주인공 티니핑 우선)
        var unmatchedByKey = {};
        var targetKey = null;

        for (var i = 0; i < cards.length; i++) {
          var c = cards[i];
          if (!c.isMatched) {
            if (!unmatchedByKey[c.charKey]) {
              unmatchedByKey[c.charKey] = [];
            }
            unmatchedByKey[c.charKey].push(c.index);
            if (c.isHero && unmatchedByKey[c.charKey].length === 2) {
              targetKey = c.charKey;
            }
          }
        }

        if (!targetKey) {
          var keys = Object.keys(unmatchedByKey);
          for (var k = 0; k < keys.length; k++) {
            if (unmatchedByKey[keys[k]].length >= 2) {
              targetKey = keys[k];
              break;
            }
          }
        }

        if (!targetKey) return null;

        var pairIndices = unmatchedByKey[targetKey].slice(0, 2);
        state.hintCount += 1;
        for (var p = 0; p < pairIndices.length; p++) {
          cards[pairIndices[p]].isHinting = true;
        }

        var hintedName = cards[pairIndices[0]].name;
        state.bannerMessage = '🔮 하츄핑의 마법 힌트! 황금빛으로 반짝이는 [' + hintedName + '] 짝꿍을 봐요! ✨';
        h.playSfx('note', 0);
        renderCards();

        if (hintTimerId) {
          clearTimeout(hintTimerId);
        }
        hintTimerId = setTimeout(function () {
          hintTimerId = null;
          for (var idx = 0; idx < cards.length; idx++) {
            cards[idx].isHinting = false;
          }
          renderCards();
        }, HINT_DURATION_MS);

        return pairIndices;
      }

      function finishGame(reason) {
        if (state.isGameOver) return;
        state.isGameOver = true;
        clearAllTimers();

        if (state.score > state.highScore) {
          state.highScore = state.score;
        }
        h.saveHighScore(GAME_ID, state.score);
        h.rewardCharacter();

        h.showResultOverlay(stageEl, {
          gameId: GAME_ID,
          title: '숨바꼭질 짝꿍 찾기 대성공! 🃏💖',
          score: state.score,
          highScore: state.highScore,
          summary: '1·2단계 티니핑 짝꿍을 모두 찾았어요! (최대 ' + state.maxCombo + '연속 성공)',
          reason: reason || 'cleared',
          charCtx: ctx,
          onRestart: function () {
            cleanup();
            gameDef.mount(stageEl, charCtx, helpers);
          }
        });
      }

      if (hintBtnEl && hintBtnEl.addEventListener) {
        hintBtnEl.addEventListener('click', function () {
          useHint();
        });
      }

      // 1스테이지 시작
      startStage(1);

      var api = {
        skipPreview: skipPreview,
        flipCard: flipCard,
        useHint: useHint,
        nextStage: function () {
          startStage(2);
        },
        finishGame: finishGame,
        getState: function () {
          return {
            stage: state.stage,
            score: state.score,
            highScore: state.highScore,
            matchedPairs: state.matchedPairs,
            totalPairs: state.totalPairs,
            totalMatchedAllStages: state.totalMatchedAllStages,
            combo: state.comboCount,
            comboCount: state.comboCount,
            maxCombo: state.maxCombo,
            hintCount: state.hintCount,
            isPreviewing: state.isPreviewing,
            isGameOver: state.isGameOver,
            bannerMessage: state.bannerMessage,
            flippedIndices: flippedIndices.slice(),
            cards: cards.map(function (c) {
              return {
                index: c.index,
                charKey: c.charKey,
                name: c.name,
                isHero: c.isHero,
                isFlipped: c.isFlipped,
                isMatched: c.isMatched,
                isHinting: c.isHinting
              };
            })
          };
        }
      };

      stageEl._memoryGame = api;

      function cleanup() {
        state.isGameOver = true;
        clearAllTimers();
        cards = [];
        flippedIndices = [];
        if (stageEl._memoryGame === api) {
          delete stageEl._memoryGame;
        }
      }

      return cleanup;
    }
  };

  global.TpGameMemory = gameDef;
  if (global.TpMiniGames && typeof global.TpMiniGames.register === 'function') {
    global.TpMiniGames.register(gameDef.id, gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
