<template>
  <div class="page">
    <header class="hero">
      <h1>Pichanga</h1>
      <p>Registro de jugadores y pagos</p>
    </header>

    <main class="layout">
      <section class="card form-card">
        <h2>Registro</h2>
        <form @submit.prevent="saveRecord" class="form-grid">
          <label class="field">
            <span>Jugador</span>
            <input
              v-model.trim="form.name"
              type="text"
              list="players-list"
              placeholder="Selecciona o escribe un jugador"
              maxlength="60"
            />
            <datalist id="players-list">
              <option v-for="player in playerOptions" :key="player" :value="player"></option>
            </datalist>
            <small class="hint">Puedes elegir uno de la lista o escribir uno nuevo.</small>
          </label>

          <div class="field">
            <span>Monto</span>
            <div class="payment-toggle amount-toggle" role="group" aria-label="Monto de pago">
              <button
                type="button"
                class="btn payment-btn"
                :class="{ 'is-active': form.amount === 7 }"
                @click="form.amount = 7"
              >
                S/ 7
              </button>
              <button
                type="button"
                class="btn payment-btn"
                :class="{ 'is-active': form.amount === 5 }"
                @click="form.amount = 5"
              >
                S/ 5
              </button>
            </div>
            <input
              v-model.number="form.customAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Otro monto (opcional)"
            />
            <small class="hint">Si escribes otro monto, reemplaza al de S/ 7 o S/ 5.</small>
          </div>

          <div class="field">
            <span>Modalidad de pago</span>
            <div class="payment-toggle" role="group" aria-label="Modalidad de pago">
              <button
                type="button"
                class="btn payment-btn"
                :class="{ 'is-active': form.method === 'YAPE' }"
                @click="form.method = 'YAPE'"
              >
                YAPE
              </button>
              <button
                type="button"
                class="btn payment-btn"
                :class="{ 'is-active': form.method === 'EFECTIVO' }"
                @click="form.method = 'EFECTIVO'"
              >
                EFECTIVO
              </button>
            </div>
          </div>

          <div class="actions-row">
            <button class="btn btn-primary btn-wide" type="submit">Guardar</button>
            <button class="btn btn-wide" type="button" @click="resetForm">Limpiar formulario</button>
          </div>

          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        </form>
      </section>

      <section class="card cancha-card">
        <div class="card-top">
          <h2>Registro adicional: Cancha</h2>
        </div>
        <form @submit.prevent="saveCourtConfig" class="form-grid">
          <label class="field">
            <span>Monto por hora</span>
            <input v-model.number="court.hourRate" type="number" min="0" step="0.01" placeholder="Ej. 50" />
          </label>
          <label class="field">
            <span>Cantidad de horas</span>
            <input v-model.number="court.hours" type="number" min="0" step="0.5" placeholder="Ej. 1" />
          </label>
          <div class="summary-inline">
            <strong>Total cancha:</strong>
            <span>S/ {{ formatAmount(courtTotal) }}</span>
          </div>
          <div class="actions-row">
            <button class="btn btn-primary btn-wide" type="submit">Guardar cancha</button>
            <button class="btn btn-wide" type="button" @click="resetCourtConfig">Limpiar cancha</button>
          </div>
          <p v-if="courtMessage" class="ok-msg">{{ courtMessage }}</p>
        </form>
      </section>

      <section class="card">
        <div class="card-top">
          <h2>Registros</h2>
          <button class="btn btn-danger" type="button" @click="clearAllRecords" :disabled="!records.length">
            Limpiar todos
          </button>
        </div>

        <div class="table-wrap desktop-table">
          <table class="records-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Jugador</th>
                <th>Monto</th>
                <th>Modalidad</th>
                <th>Fecha de registro</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!records.length">
                <td colspan="6" class="empty">No hay registros aún.</td>
              </tr>
              <tr v-for="(record, index) in records" :key="record.id">
                <td>{{ index + 1 }}</td>
                <td>{{ record.name }}</td>
                <td>S/ {{ formatAmount(record.amount) }}</td>
                <td>
                  <span class="badge" :class="record.method === 'YAPE' ? 'badge-yape' : 'badge-cash'">
                    {{ record.method }}
                  </span>
                </td>
                <td>{{ formatDate(record.createdAt) }}</td>
                <td>
                  <button class="btn btn-small btn-danger" type="button" @click="removeRecord(record.id)">
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-cards">
          <article v-for="(record, index) in records" :key="`mobile-${record.id}`" class="record-card">
            <header>
              <strong>#{{ index + 1 }} {{ record.name }}</strong>
            </header>
            <p><span>Monto:</span> S/ {{ formatAmount(record.amount) }}</p>
            <p>
              <span>Modalidad:</span>
              <span class="badge" :class="record.method === 'YAPE' ? 'badge-yape' : 'badge-cash'">
                {{ record.method }}
              </span>
            </p>
            <p><span>Fecha:</span> {{ formatDate(record.createdAt) }}</p>
            <button class="btn btn-danger btn-wide" type="button" @click="removeRecord(record.id)">Eliminar</button>
          </article>
          <p v-if="!records.length" class="empty">No hay registros aún.</p>
        </div>
      </section>

      <section class="card" ref="reportSection">
        <div class="card-top">
          <h2>Reporte</h2>
          <div class="actions-row report-actions">
            <button class="btn" type="button" @click="exportReportHtml" :disabled="!records.length">Exportar HTML</button>
            <button class="btn" type="button" @click="downloadReportImage" :disabled="!records.length">Guardar imagen</button>
            <button class="btn btn-whatsapp" type="button" @click="shareReportWhatsApp" :disabled="!records.length">
              <span class="wa-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor">
                  <path d="M19.11 17.21c-.29-.14-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.9 1.12-.16.19-.33.22-.62.08-.29-.14-1.2-.44-2.3-1.4-.86-.77-1.44-1.72-1.61-2-.17-.29-.02-.45.12-.59.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.54-.88-2.11-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 1-1 2.44s1.02 2.83 1.16 3.03c.14.19 2.01 3.07 4.87 4.31.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.12.55-.08 1.7-.69 1.94-1.35.24-.67.24-1.24.17-1.36-.08-.12-.26-.19-.55-.33z"/>
                  <path d="M16.01 3.2c-7.04 0-12.76 5.71-12.76 12.74 0 2.25.59 4.45 1.71 6.39L3.2 28.8l6.63-1.73a12.76 12.76 0 0 0 6.18 1.58h.01c7.03 0 12.75-5.72 12.75-12.75 0-3.4-1.33-6.6-3.74-9-2.4-2.4-5.6-3.7-9.02-3.7zm0 23.29h-.01a10.58 10.58 0 0 1-5.39-1.48l-.39-.23-3.94 1.03 1.05-3.84-.26-.4a10.53 10.53 0 0 1-1.62-5.62c0-5.82 4.74-10.56 10.58-10.56 2.82 0 5.47 1.1 7.46 3.09a10.47 10.47 0 0 1 3.1 7.47c0 5.83-4.74 10.57-10.58 10.57z"/>
                </svg>
              </span>
              Compartir WhatsApp
            </button>
          </div>
        </div>

        <div class="report-stepper">
          <p class="step-indicator">Paso {{ reportStep + 1 }} de 2</p>
          <h3 class="report-title">{{ reportStepTitle }}</h3>

          <div v-if="reportStep === 0" class="summary-grid compact" id="report-capture" ref="reportCapture">
            <article>
              <h3>Total aportes</h3>
              <p>S/ {{ formatAmount(totalGeneral) }}</p>
            </article>
            <article>
              <h3>Costo cancha</h3>
              <p>S/ {{ formatAmount(courtTotal) }}</p>
            </article>
            <article>
              <h3>Saldo final</h3>
              <p>S/ {{ formatAmount(netTotal) }}</p>
            </article>
            <article>
              <h3>Total YAPE</h3>
              <p>S/ {{ formatAmount(totalYape) }}</p>
            </article>
            <article>
              <h3>Total EFECTIVO</h3>
              <p>S/ {{ formatAmount(totalCash) }}</p>
            </article>
            <article>
              <h3>Cantidad jugadores</h3>
              <p>{{ records.length }}</p>
            </article>
          </div>

          <div v-else class="table-wrap report-table">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Jugador</th>
                  <th>Monto</th>
                  <th>Modalidad</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(record, index) in records" :key="`report-${record.id}`">
                  <td>{{ index + 1 }}</td>
                  <td>{{ record.name }}</td>
                  <td>S/ {{ formatAmount(record.amount) }}</td>
                  <td>{{ record.method }}</td>
                </tr>
                <tr v-if="!records.length">
                  <td colspan="4" class="empty">Sin datos para mostrar.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="actions-row">
            <button class="btn btn-wide" type="button" @click="previousReportStep">Anterior</button>
            <button class="btn btn-primary btn-wide" type="button" @click="nextReportStep">Siguiente</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";

const STORAGE_KEY = "pichanga-records";
const STORAGE_COURT_KEY = "pichanga-court";
const INITIAL_PLAYERS = [
  "Marcial", "Jairo", "Nicky", "Beto", "Isaac", "Cristian", "Henry Taba", "Jose", "Paul",
  "Arturo", "Catalino", "Junior Nicki", "Trinidad", "Nilson Taba", "Jack Nici", "Alex", "Rommel",
  "Romario", "Martin"
];

const form = ref({ name: "", amount: null, customAmount: null, method: "" });
const court = ref({ hourRate: 50, hours: 1 });
const records = ref([]);
const errorMessage = ref("");
const courtMessage = ref("");
const reportStep = ref(0);
const reportSection = ref(null);
const reportCapture = ref(null);

const playerOptions = computed(() => {
  const fromRecords = records.value.map((record) => record.name).filter(Boolean);
  return [...new Set([...INITIAL_PLAYERS, ...fromRecords])].sort((a, b) => a.localeCompare(b, "es"));
});

const reportStepTitle = computed(() =>
  reportStep.value === 0 ? "Resumen de totales" : "Lista de jugadores registrados"
);

const totalGeneral = computed(() => records.value.reduce((sum, record) => sum + Number(record.amount), 0));
const courtTotal = computed(() => Number(court.value.hourRate || 0) * Number(court.value.hours || 0));
const netTotal = computed(() => totalGeneral.value - courtTotal.value);

const totalYape = computed(() =>
  records.value.filter((record) => record.method === "YAPE").reduce((sum, record) => sum + Number(record.amount), 0)
);

const totalCash = computed(() =>
  records.value.filter((record) => record.method === "EFECTIVO").reduce((sum, record) => sum + Number(record.amount), 0)
);

function loadRecords() {
  const rawData = localStorage.getItem(STORAGE_KEY);
  if (!rawData) {
    records.value = [];
    return;
  }
  try {
    const parsed = JSON.parse(rawData);
    records.value = Array.isArray(parsed) ? parsed : [];
  } catch {
    records.value = [];
  }
}

function loadCourtConfig() {
  const rawCourt = localStorage.getItem(STORAGE_COURT_KEY);
  if (!rawCourt) return;
  try {
    const parsed = JSON.parse(rawCourt);
    court.value = {
      hourRate: Number(parsed.hourRate) || 0,
      hours: Number(parsed.hours) || 0
    };
  } catch {
    court.value = { hourRate: 50, hours: 1 };
  }
}

function persistRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value));
}

function persistCourtConfig() {
  localStorage.setItem(STORAGE_COURT_KEY, JSON.stringify(court.value));
}

function validateForm() {
  const selectedAmount = getSelectedAmount();
  if (!form.value.name) {
    errorMessage.value = "El nombre del jugador es obligatorio.";
    return false;
  }
  if (!selectedAmount || Number(selectedAmount) <= 0) {
    errorMessage.value = "El monto debe ser mayor a 0.";
    return false;
  }
  if (!form.value.method) {
    errorMessage.value = "Selecciona una modalidad de pago.";
    return false;
  }
  errorMessage.value = "";
  return true;
}

function saveRecord() {
  if (!validateForm()) return;
  const selectedAmount = getSelectedAmount();

  const newRecord = {
    id: crypto.randomUUID(),
    name: form.value.name,
    amount: Number(selectedAmount),
    method: form.value.method,
    createdAt: new Date().toISOString()
  };

  records.value.unshift(newRecord);
  persistRecords();
  resetForm();
}

function saveCourtConfig() {
  if (Number(court.value.hourRate) <= 0 || Number(court.value.hours) <= 0) {
    courtMessage.value = "Ingresa un monto por hora y horas mayores a 0.";
    return;
  }
  persistCourtConfig();
  courtMessage.value = "Costo de cancha guardado.";
}

function resetForm() {
  form.value = { name: "", amount: null, customAmount: null, method: "" };
  errorMessage.value = "";
}

function resetCourtConfig() {
  court.value = { hourRate: 0, hours: 0 };
  persistCourtConfig();
  courtMessage.value = "Registro de cancha limpiado.";
}

function getSelectedAmount() {
  if (form.value.customAmount && Number(form.value.customAmount) > 0) {
    return Number(form.value.customAmount);
  }
  return Number(form.value.amount);
}

function removeRecord(recordId) {
  records.value = records.value.filter((record) => record.id !== recordId);
  persistRecords();
}

function clearAllRecords() {
  const confirmed = window.confirm("Se eliminarán todos los registros. ¿Deseas continuar?");
  if (!confirmed) return;
  records.value = [];
  persistRecords();
}

function formatAmount(value) {
  return Number(value).toFixed(2);
}

function formatDate(value) {
  return new Date(value).toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getReportHtmlDocument() {
  const rows = records.value
    .map(
      (record, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${record.name}</td>
          <td>S/ ${formatAmount(record.amount)}</td>
          <td>${record.method}</td>
          <td>${formatDate(record.createdAt)}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reporte - Pichanga</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 24px; color: #1f2937; }
    h1 { margin-bottom: 4px; }
    p { margin-top: 0; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
    th { background: #f3f4f6; }
    .totals { margin-top: 16px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  </style>
</head>
<body>
  <h1>Pichanga - Reporte de Pagos</h1>
  <p>Generado: ${new Date().toLocaleString("es-PE")}</p>
  <div class="totals">
    <div><strong>Total aportes:</strong> S/ ${formatAmount(totalGeneral.value)}</div>
    <div><strong>Costo cancha:</strong> S/ ${formatAmount(courtTotal.value)}</div>
    <div><strong>Saldo final:</strong> S/ ${formatAmount(netTotal.value)}</div>
    <div><strong>Total YAPE:</strong> S/ ${formatAmount(totalYape.value)}</div>
    <div><strong>Total EFECTIVO:</strong> S/ ${formatAmount(totalCash.value)}</div>
    <div><strong>Total jugadores:</strong> ${records.value.length}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>N°</th>
        <th>Jugador</th>
        <th>Monto</th>
        <th>Modalidad</th>
        <th>Fecha de registro</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5">Sin registros.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
}

function exportReportHtml() {
  const html = getReportHtmlDocument();
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte-pichanga-${new Date().toISOString().slice(0, 10)}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function printReport() {
  const html = getReportHtmlDocument();
  const printWindow = window.open("", "_blank", "width=1024,height=768");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function nextReportStep() {
  reportStep.value = (reportStep.value + 1) % 2;
}

function previousReportStep() {
  reportStep.value = reportStep.value === 0 ? 1 : reportStep.value - 1;
}

function createReportImageBlob() {
  const reportNode = reportCapture.value;
  if (!reportNode) return null;

  const width = 1080;
  const height = 1350;
  const now = new Date().toLocaleString("es-PE");
  const textLines = [
    "PICHANGA - REPORTE",
    `Generado: ${now}`,
    `Total aportes: S/ ${formatAmount(totalGeneral.value)}`,
    `Costo cancha: S/ ${formatAmount(courtTotal.value)} (${formatAmount(court.value.hourRate)} x ${court.value.hours}h)`,
    `Saldo final: S/ ${formatAmount(netTotal.value)}`,
    `YAPE: S/ ${formatAmount(totalYape.value)} | EFECTIVO: S/ ${formatAmount(totalCash.value)}`,
    `Jugadores: ${records.value.length}`
  ];

  const rows = records.value.slice(0, 25).map(
    (record, idx) => `${idx + 1}. ${record.name} - S/ ${formatAmount(record.amount)} - ${record.method}`
  );

  const allLines = [...textLines, "", "Detalle:", ...rows];

  const svgText = allLines
    .map((line, index) => `<text x="50" y="${70 + index * 42}" font-size="30" fill="#1f2937">${escapeXml(line)}</text>`)
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#fffdf8"/>
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="20" fill="#fffaf0" stroke="#ddd4c5"/>
  ${svgText}
</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  return blob;
}

async function downloadReportImage() {
  const blob = createReportImageBlob();
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte-pichanga-${new Date().toISOString().slice(0, 10)}.svg`;
  link.click();
  URL.revokeObjectURL(url);
}

async function shareReportWhatsApp() {
  const blob = createReportImageBlob();
  if (!blob) return;

  const file = new File([blob], `reporte-pichanga-${new Date().toISOString().slice(0, 10)}.svg`, {
    type: "image/svg+xml"
  });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: "Reporte Pichanga",
      text: "Reporte de aportes de pichanga",
      files: [file]
    });
    return;
  }

  await downloadReportImage();
  const text = encodeURIComponent(
    `Reporte Pichanga%0A` +
    `Total aportes: S/ ${formatAmount(totalGeneral.value)}%0A` +
    `Costo cancha: S/ ${formatAmount(courtTotal.value)}%0A` +
    `Saldo final: S/ ${formatAmount(netTotal.value)}`
  );
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

onMounted(() => {
  loadRecords();
  loadCourtConfig();
});
</script>
