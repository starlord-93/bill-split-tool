export type Line = { text: string };
export type Item = { name: string; qty: number; price: number; total: number };
export type Participants = string[];
export type Assignment = Record<string, string[]>; // name -> item names
export type ParsedReceipt = {
items: Item[];
subtotal: number | null;
tax: number;
tip: number;
total: number | null;
};

export type SplitResult = {
currency: "INR";
subtotal: number;
tax: number;
tip: number;
total: number;
participants: { name: string; amount: number; upi_note: string }[];
};