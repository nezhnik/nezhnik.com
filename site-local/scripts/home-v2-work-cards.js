/**
 * Карточки home-v2 — слои как в Figma: фон · текст · экран(ы).
 * Слои: scripts/home-v2-cards-layers.js (генерируется build-home-v2-card-layers.mjs)
 */
(function () {
  'use strict';

  var PERSONAL_CARDS = [
    {
      href: 'https://omonete.ru',
      title: 'О монете',
      accent: '#ffffff',
      desc: 'Сайт-каталог российских и иностранных монет из благородных металлов с личным кабинетом, историей монетных дворов и графиками стоимости металлов',
      descLight: true,
      preview: 'images/home-v2/personal-01.png'
    },
    {
      href: 'https://nezhnik.com/color/',
      title: 'Какой цвет отличается?',
      accent: '#bd47b9',
      desc: 'Браузерная игра на цветовосприятие с настройками уровня сложности и таблицей лидеров',
      descLight: false,
      preview: 'images/home-v2/personal-02.png'
    },
    {
      href: 'https://www.figma.com/community/plugin/1518640289187057362',
      title: 'Basketball Game!',
      accent: '#11111b',
      desc: 'Плагин-игра в Figma с сохранением статистики',
      descLight: false,
      preview: 'images/home-v2/personal-03.png'
    },
    {
      href: 'https://nezhnik.com/symbols/',
      title: 'Символы',
      accent: '#ffffff',
      desc: 'Сервис с символами для интерфейсов, презентаций и идей',
      descLight: true,
      preview: 'images/home-v2/personal-04.png'
    }
  ];

  var WORK_CARDS = [
    { href: 'legalbpm.html', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Айдентика, визуальный стиль и коммуникационная стратегия Рафа — основного ИИ-ассистента для всех сотрудников', descLight: true, mac: true, preview: 'images/home-v2/work-01.png' },
    { href: 'legalbpm.html', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Веб-интерфейс и мобильное приложение Рафа — основного ИИ-ассистента для всех сотрудников банка', descLight: false, phone: true, mac: true, preview: 'images/home-v2/work-02.png' },
    { href: 'legalbpm.html', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Редизайн и проектирование единого решения поиска для порталов «Инсайдер» и «Сервис-деск»', descLight: true, mac: true, preview: 'images/home-v2/work-03.png' },
    { href: 'legalbpm.html', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Редизайн портала «Сервис-деск» — сервиса решения рабочих вопросов и проблем всех сотрудников и клиентов банка', descLight: false, mac: true, preview: 'images/home-v2/work-04.png' },
    { href: 'sberpravo.html', title: 'Сбер Право', accent: '#2c9ce6', desc: 'Редизайн юридического сервиса «LegalBPM» — системы менеджмента бизнес-процессов правовых запросов и судебной работы Сбера', descLight: false, mac: true, preview: 'images/home-v2/work-05.png' },
    { href: 'sberpravo.html', title: 'Сбер Право', accent: '#2c9ce6', desc: 'Каталог услуг и набор 3D-иллюстраций для юридического сервиса Сбера', descLight: true, phone: true, mac: true, preview: 'images/home-v2/work-06.png' },
    { href: 'csclick.html', title: 'Сбер', accent: '#2a9f3f', desc: 'Сервис заказа товаров «CS-Клик» для всех сотрудников и партнеров Сбера', descLight: false, phone: true, mac: true, preview: 'images/home-v2/work-07.png' },
    { href: 'csradar.html', title: 'Сбер', accent: '#2a9f3f', desc: 'Личные кабинеты логистов и операторов логистической платформы «CS Radar»', descLight: false, phone: true, mac: true, preview: 'images/home-v2/work-08.png' },
    { href: 'crafter.html', title: 'Crafter', accent: '#fd7350', desc: 'Личные кабинеты логистов и перевозчиков для логистической компании', descLight: true, phone: true, mac: true, preview: 'images/home-v2/work-09.png' },
    { href: 'zesklad.html', title: 'ZeСклад', accent: '#fd7350', desc: 'Личный кабинет и сайт сервиса хранения вещей', descLight: true, phone: true, mac: true, preview: 'images/home-v2/work-10.png' },
    { href: 'smarthome.html', title: 'Smart home', accent: '#2969df', desc: 'Концепция приложения умного дома', descLight: true, phone: true, mac: false, preview: 'images/home-v2/work-11.png' },
    { href: 'sibpromstroy.html', title: 'Сибпромстрой', accent: '#1077e0', desc: 'Редизайн сайта строительной компании', descLight: false, mac: true, preview: 'images/home-v2/work-12.png' },
    { href: 'designconference.html', title: 'Design Conference', accent: '#ffffff', desc: 'Лендинг дизайн-конференции', descLight: true, mac: true, preview: 'images/home-v2/work-13.png' },
    { href: 'glavpivmag.html', title: 'ГлавПивМаг', accent: '#f2cb82', desc: 'Главная страница и каталог магазина крафтового пива', descLight: true, mac: true, preview: 'images/home-v2/work-14.png' }
  ];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardClasses(card) {
    var list = ['home-v2-project-card'];
    if (card.phone) list.push('home-v2-project-card--has-phone');
    if (card.phone && !card.mac) list.push('home-v2-project-card--phone-only');
    return list.join(' ');
  }

  function boxStyle(box) {
    return (
      'left:' + box.left + '%;' +
      'top:' + box.top + '%;' +
      'width:' + box.width + '%;' +
      'height:' + box.height + '%'
    );
  }

  function normalizeBgSize(size) {
    return size.split(' ').map(function (part) {
      var n = parseFloat(part);
      return Math.abs(n).toFixed(4) + '%';
    }).join(' ');
  }

  function renderBgLayer(layer) {
    if (layer.type === 'solid') {
      return '<span class="home-v2-project-card__bg-layer" style="background:' + escapeHtml(layer.color) + '"></span>';
    }

    var flipX = parseFloat(layer.size) < 0;
    var style =
      'background-image:url(' + escapeHtml(layer.src) + ');' +
      'background-size:' + normalizeBgSize(layer.size) + ';' +
      'background-position:' + layer.position + ';' +
      (flipX ? 'transform:scaleX(-1);' : '');

    return '<span class="home-v2-project-card__bg-layer" style="' + style + '"></span>';
  }

  function renderBg(bg) {
    var layers = Array.isArray(bg) ? bg : [bg];
    return layers.map(renderBgLayer).join('');
  }

  function renderDevice(box) {
    if (!box || !box.src) return '';
    return (
      '<div class="home-v2-project-card__device" style="' + boxStyle(box) + '">' +
        '<img class="home-v2-project-card__device-img" src="' + escapeHtml(box.src) + '" alt="" crossorigin="anonymous" loading="lazy"/>' +
      '</div>'
    );
  }

  function renderWorkCard(card) {
    var layer = card.layer;
    var tone = card.descLight ? 'light' : 'dark';
    var text = layer.text;
    var external = /^https?:\/\//.test(card.href);
    var rel = external ? ' rel="noopener noreferrer"' : '';
    var target = external ? ' target="_blank"' : '';
    var devices = '';

    if (layer.mac) devices += renderDevice(layer.mac);
    (layer.phones || []).forEach(function (phone) {
      devices += renderDevice(phone);
    });

    return (
      '<a class="' + cardClasses(card) + '" href="' + escapeHtml(card.href) + '"' + target + rel + ' style="--project-accent:' + escapeHtml(card.accent || '#fff') + '">' +
        '<div class="home-v2-project-card__stage">' +
          '<div class="home-v2-project-card__bg" aria-hidden="true">' + renderBg(layer.bg) + '</div>' +
          '<div class="home-v2-project-card__copy home-v2-project-card__copy--' + tone + '" style="' + boxStyle(text) + '">' +
            '<h3 class="home-v2-project-card__title">' + escapeHtml(card.title) + '</h3>' +
            '<p class="home-v2-project-card__desc">' + escapeHtml(card.desc) + '</p>' +
          '</div>' +
          devices +
        '</div>' +
      '</a>'
    );
  }

  function attachLayers(cards, layers) {
    return cards.map(function (card, i) {
      return Object.assign({}, card, { layer: layers[i] });
    });
  }

  function mountCards(rootId, cards) {
    var root = document.getElementById(rootId);
    if (!root) return;
    root.innerHTML = cards.map(renderWorkCard).join('');
  }

  function mountWorkCards() {
    var layers = window.HOME_V2_CARD_LAYERS;
    if (!layers) return;

    mountCards('home-v2-work-list', attachLayers(WORK_CARDS, layers.work));
    mountCards('home-v2-personal-list', attachLayers(PERSONAL_CARDS, layers.personal));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWorkCards);
  } else {
    mountWorkCards();
  }

  window.HOME_V2_WORK_CARDS = WORK_CARDS;
  window.HOME_V2_PERSONAL_CARDS = PERSONAL_CARDS;
})();
