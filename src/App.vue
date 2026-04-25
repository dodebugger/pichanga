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
            <button class="btn btn-danger btn-wide" type="button" @click="removeRecord(record.id)">
              Eliminar
            </button>
          </article>
          <p v-if="!records.length" class="empty">No hay registros aún.</p>
        </div>
      </section>

      <section class="card" ref="reportSection">
        <div class="card-top">
          <h2>Reporte HTML</h2>
          <div class="actions-row report-actions">
            <button class="btn" type="button" @click="exportReportHtml" :disabled="!records.length">
              Exportar HTML
            </button>
            <button class="btn btn-primary" type="button" @click="printReport" :disabled="!records.length">
              Imprimir reporte
            </button>
          </div>
        </div>

        <div class="report-stepper">
          <p class="step-indicator">Paso {{ reportStep + 1 }} de 2</p>
          <h3 class="report-title">{{ reportStepTitle }}</h3>

          <div v-if="reportStep === 0" class="summary-grid compact">
            <article>
              <h3>Total general</h3>
              <p>S/ {{ formatAmount(totalGeneral) }}</p>
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
const INITIAL_PLAYERS = [
  "Marcial",
  "Jairo",
  "Nicky",
  "Beto",
  "Isaac",
  "Cristian",
  "Henry Taba",
  "Jose",
  "Paul",
  "Arturo",
  "Catalino",
  "Junior Nicki",
  "Trinidad",
  "Nilson Taba",
  "Jack Nici",
  "Alex",
  "Rommel",
  "Romario",
  "Martin"
];

const form = ref({
  name: "",
  amount: null,
  customAmount: null,
  method: ""
});

const records = ref([]);
const errorMessage = ref("");
const reportStep = ref(0);

const playerOptions = computed(() => {
  const fromRecords = records.value.map((record) => record.name).filter(Boolean);
  return [...new Set([...INITIAL_PLAYERS, ...fromRecords])].sort((a, b) => a.localeCompare(b, "es"));
});

const reportStepTitle = computed(() =>
  reportStep.value === 0 ? "Resumen de totales" : "Lista de jugadores registrados"
);

const totalGeneral = computed(() =>
  records.value.reduce((sum, record) => sum + Number(record.amount), 0)
);

const totalYape = computed(() =>
  records.value
    .filter((record) => record.method === "YAPE")
    .reduce((sum, record) => sum + Number(record.amount), 0)
);

const totalCash = computed(() =>
  records.value
    .filter((record) => record.method === "EFECTIVO")
    .reduce((sum, record) => sum + Number(record.amount), 0)
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

function persistRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.value));
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

function resetForm() {
  form.value = {
    name: "",
    amount: null,
    customAmount: null,
    method: ""
  };
  errorMessage.value = "";
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
  <title>Reporte - Proyecto Pichanga</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 24px; color: #1f2937; }
    h1 { margin-bottom: 4px; }
    p { margin-top: 0; color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
    th { background: #f3f4f6; }
    .totals { margin-top: 16px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    @media print { body { margin: 10mm; } }
  </style>
</head>
<body>
  <h1>Proyecto Pichanga - Reporte de Pagos</h1>
  <p>Generado: ${new Date().toLocaleString("es-PE")}</p>

  <div class="totals">
    <div><strong>Total general:</strong> S/ ${formatAmount(totalGeneral.value)}</div>
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

onMounted(() => {
  loadRecords();
});
</script>
