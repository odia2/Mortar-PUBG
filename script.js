// Конфигурация всех карт
const maps = {
    erangel: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Erangel_2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 4.0,
        realSize: 8000
    },
    miramar: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Miramar_2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 4.0,
        realSize: 8000
    },
    vikendi: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Vikendi.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 3.0,
        realSize: 6000
    },
    taego: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Taego_Main_2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 4.0,
        realSize: 8000
    },
    deston: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Deston_Main_High_Res-2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 4.0,
        realSize: 8000
    },
    rondo: {
        url: 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/rondo2000x2000.png',
        bounds: [[0, 0], [2000, 2000]],
        scale: 2.0,
        realSize: 4000
    }
};

// Настройки миномёта
const MORTAR_CONFIG = {
    minRange: 100,
    maxRange: 800,
    shellRadius: 10,
    projectileSpeed: 110
};

// Глобальные переменные
let currentMap = 'erangel';
let mortarMode = false;
let mapLayer = null;
let map;
let markers = [];
let points = [];
let polyline = null;
let mortarCircleMin = null;
let mortarCircleMax = null;
let mortarPosition = null;
let mortarElevation = 0;  // ← НОВОЕ: угол возвышения
let elevationPopup = null;  // ← НОВОЕ: попап высоты

// Иконки
const mortarIcon = L.divIcon({
    className: 'mortar-icon',
    html: '<div style="width: 20px; height: 20px; background: #ff3b3b; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 0 10px #ff3b3b;">🎯</div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const targetIcon = L.divIcon({
    className: 'target-icon',
    html: '<div style="width: 20px; height: 20px; background: #00ff88; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; box-shadow: 0 0 10px #00ff88;">💥</div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const standardIcon = L.divIcon({
    className: 'standard-icon',
    html: '<div style="width: 30px; height: 30px; background: #4facfe; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px #4facfe;"></div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

// Инициализация карты
function initMap() {
    map = L.map('map', {
        minZoom: 0,
        maxZoom: 4,
        crs: L.CRS.Simple,
        center: [1000, 1000],
        zoom: 1
    });
    
    loadMap('erangel');
    map.on('click', handleMapClick);
    map.on('dblclick', handleMapDoubleClick);  // ← ДОБАВЛЕНО
    document.addEventListener('keydown', handleKeyboard);
    loadTheme();
    initPopupDrag();
}

// Перетаскивание popup (ЛКМ) + Удаление (ПКМ)
function initPopupDrag() {
    let draggedPopup = null;
    let dragOffset = { x: 0, y: 0 };
    
    document.addEventListener('mousedown', function(e) {
        const popup = document.querySelector('.leaflet-popup-content-wrapper');
        if (popup && popup.contains(e.target) && e.button === 0) {
            draggedPopup = popup;
            const rect = popup.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            popup.style.cursor = 'grabbing';
        }
    });
    
    document.addEventListener('mousemove', function(e) {
        if (draggedPopup) {
            draggedPopup.style.position = 'fixed';
            draggedPopup.style.left = (e.clientX - dragOffset.x) + 'px';
            draggedPopup.style.top = (e.clientY - dragOffset.y) + 'px';
            draggedPopup.style.zIndex = '10000';
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (draggedPopup) {
            draggedPopup.style.cursor = 'default';
            draggedPopup = null;
        }
    });
    
    document.addEventListener('contextmenu', function(e) {
        const popup = document.querySelector('.leaflet-popup-content-wrapper');
        if (popup && popup.contains(e.target)) {
            e.preventDefault();
            e.stopPropagation();
            if (polyline) {
                map.removeLayer(polyline);
                polyline = null;
            }
            markers.forEach(m => map.removeLayer(m));
            markers = [];
            points = [];
            document.getElementById('distance').textContent = '0000 m';
            document.getElementById('angle').textContent = '--°';
            document.getElementById('flightTime').textContent = '-- с';
            document.getElementById('points').textContent = '0/2';
            return false;
        }
    });
}

// ← НОВАЯ ФУНКЦИЯ: Двойной клик по миномёту (регулировка высоты)
function handleMapDoubleClick(e) {
    if (!mortarMode || points.length === 0 || points[0].type !== 'mortar') return;
    
    if (elevationPopup) {
        map.removeLayer(elevationPopup);
        elevationPopup = null;
        return;
    }
    
    const elevationDisplay = mortarElevation >= 0 ? `+${mortarElevation}°` : `${mortarElevation}°`;
    
    const popupContent = `
        <div style="text-align: center; min-width: 150px;">
            <h4 style="margin: 0 0 10px 0; color: #ff3b3b; font-family: 'Orbitron', sans-serif;">⛰️ ELEVATION</h4>
            <div style="font-size: 24px; font-weight: bold; margin: 10px 0; color: #fff;">
                ${elevationDisplay}
            </div>
            <div style="display: flex; gap: 5px; justify-content: center;">
                <button onclick="adjustElevation(-1)" style="background: #ff4444; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">-1°</button>
                <button onclick="adjustElevation(0)" style="background: #666; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 14px;">0°</button>
                <button onclick="adjustElevation(1)" style="background: #00ff88; color: black; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">+1°</button>
            </div>
            <div style="margin-top: 10px; font-size: 10px; color: #aaa;">
                Double-click to close
            </div>
        </div>
    `;
    
    elevationPopup = L.popup({
        closeButton: false,
        autoClose: false,
        closeOnClick: false,
        offset: [0, -20]
    })
    .setLatLng(e.latlng)
    .setContent(popupContent)
    .openOn(map);
    
    map.once('dblclick', function() {
        if (elevationPopup) {
            map.removeLayer(elevationPopup);
            elevationPopup = null;
        }
    });
}

// ← НОВАЯ ФУНКЦИЯ: Регулировка высоты
function adjustElevation(change) {
    if (change === 0) {
        mortarElevation = 0;
    } else {
        mortarElevation += change;
        if (mortarElevation > 10) mortarElevation = 10;
        if (mortarElevation < -10) mortarElevation = -10;
    }
    
    if (points.length === 2) {
        const distance = calculateDistance();
        updateHUD(distance);
        drawMortarLine(distance);
    }
    
    if (elevationPopup && points.length > 0 && points[0].type === 'mortar') {
        map.removeLayer(elevationPopup);
        elevationPopup = null;
        handleMapDoubleClick({ latlng: points[0] });
    }
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

// Смена карты
function changeMap() {
    const select = document.getElementById('mapSelect');
    loadMap(select.value);
}

// Переключение режима миномёта
function toggleMortarMode() {
    const toggle = document.getElementById('mortarModeToggle');
    const modeText = document.getElementById('modeText');
    mortarMode = toggle.checked;
    modeText.textContent = mortarMode ? 'MORTAR' : 'DISTANCE';
    clearPoints(false);
    if (!mortarMode) {
        removeCircles();
    }
}

// Переключение темы
function toggleTheme() {
    const toggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const html = document.documentElement;
    if (toggle.checked) {
        html.setAttribute('data-theme', 'light');
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    }
}

// Загрузка сохранённой темы
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const toggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const html = document.documentElement;
    if (savedTheme === 'light') {
        toggle.checked = true;
        html.setAttribute('data-theme', 'light');
        themeIcon.textContent = '☀️';
    } else {
        toggle.checked = false;
        html.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '🌙';
    }
}

// Создание кругов миномёта
function createMortarCircles(position) {
    removeCircles();
    const scale = maps[currentMap].scale;
    mortarCircleMin = L.circle(position, {
        radius: MORTAR_CONFIG.minRange / scale,
        color: '#ff4444',
        fillColor: '#ff4444',
        fillOpacity: 0.15,
        weight: 2,
        className: 'leaflet-circle'
    }).addTo(map);
    mortarCircleMax = L.circle(position, {
        radius: MORTAR_CONFIG.maxRange / scale,
        color: '#00ff88',
        fillColor: '#00ff88',
        fillOpacity: 0.08,
        weight: 2,
        className: 'leaflet-circle'
    }).addTo(map);
}

// Удаление кругов
function removeCircles() {
    if (mortarCircleMin) {
        map.removeLayer(mortarCircleMin);
        mortarCircleMin = null;
    }
    if (mortarCircleMax) {
        map.removeLayer(mortarCircleMax);
        mortarCircleMax = null;
    }
}

// Клик по карте
function handleMapClick(e) {
    if (mortarMode) {
        handleMortarClick(e);
    } else {
        handleDistanceClick(e);
    }
}

// Клик в режиме миномёта
function handleMortarClick(e) {
    if (points.length >= 2) {
        alert('Already 2 points! Press "Clear" to reset.');
        return;
    }
    if (points.length === 0) {
        const marker = L.marker([e.latlng.lat, e.latlng.lng], {
            icon: mortarIcon
        }).addTo(map);
        markers.push(marker);
        points.push({lat: e.latlng.lat, lng: e.latlng.lng, type: 'mortar'});
        mortarPosition = [e.latlng.lat, e.latlng.lng];
        createMortarCircles(mortarPosition);
        document.getElementById('points').textContent = `${points.length}/2`;
    } else {
        const marker = L.marker([e.latlng.lat, e.latlng.lng], {
            icon: targetIcon
        }).addTo(map);
        markers.push(marker);
        points.push({lat: e.latlng.lat, lng: e.latlng.lng, type: 'target'});
        document.getElementById('points').textContent = `${points.length}/2`;
        const distance = calculateDistance();
        updateHUD(distance);
        drawMortarLine(distance);
    }
}

// Клик в режиме дистанции
function handleDistanceClick(e) {
    if (points.length >= 2) {
        alert('Уже 2 точки! Нажми "Clear" для сброса.');
        return;
    }
    const marker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: standardIcon
    }).addTo(map);
    markers.push(marker);
    points.push({lat: e.latlng.lat, lng: e.latlng.lng, type: 'point'});
    document.getElementById('points').textContent = `${points.length}/2`;
    if (points.length === 2) {
        const distance = calculateDistance();
        updateHUD(distance);
        drawLine(distance);
    }
}

// Расчёт расстояния
function calculateDistance() {
    if (points.length < 2) return 0;
    const dx = points[1].lng - points[0].lng;
    const dy = points[1].lat - points[0].lat;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.round(distance * maps[currentMap].scale);
}

// Отрисовка линии (режим дистанции)
function drawLine(distance) {
    if (polyline) {
        map.removeLayer(polyline);
    }
    polyline = L.polyline(points.map(p => [p.lat, p.lng]), {
        color: '#ff3b3b',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 10'
    }).addTo(map).bindPopup(`<b>Дистанция:</b> ${distance} м`).openPopup();
    map.fitBounds(polyline.getBounds(), { padding: [100, 100] });
}

// Отрисовка линии (режим миномёта)
function drawMortarLine(distance) {
    if (polyline) {
        map.removeLayer(polyline);
    }
    const lineColor = distance <= MORTAR_CONFIG.maxRange && distance >= MORTAR_CONFIG.minRange 
        ? '#00ff88'
        : '#ff4444';
    polyline = L.polyline(points.map(p => [p.lat, p.lng]), {
        color: lineColor,
        weight: 4,
        opacity: 0.9,
        dashArray: '15, 10'
    }).addTo(map);
    
    const isValid = distance <= MORTAR_CONFIG.maxRange && distance >= MORTAR_CONFIG.minRange;
    const statusText = isValid ? '✅ VALID' : '❌ OUT OF RANGE';
    const statusEmoji = isValid ? '🟢' : '🔴';
    const elevationBonus = mortarElevation * 50;
    const elevationText = mortarElevation !== 0 
        ? `<br><b>⛰️ Elevation:</b> ${mortarElevation >= 0 ? '+' : ''}${mortarElevation}° (${elevationBonus >= 0 ? '+' : ''}${elevationBonus}м)`
        : '';
    
    polyline.bindPopup(`
        <b>📏 Distance:</b> ${distance} m<br>
        <b>🎯 Angle:</b> ${getMortarAngle(distance)}°${elevationText}<br>
        <b>⏱️ Flight Time:</b> ${getFlightTime(distance)} с<br>
        <b>💥 Kill Radius:</b> ${MORTAR_CONFIG.shellRadius} м<br>
        <b>${statusEmoji} Status:</b> ${statusText}
    `).openPopup();
    
    map.fitBounds(polyline.getBounds(), { padding: [100, 100] });
}

// Обновление HUD
function updateHUD(distance) {
    document.getElementById('distance').textContent = `${String(distance).padStart(4, '0')} m`;
    const angle = getMortarAngle(distance);
    document.getElementById('angle').textContent = angle !== '--' ? `${angle}°` : '--°';
    const flightTime = getFlightTime(distance);
    document.getElementById('flightTime').textContent = `${flightTime} с`;
    document.getElementById('shellRadius').textContent = `${MORTAR_CONFIG.shellRadius} м`;
    
    // ← ДОБАВЛЕНО: отображение высоты в HUD
    const elevationDisplay = mortarElevation >= 0 ? `+${mortarElevation}°` : `${mortarElevation}°`;
    const elevationEl = document.getElementById('elevation');
    if (elevationEl) {
        elevationEl.textContent = elevationDisplay;
    }
}

// Время полёта
function getFlightTime(distance) {
    return (distance / MORTAR_CONFIG.projectileSpeed).toFixed(1);
}

// Угол миномёта (с учётом высоты)
function getMortarAngle(distance) {
    const elevationBonus = mortarElevation * 50;
    const adjustedDistance = distance - elevationBonus;
    
    if (adjustedDistance < 100) return '--';
    if (adjustedDistance < 150) return 75;
    if (adjustedDistance < 200) return 70;
    if (adjustedDistance < 250) return 65;
    if (adjustedDistance < 300) return 60;
    if (adjustedDistance < 400) return 55;
    if (adjustedDistance < 500) return 50;
    if (adjustedDistance < 600) return 45;
    if (adjustedDistance < 700) return 40;
    if (adjustedDistance < 800) return 35;
    if (adjustedDistance < 900) return 30;
    if (adjustedDistance < 1000) return 25;
    if (adjustedDistance < 1200) return 20;
    if (adjustedDistance < 1400) return 15;
    if (adjustedDistance < 1600) return 12;
    if (adjustedDistance < 1800) return 10;
    if (adjustedDistance < 2000) return 8;
    return 5;
}

// Сброс дистанции
function resetDistance() {
    if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
    }
    points = [];
    mortarElevation = 0;  // ← ДОБАВЛЕНО
    document.getElementById('distance').textContent = '0000 m';
    document.getElementById('angle').textContent = '--°';
    document.getElementById('flightTime').textContent = '-- с';
    document.getElementById('shellRadius').textContent = `${MORTAR_CONFIG.shellRadius} м`;
    document.getElementById('points').textContent = '0/2';
    const elevationEl = document.getElementById('elevation');
    if (elevationEl) elevationEl.textContent = '0°';
}

// Очистка точек
function clearPoints(reload = true) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
    }
    removeCircles();
    mortarPosition = null;
    mortarElevation = 0;  // ← ДОБАВЛЕНО
    points = [];
    document.getElementById('distance').textContent = '0000 m';
    document.getElementById('angle').textContent = '--°';
    document.getElementById('flightTime').textContent = '-- с';
    document.getElementById('shellRadius').textContent = `${MORTAR_CONFIG.shellRadius} м`;
    document.getElementById('points').textContent = '0/2';
    const elevationEl = document.getElementById('elevation');
    if (elevationEl) elevationEl.textContent = '0°';
    if (elevationPopup) {
        map.removeLayer(elevationPopup);
        elevationPopup = null;
    }
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
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
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
        case 'm':
            const toggle = document.getElementById('mortarModeToggle');
            toggle.checked = !toggle.checked;
            toggleMortarMode();
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
