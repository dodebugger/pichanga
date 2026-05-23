<template>
  <div class="page">
    <header class="hero">
      <nav class="top-nav" aria-label="Navegación principal">
        <a class="btn btn-small" :href="basePath">Registro</a>
      </nav>
      <h1>Resumen</h1>
      <p>Saldos leídos desde Google Sheet</p>
    </header>

    <main class="layout">
      <section class="card">
        <div class="card-top">
          <h2>Listado de saldos</h2>
          <div class="actions-row report-actions">
            <button class="btn btn-whatsapp" type="button" @click="shareResumenWhatsApp" :disabled="isLoading || !rows.length">
              Compartir WhatsApp
            </button>
            <button class="btn btn-primary" type="button" @click="loadResumen" :disabled="isLoading">
              {{ isLoading ? "Cargando..." : "Actualizar" }}
            </button>
          </div>
        </div>

        <p v-if="isLoading" class="loading-msg">Consultando Google Sheet...</p>
        <p v-else-if="errorMessage" class="error">{{ errorMessage }}</p>

        <template v-else>
          <div class="table-wrap desktop-table">
            <table class="records-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>FECHA</th>
                  <th>SALDO</th>
                  <th>FOTO</th>
                  <th>ESTADO</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!rows.length">
                  <td colspan="5" class="empty">No hay datos para mostrar.</td>
                </tr>
                <tr v-for="row in rows" :key="row.id">
                  <td>{{ row.number }}</td>
                  <td>{{ row.date }}</td>
                  <td>{{ formatCurrency(row.balance) }}</td>
                  <td>
                    <a
                      v-if="row.photoUrl"
                      class="btn btn-small link-btn"
                      :href="row.photoUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ row.photoText }}
                    </a>
                    <span v-else class="empty">Sin enlace</span>
                  </td>
                  <td>
                    <span class="badge" :class="getStatusClass(row.status)">
                      {{ row.status || "SIN ESTADO" }}
                    </span>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="rows.length">
                <tr class="total-row">
                  <td colspan="2">TOTAL SALDO</td>
                  <td colspan="3">{{ formatCurrency(totalBalance) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="mobile-cards">
            <article v-for="row in rows" :key="`mobile-${row.id}`" class="record-card">
              <header>
                <strong>#{{ row.number }} - {{ row.date }}</strong>
              </header>
              <p><span>Saldo:</span> {{ formatCurrency(row.balance) }}</p>
              <p>
                <span>Foto:</span>
                <a
                  v-if="row.photoUrl"
                  class="btn btn-small link-btn"
                  :href="row.photoUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {{ row.photoText }}
                </a>
                <span v-else class="empty">Sin enlace</span>
              </p>
              <p>
                <span>Estado:</span>
                <span class="badge" :class="getStatusClass(row.status)">
                  {{ row.status || "SIN ESTADO" }}
                </span>
              </p>
            </article>
            <p v-if="!rows.length" class="empty">No hay datos para mostrar.</p>
          </div>

          <div v-if="rows.length" class="total-summary">
            <span>Total saldo</span>
            <strong>{{ formatCurrency(totalBalance) }}</strong>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { fetchResumenRows } from "../services/googleSheetResumen";

const rows = ref([]);
const isLoading = ref(false);
const errorMessage = ref("");
const basePath = import.meta.env.BASE_URL;
const totalBalance = computed(() => rows.value.reduce((sum, row) => sum + Number(row.balance || 0), 0));

const currencyFormatter = new Intl.NumberFormat("es-PE", {
  currency: "PEN",
  minimumFractionDigits: 2,
  style: "currency"
});

async function loadResumen() {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    rows.value = await fetchResumenRows();
  } catch (error) {
    rows.value = [];
    errorMessage.value = error?.message || "No se pudo cargar el resumen.";
  } finally {
    isLoading.value = false;
  }
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0);
}

function getStatusClass(status) {
  const normalizedStatus = String(status || "").toUpperCase();
  return {
    "badge-pending": normalizedStatus === "PENDIENTE",
    "badge-deposited": normalizedStatus === "DEPOSITADO",
    "badge-transferred": normalizedStatus === "TRANSFERIDO"
  };
}

async function shareResumenWhatsApp() {
  const blob = await createResumenImageBlob();
  if (!blob) return;

  const file = new File([blob], `resumen-pichanga-${new Date().toISOString().slice(0, 10)}.png`, {
    type: "image/png"
  });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: "Resumen Pichanga",
        text: "Resumen de saldos de pichanga",
        files: [file]
      });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);

  const text = encodeURIComponent(`Resumen Pichanga\nTotal saldo: ${formatCurrency(totalBalance.value)}`);
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

async function createResumenImageBlob() {
  const rowHeight = 58;
  const headerHeight = 170;
  const footerHeight = 96;
  const width = 1080;
  const height = headerHeight + rows.value.length * rowHeight + footerHeight;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#ddd4c5";
  ctx.lineWidth = 2;
  roundedRect(ctx, 24, 24, width - 48, height - 48, 18, "#fffaf0", "#ddd4c5");

  ctx.fillStyle = "#1f2937";
  ctx.font = "700 42px Sora, Arial, sans-serif";
  ctx.fillText("Pichanga - Resumen", 56, 82);
  ctx.font = "600 24px Sora, Arial, sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText(`Generado: ${new Date().toLocaleString("es-PE")}`, 56, 122);

  const columns = [
    { label: "N°", x: 56, width: 80 },
    { label: "FECHA", x: 150, width: 190 },
    { label: "SALDO", x: 370, width: 210 },
    { label: "FOTO", x: 610, width: 150 },
    { label: "ESTADO", x: 790, width: 230 }
  ];

  drawImageRow(ctx, columns, 146, true);
  rows.value.forEach((row, index) => {
    drawImageRow(ctx, columns, 146 + (index + 1) * rowHeight, false, [
      row.number,
      row.date,
      formatCurrency(row.balance),
      row.photoUrl ? "Ver" : "-",
      row.status || "SIN ESTADO"
    ]);
  });

  const totalY = 146 + (rows.value.length + 1) * rowHeight + 18;
  roundedRect(ctx, 56, totalY, width - 112, 56, 12, "#dcfce7", "#16a34a");
  ctx.fillStyle = "#166534";
  ctx.font = "700 28px Sora, Arial, sans-serif";
  ctx.fillText("TOTAL SALDO", 82, totalY + 38);
  ctx.textAlign = "right";
  ctx.fillText(formatCurrency(totalBalance.value), width - 82, totalY + 38);
  ctx.textAlign = "left";

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png", 1));
}

function drawImageRow(ctx, columns, y, isHeader, values = []) {
  roundedRect(ctx, 56, y, 968, 48, 8, isHeader ? "#fbf4e7" : "#ffffff", "#eadfcd");
  ctx.font = `${isHeader ? "700" : "600"} 22px Sora, Arial, sans-serif`;
  ctx.fillStyle = isHeader ? "#334155" : "#1f2937";

  columns.forEach((column, index) => {
    const text = isHeader ? column.label : values[index];
    ctx.fillText(truncateText(ctx, String(text || ""), column.width), column.x, y + 31);
  });
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}...`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated}...`;
}

function roundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
}

onMounted(loadResumen);
</script>
