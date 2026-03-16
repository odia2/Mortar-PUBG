// Инициализация карты
const map = L.map('map', {
    minZoom: 1,
    maxZoom: 4,
    crs: L.CRS.Simple,
    center: [0, 0],
    zoom: 1
});

// Границы карты
const bounds = [[0, 0], [1267, 1269]];

// Прямая ссылка на твою карту (не тайлы!)
const imageUrl = 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/PUBG_Erangel_Remaster.png';

// Добавляем изображение
L.imageOverlay(imageUrl, bounds).addTo(map);

// Ограничиваем карту
map.setMaxBounds(bounds);

// Центрируем
map.fitBounds(bounds);

// Маркеры
let markers = [];
let points = [];

// Расчёт расстояния
function calculateDistance(lat1, lon1, lat2, lon2) {
    const dx = lon2 - lon1;
    const dy = lat2 - lat1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return Math.round(distance * 6.31);
}

// Клик по карте
map.on('click', function(e) {
    if (points.length >= 2) {
        alert('Уже 2 точки! Нажми "Очистить" для сброса.');
        return;
    }
    
    const marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
    markers.push(marker);
    points.push({lat: e.latlng.lat, lng: e.latlng.lng});
    
    document.getElementById('points').textContent = `Точек: ${points.length}/2`;
    
    if (points.length === 2) {
        const distance = calculateDistance(points[0].lat, points[0].lng, 
                                          points[1].lat, points[1].lng);
        document.getElementById('distance').textContent = `Дистанция: ${distance} м`;
        
        L.polyline(points.map(p => [p.lat, p.lng]), {
            color: 'red',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(map).bindPopup(`<b>Дистанция:</b> ${distance} м`).openPopup();
    }
});

// Очистка
function clearPoints() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    points = [];
    location.reload();
}
