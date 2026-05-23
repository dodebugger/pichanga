import { strFromU8, unzipSync } from "fflate";

const SPREADSHEET_ID = "1asqY2ooiesj3BbC5xlFNY-xPTOSf8JwE";
const SHEET_NAME = "Resumen";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx`;

const REQUIRED_COLUMNS = ["N°", "FECHA", "SALDO", "FOTO", "ESTADO"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function fetchResumenRows() {
  const response = await fetch(`${SHEET_URL}&cacheBust=${Date.now()}`);

  if (!response.ok) {
    throw new Error("No se pudo leer el Google Sheet público.");
  }

  const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const workbook = parseXml(readZipText(files, "xl/workbook.xml"));
  const workbookRels = parseRels(readZipText(files, "xl/_rels/workbook.xml.rels"));
  const sheetPath = getSheetPath(workbook, workbookRels);
  const worksheet = parseXml(readZipText(files, sheetPath));
  const sharedStrings = readSharedStrings(files);
  const hyperlinks = readHyperlinks(files, sheetPath, worksheet);

  return getRows(worksheet, sharedStrings, hyperlinks);
}

function getSheetPath(workbook, workbookRels) {
  const sheets = [...workbook.getElementsByTagName("sheet")];
  const sheet = sheets.find((item) => item.getAttribute("name") === SHEET_NAME);

  if (!sheet) {
    throw new Error(`No se encontró la hoja "${SHEET_NAME}".`);
  }

  const relationId = sheet.getAttribute("r:id");
  const target = workbookRels[relationId];

  if (!target) {
    throw new Error(`No se pudo ubicar la hoja "${SHEET_NAME}".`);
  }

  return resolvePath("xl/workbook.xml", target);
}

function readSharedStrings(files) {
  if (!files["xl/sharedStrings.xml"]) return [];

  const xml = parseXml(readZipText(files, "xl/sharedStrings.xml"));
  return [...xml.getElementsByTagName("si")].map((item) =>
    [...item.getElementsByTagName("t")].map((textNode) => textNode.textContent || "").join("")
  );
}

function readHyperlinks(files, sheetPath, worksheet) {
  const relsPath = getRelsPath(sheetPath);
  const rels = files[relsPath] ? parseRels(readZipText(files, relsPath)) : {};
  const links = {};

  for (const item of worksheet.getElementsByTagName("hyperlink")) {
    const ref = item.getAttribute("ref");
    const relationId = item.getAttribute("r:id");
    if (ref && relationId && rels[relationId]) {
      links[ref] = rels[relationId];
    }
  }

  return links;
}

function getRows(worksheet, sharedStrings, hyperlinks) {
  const rowNodes = [...worksheet.getElementsByTagName("row")];
  const headerCells = getCellsByColumn(rowNodes[0], sharedStrings);
  const columns = getColumnMap(headerCells);

  return rowNodes.slice(1).reduce((rows, rowNode) => {
    const cells = getCellsByColumn(rowNode, sharedStrings);
    const number = formatIndex(getCellValue(cells, columns["N°"]));
    const date = formatExcelDate(getCellValue(cells, columns.FECHA));
    const balance = parseBalance(getCellValue(cells, columns.SALDO));
    const photoText = getCellValue(cells, columns.FOTO);
    const status = getCellValue(cells, columns.ESTADO).trim();

    if (!hasDisplayData({ number, date, balance, photoText, status })) return rows;
    if (!number) return rows;

    rows.push({
      id: `${number}-${rowNode.getAttribute("r")}`,
      number,
      date,
      balance,
      photoText: photoText || "Ver",
      photoUrl: hyperlinks[`${columns.FOTO}${rowNode.getAttribute("r")}`] || "",
      status
    });

    return rows;
  }, []);
}

function hasDisplayData(row) {
  return Boolean(row.number || row.date || row.balance || row.photoText || row.status);
}

function getColumnMap(cells) {
  const columns = {};

  for (const [column, value] of Object.entries(cells)) {
    const label = String(value || "").trim();
    if (REQUIRED_COLUMNS.includes(label)) {
      columns[label] = column;
    }
  }

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !columns[column]);
  if (missingColumns.length) {
    throw new Error(`Faltan columnas en el Sheet: ${missingColumns.join(", ")}.`);
  }

  return columns;
}

function getCellsByColumn(rowNode, sharedStrings) {
  if (!rowNode) return {};

  return [...rowNode.getElementsByTagName("c")].reduce((cells, cell) => {
    const ref = cell.getAttribute("r") || "";
    cells[getColumnName(ref)] = readCellValue(cell, sharedStrings);
    return cells;
  }, {});
}

function readCellValue(cell, sharedStrings) {
  const type = cell.getAttribute("t");

  if (type === "inlineStr") {
    return [...cell.getElementsByTagName("t")].map((node) => node.textContent || "").join("");
  }

  const value = cell.getElementsByTagName("v")[0]?.textContent || "";

  if (type === "s") {
    return sharedStrings[Number(value)] || "";
  }

  return value;
}

function getCellValue(cells, column) {
  return String(cells[column] ?? "").trim();
}

function parseBalance(value) {
  const normalized = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(",", ".");

  return Number(normalized) || 0;
}

function formatIndex(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  const number = Number(value);
  return Number.isInteger(number) ? String(number) : rawValue;
}

function formatExcelDate(value) {
  const serialDate = Number(value);
  if (!serialDate) return String(value || "");

  return new Date((serialDate - 25569) * MS_PER_DAY).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric"
  });
}

function parseXml(xmlText) {
  const document = new DOMParser().parseFromString(xmlText, "application/xml");
  if (document.getElementsByTagName("parsererror").length) {
    throw new Error("No se pudo interpretar la información del Google Sheet.");
  }

  return document;
}

function parseRels(xmlText) {
  const xml = parseXml(xmlText);

  return [...xml.getElementsByTagName("Relationship")].reduce((rels, relation) => {
    rels[relation.getAttribute("Id")] = relation.getAttribute("Target");
    return rels;
  }, {});
}

function readZipText(files, path) {
  const file = files[path.replace(/^\//, "")];
  if (!file) {
    throw new Error("No se pudo leer el archivo exportado desde Google Sheet.");
  }

  return strFromU8(file);
}

function resolvePath(fromPath, target) {
  if (target.startsWith("/")) return target.slice(1);
  if (target.startsWith("xl/")) return target;

  const baseParts = fromPath.split("/").slice(0, -1);
  const parts = [...baseParts, ...target.split("/")];
  const resolved = [];

  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }

  return resolved.join("/");
}

function getRelsPath(path) {
  const parts = path.split("/");
  const fileName = parts.pop();
  return `${parts.join("/")}/_rels/${fileName}.rels`;
}

function getColumnName(ref) {
  return ref.replace(/\d+/g, "");
}
