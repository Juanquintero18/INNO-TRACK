import { describe, it, expect } from "vitest";
import { buildExportFileName, buildSheet, EXCEL_FORMATS, toExcelDate, toExcelDateTime } from "./excel-export";

describe("toExcelDate", () => {
  it("convierte fechas ISO a medianoche UTC para no desplazar el dia", () => {
    expect(toExcelDate("2026-03-05")).toEqual(new Date(Date.UTC(2026, 2, 5)));
  });

  it("devuelve null sin fecha y conserva textos que no son fechas ISO", () => {
    expect(toExcelDate(null)).toBeNull();
    expect(toExcelDate("")).toBeNull();
    expect(toExcelDate("pendiente")).toBe("pendiente");
  });
});

describe("toExcelDateTime", () => {
  it("expresa la hora en zona horaria de Bogota", () => {
    // 03:30 UTC del dia 10 son las 22:30 del dia 9 en Bogota (UTC-5).
    expect(toExcelDateTime("2026-01-10T03:30:00Z")).toEqual(new Date(Date.UTC(2026, 0, 9, 22, 30, 0)));
  });

  it("devuelve null sin fecha y conserva textos invalidos", () => {
    expect(toExcelDateTime(undefined)).toBeNull();
    expect(toExcelDateTime("sin fecha")).toBe("sin fecha");
  });
});

describe("buildSheet", () => {
  const sheet = buildSheet({
    name: "Prueba",
    rows: [
      { nombre: "Resina", costo: 12.5, fecha: "2026-03-05", nota: null as string | null },
      { nombre: "Fibra de vidrio biaxial", costo: Number.NaN, fecha: null as string | null, nota: "" },
    ],
    columns: [
      { header: "Nombre", value: row => row.nombre },
      { header: "Costo", value: row => row.costo, format: EXCEL_FORMATS.money },
      { header: "Fecha", value: row => toExcelDate(row.fecha) },
      { header: "Nota", value: row => row.nota },
    ],
  });

  it("pone el encabezado en negrilla como primera fila", () => {
    expect(sheet.rowCount).toBe(2);
    expect(sheet.data).toHaveLength(3);
    expect(sheet.data[0]).toEqual([
      expect.objectContaining({ value: "Nombre", fontWeight: "bold" }),
      expect.objectContaining({ value: "Costo", fontWeight: "bold" }),
      expect.objectContaining({ value: "Fecha", fontWeight: "bold" }),
      expect.objectContaining({ value: "Nota", fontWeight: "bold" }),
    ]);
  });

  it("escribe numeros y fechas tipados con su formato", () => {
    expect(sheet.data[1]).toEqual([
      "Resina",
      { value: 12.5, format: EXCEL_FORMATS.money },
      { value: new Date(Date.UTC(2026, 2, 5)), format: EXCEL_FORMATS.date },
      null,
    ]);
  });

  it("deja vacias las celdas sin valor o con numeros invalidos", () => {
    expect(sheet.data[2]).toEqual(["Fibra de vidrio biaxial", null, null, null]);
  });

  it("ajusta el ancho al contenido respetando el minimo", () => {
    expect(sheet.columns[0].width).toBe("Fibra de vidrio biaxial".length + 2);
    expect(sheet.columns[3].width).toBe(10);
  });
});

describe("buildExportFileName", () => {
  it("agrega la fecha local y la extension", () => {
    expect(buildExportFileName("piezas", new Date(2026, 9, 9))).toBe("piezas_2026-10-09.xlsx");
  });
});
