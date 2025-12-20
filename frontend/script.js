// Initialize Map
let map = L.map('map').setView([18.6298, 73.8037], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let favorites = [];
let currentUser = null;
let allResources = [...resources]; // Copy initial resources
let tempMarker = null; // For map click selection
let selectedMapCoords = null; // Store selected coordinates
let mapClickEnabled = false; // Flag for map click mode
let pickLocationMap = null; // Separate map for location picking
let searchMarker = null; // Marker for searched location

// Define custom icons
const icons = {
  hospital: L.divIcon({
    html: '<div style="background: #4285f4; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-hospital"></i></div>',
    className: 'custom-marker',
    iconSize: [35, 35]
  }),
  bloodbank: L.divIcon({
    html: '<div style="background: #ea4335; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-tint"></i></div>',
    className: 'custom-marker',
    iconSize: [35, 35]
  }),
  college: L.divIcon({
    html: '<div style="background: #fbbc04; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-graduation-cap"></i></div>',
    className: 'custom-marker',
    iconSize: [35, 35]
  }),
  govt: L.divIcon({
    html: '<div style="background: #34a853; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-landmark"></i></div>',
    className: 'custom-marker',
    iconSize: [35, 35]
  }),
  school: L.divIcon({
    html: '<div style="background: #9c27b0; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-school"></i></div>',
    className: 'custom-marker',
    iconSize: [35, 35]
  }),
  pharmacy: L.divIcon({
    html: '<div style="background: #00bcd4; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-pills"></i></div>',
    className: 'custom-marker',
    iconSize: [35, 35]
  })
};

// Load user-added resources from localStorage
function loadUserResources() {
  const userResources = JSON.parse(localStorage.getItem('userResources') || '[]');
  allResources = [...resources, ...userResources];
}

// Render Resources
function renderResources(list) {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';
  
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  if (list.length === 0) {
    sidebar.innerHTML = '<div class="loading">No resources found</div>';
    return;
  }

  list.forEach(item => {
    const isFavorite = favorites.includes(item.id);
    
    const card = document.createElement('div');
    card.className = `resource-card ${item.category}`;
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${item.name}</div>
          <span class="category-badge badge-${item.category}">${item.category}</span>
        </div>
        ${currentUser ? `<button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${item.id}, event)">
          <i class="fas fa-heart"></i>
        </button>` : ''}
      </div>
      <div class="card-info">
        <div class="card-info-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>${item.address}</span>
        </div>
        <div class="card-info-item">
          <i class="fas fa-phone"></i>
          <span>${item.phone}</span>
        </div>
        <div class="card-info-item">
          <i class="fas fa-clock"></i>
          <span>${item.hours}</span>
        </div>
        <div class="card-info-item">
          <div class="rating">
            <i class="fas fa-star"></i>
            <span>${item.rating}</span>
          </div>
        </div>
        ${item.emergency ? '<span class="emergency-tag">🚨 24/7 EMERGENCY</span>' : ''}
      </div>
    `;
    
    card.onclick = (e) => {
      if (!e.target.closest('.favorite-btn')) {
        map.setView([item.lat, item.lng], 16);
        markers.find(m => m.options.itemId === item.id).openPopup();
      }
    };
    
    sidebar.appendChild(card);

    const marker = L.marker([item.lat, item.lng], { 
      icon: icons[item.category],
      itemId: item.id
    })
      .addTo(map)
      .bindPopup(`
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 10px 0; font-size: 16px;">${item.name}</h3>
          <p style="margin: 5px 0; font-size: 13px;"><i class="fas fa-map-marker-alt"></i> ${item.address}</p>
          <p style="margin: 5px 0; font-size: 13px;"><i class="fas fa-phone"></i> ${item.phone}</p>
          <p style="margin: 5px 0; font-size: 13px;"><i class="fas fa-clock"></i> ${item.hours}</p>
          <div style="margin-top: 10px;">
            <a href="tel:${item.phone}" style="display: inline-block; padding: 8px 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 20px; font-size: 12px; font-weight: 600;">
              <i class="fas fa-phone"></i> Call Now
            </a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" style="display: inline-block; padding: 8px 15px; background: white; color: #667eea; border: 2px solid #667eea; text-decoration: none; border-radius: 20px; font-size: 12px; font-weight: 600; margin-left: 5px;">
              <i class="fas fa-directions"></i> Directions
            </a>
          </div>
        </div>
      `);
    
    markers.push(marker);
  });
}

// Initial load
loadUserResources();
renderResources(allResources);

// Filter by category
function filterCategory(category) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-category="${category}"]`).classList.add('active');

  if (category === 'all') {
    renderResources(allResources);
  } else {
    renderResources(allResources.filter(r => r.category === category));
  }
}

// Search functionality
document.getElementById('searchBox').addEventListener('input', (e) => {
  const searchText = e.target.value.toLowerCase();
  const filtered = allResources.filter(r =>
    r.name.toLowerCase().includes(searchText) ||
    r.address.toLowerCase().includes(searchText) ||
    r.category.toLowerCase().includes(searchText)
  );
  renderResources(filtered);
});

// Modal Functions
function openModal(type) {
  // Check if user is logged in for addResource modal
  if (type === 'addResource' && !currentUser) {
    alert('Please login first to add a service');
    openModal('login');
    return;
  }
  
  const modal = document.getElementById(type + 'Modal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(type) {
  const modal = document.getElementById(type + 'Modal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
  
  // Clear form
  const form = document.getElementById(type + 'Form');
  if (form) {
    form.reset();
  }
  
  const errorDiv = document.getElementById(type + 'Error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
  
  if (type === 'register' || type === 'addResource') {
    const successDiv = document.getElementById(type + 'Success');
    if (successDiv) {
      successDiv.style.display = 'none';
    }
  }
}

function switchModal(from, to) {
  closeModal(from);
  setTimeout(() => openModal(to), 200);
}

// Authentication Functions
function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');

  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    currentUser = { name: user.name, email: user.email };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    favorites = JSON.parse(localStorage.getItem('favorites_' + email) || '[]');
    
    updateUIForLoggedInUser();
    closeModal('login');
    
    setTimeout(() => {
      alert('Welcome back, ' + user.name + '!');
    }, 300);
  } else {
    errorDiv.textContent = 'Invalid email or password';
    errorDiv.style.display = 'block';
  }
}

function handleRegister(event) {
  event.preventDefault();
  
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;
  const errorDiv = document.getElementById('registerError');
  const successDiv = document.getElementById('registerSuccess');

  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  if (password !== confirmPassword) {
    errorDiv.textContent = 'Passwords do not match';
    errorDiv.style.display = 'block';
    return;
  }

  if (password.length < 6) {
    errorDiv.textContent = 'Password must be at least 6 characters';
    errorDiv.style.display = 'block';
    return;
  }

  const users = JSON.parse(localStorage.getItem('users') || '[]');
  
  if (users.find(u => u.email === email)) {
    errorDiv.textContent = 'Email already registered';
    errorDiv.style.display = 'block';
    return;
  }

  users.push({ name, email, password });
  localStorage.setItem('users', JSON.stringify(users));

  successDiv.textContent = 'Account created successfully! You can now login.';
  successDiv.style.display = 'block';

  document.getElementById('registerForm').reset();

  setTimeout(() => {
    switchModal('register', 'login');
    document.getElementById('loginEmail').value = email;
  }, 2000);
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    currentUser = null;
    favorites = [];
    localStorage.removeItem('currentUser');
    
    document.getElementById('userInfo').style.display = 'none';
    document.getElementById('userActions').style.display = 'flex';
    
    const activeFilter = document.querySelector('.filter-btn.active').dataset.category;
    filterCategory(activeFilter);
  }
}

function updateUIForLoggedInUser() {
  document.getElementById('userActions').style.display = 'none';
  document.getElementById('userInfo').style.display = 'flex';
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
  
  const activeFilter = document.querySelector('.filter-btn.active').dataset.category;
  filterCategory(activeFilter);
}

function toggleFavorite(resourceId, event) {
  event.stopPropagation();
  
  if (!currentUser) {
    alert('Please login to save favorites');
    openModal('login');
    return;
  }

  const index = favorites.indexOf(resourceId);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(resourceId);
  }

  localStorage.setItem('favorites_' + currentUser.email, JSON.stringify(favorites));
  
  const activeFilter = document.querySelector('.filter-btn.active').dataset.category;
  filterCategory(activeFilter);
}

// Area coordinates mapping
const areaCoordinates = {
  'Pimpri': { lat: 18.6298, lng: 73.8037 },
  'Chinchwad': { lat: 18.6420, lng: 73.7890 },
  'Akurdi': { lat: 18.6488, lng: 73.7702 },
  'Nigdi': { lat: 18.6621, lng: 73.7706 },
  'Thergaon': { lat: 18.6295, lng: 73.7565 },
  'Alandi': { lat: 18.6772, lng: 73.8986 },
  'Wakad': { lat: 18.5978, lng: 73.7636 },
  'Hinjewadi': { lat: 18.5912, lng: 73.7389 },
  'Bhosari': { lat: 18.6270, lng: 73.8467 },
  'Moshi': { lat: 18.6714, lng: 73.8358 },
  'Chakan': { lat: 18.7606, lng: 73.8636 },
  'Dehu Road': { lat: 18.7217, lng: 73.7547 }
};

// Toggle custom area fields
function toggleCustomArea() {
  const areaSelect = document.getElementById('resourceArea');
  const customSection = document.getElementById('customAreaSection');
  const mapSection = document.getElementById('mapSelectionSection');
  const autoHelp = document.getElementById('autoLocationHelp');
  
  // Reset map click mode
  mapClickEnabled = false;
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
  selectedMapCoords = null;
  
  if (areaSelect.value === 'custom') {
    customSection.style.display = 'block';
    mapSection.style.display = 'none';
    autoHelp.style.display = 'none';
    document.getElementById('customAreaName').required = true;
    document.getElementById('resourceLat').required = true;
    document.getElementById('resourceLng').required = true;
  } else if (areaSelect.value === 'map') {
    customSection.style.display = 'none';
    mapSection.style.display = 'block';
    autoHelp.style.display = 'none';
    document.getElementById('customAreaName').required = false;
    document.getElementById('resourceLat').required = false;
    document.getElementById('resourceLng').required = false;
    
    // Initialize pick location map
    setTimeout(() => {
      if (!pickLocationMap) {
        pickLocationMap = L.map('pickLocationMap').setView([18.6298, 73.8037], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(pickLocationMap);
        
        // Add click event to pick location map
        pickLocationMap.on('click', function(e) {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;
          
          // Remove previous temp marker
          if (tempMarker) {
            pickLocationMap.removeLayer(tempMarker);
          }
          
          // Add new temp marker with animation
          tempMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              html: '<div style="background: #ff5252; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 3px 10px rgba(0,0,0,0.4); animation: pulse 1.5s infinite;"><i class="fas fa-map-pin"></i></div>',
              className: 'temp-marker',
              iconSize: [40, 40]
            })
          }).addTo(pickLocationMap);
          
          // Store coordinates
          selectedMapCoords = { lat, lng };
          
          // Update UI
          document.getElementById('selectedLocation').style.display = 'block';
          document.getElementById('selectedCoords').textContent = 
            `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        });
      } else {
        pickLocationMap.invalidateSize();
      }
    }, 100);
    
    document.getElementById('selectedLocation').style.display = 'none';
  } else {
    customSection.style.display = 'none';
    mapSection.style.display = 'none';
    autoHelp.style.display = 'block';
    document.getElementById('customAreaName').required = false;
    document.getElementById('resourceLat').required = false;
    document.getElementById('resourceLng').required = false;
  }
}

// Search on map function
function searchOnMap() {
  const searchQuery = document.getElementById('mapSearchBox').value.trim();
  
  if (!searchQuery) {
    alert('Please enter a location to search');
    return;
  }
  
  // Use Nominatim API for geocoding (free OpenStreetMap service)
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Pune, Maharashtra, India')}&limit=1`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        
        // Center map on searched location
        pickLocationMap.setView([lat, lng], 15);
        
        // Remove previous search marker
        if (searchMarker) {
          pickLocationMap.removeLayer(searchMarker);
        }
        
        // Add search result marker
        searchMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            html: '<div style="background: #4285f4; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"><i class="fas fa-search"></i></div>',
            className: 'search-marker',
            iconSize: [35, 35]
          })
        }).addTo(pickLocationMap)
          .bindPopup(`<strong>${data[0].display_name}</strong><br><small>Click on map to select exact location</small>`)
          .openPopup();
        
        // Show instruction
        alert('Location found! Now click on the exact spot on the map to select it.');
      } else {
        alert('Location not found. Try searching with different keywords (e.g., "Pimpri Hospital", "Chinchwad Station")');
      }
    })
    .catch(error => {
      console.error('Search error:', error);
      alert('Unable to search. Please try again or click directly on the map.');
    });
}

// Add enter key support for map search
document.addEventListener('DOMContentLoaded', function() {
  const mapSearchBox = document.getElementById('mapSearchBox');
  if (mapSearchBox) {
    mapSearchBox.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchOnMap();
      }
    });
  }
});

// Handle Add Resource Form
function handleAddResource(event) {
  event.preventDefault();
  
  if (!currentUser) {
    alert('Please login first');
    return;
  }

  const errorDiv = document.getElementById('addResourceError');
  const successDiv = document.getElementById('addResourceSuccess');
  
  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  const name = document.getElementById('resourceName').value;
  const category = document.getElementById('resourceCategory').value;
  const address = document.getElementById('resourceAddress').value;
  const phone = document.getElementById('resourcePhone').value;
  const hours = document.getElementById('resourceHours').value;
  const area = document.getElementById('resourceArea').value;
  const emergency = document.getElementById('resourceEmergency').checked;

  let lat, lng;

  // Check if map selection is used
  if (area === 'map') {
    if (!selectedMapCoords) {
      errorDiv.textContent = 'Please click on the map to select a location';
      errorDiv.style.display = 'block';
      return;
    }
    
    lat = selectedMapCoords.lat;
    lng = selectedMapCoords.lng;
    
  } else if (area === 'custom') {
    // Custom coordinates entry
    const customAreaName = document.getElementById('customAreaName').value;
    const customLat = parseFloat(document.getElementById('resourceLat').value);
    const customLng = parseFloat(document.getElementById('resourceLng').value);

    if (!customAreaName || !customLat || !customLng) {
      errorDiv.textContent = 'Please fill all custom location fields';
      errorDiv.style.display = 'block';
      return;
    }

    if (customLat < 18.3 || customLat > 19.0 || customLng < 73.5 || customLng > 74.2) {
      errorDiv.textContent = 'Coordinates must be within Pune region';
      errorDiv.style.display = 'block';
      return;
    }

    lat = customLat;
    lng = customLng;
    
  } else {
    // Use predefined area coordinates
    if (!name || !category || !address || !phone || !hours || !area) {
      errorDiv.textContent = 'Please fill all required fields';
      errorDiv.style.display = 'block';
      return;
    }

    // Get coordinates from selected area
    const coords = areaCoordinates[area];
    if (!coords) {
      errorDiv.textContent = 'Invalid area selected';
      errorDiv.style.display = 'block';
      return;
    }

    lat = coords.lat + (Math.random() - 0.5) * 0.01; // Add small random offset
    lng = coords.lng + (Math.random() - 0.5) * 0.01;
  }

  // Get existing user resources
  const userResources = JSON.parse(localStorage.getItem('userResources') || '[]');
  
  // Create new resource
  const newResource = {
    id: Date.now(), // Use timestamp as unique ID
    name,
    category,
    address,
    phone,
    hours,
    lat,
    lng,
    rating: 0, // New resources start with 0 rating
    emergency,
    addedBy: currentUser.email,
    addedAt: new Date().toISOString()
  };

  // Add to user resources
  userResources.push(newResource);
  localStorage.setItem('userResources', JSON.stringify(userResources));

  // Reload all resources
  loadUserResources();

  successDiv.textContent = 'Service added successfully! It will appear on the map.';
  successDiv.style.display = 'block';

  document.getElementById('addResourceForm').reset();
  
  // Clean up temp marker and map
  if (tempMarker && pickLocationMap) {
    pickLocationMap.removeLayer(tempMarker);
    tempMarker = null;
  }
  if (searchMarker && pickLocationMap) {
    pickLocationMap.removeLayer(searchMarker);
    searchMarker = null;
  }
  selectedMapCoords = null;
  mapClickEnabled = false;
  
  document.getElementById('mapSearchBox').value = '';

  // Re-render with new resource
  renderResources(allResources);

  // Zoom to new location
  setTimeout(() => {
    map.setView([lat, lng], 16);
  }, 500);

  // Close modal after 2 seconds
  setTimeout(() => {
    closeModal('addResource');
  }, 2000);
}

// Check if user is already logged in on page load
window.addEventListener('load', () => {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    favorites = JSON.parse(localStorage.getItem('favorites_' + currentUser.email) || '[]');
    updateUIForLoggedInUser();
  }
});

// Close modal on outside click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      const modalType = modal.id.replace('Modal', '');
      closeModal(modalType);
    }
  });
});

// Prevent modal content click from closing modal
document.querySelectorAll('.modal-content').forEach(content => {
  content.addEventListener('click', (e) => {
    e.stopPropagation();
  });
});