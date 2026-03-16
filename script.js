// Инициализация карты без стандартного слоя
const map = L.map('map', {
    minZoom: 1,
    maxZoom: 4,
    crs: L.CRS.Simple,
    center: [0, 0],
    zoom: 2
});

// Границы карты (для Erangel)
const bounds = [[0, 0], [1000, 1000]];

// Вставь имя своего файла карты здесь
const imageUrl = 'https://raw.githubusercontent.com/odia2/Mortar-PUBG/main/Erangel02.png';

L.imageOverlay(imageUrl, bounds).addTo(map);

// Ограничиваем карту границами
map.setMaxBounds(bounds);

// Хранилище для маркеров
let markers = [];
let points = [];

// Функция расчёта расстояния
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round((R * c) / 100);
}

// Обработка клика по карте
map.on('click', function(e) {
    if (points.length >= 2) {
        alert('Уже стоит 2 точки! Нажми "Очистить карту" чтобы начать заново.');
        return;
    }
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    const marker = L.marker([lat, lng]).addTo(map);
    markers.push(marker);
    points.push({lat, lng});
    
    document.getElementById('points').textContent = `Точек: ${points.length}/2`;
    
    if (points.length === 2) {
        const distance = calculateDistance(points[0].lat, points[0].lng, 
                                          points[1].lat, points[1].lng);
        document.getElementById('distance').textContent = `Дистанция: ${distance} м`;
        
        const polyline = L.polyline(points.map(p => [p.lat, p.lng]), {
            color: 'red',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(map);
        
        polyline.bindPopup(`<b>Дистанция:</b> ${distance} м`).openPopup();
    }
});

// Очистка карты
function clearPoints() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    points = [];
    location.reload();
}
