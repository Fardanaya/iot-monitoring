const ws = new WebSocket("ws://localhost:8080");

const devices = new Map();
const charts = new Map();
const maxDataPoints = 100;

ws.onopen = () => {
    updateConnectionStatus(true);
    console.log('Connected to WebSocket server');
};

ws.onclose = () => {
    updateConnectionStatus(false);
    console.log('Disconnected from WebSocket server');
};

ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateConnectionStatus(false);
};

ws.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);
        updateDeviceData(message.device_id, message.device_name || message.device_id, message.data);
    } catch (error) {
        console.error('Error parsing message:', error);
    }
};

function updateConnectionStatus(connected) {
    const indicator = document.getElementById('connectionStatus');
    const text = document.getElementById('connectionText');

    if (connected) {
        indicator.classList.add('connected');
        indicator.classList.remove('disconnected');
        text.textContent = 'Connected';
    } else {
        indicator.classList.remove('connected');
        indicator.classList.add('disconnected');
        text.textContent = 'Disconnected';
    }
}

function updateDeviceData(deviceId, deviceName, data) {
    if (!devices.has(deviceId)) {
        createDeviceCard(deviceId, deviceName);
        devices.set(deviceId, {
            id: deviceId,
            name: deviceName,
            uptime: 0,
            history: {
                cpu: [],
                ram: [],
                temp: [],
                battery: [],
                timestamps: []
            }
        });
    }

    devices.get(deviceId).uptime = data.uptime || 0;

    const device = devices.get(deviceId);
    const history = device.history;

    history.cpu.push(parseFloat(data.cpu));
    history.ram.push(parseFloat(data.ram));
    history.temp.push(parseFloat(data.temp));
    history.battery.push(parseFloat(data.battery));
    history.timestamps.push(new Date(data.timestamp));

    if (history.cpu.length > maxDataPoints) {
        history.cpu.shift();
        history.ram.shift();
        history.temp.shift();
        history.battery.shift();
        history.timestamps.shift();
    }

    updateDeviceUI(deviceId, data);
    updateDeviceChart(deviceId);
    updateActiveDevicesCount();

    document.getElementById('emptyState').style.display = 'none';
}

function createDeviceCard(deviceId, deviceName) {
    const container = document.getElementById('devicesContainer');

    const card = document.createElement('div');
    card.className = 'bg-white rounded-2xl shadow-xl p-6';
    card.id = `device-${deviceId}`;

    card.innerHTML = `
        <div class="flex items-center justify-between pb-4 mb-5 border-b-2 border-gray-100">
            <div class="flex items-center gap-3">
                <span class="text-3xl">💻</span>
                <h3 class="text-xl font-bold text-gray-900">${deviceName}</h3>
            </div>
            <div class="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-xs font-semibold">
                <span>⏱️</span>
                <span id="${deviceId}-uptime">0s</span>
            </div>
            <div class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-xs font-bold uppercase tracking-wide">
                <span class="w-2 h-2 bg-white rounded-full"></span>
                Active
            </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
            <!-- CPU Card -->
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-l-4 border-indigo-500">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-gray-600 uppercase tracking-wide">CPU Usage</span>
                    <span class="text-xl">⚡</span>
                </div>
                <div class="text-3xl font-bold text-gray-900">
                    <span id="${deviceId}-cpu">0</span><span class="text-base text-gray-500 ml-1">%</span>
                </div>
                <div class="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-out" 
                         id="${deviceId}-cpu-bar" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-l-4 border-green-500">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-gray-600 uppercase tracking-wide">RAM Usage</span>
                    <span class="text-xl">🧠</span>
                </div>
                <div class="text-3xl font-bold text-gray-900">
                    <span id="${deviceId}-ram">0</span><span class="text-base text-gray-500 ml-1">%</span>
                </div>
                <div class="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500 ease-out" 
                         id="${deviceId}-ram-bar" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-xl border-l-4 border-orange-500">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-gray-600 uppercase tracking-wide">Temperature</span>
                    <span class="text-xl">🌡️</span>
                </div>
                <div class="text-3xl font-bold text-gray-900">
                    <span id="${deviceId}-temp">0</span><span class="text-base text-gray-500 ml-1">°C</span>
                </div>
                <div class="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full transition-all duration-500 ease-out" 
                         id="${deviceId}-temp-bar" style="width: 0%"></div>
                </div>
            </div>
            
            <div class="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border-l-4 border-red-500">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-bold text-gray-600 uppercase tracking-wide">Battery</span>
                    <span class="text-xl">🔋</span>
                </div>
                <div class="text-3xl font-bold text-gray-900">
                    <span id="${deviceId}-battery">0</span><span class="text-base text-gray-500 ml-1">%</span>
                </div>
                <div class="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-red-500 to-pink-600 rounded-full transition-all duration-500 ease-out" 
                         id="${deviceId}-battery-bar" style="width: 0%"></div>
                </div>
            </div>
        </div>
        
        <div class="mt-6">
            <div class="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>📊</span> Performance History
            </div>
            <div class="bg-gray-50 p-5 rounded-xl h-64">
                <canvas id="${deviceId}-chart"></canvas>
            </div>
        </div>
        
        <div class="mt-5 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
            Last update: <span id="${deviceId}-timestamp" class="font-semibold text-gray-700">-</span>
        </div>
    `;

    container.appendChild(card);

    initializeChart(deviceId);
}
function updateDeviceUI(deviceId, data) {
    document.getElementById(`${deviceId}-cpu`).textContent = parseFloat(data.cpu).toFixed(1);
    document.getElementById(`${deviceId}-ram`).textContent = parseFloat(data.ram).toFixed(1);
    document.getElementById(`${deviceId}-temp`).textContent = parseFloat(data.temp).toFixed(1);
    document.getElementById(`${deviceId}-battery`).textContent = parseFloat(data.battery).toFixed(0);
    document.getElementById(`${deviceId}-cpu-bar`).style.width = `${data.cpu}%`;
    document.getElementById(`${deviceId}-ram-bar`).style.width = `${data.ram}%`;
    document.getElementById(`${deviceId}-temp-bar`).style.width = `${Math.min(data.temp, 100)}%`;
    document.getElementById(`${deviceId}-battery-bar`).style.width = `${data.battery}%`;

    const uptime = formatUptime(data.uptime || 0);
    document.getElementById(`${deviceId}-uptime`).textContent = uptime;

    const timestamp = new Date(data.timestamp).toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    document.getElementById(`${deviceId}-timestamp`).textContent = timestamp;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}
function initializeChart(deviceId) {
    const ctx = document.getElementById(`${deviceId}-chart`).getContext('2d');

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU %',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'RAM %',
                    data: [],
                    borderColor: '#48bb78',
                    backgroundColor: 'rgba(72, 187, 120, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Temp °C',
                    data: [],
                    borderColor: '#ed8936',
                    backgroundColor: 'rgba(237, 137, 54, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: {
                            family: 'Inter',
                            size: 11,
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 32, 44, 0.95)',
                    padding: 12,
                    titleFont: {
                        size: 13,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 12
                    },
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10
                        },
                        maxRotation: 0
                    }
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        }
    });

    charts.set(deviceId, chart);
}
function updateDeviceChart(deviceId) {
    const chart = charts.get(deviceId);
    const device = devices.get(deviceId);

    if (!chart || !device) return;

    const history = device.history;
    chart.data.labels = history.timestamps.map(t =>
        t.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    );
    chart.data.datasets[0].data = history.cpu;
    chart.data.datasets[1].data = history.ram;
    chart.data.datasets[2].data = history.temp;
    chart.update('none');
}
function updateActiveDevicesCount() {
    document.getElementById('activeDevices').textContent = devices.size;
}
