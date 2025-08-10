import express from "express";
import { parseReceipt, applyAssignments } from "./parse.js";
import { toTamilSummary } from "./i18n.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

// Simple viewer counter for leaderboard/demo
let viewers = 0;
app.get("/health", (_req, res) => res.json({ ok: true, viewers }));
app.get("/view", (_req, res) => {
viewers++;
res.json({ ok: true, viewers });
});

// Core endpoint: split
// Body:
// {
//   "receipt_text": "string" (raw pasted receipt) OR
//   "lines": [{ "text": "..." }] (OCR lines),
//   "participants": ["Arjun", "Meera", "Kavin"],
//   "assignment": { "Meera": ["Paneer Tikka"], "Kavin": ["Butter Naan"] },
//   "lang": "ta" | "en"
// }
app.post("/split", (req, res) => {
try {
const { receipt_text, lines, participants = [], assignment = null, lang = "ta" } =
req.body || {};

    const raw =
      typeof receipt_text === "string" && receipt_text.trim().length
        ? receipt_text
        : Array.isArray(lines)
        ? lines.map((l: any) => (l?.text ?? "")).join("\n")
        : "";
    
    if (!raw) {
      return res.status(400).json({ error: "Provide receipt_text or lines[]" });
    }
    
    const parsed = parseReceipt(raw);
    const result = applyAssignments(parsed, participants, assignment);
    const human =
      lang === "ta"
        ? toTamilSummary(result)
        : humanEnglish(result);
    
    res.json({ human, json: result, parsed });
    } catch (e: any) {
res.status(500).json({ error: e?.message || "Internal error" });
}
});

function humanEnglish(result: {
subtotal: number;
tax: number;
tip: number;
total: number;
participants: { name: string; amount: number; upi_note: string }[];
}) {
const lines: string[] = [];
lines.push(`Total ₹${result.total} (Subtotal ₹${result.subtotal}, Tax ₹${result.tax}, Tip ₹${result.tip})`);
lines.push("Split:");
for (const p of result.participants) {
lines.push(`- ${p.name}: ₹${p.amount} — UPI: “${p.upi_note}”`);
}
return lines.join("\n");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`BillSplit server listening on :${PORT}`);
});