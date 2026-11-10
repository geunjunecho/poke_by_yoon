/**
 * 티니핑 미니게임 T3: 반짝반짝 비눗방울 톡톡! (tp-bubble.js)
 * 6~7세 아이들을 위한 실로폰 계이름 연주 + 마법 비눗방울 터치 구출 놀이
 */
(function (global) {
  'use strict';

  var GAME_ID = 'bubble';
  var TARGET_RESCUE_PER_WAVE = 15;
  var MAX_HEARTS = 3;
  var SOLFEGE_NAMES = ['도', '레', '미', '파', '솔', '라', '시', '높은 도'];

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

  var XYLOPHONE_NOTES = [
    { idx: 0, label: '도', color: '#FF5252', glow: 'rgba(255, 82, 82, 0.75)' },
    { idx: 1, label: '레', color: '#FF9800', glow: 'rgba(255, 152, 0, 0.75)' },
    { idx: 2, label: '미', color: '#FDD835', glow: 'rgba(253, 216, 53, 0.8)' },
    { idx: 3, label: '파', color: '#66BB6A', glow: 'rgba(102, 187, 106, 0.75)' },
    { idx: 4, label: '솔', color: '#29B6F6', glow: 'rgba(41, 182, 246, 0.75)' },
    { idx: 5, label: '라', color: '#5C6BC0', glow: 'rgba(92, 107, 192, 0.75)' },
    { idx: 6, label: '시', color: '#AB47BC', glow: 'rgba(171, 71, 188, 0.75)' },
    { idx: 7, label: '도', color: '#EC407A', glow: 'rgba(236, 64, 122, 0.8)' }
  ];

  function injectBubbleStyles() {
    if (typeof document === 'undefined' || !document.head) return;
    var existing = document.getElementById('tp-bubble-game-styles');
    var styleEl = existing || document.createElement('style');
    styleEl.id = 'tp-bubble-game-styles';
    styleEl.textContent = [
      '.tp-bubble-wrap {',
      '  position: relative; width: 100%; height: 100%; min-height: 0;',
      '  display: flex; flex-direction: column; overflow: hidden;',
      '  background: radial-gradient(circle at 50% 25%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #B2EBF2 0%, #E1BEE7 54%, #FFF9C4 100%);',
      '  border-radius: 20px; user-select: none; -webkit-user-select: none;',
      '  font-family: "Pretendard", "Malgun Gothic", sans-serif;',
      '  box-shadow: inset 0 0 24px rgba(255, 255, 255, 0.75);',
      '}',
      '.tp-bubble-hud {',
      '  position: relative; z-index: 10; display: flex; flex-wrap: wrap; flex-shrink: 0;',
      '  align-items: center; justify-content: space-between; gap: 6px;',
      '  padding: clamp(6px, 1.1vh, 10px) clamp(10px, 2vw, 14px); background: rgba(255, 255, 255, 0.92);',
      '  backdrop-filter: blur(8px); border-bottom: 2px solid rgba(38, 198, 218, 0.32);',
      '}',
      '.tp-bubble-cheer {',
      '  display: flex; align-items: center; gap: 6px; font-weight: 800;',
      '  color: #00838F; font-size: clamp(12px, 1.6vh, 14px);',
      '}',
      '@media (max-width: 540px) { .tp-bubble-cheer { width: 100%; justify-content: center; } }',
      '.tp-bubble-wand {',
      '  display: inline-block; font-size: 18px;',
      '  animation: tpWandWave 1.2s ease-in-out infinite alternate;',
      '}',
      '@keyframes tpWandWave {',
      '  0% { transform: rotate(-12deg) scale(1); }',
      '  100% { transform: rotate(18deg) scale(1.15); }',
      '}',
      '.tp-bubble-stats {',
      '  display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: center;',
      '}',
      '.tp-bubble-hearts {',
      '  font-size: clamp(14px, 1.9vh, 18px); letter-spacing: 2px; background: #FFF0F5;',
      '  padding: 3px 8px; border-radius: 999px; border: 1.5px solid #F8BBD0;',
      '}',
      '.tp-bubble-gauge {',
      '  font-size: clamp(11px, 1.5vh, 13px); font-weight: 800; color: #006064;',
      '  background: #E0F7FA; padding: 4px 10px; border-radius: 999px;',
      '  border: 1.5px solid #80DEEA;',
      '}',
      '.tp-bubble-score-pill {',
      '  font-size: clamp(12px, 1.6vh, 14px); font-weight: 900; color: #AD1457;',
      '  background: #FCE4EC; padding: 4px 10px; border-radius: 999px;',
      '  border: 1.5px solid #F48FB1;',
      '}',
      '.tp-bubble-finish-btn {',
      '  cursor: pointer; border: none; border-radius: 999px;',
      '  background: linear-gradient(135deg, #FF80AB, #FF4081);',
      '  color: #fff; font-weight: 800; font-size: 12px; padding: 5px 11px;',
      '  box-shadow: 0 3px 8px rgba(255, 64, 129, 0.35); transition: transform 0.15s; touch-action: manipulation;',
      '}',
      '.tp-bubble-finish-btn:active { transform: scale(0.95); }',
      '.tp-bubble-xylophone {',
      '  position: relative; z-index: 9; display: flex; align-items: center; justify-content: center; gap: 4px; flex-wrap: wrap; flex-shrink: 0;',
      '  padding: clamp(4px, 0.8vh, 6px) 10px; background: rgba(255, 255, 255, 0.78);',
      '  border-bottom: 2px dashed rgba(171, 71, 188, 0.25);',
      '}',
      '.tp-xylophone-title {',
      '  font-size: 12px; font-weight: 900; color: #6A1B9A; margin-right: 4px;',
      '}',
      '.tp-xylophone-key {',
      '  --key-color: #29B6F6; --key-glow: rgba(41, 182, 246, 0.65);',
      '  min-width: 26px; height: 22px; padding: 0 5px; border-radius: 8px;',
      '  display: inline-flex; align-items: center; justify-content: center;',
      '  font-size: 11px; font-weight: 900; color: #455A64;',
      '  background: rgba(255, 255, 255, 0.88); border: 2px solid var(--key-color);',
      '  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.12);',
      '  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.18s, color 0.18s, box-shadow 0.18s;',
      '}',
      '.tp-xylophone-key.is-lit {',
      '  background: var(--key-color); color: #FFFFFF;',
      '  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);',
      '}',
      '.tp-xylophone-key.is-active {',
      '  background: var(--key-color); color: #FFFFFF;',
      '  transform: translateY(-3px) scale(1.16);',
      '  box-shadow: 0 4px 12px var(--key-glow), 0 0 0 2px #FFFFFF;',
      '  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);',
      '}',
      '.tp-bubble-playfield {',
      '  position: relative; flex: 1; width: 100%; min-height: 150px; overflow: hidden;',
      '}',
      '.tp-magic-bubble {',
      '  position: absolute; border-radius: 50%; cursor: pointer; padding: 4px; overflow: hidden;',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  box-sizing: border-box; text-align: center; touch-action: manipulation; outline: none;',
      '  animation: tpBubbleWobble 2.2s ease-in-out infinite alternate;',
      '  transition: transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.14s ease;',
      '  box-shadow: inset -8px -8px 18px rgba(255,255,255,0.88), inset 8px 8px 18px rgba(38,198,218,0.42), inset 0 0 12px rgba(236,64,122,0.28), 0 8px 18px rgba(0,0,0,0.12);',
      '}',
      '@keyframes tpBubbleWobble {',
      '  0% { transform: translateX(-2px) scale(0.99, 1.01); }',
      '  100% { transform: translateX(2px) scale(1.01, 0.99); }',
      '}',
      '.tp-magic-bubble:hover { transform: scale(1.06); }',
      '.tp-magic-bubble:active { transform: scale(0.92); }',
      '.tp-bubble-icon-box {',
      '  width: 40px; height: 40px; min-width: 40px; min-height: 40px;',
      '  display: flex; align-items: center; justify-content: center; overflow: hidden; pointer-events: none; z-index: 2;',
      '}',
      '.tp-magic-bubble::before {',
      '  content: ""; position: absolute; bottom: 11%; right: 15%; width: 16%; height: 9%;',
      '  border-radius: 50%; background: rgba(255, 255, 255, 0.62);',
      '  transform: rotate(-28deg); pointer-events: none; z-index: 3;',
      '}',
      '.tp-magic-bubble::after {',
      '  content: ""; position: absolute; top: 11%; left: 16%; width: 26%; height: 15%;',
      '  border-radius: 50%; background: rgba(255, 255, 255, 0.92);',
      '  transform: rotate(-28deg); pointer-events: none; z-index: 3;',
      '}',
      '.tp-magic-bubble--hero {',
      '  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.96), rgba(255,182,193,0.72) 52%, rgba(128,216,255,0.48) 78%, rgba(255,215,0,0.72) 100%);',
      '  border: 3px solid #FFD54F;',
      '  box-shadow: 0 0 20px rgba(255, 213, 79, 0.8), inset 0 0 16px rgba(255,255,255,0.92);',
      '}',
      '.tp-magic-bubble--friend {',
      '  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(128,222,234,0.56) 52%, rgba(244,143,177,0.48) 78%, rgba(206,147,216,0.65) 100%);',
      '  border: 2.5px solid rgba(255, 255, 255, 0.94);',
      '}',
      '.tp-magic-bubble--bonus {',
      '  background: radial-gradient(circle at 30% 30%, #FFF9C4, #FF80AB 55%, #80D8FF 100%);',
      '  border: 3px solid #FFF176;',
      '  box-shadow: 0 0 22px rgba(255, 128, 171, 0.78), inset 0 0 14px rgba(255,255,255,0.9);',
      '}',
      '.tp-magic-bubble--villain {',
      '  background: radial-gradient(circle at 35% 35%, #7E57C2, #311B92 70%, #1A0933 100%);',
      '  border: 2.5px dashed #B388FF; color: #fff;',
      '  box-shadow: 0 0 14px rgba(49, 27, 146, 0.65);',
      '}',
      '.tp-bubble-label {',
      '  font-size: 11px; font-weight: 800; color: #37474F; z-index: 2;',
      '  background: rgba(255,255,255,0.86); padding: 1px 6px; border-radius: 999px;',
      '  margin-top: 2px; max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;',
      '}',
      '.tp-magic-bubble--villain .tp-bubble-label {',
      '  background: rgba(0,0,0,0.55); color: #EDE7F6;',
      '}',
      '.tp-bubble-pop-ring {',
      '  position: absolute; width: 84px; height: 84px; border-radius: 50%; pointer-events: none; z-index: 22;',
      '  border: 4px solid #80DEEA;',
      '  box-shadow: 0 0 16px rgba(255, 128, 171, 0.85), inset 0 0 12px rgba(255, 255, 255, 0.95);',
      '  animation: tpBubbleRingBurst 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;',
      '}',
      '@keyframes tpBubbleRingBurst {',
      '  0% { opacity: 0.95; transform: translate(-50%, -50%) scale(0.45); }',
      '  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.65); }',
      '}',
      '.tp-bubble-float-text {',
      '  position: absolute; pointer-events: none; z-index: 25;',
      '  font-weight: 900; font-size: 15px; color: #D81B60;',
      '  text-shadow: 0 2px 6px rgba(255,255,255,0.95);',
      '  animation: tpFloatUp 0.85s ease-out forwards;',
      '}',
      '@keyframes tpFloatUp {',
      '  0% { opacity: 1; transform: translate(-50%, 0) scale(0.85); }',
      '  100% { opacity: 0; transform: translate(-50%, -42px) scale(1.1); }',
      '}'
    ].join('\n');
    if (!existing) {
      document.head.appendChild(styleEl);
    }
  }

  function normalizeBubbleType(type) {
    if (!type) return null;
    var t = String(type).toLowerCase().trim();
    if (t === 'hero' || t === 'main' || t === 'protagonist' || t === 'char' || t === 'my') return 'hero';
    if (t === 'friend' || t === 'buddy' || t === 'pool') return 'friend';
    if (t === 'bonus' || t === 'heart' || t === 'rainbow' || t === 'heal') return 'bonus';
    if (t === 'villain' || t === 'bad' || t === 'cloud' || t === 'storm' || t === 'enemy' || t === 'dark') return 'villain';
    return 'friend';
  }

  function pickRandomType() {
    var r = Math.random();
    if (r < 0.32) return 'hero';
    if (r < 0.72) return 'friend';
    if (r < 0.84) return 'bonus';
    return 'villain';
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
      return '<img src="' + img + '" alt="' + name + '" style="width:38px;height:38px;object-fit:contain;pointer-events:none;" />';
    }
    return '<span style="font-size:26px;line-height:1;">' + emoji + '</span>';
  }

  var gameDef = {
    id: GAME_ID,
    title: '반짝반짝 비눗방울 톡톡!',
    subtitle: '비눗방울 속에 숨은 티니핑 친구들을 구해줘요!',
    icon: '🫧',
    badgeColor: '#26C6DA',

    mount: function (stageEl, charCtx, helpers) {
      if (!stageEl) {
        return function () {};
      }

      injectBubbleStyles();

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

      var friendPool = Array.isArray(ctx.pool) && ctx.pool.length > 0
        ? ctx.pool.filter(function (p) { return p && p.name !== ctx.name; })
        : DEFAULT_FRIENDS;
      if (friendPool.length === 0) {
        friendPool = DEFAULT_FRIENDS;
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
        score: 0,
        highScore: Number(h.getHighScore(GAME_ID)) || 0,
        lives: MAX_HEARTS,
        comboCount: 0,
        maxCombo: 0,
        rescuedInWave: 0,
        totalRescued: 0,
        targetRescue: TARGET_RESCUE_PER_WAVE,
        wave: 1,
        isGameOver: false,
        lastMessage: ctx.name + '와(과) 함께 비눗방울을 톡톡 터뜨려요! 🪄'
      };

      var bubbles = [];
      var nextBubbleSeq = 1;
      var spawnTimerId = null;
      var animFrameId = null;
      var tickTimerId = null;
      var floatingTimers = [];

      var xylophoneKeysHtml = XYLOPHONE_NOTES.map(function (n) {
        return (
          '<span class="tp-xylophone-key" data-role="xylophone-key" data-note-idx="' + n.idx + '" ' +
            'style="--key-color: ' + n.color + '; --key-glow: ' + n.glow + ';">' + n.label + '</span>'
        );
      }).join('');

      stageEl.innerHTML = [
        '<div class="tp-bubble-wrap">',
        '  <div class="tp-bubble-hud">',
        '    <div class="tp-bubble-cheer">',
        '      <span class="tp-bubble-cheer-avatar">' + safeRenderAvatar(h, ctx, 'sm') + '</span>',
        '      <span class="tp-bubble-wand">🪄</span>',
        '      <span class="tp-bubble-cheer-text">' + ctx.name + ' 응원 중!</span>',
        '    </div>',
        '    <div class="tp-bubble-stats">',
        '      <span class="tp-bubble-hearts" data-role="hearts" aria-label="남은 하트">💖💖💖</span>',
        '      <span class="tp-bubble-gauge" data-role="gauge">0 / ' + TARGET_RESCUE_PER_WAVE + '마리 구출!</span>',
        '      <span class="tp-bubble-score-pill" data-role="score">0점</span>',
        '      <button type="button" class="tp-bubble-finish-btn" data-role="finish-btn">🏁 여기까지 하고 선물 받기!</button>',
        '    </div>',
        '  </div>',
        '  <div class="tp-bubble-xylophone" data-role="xylophone-bar" aria-label="무지개 실로폰 계이름 바">',
        '    <span class="tp-xylophone-title">🎹 실로폰</span>',
             xylophoneKeysHtml,
        '  </div>',
        '  <div class="tp-bubble-playfield" data-role="playfield"></div>',
        '</div>'
      ].join('');

      var playfieldEl = stageEl.querySelector ? stageEl.querySelector('[data-role="playfield"]') : null;
      var heartsEl = stageEl.querySelector ? stageEl.querySelector('[data-role="hearts"]') : null;
      var gaugeEl = stageEl.querySelector ? stageEl.querySelector('[data-role="gauge"]') : null;
      var scoreEl = stageEl.querySelector ? stageEl.querySelector('[data-role="score"]') : null;
      var cheerTextEl = stageEl.querySelector ? stageEl.querySelector('[data-role="cheer-text"], .tp-bubble-cheer-text') : null;
      var finishBtnEl = stageEl.querySelector ? stageEl.querySelector('[data-role="finish-btn"]') : null;
      var xylophoneKeyEls = stageEl.querySelectorAll ? stageEl.querySelectorAll('[data-role="xylophone-key"]') : [];

      function updateHud() {
        if (heartsEl) {
          var fullHearts = Math.max(0, Math.min(MAX_HEARTS, state.lives));
          var emptyHearts = Math.max(0, MAX_HEARTS - fullHearts);
          heartsEl.textContent = '💖'.repeat(fullHearts) + '🤍'.repeat(emptyHearts);
        }
        if (gaugeEl) {
          gaugeEl.textContent = state.rescuedInWave + ' / ' + state.targetRescue + '마리 구출! (Stage ' + state.wave + ')';
        }
        if (scoreEl) {
          scoreEl.textContent = state.score + '점';
        }
        if (cheerTextEl) {
          cheerTextEl.textContent = state.lastMessage;
        }
        if (xylophoneKeyEls && xylophoneKeyEls.length) {
          var activeNoteIdx = state.comboCount > 0 ? ((state.comboCount - 1) % XYLOPHONE_NOTES.length) : -1;
          for (var i = 0; i < xylophoneKeyEls.length; i++) {
            var keyEl = xylophoneKeyEls[i];
            var cls = 'tp-xylophone-key';
            if (activeNoteIdx >= 0) {
              if (i === activeNoteIdx) {
                cls += ' is-active is-lit';
              } else if (i < activeNoteIdx) {
                cls += ' is-lit';
              }
            }
            keyEl.className = cls;
          }
        }
      }

      function spawnPopRingBurst(x, y, ringColor) {
        if (!playfieldEl || typeof document === 'undefined' || !document.createElement) return;
        var ringEl = document.createElement('div');
        ringEl.className = 'tp-bubble-pop-ring';
        ringEl.style.left = (x || 50) + '%';
        ringEl.style.top = (y || 50) + '%';
        if (ringColor) {
          ringEl.style.borderColor = ringColor;
        }
        if (playfieldEl.appendChild) {
          playfieldEl.appendChild(ringEl);
        }
        var rtid = setTimeout(function () {
          if (ringEl && ringEl.parentNode) {
            ringEl.parentNode.removeChild(ringEl);
          }
        }, 440);
        floatingTimers.push(rtid);
      }

      function showFloatingFeedback(x, y, text, color) {
        state.lastMessage = text;
        updateHud();
        if (!playfieldEl || typeof document === 'undefined' || !document.createElement) return;

        var floatEl = document.createElement('div');
        floatEl.className = 'tp-bubble-float-text';
        floatEl.textContent = text;
        floatEl.style.left = (x || 50) + '%';
        floatEl.style.top = (y || 50) + '%';
        if (color) floatEl.style.color = color;

        if (playfieldEl.appendChild) {
          playfieldEl.appendChild(floatEl);
        }
        var tid = setTimeout(function () {
          if (floatEl && floatEl.parentNode) {
            floatEl.parentNode.removeChild(floatEl);
          }
        }, 850);
        floatingTimers.push(tid);
      }

      function removeBubbleDom(bubbleObj) {
        if (bubbleObj && bubbleObj.el && bubbleObj.el.parentNode) {
          bubbleObj.el.parentNode.removeChild(bubbleObj.el);
        }
      }

      function spawnBubble(forcedType) {
        if (state.isGameOver) return null;

        var bType = normalizeBubbleType(forcedType) || pickRandomType();
        var id = 'bubble-' + (nextBubbleSeq++);
        var sizePx = 76 + Math.floor(Math.random() * 21); // 76px ~ 96px (6~7세 터치 친화 크기)
        var xPct = 10 + Math.floor(Math.random() * 76);   // 10% ~ 85%
        var yPct = 92;
        var speedPerTick = (0.55 + Math.random() * 0.35) * (1 + (state.wave - 1) * 0.15);
        var wobblePhase = Math.random() * Math.PI * 2;

        var charData = null;
        var innerHtml = '';
        var labelText = '';

        if (bType === 'hero') {
          charData = ctx;
          labelText = '👑 ' + ctx.name;
          innerHtml = '<div class="tp-bubble-icon-box">' + safeRenderAvatar(h, ctx, 'sm') + '</div><span class="tp-bubble-label">' + labelText + '</span>';
        } else if (bType === 'friend') {
          charData = friendPool[Math.floor(Math.random() * friendPool.length)] || DEFAULT_FRIENDS[0];
          labelText = charData.name || '친구핑';
          innerHtml = '<div class="tp-bubble-icon-box">' + safeRenderAvatar(h, charData, 'sm') + '</div><span class="tp-bubble-label">' + labelText + '</span>';
        } else if (bType === 'bonus') {
          labelText = '보너스 하트';
          innerHtml = '<div class="tp-bubble-icon-box"><span style="font-size:28px;line-height:1;">🌈💖</span></div><span class="tp-bubble-label">' + labelText + '</span>';
        } else {
          labelText = '심술 먹구름';
          innerHtml = '<div class="tp-bubble-icon-box"><span style="font-size:26px;line-height:1;">⛈️😈</span></div><span class="tp-bubble-label">' + labelText + '</span>';
        }

        var bubbleEl = null;
        if (typeof document !== 'undefined' && document.createElement) {
          bubbleEl = document.createElement('button');
          bubbleEl.type = 'button';
          bubbleEl.className = 'tp-magic-bubble tp-magic-bubble--' + bType;
          bubbleEl.setAttribute('data-bubble-id', id);
          bubbleEl.setAttribute('data-bubble-type', bType);
          bubbleEl.style.width = sizePx + 'px';
          bubbleEl.style.height = sizePx + 'px';
          bubbleEl.style.left = xPct + '%';
          bubbleEl.style.top = yPct + '%';
          bubbleEl.innerHTML = innerHtml;

          var onPopHandler = function (ev) {
            if (ev && typeof ev.stopPropagation === 'function') ev.stopPropagation();
            if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
            popBubble(id);
          };
          if (bubbleEl.addEventListener) {
            bubbleEl.addEventListener('pointerdown', onPopHandler);
            bubbleEl.addEventListener('click', onPopHandler);
          }

          if (playfieldEl && playfieldEl.appendChild) {
            playfieldEl.appendChild(bubbleEl);
          }
        }

        var bubbleObj = {
          id: id,
          type: bType,
          size: sizePx,
          x: xPct,
          baseX: xPct,
          y: yPct,
          speed: speedPerTick,
          wobblePhase: wobblePhase,
          charData: charData,
          el: bubbleEl,
          popped: false,
          toString: function () { return id; },
          valueOf: function () { return id; }
        };

        bubbles.push(bubbleObj);
        return bubbleObj;
      }

      function checkWaveClear(x, y) {
        if (state.rescuedInWave >= state.targetRescue) {
          state.score += 100;
          state.wave += 1;
          state.rescuedInWave = 0;
          h.playSfx('clear');
          showFloatingFeedback(x || 50, y || 40, '🎉 15마리 구출 성공! Stage Clear +100점!', '#00897B');
        }
      }

      function popBubble(idOrBubble) {
        if (state.isGameOver) return null;

        var target = null;
        if (idOrBubble && typeof idOrBubble === 'object' && idOrBubble.id) {
          for (var i = 0; i < bubbles.length; i++) {
            if (bubbles[i].id === idOrBubble.id) {
              target = bubbles[i];
              break;
            }
          }
        } else if (typeof idOrBubble === 'string' || typeof idOrBubble === 'number') {
          var key = String(idOrBubble);
          for (var j = 0; j < bubbles.length; j++) {
            if (bubbles[j].id === key) {
              target = bubbles[j];
              break;
            }
          }
          // 만약 타입 이름('hero', 'villain' 등)으로 호출된 경우 해당 타입의 첫 방울을 탐색
          if (!target) {
            var norm = normalizeBubbleType(key);
            for (var k = 0; k < bubbles.length; k++) {
              if (bubbles[k].type === norm) {
                target = bubbles[k];
                break;
              }
            }
          }
        } else if (bubbles.length > 0) {
          target = bubbles[bubbles.length - 1];
        }

        if (!target || target.popped) return null;

        target.popped = true;
        bubbles = bubbles.filter(function (b) { return b.id !== target.id; });
        removeBubbleDom(target);

        var bx = target.x || 50;
        var by = target.y || 50;

        if (target.type === 'villain') {
          state.lives = Math.max(0, state.lives - 1);
          state.comboCount = 0;
          h.playSfx('hit');
          spawnPopRingBurst(bx, by, '#7E57C2');
          showFloatingFeedback(bx, by, '앗! 심술 방울이야! ⛈️💔', '#6A1B9A');
          updateHud();

          if (state.lives <= 0) {
            finishGame('out_of_hearts');
          }
          return target;
        }

        // 좋은 방울 터뜨림 -> 콤보 증가 및 실로폰 도-레-미-파-솔-라-시-도 연주
        state.comboCount += 1;
        if (state.comboCount > state.maxCombo) {
          state.maxCombo = state.comboCount;
        }
        var noteIdx = state.comboCount - 1;
        var solfege = SOLFEGE_NAMES[noteIdx % SOLFEGE_NAMES.length];
        var xyloNote = XYLOPHONE_NOTES[noteIdx % XYLOPHONE_NOTES.length];
        h.playSfx('note', noteIdx);
        spawnPopRingBurst(bx, by, xyloNote ? xyloNote.color : '#80DEEA');

        if (target.type === 'hero') {
          state.score += 30;
          state.rescuedInWave += 1;
          state.totalRescued += 1;
          h.createHeartExplosion(bx, by);
          showFloatingFeedback(bx, by, '고마워~ 츄! 💖 (+30점 · 🎵' + solfege + ')', '#D81B60');
          checkWaveClear(bx, by);
        } else if (target.type === 'friend') {
          state.score += 15;
          state.rescuedInWave += 1;
          state.totalRescued += 1;
          var friendName = (target.charData && target.charData.name) ? target.charData.name : '친구핑';
          showFloatingFeedback(bx, by, '✨ ' + friendName + ' 구출! (+15점 · 🎵' + solfege + ')', '#00838F');
          checkWaveClear(bx, by);
        } else if (target.type === 'bonus') {
          state.score += 50;
          if (state.lives < MAX_HEARTS) {
            state.lives += 1;
          }
          h.createHeartExplosion(bx, by);
          showFloatingFeedback(bx, by, '🌈 무지개 하트 보너스! 💖 (+50점 · 🎵' + solfege + ')', '#E91E63');
        }

        updateHud();
        return target;
      }

      function stepBubbles() {
        if (state.isGameOver) return;
        for (var i = bubbles.length - 1; i >= 0; i--) {
          var b = bubbles[i];
          b.y -= b.speed;
          b.wobblePhase += 0.08;
          b.x = Math.max(4, Math.min(88, b.baseX + Math.sin(b.wobblePhase) * 4.5));

          if (b.el) {
            b.el.style.top = b.y.toFixed(2) + '%';
            b.el.style.left = b.x.toFixed(2) + '%';
          }

          // 화면 위로 지나간 방울 정리 (심술 먹구름 방울도 그냥 지나가게 두면 안전!)
          if (b.y < -16) {
            removeBubbleDom(b);
            bubbles.splice(i, 1);
          }
        }
      }

      function finishGame(reason) {
        if (state.isGameOver) return;
        state.isGameOver = true;
        stopTimers();

        if (state.score > state.highScore) {
          state.highScore = state.score;
        }
        h.saveHighScore(GAME_ID, state.score);
        h.rewardCharacter();

        h.showResultOverlay(stageEl, {
          gameId: GAME_ID,
          title: state.lives > 0 ? '반짝반짝 비눗방울 구출 대성공! 🫧' : '비눗방울 구출 완료! 💖',
          score: state.score,
          highScore: state.highScore,
          summary: '총 ' + state.totalRescued + '마리의 티니핑 친구들을 구출했어요! (최대 ' + state.maxCombo + '콤보)',
          reason: reason || 'finished',
          charCtx: ctx,
          onRestart: function () {
            cleanup();
            gameDef.mount(stageEl, charCtx, helpers);
          }
        });
      }

      function stopTimers() {
        if (spawnTimerId) {
          clearInterval(spawnTimerId);
          spawnTimerId = null;
        }
        if (tickTimerId) {
          clearInterval(tickTimerId);
          tickTimerId = null;
        }
        if (animFrameId && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(animFrameId);
          animFrameId = null;
        }
        while (floatingTimers.length > 0) {
          clearTimeout(floatingTimers.pop());
        }
      }

      if (finishBtnEl && finishBtnEl.addEventListener) {
        finishBtnEl.addEventListener('click', function () {
          finishGame('user_finish');
        });
      }

      // 초기 방울 3개 생성 (주인공 방울 1개 + 친구 방울 2개)
      spawnBubble('hero');
      spawnBubble('friend');
      spawnBubble('friend');
      updateHud();

      spawnTimerId = setInterval(function () {
        if (state.isGameOver) return;
        if (bubbles.length < 8) {
          spawnBubble();
        }
      }, 1150);

      tickTimerId = setInterval(function () {
        stepBubbles();
      }, 50);

      var api = {
        spawnBubble: spawnBubble,
        popBubble: popBubble,
        stepBubbles: stepBubbles,
        finishGame: finishGame,
        getState: function () {
          return {
            score: state.score,
            highScore: state.highScore,
            lives: state.lives,
            hearts: state.lives,
            combo: state.comboCount,
            comboCount: state.comboCount,
            maxCombo: state.maxCombo,
            rescued: state.totalRescued,
            totalRescued: state.totalRescued,
            rescuedInWave: state.rescuedInWave,
            targetRescue: state.targetRescue,
            wave: state.wave,
            isGameOver: state.isGameOver,
            lastMessage: state.lastMessage,
            bubbles: bubbles.map(function (b) {
              return {
                id: b.id,
                type: b.type,
                x: b.x,
                y: b.y,
                size: b.size
              };
            })
          };
        }
      };

      stageEl._bubbleGame = api;
      stageEl._tpGameInstance = api;

      function cleanup() {
        state.isGameOver = true;
        stopTimers();
        for (var i = 0; i < bubbles.length; i++) {
          removeBubbleDom(bubbles[i]);
        }
        bubbles = [];
        if (stageEl._bubbleGame === api) {
          delete stageEl._bubbleGame;
        }
        if (stageEl._tpGameInstance === api) {
          delete stageEl._tpGameInstance;
        }
      }

      return cleanup;
    }
  };

  global.TpGameBubble = gameDef;
  if (global.TpMiniGames && typeof global.TpMiniGames.register === 'function') {
    global.TpMiniGames.register(gameDef.id, gameDef);
  }
})(typeof window !== 'undefined' ? window : globalThis);
