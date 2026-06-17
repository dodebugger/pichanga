import { strFromU8, unzipSync } from "fflate";

const SPREADSHEET_ID = "1asqY2ooiesj3BbC5xlFNY-xPTOSf8JwE";
const SHEET_NAME = "Resumen";
const XLSX_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx`;
const REQUIRED_COLUMNS = ["N°", "FECHA", "SALDO", "FOTO", "ESTADO"];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function fetchResumenRows() {
  const response = await fetch(`${XLSX_URL}&cacheBust=${Date.now()}`);

  if (!response.ok) {
    throw new Error("No se pudo leer el Google Sheet público.");
  }

  const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const workbook = parseXml(readZipText(files, "xl/workbook.xml"));
  const workbookRels = parseRels(readZipText(files, "xl/_rels/workbook.xml.rels"));
  const sheetPath = getSheetPath(workbook, workbookRels);
  const worksheet = parseXml(readZipText(files, sheetPath));
  const sharedStrings = readSharedStrings(files);
  const styleFormats = readStyleFormats(files);
  const hyperlinks = readHyperlinks(files, sheetPath, worksheet);

  return getRows(worksheet, sharedStrings, styleFormats, hyperlinks);
}

function getRows(worksheet, sharedStrings, styleFormats, hyperlinks) {
  const rowNodes = [...worksheet.getElementsByTagName("row")];
  const headerCells = getCellsByColumn(rowNodes[0], sharedStrings, styleFormats);
  const columns = getColumnMap(headerCells);

  return rowNodes.slice(1).reduce((rows, rowNode) => {
    const cells = getCellsByColumn(rowNode, sharedStrings, styleFormats);
    const number = formatIndex(cells[columns["N°"]]?.display);
    const date = cells[columns.FECHA]?.display || "";
    const balance = Number(cells[columns.SALDO]?.raw || 0);
    const photoText = cells[columns.FOTO]?.display || "";
    const status = String(cells[columns.ESTADO]?.display || "").trim();

    if (!isValidNumber(number)) return rows;
    if (!hasDisplayData({ number, date, balance, photoText, status })) return rows;

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

function getColumnMap(cells) {
  const columns = {};

  for (const [column, cell] of Object.entries(cells)) {
    const label = String(cell.display || "").trim();
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

function getCellsByColumn(rowNode, sharedStrings, styleFormats) {
  if (!rowNode) return {};

  return [...rowNode.getElementsByTagName("c")].reduce((cells, cell) => {
    const ref = cell.getAttribute("r") || "";
    cells[getColumnName(ref)] = readCellValue(cell, sharedStrings, styleFormats);
    return cells;
  }, {});
}

function readCellValue(cell, sharedStrings, styleFormats) {
  const type = cell.getAttribute("t");
  const raw = cell.getElementsByTagName("v")[0]?.textContent || "";

  if (type === "inlineStr") {
    const display = [...cell.getElementsByTagName("t")].map((node) => node.textContent || "").join("");
    return { display, raw: display };
  }

  if (type === "s") {
    const display = sharedStrings[Number(raw)] || "";
    return { display, raw: display };
  }

  const formatCode = styleFormats[Number(cell.getAttribute("s") || 0)] || "";
  return {
    display: formatByCellStyle(raw, formatCode),
    raw
  };
}

function formatByCellStyle(value, formatCode) {
  if (!value) return "";

  const normalizedFormat = String(formatCode || "").toLowerCase();
  if (normalizedFormat.includes("d") && normalizedFormat.includes("m") && normalizedFormat.includes("y")) {
    return formatExcelDate(value, normalizedFormat);
  }

  return String(value).trim();
}

function formatExcelDate(value, formatCode) {
  const serialDate = Number(value);
  if (!serialDate) return String(value || "");

  const date = new Date((serialDate - 25569) * MS_PER_DAY);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear());

  if (formatCode.indexOf("m") < formatCode.indexOf("d")) {
    return `${month}/${day}/${year}`;
  }

  return `${day}/${month}/${year}`;
}

function readSharedStrings(files) {
  if (!files["xl/sharedStrings.xml"]) return [];

  const xml = parseXml(readZipText(files, "xl/sharedStrings.xml"));
  return [...xml.getElementsByTagName("si")].map((item) =>
    [...item.getElementsByTagName("t")].map((textNode) => textNode.textContent || "").join("")
  );
}

function readStyleFormats(files) {
  if (!files["xl/styles.xml"]) return [];

  const xml = parseXml(readZipText(files, "xl/styles.xml"));
  const customFormats = {};

  for (const format of xml.getElementsByTagName("numFmt")) {
    customFormats[format.getAttribute("numFmtId")] = format.getAttribute("formatCode") || "";
  }

  return [...xml.getElementsByTagName("cellXfs")[0]?.getElementsByTagName("xf") || []].map((style) => {
    const formatId = style.getAttribute("numFmtId");
    return customFormats[formatId] || getBuiltinFormat(formatId);
  });
}

function getBuiltinFormat(formatId) {
  const builtinFormats = {
    14: "m/d/yyyy",
    15: "d-mmm-yy",
    16: "d-mmm",
    17: "mmm-yy",
    22: "m/d/yyyy h:mm"
  };

  return builtinFormats[formatId] || "";
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

function isValidNumber(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return false;

  const number = Number(rawValue);
  return !Number.isFinite(number) || number > 0;
}

function hasDisplayData(row) {
  return Boolean(row.number || row.date || row.balance || row.photoText || row.status);
}

function formatIndex(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  const number = Number(rawValue);
  return Number.isInteger(number) ? String(number) : rawValue;
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
