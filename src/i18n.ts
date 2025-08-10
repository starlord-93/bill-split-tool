export function toTamilSummary(result: {
subtotal: number;
tax: number;
tip: number;
total: number;
participants: { name: string; amount: number; upi_note: string }[];
}) {
const lines: string[] = [];
lines.push(`மொத்தம் ₹${result.total} (Subtotal ₹${result.subtotal}, Tax ₹${result.tax}, Tip ₹${result.tip})`);
lines.push("பங்கு:");
for (const p of result.participants) {
lines.push(`- ${p.name}: ₹${p.amount} — UPI: “${p.upi_note}”`);
}
return lines.join("\n");
}