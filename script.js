// Инициализация карты (координаты центра Erangel)
const map = L.map('map').setView([41.3, 130.4], 10);

// Добавляем слой карты (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Хранилище для маркеров
let markers = [];
let points = [];

// Функция расчёта расстояния между двумя точками (формула Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Радиус Земли в метрах
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c); // Расстояние в метрах
}

// Обработка клика по карте
map.on('click', function(e) {
    if (points.length >= 2) {
        alert('Уже стоит 2 точки! Нажми "Очистить карту" чтобы начать заново.');
        return;
    }
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Добавляем маркер
    const marker = L.marker([lat, lng]).addTo(map);
    markers.push(marker);
    points.push({lat, lng});
    
    // Обновляем счётчик
    document.getElementById('points').textContent = `Точек: ${points.length}/2`;
    
    // Если 2 точки - считаем расстояние
    if (points.length === 2) {
        const distance = calculateDistance(points[0].lat, points[0].lng, 
                                          points[1].lat, points[1].lng);
        document.getElementById('distance').textContent = `Дистанция: ${distance} м`;
        
        // Рисуем линию между точками
        const polyline = L.polyline(points.map(p => [p.lat, p.lng]), {
            color: 'red',
            weight: 3,
            opacity: 0.8,
            dashArray: '10, 10'
        }).addTo(map);
        
        // Показываем всплывающее окно с дистанцией
        polyline.bindPopup(`<b>Дистанция:</b> ${distance} м`).openPopup();
    }
});

// Очистка карты
function clearPoints() {
    // Удаляем все маркеры
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    points = [];
    
    // Перезагружаем страницу для удаления линий
    location.reload();
}

// Добавляем информацию о текущей позиции
map.on('mousemove', function(e) {
    const lat = e.latlng.lat.toFixed(4);
    const lng = e.latlng.lng.toFixed(4);
    document.title = `Mortar Calculator - ${lat}, ${lng}`;
});