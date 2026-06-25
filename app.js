/**
 * EmociFísica - Lógica de Negocio y Control de la Aplicación
 */

// --- CONFIGURACIÓN Y ESTADO GLOBAL ---
const DEFAULT_PIN = "1234";
let activeSession = null; // Sesión activa para el registro de alumnos
let selectedEmotion = null; // Emoción seleccionada por el alumno actual
let pinBuffer = ""; // Buffer para el login de PIN

// Emociones disponibles en la aplicación
const EMOTIONS = [
  {
    id: "joy",
    label: "Alegre / Motivado",
    emoji: "😊",
    color: "#ff9f43",
    description: "Me he divertido y me he sentido motivado en la clase de hoy."
  },
  {
    id: "energy",
    label: "Con Energía",
    emoji: "⚡",
    color: "#00d2d3",
    description: "Me siento activo, fuerte y con ganas de seguir moviéndome."
  },
  {
    id: "calm",
    label: "Calmado / Satisfecho",
    emoji: "🧘",
    color: "#1dd1a1",
    description: "Me siento relajado, en paz y satisfecho con mi esfuerzo."
  },
  {
    id: "tired",
    label: "Cansado / Agotado",
    emoji: "😴",
    color: "#54a0ff",
    description: "He hecho mucho esfuerzo físico y ahora me siento sin energía."
  },
  {
    id: "bored",
    label: "Aburrido",
    emoji: "😐",
    color: "#a5b1c2",
    description: "No me ha interesado mucho la actividad o me he aburrido."
  },
  {
    id: "angry",
    label: "Frustrado / Enfadado",
    emoji: "😤",
    color: "#ff6b6b",
    description: "Me he sentido molesto, frustrado o con enfado por algo ocurrido."
  }
];

// --- GESTIÓN DE BASE DE DATOS LOCAL (localStorage) ---
const DB = {
  getSessions: () => {
    const sessions = localStorage.getItem("emocifisica_sessions");
    return sessions ? JSON.parse(sessions) : [];
  },
  saveSessions: (sessions) => {
    localStorage.setItem("emocifisica_sessions", JSON.stringify(sessions));
  },
  getLogs: () => {
    const logs = localStorage.getItem("emocifisica_logs");
    return logs ? JSON.parse(logs) : [];
  },
  saveLogs: (logs) => {
    localStorage.setItem("emocifisica_logs", JSON.stringify(logs));
  },
  addLog: (log) => {
    const logs = DB.getLogs();
    logs.push(log);
    DB.saveLogs(logs);
  },
  addSession: (session) => {
    const sessions = DB.getSessions();
    // Evitar duplicados por ID
    if (!sessions.find(s => s.id === session.id)) {
      sessions.push(session);
      DB.saveSessions(sessions);
    }
  },
  clearAll: () => {
    localStorage.removeItem("emocifisica_sessions");
    localStorage.removeItem("emocifisica_logs");
  }
};

// --- NAVEGACIÓN Y GESTIÓN DE VISTAS (SPA) ---
const views = {
  setup: document.getElementById("view-setup"),
  student: document.getElementById("view-student"),
  thankyou: document.getElementById("view-thankyou"),
  auth: document.getElementById("view-auth"),
  admin: document.getElementById("view-admin")
};

function showView(viewName) {
  Object.keys(views).forEach(key => {
    if (key === viewName) {
      views[key].classList.add("active");
    } else {
      views[key].classList.remove("active");
    }
  });

  // Mostrar / ocultar botón de regresar a registro si hay sesión activa
  const btnNavStudent = document.getElementById("btn-nav-student");
  if (activeSession && viewName !== "student" && viewName !== "thankyou") {
    btnNavStudent.style.display = "flex";
  } else {
    btnNavStudent.style.display = "none";
  }

  // Si entramos en la vista de administración, cargar datos
  if (viewName === "admin") {
    renderAdminDashboard();
  }
  // Si entramos en setup, actualizar lista
  if (viewName === "setup") {
    renderSetupRecentSessions();
  }
}

// --- PANTALLA 1: CONFIGURACIÓN DE SESIÓN (SETUP) ---
function renderSetupRecentSessions() {
  const container = document.getElementById("recent-sessions-list");
  container.innerHTML = "";
  const sessions = DB.getSessions().slice(-5).reverse(); // últimas 5

  if (sessions.length === 0) {
    container.innerHTML = "<span style='color:var(--text-muted); font-size:0.9rem;'>No hay clases registradas recientemente.</span>";
    return;
  }

  sessions.forEach(session => {
    const badge = document.createElement("div");
    badge.className = "session-badge";
    badge.textContent = `${session.group} - ${session.activity}`;
    badge.title = `Clase del ${formatDate(session.date)}`;
    badge.addEventListener("click", () => {
      document.getElementById("setup-group").value = session.group;
      document.getElementById("setup-activity").value = session.activity;
    });
    container.appendChild(badge);
  });
}

function startSession() {
  const group = document.getElementById("setup-group").value;
  const activity = document.getElementById("setup-activity").value;
  let dateVal = document.getElementById("setup-date").value;
  
  if (!dateVal) {
    dateVal = new Date().toISOString().split('T')[0]; // Fecha de hoy local
  }

  if (!group || !activity) {
    alert("Por favor, selecciona un grupo y una actividad.");
    return;
  }

  // Generar ID único para la sesión
  const sessionId = `${group.replace(/\s+/g, '')}_${activity.replace(/\s+/g, '')}_${dateVal}`;
  
  activeSession = {
    id: sessionId,
    group: group,
    activity: activity,
    date: dateVal
  };

  // Guardar sesión en base de datos si no existe
  DB.addSession(activeSession);

  // Configurar pantalla de estudiantes
  document.getElementById("student-session-title").textContent = `${activeSession.group} • ${activeSession.activity}`;
  document.getElementById("student-session-date").textContent = `Clase del ${formatDate(activeSession.date)}`;

  resetStudentForm();
  showView("student");
}

// --- PANTALLA 2: REGISTRO DE EMOCIONES DE ESTUDIANTES ---
function renderEmotionsGrid() {
  const container = document.getElementById("emotions-container");
  container.innerHTML = "";

  EMOTIONS.forEach(emotion => {
    const card = document.createElement("div");
    card.className = "emotion-card";
    card.setAttribute("data-emotion", emotion.id);
    card.id = `emotion-card-${emotion.id}`;
    
    card.innerHTML = `
      <div class="emotion-emoji">${emotion.emoji}</div>
      <div class="emotion-label">${emotion.label}</div>
      <div class="emotion-desc">${emotion.description}</div>
    `;

    card.addEventListener("click", () => selectEmotionCard(emotion.id));
    container.appendChild(card);
  });
}

function selectEmotionCard(emotionId) {
  selectedEmotion = emotionId;
  
  // Quitar clase selected de todas
  document.querySelectorAll(".emotion-card").forEach(card => {
    card.classList.remove("selected");
  });

  // Añadir a la seleccionada
  const selected = document.getElementById(`emotion-card-${emotionId}`);
  if (selected) {
    selected.classList.add("selected");
  }

  // Activar botón de enviar
  const submitBtn = document.getElementById("btn-submit-emotion");
  submitBtn.disabled = false;
}

function sendToGoogleSheets(url, log) {
  fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(log)
  })
  .then(() => console.log("Datos enviados a Google Sheets."))
  .catch(err => console.error("Error al enviar a Google Sheets:", err));
}

function submitEmotionLog() {
  if (!activeSession || !selectedEmotion) return;

  const feedback = document.getElementById("student-feedback").value.trim();
  
  const log = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    sessionId: activeSession.id,
    sessionGroup: activeSession.group,
    sessionActivity: activeSession.activity,
    sessionDate: activeSession.date,
    emotionId: selectedEmotion,
    feedback: feedback,
    timestamp: new Date().toISOString()
  };

  DB.addLog(log);

  // Enviar a Google Sheets en segundo plano si está configurado
  const sheetsUrl = localStorage.getItem("emocifisica_sheets_url");
  if (sheetsUrl) {
    sendToGoogleSheets(sheetsUrl, log);
  }
  
  // Ir a pantalla de agradecimiento
  showView("thankyou");
  triggerConfetti();

  // Iniciar temporizador automático de 3 segundos para volver a registrar
  let countdownTimer = setTimeout(() => {
    backToRecording();
  }, 3000);

  // Botón para saltarse el temporizador
  const skipBtn = document.getElementById("btn-skip-countdown");
  const newSkipBtn = skipBtn.cloneNode(true);
  skipBtn.parentNode.replaceChild(newSkipBtn, skipBtn); // Elimina listeners previos
  newSkipBtn.addEventListener("click", () => {
    clearTimeout(countdownTimer);
    backToRecording();
  });
}

function backToRecording() {
  resetStudentForm();
  showView("student");
}

function resetStudentForm() {
  selectedEmotion = null;
  document.getElementById("student-feedback").value = "";
  
  // Desactivar botón enviar
  const submitBtn = document.getElementById("btn-submit-emotion");
  submitBtn.disabled = true;

  // Quitar seleccionados visuales
  document.querySelectorAll(".emotion-card").forEach(card => {
    card.classList.remove("selected");
  });
}

// Confetti Animado en CSS/JS
function triggerConfetti() {
  const container = document.getElementById("confetti-container");
  container.innerHTML = "";
  const pieceCount = 60;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    
    // Propiedades aleatorias para caída natural
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 2 + Math.random() * 2;
    const sizeWidth = 8 + Math.random() * 6;
    const sizeHeight = 12 + Math.random() * 8;
    
    piece.style.left = `${left}%`;
    piece.style.animationDelay = `${delay}s`;
    piece.style.animationDuration = `${duration}s`;
    piece.style.width = `${sizeWidth}px`;
    piece.style.height = `${sizeHeight}px`;

    container.appendChild(piece);
  }
}

// --- PANTALLA 4: AUTENTICACIÓN (LOGIN PIN) ---
function setupPinAuthentication() {
  const pinInputs = [
    document.getElementById("pin-1"),
    document.getElementById("pin-2"),
    document.getElementById("pin-3"),
    document.getElementById("pin-4")
  ];

  pinInputs.forEach((input, index) => {
    // Al escribir un dígito, pasar al siguiente input
    input.addEventListener("input", (e) => {
      if (e.target.value.length === 1) {
        if (index < 3) {
          pinInputs[index + 1].focus();
        }
      }
    });

    // Controlar retroceso (backspace)
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && e.target.value.length === 0) {
        if (index > 0) {
          pinInputs[index - 1].focus();
          pinInputs[index - 1].value = "";
        }
      }
    });
  });

  document.getElementById("btn-auth-submit").addEventListener("click", () => verifyPin(pinInputs));
  document.getElementById("btn-auth-cancel").addEventListener("click", () => {
    clearPinInputs(pinInputs);
    if (activeSession) {
      showView("student");
    } else {
      showView("setup");
    }
  });

  // Enter en el último dígito envía
  pinInputs[3].addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      verifyPin(pinInputs);
    }
  });
}

function verifyPin(inputs) {
  const pin = inputs.map(input => input.value).join("");
  const errorMsg = document.getElementById("auth-error-message");

  if (pin === DEFAULT_PIN) {
    errorMsg.style.display = "none";
    clearPinInputs(inputs);
    showView("admin");
  } else {
    errorMsg.style.display = "block";
    // Agitar panel y limpiar inputs
    const panel = document.querySelector(".auth-panel");
    panel.style.animation = "shake 0.3s ease";
    setTimeout(() => { panel.style.animation = ""; }, 300);
    clearPinInputs(inputs);
    inputs[0].focus();
  }
}

function clearPinInputs(inputs) {
  inputs.forEach(input => {
    input.value = "";
  });
  document.getElementById("auth-error-message").style.display = "none";
}

// CSS Shake Animation para errores de PIN
const style = document.createElement('style');
style.innerHTML = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-8px); }
    75% { transform: translateX(8px); }
  }
`;
document.head.appendChild(style);


// --- PANTALLA 5: DASHBOARD DE DOCENTE (ADMIN) ---
function renderAdminDashboard() {
  const logs = DB.getLogs();
  const sessions = DB.getSessions();

  // 1. Población de Filtros en la cabecera
  populateAdminFilters(sessions, logs);

  // 2. Aplicar los filtros
  updateDashboardData();
}

function populateAdminFilters(sessions, logs) {
  const filterSession = document.getElementById("filter-session");
  const filterGroup = document.getElementById("filter-group");

  // Guardar valores seleccionados actuales para mantenerlos si refrescamos
  const currentSessionFilter = filterSession.value || "all";
  const currentGroupFilter = filterGroup.value || "all";

  // Limpiar y resetear
  filterSession.innerHTML = '<option value="all">Todas las sesiones</option>';
  filterGroup.innerHTML = '<option value="all">Todos los grupos</option>';

  // Añadir sesiones ordenadas por fecha
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  sortedSessions.forEach(session => {
    const opt = document.createElement("option");
    opt.value = session.id;
    opt.textContent = `${session.group} - ${session.activity} (${formatDate(session.date)})`;
    filterSession.appendChild(opt);
  });

  // Añadir grupos únicos
  const uniqueGroups = [...new Set(logs.map(log => log.sessionGroup))].sort();
  uniqueGroups.forEach(group => {
    const opt = document.createElement("option");
    opt.value = group;
    opt.textContent = group;
    filterGroup.appendChild(opt);
  });

  // Restaurar filtros seleccionados si siguen existiendo
  if ([...filterSession.options].some(o => o.value === currentSessionFilter)) {
    filterSession.value = currentSessionFilter;
  }
  if ([...filterGroup.options].some(o => o.value === currentGroupFilter)) {
    filterGroup.value = currentGroupFilter;
  }
}

function updateDashboardData() {
  const logs = DB.getLogs();
  const filterSessionVal = document.getElementById("filter-session").value;
  const filterGroupVal = document.getElementById("filter-group").value;

  // Filtrar los logs
  let filteredLogs = logs;
  
  if (filterSessionVal !== "all") {
    filteredLogs = filteredLogs.filter(log => log.sessionId === filterSessionVal);
  }
  if (filterGroupVal !== "all") {
    filteredLogs = filteredLogs.filter(log => log.sessionGroup === filterGroupVal);
  }

  // 1. Calcular Métricas Resumen
  const totalResponses = filteredLogs.length;
  
  // Contar sesiones únicas en base a los logs filtrados o del total
  const uniqueSessionsCount = new Set(filteredLogs.map(log => log.sessionId)).size;

  // Clima emocional: Porcentaje de emociones positivas (Alegre, Con Energía, Calmado)
  let emotionalClimatePct = 0;
  if (totalResponses > 0) {
    const positiveCount = filteredLogs.filter(log => 
      log.emotionId === "joy" || log.emotionId === "energy" || log.emotionId === "calm"
    ).length;
    emotionalClimatePct = Math.round((positiveCount / totalResponses) * 100);
  }

  // Actualizar en el HTML
  document.getElementById("metric-responses-count").textContent = totalResponses;
  document.getElementById("metric-sessions-count").textContent = uniqueSessionsCount;
  document.getElementById("metric-emotional-climate").textContent = `${emotionalClimatePct}%`;

  // Cambiar color de clima emocional según valor
  const climateDisplay = document.getElementById("metric-emotional-climate");
  if (emotionalClimatePct >= 75) {
    climateDisplay.style.color = "#1dd1a1"; // Verde positivo
  } else if (emotionalClimatePct >= 50) {
    climateDisplay.style.color = "#ff9f43"; // Naranja intermedio
  } else {
    climateDisplay.style.color = totalResponses > 0 ? "#ff6b6b" : "var(--text-primary)"; // Rojo bajo
  }

  // 2. Agrupar conteo de emociones
  const emotionCounts = {};
  EMOTIONS.forEach(em => { emotionCounts[em.id] = 0; });
  filteredLogs.forEach(log => {
    if (emotionCounts[log.emotionId] !== undefined) {
      emotionCounts[log.emotionId]++;
    }
  });

  // 3. Renderizar Gráfico de Barras SVG Dinámico
  renderSvgBarChart(emotionCounts, totalResponses);

  // 4. Renderizar Desglose Porcentual Detallado
  renderEmotionBreakdownList(emotionCounts, totalResponses);

  // 5. Renderizar Tabla de Comentarios
  renderFeedbackTable(filteredLogs);
}

function renderSvgBarChart(counts, total) {
  const svg = document.getElementById("emotion-chart");
  svg.innerHTML = ""; // Vaciar anterior

  const svgWidth = 500;
  const svgHeight = 250;
  const paddingBottom = 40;
  const paddingTop = 30;
  const chartHeight = svgHeight - paddingTop - paddingBottom;
  const barWidth = 50;
  const gap = 25;
  const startX = 35;

  // Encontrar el valor máximo para escalar la altura de las barras
  let maxCount = Math.max(...Object.values(counts));
  if (maxCount === 0) maxCount = 10; // Evitar división por cero

  EMOTIONS.forEach((emotion, idx) => {
    const count = counts[emotion.id];
    
    // Altura proporcional
    const barHeight = (count / maxCount) * chartHeight;
    const x = startX + idx * (barWidth + gap);
    const y = svgHeight - paddingBottom - barHeight;

    // Crear grupo g
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "bar-group");
    g.setAttribute("title", `${emotion.label}: ${count} votos`);

    // Crear rectángulo
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", svgHeight - paddingBottom); // Inicia desde abajo para animación
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", 0);
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", emotion.color);
    rect.setAttribute("class", "bar-rect");

    // Animar la barra (efecto interactivo moderno)
    setTimeout(() => {
      rect.setAttribute("y", y);
      rect.setAttribute("height", barHeight);
    }, 50 * idx);

    // Texto de cantidad arriba de la barra
    const textVal = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textVal.setAttribute("x", x + barWidth / 2);
    textVal.setAttribute("y", y - 8);
    textVal.setAttribute("class", "bar-val");
    textVal.textContent = count > 0 ? count : "";

    // Texto de emoji debajo del gráfico
    const textLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textLabel.setAttribute("x", x + barWidth / 2);
    textLabel.setAttribute("y", svgHeight - 15);
    textLabel.setAttribute("class", "bar-label");
    textLabel.style.fontSize = "16px";
    textLabel.textContent = emotion.emoji;

    // Texto de etiqueta (abreviación de emoción debajo del emoji)
    const textDesc = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textDesc.setAttribute("x", x + barWidth / 2);
    textDesc.setAttribute("y", svgHeight - 2);
    textDesc.setAttribute("class", "bar-label");
    textDesc.style.fontSize = "8px";
    textDesc.textContent = emotion.label.split(" ")[0]; // Primera palabra de la emoción

    g.appendChild(rect);
    g.appendChild(textVal);
    g.appendChild(textLabel);
    g.appendChild(textDesc);
    svg.appendChild(g);
  });
}

function renderEmotionBreakdownList(counts, total) {
  const container = document.getElementById("emotion-breakdown-container");
  container.innerHTML = "";

  EMOTIONS.forEach(emotion => {
    const count = counts[emotion.id];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;

    const item = document.createElement("div");
    item.className = "breakdown-item";
    
    item.innerHTML = `
      <div class="breakdown-emoji">${emotion.emoji}</div>
      <div class="breakdown-details">
        <div class="breakdown-meta">
          <span>${emotion.label}</span>
          <span class="breakdown-pct">${pct}% (${count})</span>
        </div>
        <div class="breakdown-bar-bg">
          <div class="breakdown-bar-fill" style="width: 0%; background-color: ${emotion.color}"></div>
        </div>
      </div>
    `;

    container.appendChild(item);

    // Animar la barra de carga tras renderizar
    setTimeout(() => {
      item.querySelector(".breakdown-bar-fill").style.width = `${pct}%`;
    }, 100);
  });
}

function renderFeedbackTable(logs) {
  const tbody = document.getElementById("feedback-table-body");
  tbody.innerHTML = "";

  // Filtrar los logs que tengan feedback y ordenarlos por fecha más reciente
  const logsWithFeedback = logs.filter(log => log.feedback !== "").sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (logsWithFeedback.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <span class="empty-state-icon">💬</span>
            <p>No hay comentarios ni valoraciones textuales registradas todavía.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  logsWithFeedback.forEach(log => {
    const emotion = EMOTIONS.find(e => e.id === log.emotionId) || { label: log.emotionId, emoji: "❓" };
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${formatDateTime(log.timestamp)}</td>
      <td><strong>${escapeHtml(log.sessionGroup)}</strong></td>
      <td>${escapeHtml(log.sessionActivity)}</td>
      <td>
        <span class="badge-emotion-inline ${emotion.id}">
          <span>${emotion.emoji}</span>
          <span>${emotion.label}</span>
        </span>
      </td>
      <td style="font-style: italic; color: #d8d3ff;">"${escapeHtml(log.feedback)}"</td>
    `;

    tbody.appendChild(row);
  });
}

// --- ACCIONES DOCENTES Y FUNCIONES EXTRA ---

// Cargar Datos de Simulación para Demostración inmediata
function loadDemoData() {
  if (!confirm("¿Deseas cargar datos simulados de prueba para visualizar el panel de control?")) return;

  const demoSessions = [
    { id: "1ESO_Futbol_2026-06-22", group: "1º ESO A", activity: "Fútbol", date: "2026-06-22" },
    { id: "2ESO_Danza_2026-06-23", group: "2º ESO B", activity: "Expresión Corporal / Danza", date: "2026-06-23" },
    { id: "3ESO_Baloncesto_2026-06-24", group: "3º ESO A", activity: "Baloncesto", date: "2026-06-24" },
    { id: "4ESO_Resistencia_2026-06-25", group: "4º ESO B", activity: "Resistencia / HIIT", date: "2026-06-25" }
  ];

  const demoComments = {
    joy: ["¡Me ha encantado la clase de fútbol de hoy!", "Ha sido súper divertido trabajar en equipo.", "¡Por fin jugamos baloncesto!", "El profesor ha preparado unos juegos geniales hoy.", "¡Súper divertido!"],
    energy: ["Me he cansado pero me he sentido con mucha fuerza.", "¡He corrido un montón!", "¡Buen entrenamiento de resistencia!", "Me gusta cuando hacemos circuitos de ejercicio intenso."],
    calm: ["La sesión de relajación al final ha sido increíble.", "Me he sentido muy a gusto hoy.", "He aprendido a concentrarme mejor en los pases.", "Clase muy tranquila y productiva."],
    tired: ["Me duelen las piernas por correr tanto.", "Demasiado intenso el HIIT de hoy, estoy agotado.", "Uf, qué calor y qué cansancio.", "Hoy ha sido muy exigente físicamente."],
    bored: ["No me gusta mucho el fútbol, preferiría otro deporte.", "Hemos esperado mucho tiempo en las filas para tirar.", "Hoy la clase ha sido un poco monótona."],
    angry: ["Se han enfadado conmigo por perder el balón.", "El partido ha sido muy injusto y el árbitro no ha visto las faltas.", "No me ha gustado el comportamiento de mis compañeros de equipo hoy."]
  };

  const demoLogs = [];
  
  demoSessions.forEach(session => {
    DB.addSession(session);
    
    // Generar entre 15 y 30 respuestas de alumnos por sesión
    const responsesCount = 15 + Math.floor(Math.random() * 16);
    
    // Distribuir emociones según el tipo de actividad para hacerlo realista
    let weights = { joy: 0.3, energy: 0.3, calm: 0.2, tired: 0.1, bored: 0.05, angry: 0.05 }; // Default
    
    if (session.activity === "Resistencia / HIIT") {
      weights = { joy: 0.15, energy: 0.25, calm: 0.1, tired: 0.4, bored: 0.05, angry: 0.05 }; // Más cansados
    } else if (session.activity === "Expresión Corporal / Danza") {
      weights = { joy: 0.2, energy: 0.15, calm: 0.4, tired: 0.1, bored: 0.1, angry: 0.05 }; // Más calmados
    } else if (session.activity === "Fútbol") {
      weights = { joy: 0.4, energy: 0.3, calm: 0.05, tired: 0.1, bored: 0.05, angry: 0.1 }; // Más alegres pero algo de frustración
    }

    for (let i = 0; i < responsesCount; i++) {
      // Elegir emoción según pesos
      const r = Math.random();
      let selectedId = "joy";
      let cumulative = 0;
      
      for (const [emId, weight] of Object.entries(weights)) {
        cumulative += weight;
        if (r <= cumulative) {
          selectedId = emId;
          break;
        }
      }

      // Decidir si tiene comentario (30% de probabilidad)
      let comment = "";
      if (Math.random() < 0.35) {
        const commentList = demoComments[selectedId];
        comment = commentList[Math.floor(Math.random() * commentList.length)];
      }

      // Timestamp aleatorio dentro del día de la clase
      const hour = 9 + Math.floor(Math.random() * 5); // Entre 9:00 y 14:00
      const minute = Math.floor(Math.random() * 60);
      const timestamp = `${session.date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00Z`;

      demoLogs.push({
        id: 'log_demo_' + Math.random().toString(36).substr(2, 9),
        sessionId: session.id,
        sessionGroup: session.group,
        sessionActivity: session.activity,
        sessionDate: session.date,
        emotionId: selectedId,
        feedback: comment,
        timestamp: timestamp
      });
    }
  });

  // Guardar datos
  DB.saveLogs(demoLogs);
  alert("¡Datos simulados cargados con éxito!");
  
  // Recargar vista
  renderAdminDashboard();
}

// Exportar base de datos a archivo CSV
function exportDataToCsv() {
  const logs = DB.getLogs();
  if (logs.length === 0) {
    alert("No hay datos registrados para exportar.");
    return;
  }

  // Definir cabeceras
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Byte Order Mark para compatibilidad Excel con acentos
  csvContent += "ID Registro;Fecha Registro;Grupo;Actividad;Fecha Clase;ID Emocion;Emocion;Comentario\r\n";

  // Rellenar filas
  logs.forEach(log => {
    const emotion = EMOTIONS.find(e => e.id === log.emotionId) || { label: log.emotionId };
    const dateFormatted = formatDateTime(log.timestamp);
    const feedbackEscaped = log.feedback.replace(/"/g, '""'); // Escapar comillas dobles

    csvContent += `"${log.id}";"${dateFormatted}";"${log.sessionGroup}";"${log.sessionActivity}";"${log.sessionDate}";"${log.emotionId}";"${emotion.label}";"${feedbackEscaped}"\r\n`;
  });

  // Crear elemento de descarga
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `EmociFisica_Export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
}

// Resetear aplicación
function resetAllData() {
  if (!confirm("¿ESTÁS SEGURO? Esto eliminará de forma permanente todas las clases registradas y todas las emociones enviadas por los alumnos.")) {
    return;
  }

  if (confirm("Confirma una vez más si de verdad quieres formatear el sistema. Esta acción no se puede deshacer.")) {
    DB.clearAll();
    activeSession = null;
    resetStudentForm();
    alert("Aplicación restaurada de fábrica.");
    showView("setup");
  }
}


// --- FUNCIONES AUXILIARES DE FORMATEO Y SEGURIDAD ---

function formatDate(dateString) {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString;
  return `${parts[2]}/${parts[1]}/${parts[0]}`; // Formato DD/MM/AAAA
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// --- CONFIGURACIÓN DE LISTENERS DE EVENTOS ---

document.addEventListener("DOMContentLoaded", () => {
  // 1. Renderizar cuadricula inicial de emociones
  renderEmotionsGrid();

  // 2. Renderizar recientes en setup
  renderSetupRecentSessions();

  // 3. Configurar PIN de autenticación
  setupPinAuthentication();

  // --- Botones de Navegación ---
  document.getElementById("btn-nav-admin").addEventListener("click", () => {
    // Al pulsar "Panel Profesor", enviamos a Auth PIN
    showView("auth");
    setTimeout(() => {
      document.getElementById("pin-1").focus();
    }, 100);
  });

  document.getElementById("btn-nav-student").addEventListener("click", () => {
    if (activeSession) {
      showView("student");
    }
  });

  // Cierre de registro activo desde pantalla de estudiantes
  document.getElementById("btn-finish-recording").addEventListener("click", () => {
    if (confirm("¿Quieres finalizar el registro para esta clase? Volverás a la pantalla de configuración principal.")) {
      activeSession = null;
      showView("setup");
    }
  });

  // --- Envíos y Formularios ---
  document.getElementById("setup-session-form").addEventListener("submit", (e) => {
    e.preventDefault();
    startSession();
  });

  document.getElementById("btn-submit-emotion").addEventListener("click", () => {
    submitEmotionLog();
  });

  // --- Filtros Dashboard ---
  document.getElementById("filter-session").addEventListener("change", updateDashboardData);
  document.getElementById("filter-group").addEventListener("change", updateDashboardData);

  // --- Acciones de Administración ---
  document.getElementById("btn-admin-demo-data").addEventListener("click", loadDemoData);
  document.getElementById("btn-admin-export").addEventListener("click", exportDataToCsv);
  document.getElementById("btn-admin-reset").addEventListener("click", resetAllData);
  
  // Cargar URL de Google Sheets guardada si existe
  const savedSheetsUrl = localStorage.getItem("emocifisica_sheets_url") || "";
  const sheetsUrlInput = document.getElementById("admin-sheets-url");
  if (sheetsUrlInput) {
    sheetsUrlInput.value = savedSheetsUrl;
  }

  const btnSaveSheets = document.getElementById("btn-save-sheets-url");
  if (btnSaveSheets) {
    btnSaveSheets.addEventListener("click", () => {
      const url = document.getElementById("admin-sheets-url").value.trim();
      localStorage.setItem("emocifisica_sheets_url", url);
      alert("Enlace de Google Sheets guardado con éxito.");
    });
  }

  // Establecer fecha de hoy por defecto en la configuración
  const dateInput = document.getElementById("setup-date");
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
});
