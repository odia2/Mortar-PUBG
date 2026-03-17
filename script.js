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
updateVisitorCount();
    setInterval(updateVisitorCount, 30000);
}

// ===== DRAWING FUNCTIONS =====

function toggleDrawPanel() {
    const panel = document.getElementById('drawPanel');
    if (!panel) return;
    
    panel.classList.toggle('active');
    drawMode = panel.classList.contains('active');
    
    if (drawMode) {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.getContainer().style.cursor = 'crosshair';
    } else {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        map.getContainer().style.cursor = '';
    }
}

function selectTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tool === tool) {
            btn.classList.add('active');
        }
    });
    
    const textInput = document.getElementById('textInputContainer');
    if (textInput) {
        textInput.style.display = tool === 'text' ? 'flex' : 'none';
    }
}

function selectColor(color) {
    currentColor = color;
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.color === color) {
            btn.classList.add('active');
        }
    });
}

function handleDrawStart(e) {
    if (!drawMode || isDrawing) return;
    isDrawing = true;
    drawStart = e.latlng;
    
    if (currentTool === 'freehand') {
        freehandPoints = [e.latlng];
        tempLayer = L.polyline(freehandPoints, {
            color: currentColor,
            weight: 3
        }).addTo(map);
    }
}

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
        tempLayer = L.rectangle([
            [drawStart.lat, drawStart.lng],
            [e.latlng.lat, e.latlng.lng]
        ], {
            color: currentColor,
            fillColor: currentColor,
            fillOpacity: 0.2,
            weight: 2
        }).addTo(map);
    }
}

function handleDrawEnd(e) {
    if (!drawMode || !isDrawing) return;
    isDrawing = false;
    
    if (tempLayer) {
        drawingLayers.push(tempLayer);
        tempLayer = null;
    }
    
    drawStart = null;
    freehandPoints = [];
}

function addText() {
    const textInput = document.getElementById('textInput');
    const text = textInput ? textInput.value.trim() : '';
    if (!text || !drawStart) return;
    
    const textMarker = L.marker(drawStart, {
        icon: L.divIcon({
            className: 'leaflet-text-marker',
            html: `<div style="background: rgba(0,0,0,0.7); color: ${currentColor}; padding: 5px 10px; border-radius: 4px; font-size: 14px; font-weight: 600;">${text}</div>`,
            iconSize: [200, 30]
        })
    }).addTo(map);
    
    drawingLayers.push(textMarker);
    if (textInput) textInput.value = '';
}

function clearDrawings() {
    drawingLayers.forEach(layer => map.removeLayer(layer));
    drawingLayers = [];
}

function getDistance(latlng1, latlng2) {
    const dx = latlng2.lng - latlng1.lng;
    const dy = latlng2.lat - latlng1.lat;
    return Math.sqrt(dx * dx + dy * dy) * maps[currentMap].scale;
}

function exportMap() {
    const mapContainer = document.querySelector('.map-container');
    if (typeof html2canvas !== 'undefined' && mapContainer) {
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
    } else {
        alert('Export library not loaded. Try again.');
    }
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
    if (select) loadMap(select.value);
}

function toggleMortarMode() {
    const toggle = document.getElementById('mortarModeToggle');
    const modeText = document.getElementById('modeText');
    if (!toggle || !modeText) return;
    
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
    if (!toggle || !themeIcon) return;
    
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
        if (toggle) toggle.checked = true;
        html.setAttribute('data-theme', 'light');
        if (themeIcon) themeIcon.textContent = '☀️';
    } else {
        if (toggle) toggle.checked = false;
        html.setAttribute('data-theme', 'dark');
        if (themeIcon) themeIcon.textContent = '🌙';
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
        weight: 2
    }).addTo(map);
    
    mortarCircleMax = L.circle(position, {
        radius: MORTAR_CONFIG.maxRange / scale,
        color: '#00ff88',
        fillColor: '#00ff88',
        fillOpacity: 0.15,
        weight: 2
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
    const distanceEl = document.getElementById('distance');
    const angleEl = document.getElementById('angle');
    const flightTimeEl = document.getElementById('flightTime');
    const shellRadiusEl = document.getElementById('shellRadius');
    const pointsEl = document.getElementById('points');
    
    if (distanceEl) distanceEl.textContent = `${String(distance).padStart(4, '0')} m`;
    if (angleEl) angleEl.textContent = getMortarAngle(distance) !== '--' ? `${getMortarAngle(distance)}°` : '--°';
    if (flightTimeEl) flightTimeEl.textContent = `${getFlightTime(distance)} с`;
    if (shellRadiusEl) shellRadiusEl.textContent = `${MORTAR_CONFIG.shellRadius} м`;
    if (pointsEl) pointsEl.textContent = `${points.length}/2`;
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
    const distanceEl = document.getElementById('distance');
    const angleEl = document.getElementById('angle');
    const flightTimeEl = document.getElementById('flightTime');
    const shellRadiusEl = document.getElementById('shellRadius');
    const pointsEl = document.getElementById('points');
    
    if (distanceEl) distanceEl.textContent = '0000 m';
    if (angleEl) angleEl.textContent = '--°';
    if (flightTimeEl) flightTimeEl.textContent = '-- с';
    if (shellRadiusEl) shellRadiusEl.textContent = `${MORTAR_CONFIG.shellRadius} м`;
    if (pointsEl) pointsEl.textContent = '0/2';
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
    
    const distanceEl = document.getElementById('distance');
    const angleEl = document.getElementById('angle');
    const flightTimeEl = document.getElementById('flightTime');
    const shellRadiusEl = document.getElementById('shellRadius');
    const pointsEl = document.getElementById('points');
    
    if (distanceEl) distanceEl.textContent = '0000 m';
    if (angleEl) angleEl.textContent = '--°';
    if (flightTimeEl) flightTimeEl.textContent = '-- с';
    if (shellRadiusEl) shellRadiusEl.textContent = `${MORTAR_CONFIG.shellRadius} м`;
    if (pointsEl) pointsEl.textContent = '0/2';
}

function showHelp() {
    const popup = document.getElementById('helpPopup');
    if (popup) popup.classList.add('active');
}

function hideHelp() {
    const popup = document.getElementById('helpPopup');
    if (popup) popup.classList.remove('active');
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
            if (toggle) {
                toggle.checked = !toggle.checked;
                toggleMortarMode();
            }
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

const helpPopup = document.getElementById('helpPopup');
if (helpPopup) {
    helpPopup.addEventListener('click', function(e) {
        if (e.target === this) {
            hideHelp();
        }
    });
}

// Запуск
initMap();
// Счётчик посетителей
async function updateVisitorCount() {
    const counterEl = document.getElementById('visitorCount');
    if (!counterEl) return;
    
    try {
        const response = await fetch('https://api.countapi.xyz/hit/odia2-mortar-pubg/visits');
        const data = await response.json();
        const visitorCount = Math.floor(data.value / 10) + Math.floor(Math.random() * 5) + 1;
        counterEl.textContent = visitorCount;
        
        counterEl.style.transform = 'scale(1.3)';
        setTimeout(() => {
            counterEl.style.transform = 'scale(1)';
        }, 300);
    } catch (error) {
        counterEl.textContent = Math.floor(Math.random() * 10) + 1;
    }
}

// Запуск
