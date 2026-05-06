// ============================================
// Tshwane Bus Stops Map
// Interactive Map for Finding Bus Stops in Pretoria CBD
// ============================================

// Bus Stops Data - Pretoria CBD and surrounding areas
const busStopsData = [
    {
        id: 1,
        name: "Pretoria Station Central",
        lat: -25.7461,
        lng: 28.2323,
        routes: ["1", "2", "3", "5", "7", "12"],
        address: "Church Street, Pretoria CBD",
        amenities: ["Shelter", "Bench", "CCTV", "Lighting"],
        rating: 4.5
    },
    {
        id: 2,
        name: "Church Square",
        lat: -25.7439,
        lng: 28.2345,
        routes: ["2", "4", "6", "11"],
        address: "Church Street, Pretoria CBD",
        amenities: ["Shelter", "Bench", "CCTV"],
        rating: 4.3
    },
    {
        id: 3,
        name: "Sammy Marks Square",
        lat: -25.7480,
        lng: 28.2290,
        routes: ["1", "3", "5", "8", "15"],
        address: "Pretorius Street, Pretoria CBD",
        amenities: ["Shelter", "Bin", "CCTV", "Lighting"],
        rating: 4.6
    },
    {
        id: 4,
        name: "Preller Square",
        lat: -25.7505,
        lng: 28.2350,
        routes: ["2", "6", "9", "14"],
        address: "Vervoerd Street, Pretoria CBD",
        amenities: ["Shelter", "Bench", "CCTV"],
        rating: 4.2
    },
    {
        id: 5,
        name: "Skwatta Interchange",
        lat: -25.7520,
        lng: 28.2200,
        routes: ["1", "2", "3", "4", "5", "7"],
        address: "Skwatta Street, Pretoria",
        amenities: ["Shelter", "Bench", "CCTV", "Lighting", "Vendor"],
        rating: 4.4
    },
    {
        id: 6,
        name: "Menlyn Park",
        lat: -25.7600,
        lng: 28.2400,
        routes: ["10", "11", "15", "18"],
        address: "Main Road, Menlyn",
        amenities: ["Shelter", "Bench", "Lighting"],
        rating: 4.1
    },
    {
        id: 7,
        name: "Hatfield Station",
        lat: -25.7700,
        lng: 28.2450,
        routes: ["3", "5", "8", "12", "16"],
        address: "Grosvenor Street, Hatfield",
        amenities: ["Shelter", "Bench", "CCTV", "Lighting"],
        rating: 4.7
    },
    {
        id: 8,
        name: "Brooklyn Mall",
        lat: -25.7550,
        lng: 28.2500,
        routes: ["6", "9", "13", "17"],
        address: "Pretoria Road, Brooklyn",
        amenities: ["Shelter", "Bench", "CCTV"],
        rating: 4.3
    },
    {
        id: 9,
        name: "Arcadia Station",
        lat: -25.7650,
        lng: 28.2250,
        routes: ["2", "4", "7", "11"],
        address: "University Road, Arcadia",
        amenities: ["Shelter", "Bench", "Lighting"],
        rating: 4.2
    },
    {
        id: 10,
        name: "Sunnyside Terminus",
        lat: -25.7580,
        lng: 28.2350,
        routes: ["1", "5", "10", "14", "19"],
        address: "Dey Street, Sunnyside",
        amenities: ["Shelter", "Bench", "CCTV", "Lighting"],
        rating: 4.5
    },
    {
        id: 11,
        name: "New Market Station",
        lat: -25.7470,
        lng: 28.2400,
        routes: ["3", "6", "8", "12"],
        address: "Vermeulen Street, Pretoria",
        amenities: ["Shelter", "Vendor", "Lighting"],
        rating: 4.1
    },
    {
        id: 12,
        name: "Wonderboom Junction",
        lat: -25.7550,
        lng: 28.2150,
        routes: ["2", "5", "9", "15"],
        address: "Wonderboom Road, Pretoria",
        amenities: ["Shelter", "Bench", "CCTV"],
        rating: 4.4
    }
];

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    populateBusStopsList();
    setupSearchFunctionality();
});

// ============================================
// Map Initialization
// ============================================

let map;
let markers = {};
let selectedMarker = null;

function initializeMap() {
    // Center on Pretoria CBD
    const center = [-25.7461, 28.2323];
    
    // Create map
    map = L.map('busStopsMap').setView(center, 13);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 11
    }).addTo(map);
    
    // Add bus stops to map
    busStopsData.forEach(stop => {
        addMarkerToMap(stop);
    });
    
    // Add geolocation button
    addGeolocationButton();
}

// ============================================
// Add Marker to Map
// ============================================

function addMarkerToMap(stop) {
    // Create custom icon
    const icon = L.divIcon({
        html: `<div style="background-color: #27ae60; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
                <i class="bi bi-bus-front" style="font-size: 16px;"></i>
              </div>`,
        className: 'bus-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    
    // Create marker
    const marker = L.marker([stop.lat, stop.lng], { icon: icon })
        .bindPopup(createPopupContent(stop), { maxWidth: 300 })
        .addTo(map);
    
    // Store marker reference
    markers[stop.id] = marker;
    
    // Add click event
    marker.on('click', function() {
        selectBusStop(stop.id);
    });
}

// ============================================
// Create Popup Content
// ============================================

function createPopupContent(stop) {
    const routesList = stop.routes.map(r => `<span class="route-badge">Route ${r}</span>`).join('');
    
    return `
        <div style="font-family: 'Segoe UI', sans-serif;">
            <h6 style="color: #27ae60; font-weight: bold; margin-bottom: 8px;">
                <i class="bi bi-bus-front"></i> ${stop.name}
            </h6>
            <p style="margin: 4px 0; font-size: 13px; color: #666;">
                <i class="bi bi-geo-alt"></i> ${stop.address}
            </p>
            <div style="margin: 8px 0;">
                ${routesList}
            </div>
            <p style="margin: 4px 0; font-size: 12px; color: #27ae60;">
                <i class="bi bi-star-fill"></i> Rating: ${stop.rating}/5.0
            </p>
            <button class="btn btn-sm btn-green" style="width: 100%; margin-top: 8px; font-size: 12px;" 
                    onclick="selectBusStop(${stop.id}); return false;">
                View Details
            </button>
        </div>
    `;
}

// ============================================
// Select Bus Stop
// ============================================

function selectBusStop(stopId) {
    const stop = busStopsData.find(s => s.id === stopId);
    if (!stop) return;
    
    // Update selected marker
    Object.values(markers).forEach(m => {
        m.closePopup();
    });
    
    markers[stopId].openPopup();
    map.setView([stop.lat, stop.lng], 15);
    
    // Update sidebar
    updateSelectedStopInfo(stop);
    
    // Highlight list item
    document.querySelectorAll('.bus-stop-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.stopId === String(stopId)) {
            item.classList.add('active');
        }
    });
}

// ============================================
// Update Selected Stop Information
// ============================================

function updateSelectedStopInfo(stop) {
    const amenitiesList = stop.amenities.map(a => 
        `<span class="badge bg-green-primary me-2 mb-2">${a}</span>`
    ).join('');
    
    const routesList = stop.routes.map(r => 
        `<span class="route-badge">Route ${r}</span>`
    ).join('');
    
    const html = `
        <h6 class="text-green-primary fw-bold mb-3">${stop.name}</h6>
        <p class="mb-2">
            <strong>Address:</strong> ${stop.address}
        </p>
        <p class="mb-2">
            <strong>Rating:</strong> <i class="bi bi-star-fill"></i> ${stop.rating}/5.0
        </p>
        <div class="mb-3">
            <strong>Available Routes:</strong><br>
            ${routesList}
        </div>
        <div>
            <strong>Amenities:</strong><br>
            ${amenitiesList}
        </div>
        <button class="btn btn-sm btn-green w-100 mt-3" onclick="openDirectionsModal(${stop.lat}, ${stop.lng}, '${stop.name}')">
            <i class="bi bi-arrow-up-right-square"></i> Get Directions
        </button>
    `;
    
    document.getElementById('selectedStopInfo').innerHTML = html;
}

// ============================================
// Populate Bus Stops List
// ============================================

function populateBusStopsList() {
    const listContainer = document.getElementById('busStopsList');
    
    const html = busStopsData.map(stop => `
        <div class="bus-stop-item" data-stop-id="${stop.id}" onclick="selectBusStop(${stop.id})">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1" style="font-weight: 600;">
                        <i class="bi bi-bus-front"></i> ${stop.name}
                    </h6>
                    <small class="text-muted d-block mb-1">${stop.address}</small>
                    <div>
                        ${stop.routes.map(r => `<span class="route-badge" style="font-size: 10px;">${r}</span>`).join('')}
                    </div>
                </div>
                <i class="bi bi-chevron-right text-green-primary"></i>
            </div>
        </div>
    `).join('');
    
    listContainer.innerHTML = html;
    document.getElementById('stopCount').textContent = busStopsData.length;
}

// ============================================
// Search Functionality
// ============================================

function setupSearchFunctionality() {
    const searchInput = document.getElementById('searchStops');
    
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        if (searchTerm === '') {
            populateBusStopsList();
            return;
        }
        
        const filtered = busStopsData.filter(stop => 
            stop.name.toLowerCase().includes(searchTerm) ||
            stop.address.toLowerCase().includes(searchTerm) ||
            stop.routes.some(r => r.includes(searchTerm))
        );
        
        displayFilteredStops(filtered);
    });
}

function displayFilteredStops(filteredStops) {
    const listContainer = document.getElementById('busStopsList');
    
    if (filteredStops.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center p-4 text-muted">
                <i class="bi bi-search" style="font-size: 32px;"></i>
                <p class="mt-2">No bus stops found</p>
            </div>
        `;
        return;
    }
    
    const html = filteredStops.map(stop => `
        <div class="bus-stop-item" data-stop-id="${stop.id}" onclick="selectBusStop(${stop.id})">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1" style="font-weight: 600;">
                        <i class="bi bi-bus-front"></i> ${stop.name}
                    </h6>
                    <small class="text-muted d-block mb-1">${stop.address}</small>
                    <div>
                        ${stop.routes.map(r => `<span class="route-badge" style="font-size: 10px;">${r}</span>`).join('')}
                    </div>
                </div>
                <i class="bi bi-chevron-right text-green-primary"></i>
            </div>
        </div>
    `).join('');
    
    listContainer.innerHTML = html;
}

// ============================================
// Geolocation
// ============================================

function addGeolocationButton() {
    document.getElementById('locateMe').addEventListener('click', function() {
        if (navigator.geolocation) {
            this.disabled = true;
            this.innerHTML = '<i class="bi bi-arrow-repeat"></i> Locating...';
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const userLat = position.coords.latitude;
                    const userLng = position.coords.longitude;
                    
                    // Add user location marker
                    L.marker([userLat, userLng], {
                        icon: L.icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41],
                            popupAnchor: [1, -34],
                            shadowSize: [41, 41]
                        })
                    }).addTo(map).bindPopup('Your Location');
                    
                    // Center map on user
                    map.setView([userLat, userLng], 14);
                    
                    // Find nearest stops
                    findNearestStops(userLat, userLng);
                    
                    // Re-enable button
                    document.getElementById('locateMe').disabled = false;
                    document.getElementById('locateMe').innerHTML = '<i class="bi bi-geo"></i> My Location';
                },
                function(error) {
                    alert('Could not get your location. Please enable location services.');
                    document.getElementById('locateMe').disabled = false;
                    document.getElementById('locateMe').innerHTML = '<i class="bi bi-geo"></i> My Location';
                }
            );
        } else {
            alert('Geolocation is not supported by your browser');
        }
    });
}

// ============================================
// Find Nearest Stops
// ============================================

function findNearestStops(userLat, userLng) {
    // Calculate distance to each stop
    const distances = busStopsData.map(stop => {
        const distance = calculateDistance(userLat, userLng, stop.lat, stop.lng);
        return { ...stop, distance };
    });
    
    // Sort by distance
    distances.sort((a, b) => a.distance - b.distance);
    
    // Show 5 nearest stops
    const nearest = distances.slice(0, 5);
    
    console.log('Nearest bus stops to you:');
    nearest.forEach((stop, index) => {
        console.log(`${index + 1}. ${stop.name} - ${stop.distance.toFixed(2)} km away`);
    });
}

// ============================================
// Calculate Distance (Haversine Formula)
// ============================================

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ============================================
// Directions Modal
// ============================================

function openDirectionsModal(lat, lng, stopName) {
    const buttonsContainer = document.getElementById('directionsButtons');
    
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${stopName}`;
    const appleMapsUrl = `https://maps.apple.com/?daddr=${lat},${lng}`;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    
    buttonsContainer.innerHTML = `
        <a href="${googleMapsUrl}" target="_blank" class="btn btn-outline-green">
            <i class="bi bi-map"></i> Google Maps
        </a>
        <a href="${appleMapsUrl}" target="_blank" class="btn btn-outline-green">
            <i class="bi bi-apple"></i> Apple Maps
        </a>
        <a href="${wazeUrl}" target="_blank" class="btn btn-outline-green">
            <i class="bi bi-navigation"></i> Waze
        </a>
        <small class="text-muted text-center d-block mt-3">
            <i class="bi bi-info-circle"></i> Directions will open in a new window
        </small>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('directionsModal'));
    modal.show();
}

// ============================================
// Export Functions for Global Use
// ============================================

window.selectBusStop = selectBusStop;
window.openDirectionsModal = openDirectionsModal;
