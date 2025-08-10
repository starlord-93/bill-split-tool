const money = (s: string) => {
const m = s.replace(/[,₹]/g, "").match(/(\d+(\.\d+)?)/);
return m ? parseFloat(m) : NaN;[^1]
};

export function parseReceipt(raw: string): ParsedReceipt {
const lines = raw
.split(/\r?\n/)
.map(l => l.trim())
.filter(Boolean);

const items = [] as Item[];
let subtotal: number | null = null;
let tax = 0;
let tip = 0;
let total: number | null = null;

for (const line of lines) {
const low = line.toLowerCase();

    // Totals
    if (/\bsubtotal\b/.test(low)) {
      const v = money(line);
      if (!isNaN(v)) subtotal = v;
      continue;
    }
    if (/\b(total)\b/.test(low) && !/\bsubtotal\b/.test(low)) {
      const v = money(line);
      if (!isNaN(v)) total = v;
      continue;
    }
    if (/(gst|cgst|sgst|tax)/.test(low)) {
      const v = money(line);
      if (!isNaN(v)) tax += v;
      continue;
    }
    if (/service\s*charge/.test(low)) {
      const v = money(line);
      if (!isNaN(v)) tax += v; // treat as tax bucket
      continue;
    }
    if (/\btip\b/.test(low)) {
      const v = money(line);
      if (!isNaN(v)) tip += v;
      continue;
    }
    
    // Items: "<name> x2 320.00" or "<name> 2 x 160 320.00" or "<name> 320.00"
    const m = line.match(/^(.+?)\s+(x?\s*\d+)?\s*(\d+(\.\d{1,2})?)\s*$/i);
    if (m) {
      const name = m.replace(/\s*x$/i, "").trim();[^1]
      const qtyStr = m?.replace(/[xX]/g, "").trim();[^2]
      const qty = qtyStr ? parseInt(qtyStr) : 1;
      const price = parseFloat(m);[^3]
      const totalItem = price; // Often receipts print line total
      items.push({ name, qty: isNaN(qty) ? 1 : qty, price, total: totalItem });
    }
    }

// Derive subtotal/total if missing
const itemsTotal =
items.reduce((s, it) => s + (isFinite(it.total) ? it.total : it.qty * it.price), 0) || 0;

if (subtotal == null) subtotal = Math.round(itemsTotal * 100) / 100;
if (total == null) total = Math.round((subtotal + tax + tip) * 100) / 100;

return { items, subtotal, tax, tip, total };
}

export function applyAssignments(
parsed: ParsedReceipt,
participants: Participants,
assignment: Assignment | null
): SplitResult {
const names = participants.length ? participants : ["Person 1", "Person 2"];

const share: Record<string, number> = Object.fromEntries(names.map(n => [n, 0]));

const itemTotals = parsed.items.map(it =>
isFinite(it.total) ? it.total : it.qty * it.price
);
const sumItems = itemTotals.reduce((a, b) => a + b, 0) || 0;

if (assignment \&\& Object.keys(assignment).length > 0) {
// Allocate items to specified people; unassigned items split equally among all
const assigned = new Set<string>();
for (const [person, list] of Object.entries(assignment)) {
for (const itemName of list) {
const idx = parsed.items.findIndex(
it => it.name.toLowerCase() === itemName.toLowerCase()
);
if (idx >= 0) {
const val = itemTotals[idx];
share[person] = (share[person] || 0) + val;
assigned.add(parsed.items[idx].name);
}
}
}
const unassignedValue = parsed.items
.filter(it => !assigned.has(it.name))
.reduce((s, it, i) => s + itemTotals[parsed.items.indexOf(it)], 0);

    const equal = unassignedValue / names.length;
    for (const n of names) share[n] += equal;
    } else {
// Equal split
const equal = sumItems / names.length;
for (const n of names) share[n] = equal;
}

const taxTip = parsed.tax + parsed.tip;
// Proportional allocation of tax/tip
const proportions: Record<string, number> = {};
const sumShare = Object.values(share).reduce((a, b) => a + b, 0) || 1;
for (const n of names) {
proportions[n] = share[n] / sumShare;
share[n] += taxTip * proportions[n];
}

const result: SplitResult = {
currency: "INR",
subtotal: round2(parsed.subtotal),
tax: round2(parsed.tax),
tip: round2(parsed.tip),
total: round2(parsed.total),
participants: names.map(n => ({
name: n,
amount: round2(share[n]),
upi_note: `BillSplit ${new Date().toLocaleDateString("en-IN", {         month: "short",         day: "2-digit"       })} ${n} ₹${round2(share[n])}`
}))
};

return result;
}

function round2(n: number) {
return Math.round(n * 100) / 100;
}