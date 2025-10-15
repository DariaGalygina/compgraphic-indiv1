let points = [];
let hull = [];
let isStepByStep = false;
let algorithmState = null;
let canvasWidth = 0;
let canvasHeight = 0;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const stepControls = document.getElementById('stepControls');

function initCanvas() {
    const container = canvas.parentElement;
    canvasWidth = container.clientWidth;
    canvasHeight = 500;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
}

function init() {
    initCanvas();
    
    // Обработчики событий холста
    canvas.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', initCanvas);
    
    addRandomPoints(8);
    updateDisplay();
}

// Обработчик клика по холсту
function handleCanvasClick(event) {
    if (isStepByStep) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    points.push({ x, y });
    updateDisplay();
}

// Генерация случайных точек
function addRandomPoints(count) {
    const padding = 30;
    const usedPositions = new Set();
    
    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let x, y, positionKey;
        
        do {
            x = padding + Math.random() * (canvasWidth - 2 * padding);
            y = padding + Math.random() * (canvasHeight - 2 * padding);
            
            const gridX = Math.floor(x / 20);
            const gridY = Math.floor(y / 20);
            positionKey = `${gridX},${gridY}`;
            attempts++;
            
            if (attempts > 50) break;
            
        } while (usedPositions.has(positionKey));
        
        usedPositions.add(positionKey);
        points.push({ x, y });
    }
    updateDisplay();
}

function clearPoints() {
    points = [];
    hull = [];
    algorithmState = null;
    isStepByStep = false;
    stepControls.style.display = 'none';
    updateDisplay();
}

function clearHull() {
    hull = [];
    algorithmState = null;
    updateDisplay();
}

function runJarvis() {
    if (points.length < 3) {
        alert('Нужно как минимум 3 точки для построения выпуклой оболочки!');
        return;
    }
    
    hull = jarvisMarch(points);
    updateDisplay();
}

// Пошаговое выполнение алгоритма
function stepByStep() {
    if (points.length < 3) {
        alert('Нужно как минимум 3 точки для построения выпуклой оболочки!');
        return;
    }
    
    isStepByStep = true;
    stepControls.style.display = 'flex';
    
    const startIndex = findLeftmostPoint(points);
    
    algorithmState = {
        points: [...points],
        hull: [],
        currentPointIndex: startIndex,
        nextPointIndex: (startIndex + 1) % points.length,
        checkedPoints: [],
        step: 0,
        startPointIndex: startIndex,
        phase: 'start'
    };
    
    updateStepDisplay();
}

// Следующий шаг алгоритма
function nextStep() {
    if (!algorithmState) return;
    
    const state = algorithmState;
    state.step++;
    
    if (state.phase === 'start') {
        state.hull.push(state.points[state.currentPointIndex]);
        state.phase = 'checking';
        state.checkedPoints = [];
    }
    else if (state.phase === 'checking') {
        let nextCheckIndex = -1;
        
        for (let i = 0; i < state.points.length; i++) {
            if (i !== state.currentPointIndex && !state.checkedPoints.includes(i)) {
                nextCheckIndex = i;
                break;
            }
        }
        
        if (nextCheckIndex !== -1) {
            state.checkedPoints.push(nextCheckIndex);
            
            const orientation = getOrientation(
                state.points[state.currentPointIndex],
                state.points[nextCheckIndex],
                state.points[state.nextPointIndex]
            );
            
            if (orientation === 2) {
                state.nextPointIndex = nextCheckIndex;
            } else if (orientation === 0) {
                const distToCheck = distanceSquared(state.points[state.currentPointIndex], state.points[nextCheckIndex]);
                const distToNext = distanceSquared(state.points[state.currentPointIndex], state.points[state.nextPointIndex]);
                if (distToCheck > distToNext) {
                    state.nextPointIndex = nextCheckIndex;
                }
            }
            
            if (state.checkedPoints.length === state.points.length - 1) {
                state.phase = 'next_point';
            }
        }
    }
    else if (state.phase === 'next_point') {
        state.currentPointIndex = state.nextPointIndex;
        
        if (state.currentPointIndex === state.startPointIndex) {
            state.phase = 'finished';
        } else {
            state.hull.push(state.points[state.currentPointIndex]);
            state.nextPointIndex = (state.currentPointIndex + 1) % state.points.length;
            state.checkedPoints = [];
            state.phase = 'checking';
        }
    }
    else if (state.phase === 'finished') {
        finishAlgorithm();
        return;
    }
    
    updateStepDisplay();
}

function finishAlgorithm() {
    hull = algorithmState.hull;
    isStepByStep = false;
    stepControls.style.display = 'none';
    algorithmState = null;
    updateDisplay();
}

function resetAlgorithm() {
    isStepByStep = false;
    stepControls.style.display = 'none';
    algorithmState = null;
    hull = [];
    updateDisplay();
}

// Обновление отображения шага
function updateStepDisplay() {
    if (!algorithmState) return;
    
    const state = algorithmState;
    drawPoints(state.points, state.hull, state.currentPointIndex, state.nextPointIndex, state.checkedPoints);
}

// Алгоритм Джарвиса
function jarvisMarch(points) {
    if (points.length < 3) return points;
    
    const n = points.length;
    const hull = [];
    
    let leftmostIndex = findLeftmostPoint(points);
    let currentIndex = leftmostIndex;
    
    do {
        hull.push(points[currentIndex]);
        
        let nextIndex = (currentIndex + 1) % n;
        
        for (let i = 0; i < n; i++) {
            if (i === currentIndex) continue;
            
            const orientation = getOrientation(
                points[currentIndex],
                points[i],
                points[nextIndex]
            );
            
            if (orientation === 2 || 
                (orientation === 0 && 
                 distanceSquared(points[currentIndex], points[i]) > 
                 distanceSquared(points[currentIndex], points[nextIndex]))) {
                nextIndex = i;
            }
        }
        
        currentIndex = nextIndex;
        
    } while (currentIndex !== leftmostIndex);
    
    return hull;
}

// Поиск самой левой точки
function findLeftmostPoint(points) {
    let leftmostIndex = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].x < points[leftmostIndex].x || 
            (points[i].x === points[leftmostIndex].x && points[i].y < points[leftmostIndex].y)) {
            leftmostIndex = i;
        }
    }
    return leftmostIndex;
}

// Определение ориентации точек
function getOrientation(p, q, r) {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (val === 0) return 0;
    return val > 0 ? 1 : 2;
}

// Вычисление квадрата расстояния
function distanceSquared(p1, p2) {
    return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
}

// Отрисовка точек и линий
function drawPoints(allPoints, hullPoints, currentIndex = null, nextIndex = null, checkedPoints = []) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Рисование выпуклой оболочки
    if (hullPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(hullPoints[0].x, hullPoints[0].y);
        
        for (let i = 1; i < hullPoints.length; i++) {
            ctx.lineTo(hullPoints[i].x, hullPoints[i].y);
        }
        
        if (hullPoints.length > 2 && !isStepByStep) {
            ctx.closePath();
            ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
            ctx.fill();
        }
        
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    // Рисование линий в пошаговом режиме
    if (isStepByStep && algorithmState && currentIndex !== null) {
        const currentPoint = allPoints[currentIndex];
        
        if (nextIndex !== null) {
            ctx.beginPath();
            ctx.moveTo(currentPoint.x, currentPoint.y);
            ctx.lineTo(allPoints[nextIndex].x, allPoints[nextIndex].y);
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            ctx.stroke();
        }
        
        for (const checkedIndex of checkedPoints) {
            if (checkedIndex !== nextIndex && checkedIndex !== currentIndex) {
                ctx.beginPath();
                ctx.moveTo(currentPoint.x, currentPoint.y);
                ctx.lineTo(allPoints[checkedIndex].x, allPoints[checkedIndex].y);
                ctx.strokeStyle = 'rgba(149, 165, 166, 0.7)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 3]);
                ctx.stroke();
            }
        }
        ctx.setLineDash([]);
    }
    
    // Рисование точек
    allPoints.forEach((point, index) => {
        ctx.beginPath();
        
        let color = '#e74c3c';
        let radius = 6;
        
        if (hullPoints.includes(point)) {
            color = '#27ae60';
            radius = 8;
        }
        
        if (isStepByStep && algorithmState) {
            if (index === currentIndex) {
                color = '#9b59b6';
                radius = 10;
            } else if (index === nextIndex) {
                color = '#f39c12';
                radius = 9;
            } else if (checkedPoints.includes(index)) {
                color = '#95a5a6';
                radius = 7;
            }
        }
        
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Отображение номеров точек
        if (isStepByStep) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(index, point.x, point.y - 15);
        }
    });
}

function updateDisplay() {
    drawPoints(points, hull);
}

window.onload = init;