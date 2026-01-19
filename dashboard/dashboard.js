const ws = new WebSocket("ws://localhost:8080");

const devices = new Map();
const charts = new Map();
const maxDataPoints = 100;

ws.onopen = () => {
    updateConnectionStatus(true);
    console.log('Connected to WebSocket server');
    loadDevicesAndHistory();
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

async function loadDevicesAndHistory() {
    try {
        const response = await fetch('http://localhost:3000/api/devices');
        const result = await response.json();

        if (!result.success || !result.devices || result.devices.length === 0) {
            console.log('No devices found in database');
            return;
        }

        for (const device of result.devices) {
            const metricsResponse = await fetch(`http://localhost:3000/api/metrics/${device.device_id}/latest?limit=50`);
            const metricsResult = await metricsResponse.json();

            if (metricsResult.success && metricsResult.metrics && metricsResult.metrics.length > 0) {
                const metrics = metricsResult.metrics.reverse();

                createDeviceCard(device.device_id, device.device_name);
                devices.set(device.device_id, {
                    id: device.device_id,
                    name: device.device_name,
                    uptime: 0,
                    history: {
                        cpu: [],
                        ram: [],
                        temp: [],
                        battery: [],
                        timestamps: []
                    }
                });

                const deviceData = devices.get(device.device_id);

                for (const metric of metrics) {
                    deviceData.history.cpu.push(parseFloat(metric.cpu));
                    deviceData.history.ram.push(parseFloat(metric.ram));
                    deviceData.history.temp.push(parseFloat(metric.temp));
                    deviceData.history.battery.push(parseFloat(metric.battery));
                    deviceData.history.timestamps.push(new Date(metric.timestamp));
                }

                if (metrics.length > 0) {
                    const latestMetric = metrics[metrics.length - 1];
                    updateDeviceUI(device.device_id, {
                        cpu: latestMetric.cpu,
                        ram: latestMetric.ram,
                        temp: latestMetric.temp,
                        battery: latestMetric.battery,
                        timestamp: latestMetric.timestamp,
                        uptime: 0
                    });
                }

                updateDeviceChart(device.device_id);
                document.getElementById('emptyState').style.display = 'none';
            }
        }

        updateActiveDevicesCount();
        console.log(`Loaded ${result.devices.length} devices with historical data`);
    } catch (error) {
        console.error('Error loading historical data:', error);
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
    card.className = 'bg-white rounded-xl border border-slate-200 p-6 transition-all duration-300 hover:shadow-card';
    card.id = `device-${deviceId}`;

    // SVG Icons
    const icons = {
        cpu: '<svg class="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>',
        ram: '<svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>',
        temp: '<svg class="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>',
        battery: '<svg class="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>',
        device: '<svg class="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>'
    };

    card.innerHTML = `
        <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-3">
                <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    ${icons.device}
                </div>
                <div>
                    <h3 class="text-sm font-semibold text-slate-900 leading-tight">${deviceName}</h3>
                    <p class="text-[11px] text-slate-400 font-medium font-mono mt-0.5">${deviceId}</p>
                </div>
            </div>
            <div class="flex flex-col items-end">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 mb-1">
                    ACTIVE
                </span>
                <span class="text-[10px] text-slate-400 font-mono" id="${deviceId}-uptime">00:00:00</span>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                <div class="flex items-center gap-2 mb-2">
                    ${icons.cpu}
                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CPU</span>
                </div>
                <div class="flex items-baseline justify-between">
                    <span class="text-2xl font-bold text-slate-800"><span id="${deviceId}-cpu">0</span><span class="text-sm text-slate-400 font-normal">%</span></span>
                    <div class="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div id="${deviceId}-cpu-bar" class="h-full bg-blue-500 rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <div class="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                <div class="flex items-center gap-2 mb-2">
                    ${icons.ram}
                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">RAM</span>
                </div>
                <div class="flex items-baseline justify-between">
                    <span class="text-2xl font-bold text-slate-800"><span id="${deviceId}-ram">0</span><span class="text-sm text-slate-400 font-normal">%</span></span>
                    <div class="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div id="${deviceId}-ram-bar" class="h-full bg-emerald-500 rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <div class="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                <div class="flex items-center gap-2 mb-2">
                    ${icons.temp}
                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Temp</span>
                </div>
                <div class="flex items-baseline justify-between">
                    <span class="text-2xl font-bold text-slate-800"><span id="${deviceId}-temp">0</span><span class="text-sm text-slate-400 font-normal">°C</span></span>
                    <div class="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div id="${deviceId}-temp-bar" class="h-full bg-orange-400 rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <div class="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                <div class="flex items-center gap-2 mb-2">
                    ${icons.battery}
                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Battery</span>
                </div>
                <div class="flex items-baseline justify-between">
                    <span class="text-2xl font-bold text-slate-800"><span id="${deviceId}-battery">0</span><span class="text-sm text-slate-400 font-normal">%</span></span>
                    <div class="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div id="${deviceId}-battery-bar" class="h-full bg-red-500 rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-6">
            <div class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Performance History</div>
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 h-48">
                <canvas id="${deviceId}-chart"></canvas>
            </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
            <span class="text-[10px] text-slate-400">Last Sync</span>
            <span class="text-[10px] font-medium text-slate-600 font-mono" id="${deviceId}-timestamp">-</span>
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
                    label: 'CPU',
                    data: [],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'RAM',
                    data: [],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Temp',
                    data: [],
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Battery',
                    data: [],
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.05)',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 4,
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
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 8,
                    titleFont: { family: 'Inter', size: 11 },
                    bodyFont: { family: 'Inter', size: 11 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: '#f1f5f9',
                        drawBorder: false
                    },
                    ticks: {
                        display: false,
                        font: { size: 9 }
                    }
                },
                x: {
                    display: false,
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 0
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
    chart.data.labels = history.timestamps.map(t => {
        const day = String(t.getDate()).padStart(2, '0');
        const month = String(t.getMonth() + 1).padStart(2, '0');
        const hours = String(t.getHours()).padStart(2, '0');
        const minutes = String(t.getMinutes()).padStart(2, '0');
        const seconds = String(t.getSeconds()).padStart(2, '0');
        return `${day}/${month} ${hours}:${minutes}:${seconds}`;
    });
    chart.data.datasets[0].data = history.cpu;
    chart.data.datasets[1].data = history.ram;
    chart.data.datasets[2].data = history.temp;
    chart.data.datasets[3].data = history.battery;
    chart.update('none');
}
function updateActiveDevicesCount() {
    document.getElementById('activeDevices').textContent = devices.size;
}
