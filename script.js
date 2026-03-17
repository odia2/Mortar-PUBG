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
    shellRadius: 25,
    projectileSpeed: 110
};

// Настройки рисования
const DRAW_CONFIG = {
    tools: ['freehand', 'line', 'arrow', 'circle', 'square', 'text', 'eraser'],
    colors: ['#ff3b3b', '#00ff88', '#4facfe', '#ffaa00', '#ffffff']
};

// Глобальные переменные
let currentMap = 'erangel';
let mortarMode = false;
let drawMode = false;
let currentTool = 'freehand';
let currentColor = '#ff3b3b';
let mapLayer = null;
let map;
let markers = [];
let points = [];
let polyline = null;
let mortarCircleMin = null;
let mortarCircleMax = null;
let mortarPosition = null;

// Переменные для рисования
let drawingLayers = [];
let isDrawing = false;
let drawStart = null;
let tempLayer = null;
let freehandPoints = [];

// Иконки
const mortarIcon = L.divIcon({
    className: 'mortar-icon',
    html: '<div style="width: 40px; height: 40px; background: #ff3b3b; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px #ff3b3b;">🎯</div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const targetIcon = L.divIcon({
    className: 'target-icon',
    html: '<div style="width: 40px; height: 40px; background: #00ff88; border: 3px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 0 15px #00ff88;">💥</div>',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
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
    map.on('mousedown', handleDrawStart);
    map.on('mousemove', handleDrawMove);
    map.on('mouseup', handleDrawEnd);
    document.addEventListener('keydown', handleKeyboard);
    loadTheme();
}

// ===== DRAWING FUNCTIONS =====

// Переключение панели рисования
function toggleDrawPanel() {
    const panel = document.getElementById('drawPanel');
    panel.classList.toggle('active');
    drawMode = panel.classList.contains('active');
    
    if (drawMode) {
        // ОТКЛЮЧИТЬ перетаскивание карты при рисовании
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        
        map.getContainer().classList.add('leaflet-drawing');
        map.getContainer().style.cursor = 'crosshair';
    } else {
        // ВКЛЮЧИТЬ перетаскивание обратно
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        
        map.getContainer().classList.remove('leaflet-drawing');
        map.getContainer().style.cursor = '';
    }
}

// Выбор инструмента
function selectTool(tool) {
    currentTool = tool;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tool === tool) {
            btn.classList.add('active');
        }
    });
    
    // Показываем input для текста
    const textInput = document.getElementById('textInputContainer');
    if (tool === 'text') {
        textInput.style.display = 'flex';
        document.getElementById('textInput').focus();
    } else {
        textInput.style.display = 'none';
    }
}

// Выбор цвета
function selectColor(color) {
    currentColor = color;
    
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.color === color) {
            btn.classList.add('active');
        }
    });
}

// Начало рисования
function handleDrawStart(e) {
    if (!drawMode || isDrawing) return;
    
    // ← Предотвратить перетаскивание карты
    e.originalEvent.stopPropagation();
    
    isDrawing = true;
    drawStart = e.latlng;
    
    if (currentTool === 'freehand') {
        freehandPoints = [e.latlng];
        tempLayer = L.polyline(freehandPoints, {
            color: currentColor,
            weight: 3,
            smoothFactor: 1
        }).addTo(map);
    }

// Движение при рисовании
function handleDrawMove(e) {
    if (!drawMode || !isDrawing || !drawStart) return;
    
    if (currentTool === 'freehand') {
        freehandPoints.push(e.latlng);
        tempLayer.setLatLngs(freehandPoints);
    } else if (currentTool === 'line') {
        if (tempLayer) map.removeLayer(tempLayer);
        tempLayer = L.polyline([drawStart, e.latlng], {
            color: currentColor,
            weight: 3
        }).addTo(map);
    } else if (currentTool === 'arrow') {
        if (tempLayer) map.removeLayer(tempLayer);
        tempLayer = L.polyline([drawStart, e.latlng], {
            color: currentColor,
            weight: 3
        }).addTo(map);
    } else if (currentTool === 'circle') {
        if (tempLayer) map.removeLayer(tempLayer);
        const radius = getDistance(drawStart, e.latlng);
        tempLayer = L.circle(drawStart, {
            radius: radius,
            color: currentColor,
            fillColor: currentColor,
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map);
    } else if (currentTool === 'square') {
        if (tempLayer) map.removeLayer(tempLayer);
        const bounds = [
            [drawStart.lat, drawStart.lng],
            [e.latlng.lat, e.latlng.lng]
        ];
        tempLayer = L.rectangle(bounds, {
            color: currentColor,
            fillColor: currentColor,
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map);
    }
}

// Конец рисования
function handleDrawEnd(e) {
    if (!drawMode || !isDrawing) return;
    
    isDrawing = false;
    
    if (tempLayer) {
        drawingLayers.push(tempLayer);
        
        // Добавляем стрелку для arrow инструмента
        if (currentTool === 'arrow') {
            addArrowHead(drawStart, e.latlng);
        }
        
        tempLayer = null;
    }
    
    drawStart = null;
    freehandPoints = [];
}

// Добавление стрелки
function addArrowHead(start, end) {
    const angle = Math.atan2(end.lat - start.lat, end.lng - start.lng);
    const arrowLength = 50 / maps[currentMap].scale;
    
    const arrowLeft = {
        lat: end.lat - arrowLength * Math.cos(angle - Math.PI / 6),
        lng: end.lng - arrowLength * Math.sin(angle - Math.PI / 6)
    };
    
    const arrowRight = {
        lat: end.lat - arrowLength * Math.cos(angle + Math.PI / 6),
        lng: end.lng - arrowLength * Math.sin(angle + Math.PI / 6)
    };
    
    const arrowLayer = L.polyline([end, arrowLeft, end, arrowRight], {
        color: currentColor,
        weight: 3
    }).addTo(map);
    
    drawingLayers.push(arrowLayer);
}

// Добавление текста
function addText() {
    const textInput = document.getElementById('textInput');
    const text = textInput.value.trim();
    
    if (!text || !drawStart) return;
    
    const textMarker = L.marker(drawStart, {
        icon: L.divIcon({
            className: 'leaflet-text-marker',
            html: `<div class="text-content" style="color: ${currentColor};">${text}</div>`,
            iconSize: [200, 30]
        })
    }).addTo(map);
    
    drawingLayers.push(textMarker);
    textInput.value = '';
}

// Очистка рисунков
function clearDrawings() {
    drawingLayers.forEach(layer => map.removeLayer(layer));
    drawingLayers = [];
}

// Расчёт расстояния (для круга)
function getDistance(latlng1, latlng2) {
    const dx = latlng2.lng - latlng1.lng;
    const dy = latlng2.lat - latlng1.lat;
    return Math.sqrt(dx * dx + dy * dy) * maps[currentMap].scale;
}

// Экспорт карты в картинку
function exportMap() {
    const mapContainer = document.querySelector('.map-container');
    
    html2canvas(mapContainer, {
        backgroundColor: '#111111',
        scale: 2,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `PUBG-Mortar-Map-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// ===== MORTAR & DISTANCE FUNCTIONS =====

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

function changeMap() {
    const select = document.getElementById('mapSelect');
    loadMap(select.value);
}

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

function createMortarCircles(position) {
    removeCircles();
    const scale = maps[currentMap].scale;
    mortarCircleMin = L.circle(position, {
        radius: MORTAR_CONFIG.minRange / scale,
        color: '#ff4444',
        fillColor: '#ff4444',
        fillOpacity: 0.2,
        weight: 2,
        className: 'leaflet-circle'
    }).addTo(map);
    mortarCircleMax = L.circle(position, {
        radius: MORTAR_CONFIG.maxRange / scale,
        color: '#00ff88',
        fillColor: '#00ff88',
        fillOpacity: 0.15,
        weight: 2,
        className: 'leaflet-circle'
    }).addTo(map);
}

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

function handleMapClick(e) {
    if (drawMode || isDrawing) return;
    
    if (mortarMode) {
        handleMortarClick(e);
    } else {
        handleDistanceClick(e);
    }
}

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

function calculateDistance() {
    if (points.length < 2) return 0;
    const dx = points[1].lng - points[0].lng;
    const dy = points[1].lat - points[0].lat;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.round(distance * maps[currentMap].scale);
}

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
    
    polyline.bindPopup(`
        <b>Distance:</b> ${distance} m<br>
        <b>Angle:</b> ${getMortarAngle(distance)}°<br>
        <b>Flight Time:</b> ${getFlightTime(distance)} с<br>
        <b>Status:</b> ${statusText}
    `).openPopup();
    
    map.fitBounds(polyline.getBounds(), { padding: [100, 100] });
}

function updateHUD(distance) {
    document.getElementById('distance').textContent = `${String(distance).padStart(4, '0')} m`;
    const angle = getMortarAngle(distance);
    document.getElementById('angle').textContent = angle !== '--' ? `${angle}°` : '--°';
    const flightTime = getFlightTime(distance);
    document.getElementById('flightTime').textContent = `${flightTime} с`;
    document.getElementById('shellRadius').textContent = `${MORTAR_CONFIG.shellRadius} м`;
}

function getFlightTime(distance) {
    return (distance / MORTAR_CONFIG.projectileSpeed).toFixed(1);
}

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

function resetDistance() {
    if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
    }
    points = [];
    document.getElementById('distance').textContent = '0000 m';
    document.getElementById('angle').textContent = '--°';
    document.getElementById('flightTime').textContent = '-- с';
    document.getElementById('shellRadius').textContent = `${MORTAR_CONFIG.shellRadius} м`;
    document.getElementById('points').textContent = '0/2';
}

function clearPoints(reload = true) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    if (polyline) {
        map.removeLayer(polyline);
        polyline = null;
    }
    removeCircles();
    mortarPosition = null;
    points = [];
    document.getElementById('distance').textContent = '0000 m';
    document.getElementById('angle').textContent = '--°';
    document.getElementById('flightTime').textContent = '-- с';
    document.getElementById('shellRadius').textContent = `${MORTAR_CONFIG.shellRadius} м`;
    document.getElementById('points').textContent = '0/2';
}

function showHelp() {
    document.getElementById('helpPopup').classList.add('active');
}

function hideHelp() {
    document.getElementById('helpPopup').classList.remove('active');
}

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
        case 'd':
            toggleDrawPanel();
            break;
        case 'escape':
            hideHelp();
            if (drawMode) toggleDrawPanel();
            break;
    }
}

document.getElementById('helpPopup').addEventListener('click', function(e) {
    if (e.target === this) {
        hideHelp();
    }
});

initMap();
