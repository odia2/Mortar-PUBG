// Конфигурация всех карт
const maps = {
    erangel: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Pubg_maps/Erangel_2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 4.0  // 8000м / 2000px
    },
    miramar: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Miramar_2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 4.0  // 8000м / 2000px
    },
    vikendi: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Vikendi_2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 3.0  // 6000м / 2000px
    },
    taego: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Taego_2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 4.0  // 8000м / 2000px
    },
    deston: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Deston_2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 4.0  // 8000м / 2000px
    }
};

// Глобальные переменные
let currentMap = 'erangel';
let mapLayer = null;
let map;
let markers = [];
let points = [];
let polyline = null;

// Таблица углов миномёта
function getMortarAngle(distance) {
    if (distance < 100) return '--';
    if (distance < 150) return 75;
    if (distance < 200) return 70;
    if (distance < 250) return 65;
    if (distance < 300) return 60;
    if (distance < 400) return 55;
    if (distance < 500) return 50;
    if (distance < 600) return 45;
    if (distance < 700) return 40;
    if (distance < 800) return 35;
    if (distance < 900) return 30;
    if (distance < 1000) return 25;
    if (distance < 1200) return 20;
    if (distance < 1400) return 15;
    if (distance < 1600) return 12;
    if (distance < 1800) return 10;
    if (distance < 2000) return 8;
    return 5;
}

// Инициализация карты
function initMap() {
    map = L.map('map', {
        minZoom: 1,
        maxZoom: 4,
        crs: L.CRS.Simple,
        center: [1000, 1000],
        zoom: 2
    });
    
    loadMap('erangel');
    map.on('click', handleMapClick);
    document.addEventListener('keydown', handleKeyboard);
}

// Загрузка карты
function loadMap(mapName) {
    const config = maps[mapName];
    
    if (mapLayer) {
        map.removeLayer(mapLayer);
    }
    
    mapLayer = L.imageOverlay(config.url, config.bounds).addTo(map);
    map.setMaxBounds(config.bounds);
    map.fitBounds(config.bounds);
    
    currentMap = mapName;
    clearPoints(false);
}

// Смена мапф
function changeMap() {
    const select = document.getElementById('mapSelect');
    loadMap(select.value);
}

// Клик по карте
function handleMapClick(e) {
    if (points.length >= 2) {
        alert('Уже 2 точки! Нажми "Clear" для сброса.');
        return;
    }
    
    const marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
    markers.push(marker);
    points.push({lat: e.latlng.lat, lng: e.latlng.lng});
    
    document.getElementById('points').textContent = `${points.length}/2`;
    
    if (points.length === 2) {
        const distance = calculateDistance();
        updateHUD(distance);
        drawLine(distance);
    }
}

// Расчёт расстояния
function calculateDistance() {
    const dx = points[1].lng - points[0].lng;
    const dy = points[1].lat - points[0].lat;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.round(distance * maps[currentMap].scale);
}

// Отрисовка линии
function drawLine(distance) {
    if (polyline) {
        map.removeLayer(polyline);
    }
    
    polyline = L.polyline(points.map(p => [p.lat, p.lng]), {
        color: 'red',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 10'
    }).addTo(map).bindPopup(`<b>Дистанция:</b> ${distance} м`).openPopup();
    
    map.fitBounds(polyline.getBounds(), { padding: [100, 100] });
}

// Обновление HUD
function updateHUD(distance) {
    document.getElementById('distance').textContent = `${String(distance).padStart(4, '0')} m`;
    const angle = getMortarAngle(distance);
    document.getElementById('angle').textContent = angle !== '--' ? `${angle}°` : '--°';
}

// Сброс дистанции
function resetDistance() {
    if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
    }
    points = [];
    document.getElementById('distance').textContent = '0000 m';
    document.getElementById('angle').textContent = '--°';
    document.getElementById('points').textContent = '0/2';
}

// Очистка точек
function clearPoints(reload = true) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    
    if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
    }
    
    points = [];
    document.getElementById('distance').textContent = '0000 m';
    document.getElementById('angle').textContent = '--°';
    document.getElementById('points').textContent = '0/2';
}

// Показать Help
function showHelp() {
    document.getElementById('helpPopup').classList.add('active');
}

// Скрыть Help
function hideHelp() {
    document.getElementById('helpPopup').classList.remove('active');
}

// Горячие клавиши
function handleKeyboard(e) {
    if (e.target.tagName === 'SELECT') return;
    
    switch(e.key.toLowerCase()) {
        case 'r':
            resetDistance();
            break;
        case 'c':
            clearPoints(false);
            break;
        case 'h':
            showHelp();
            break;
        case 'escape':
            hideHelp();
            break;
    }
}

// Закрытие popup при клике вне
document.getElementById('helpPopup').addEventListener('click', function(e) {
    if (e.target === this) {
        hideHelp();
    }
});

// Запуск
initMap();
