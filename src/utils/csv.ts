// Parser CSV simples (suporta ; ou ,) com cabeçalho.
// Retorna { header: string[], rows: string[][] }
export function parseCSV(text: string) {
  // normaliza \r\n → \n
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!raw) return { header: [], rows: [] };

  // detecta separador por heurística
  const firstLine = raw.split("\n", 1)[0] || "";
  const sep = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";

  const lines = raw.split("\n");
  const header = splitLine(lines[0], sep);
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    rows.push(splitLine(line, sep));
  }
  return { header, rows };

  function splitLine(line: string, s: string) {
    const out: string[] = [];
    let cur = "", quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"'; i++;
        } else {
          quoted = !quoted;
        }
      } else if (ch === s && !quoted) {
        out.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map((v) => v.trim());
  }
}

export function toObjectRow(header: string[], row: string[]) {
  const obj: Record<string, string> = {};
  header.forEach((h, i) => (obj[h] = (row[i] ?? "").trim()));
  return obj;
}
