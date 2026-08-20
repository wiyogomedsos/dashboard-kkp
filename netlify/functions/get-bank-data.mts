// netlify/functions/get-bank-data.mts
//
// Function ini adalah satu-satunya pintu untuk mengambil data dari Google
// Sheets. Browser TIDAK PERNAH memanggil Google Sheets secara langsung lagi.
// Setiap request wajib membawa cookie nf_jwt (otomatis terkirim browser
// setelah user login lewat @netlify/identity), lalu role di dalam token
// itu dicocokkan dengan bank yang diminta sebelum data dikirim balik.

import { getUser } from "@netlify/identity";
import type { Context } from "@netlify/functions";

const SHEET_ID = "1OX0Wsozkenqwp1uPf9aTprJdDl2wVNbd9L0hIaAyF-w";

// HARUS sama persis dengan mapping ROLE_TO_BANK di public/index.html
const ROLE_TO_BANK: Record<string, string> = {
  btn: "BTN",
  bri_surabaya: "BRI RO SURABAYA",
  bri_malang: "BRI RO MALANG",
  bni_surabaya: "BNI RO SURABAYA",
  bni_malang: "BNI RO MALANG",
  mandiri: "BANK MANDIRI",
  jatim: "BANK JATIM",
  bsi: "BSI",
};
const VALID_BANK_NAMES = new Set(Object.values(ROLE_TO_BANK));

export default async (req: Request, context: Context) => {
  // 1. Pastikan user login
  const user = await getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Belum login." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Ambil role dari appMetadata (diisi admin lewat Netlify Identity UI)
  const roles: string[] = (user.appMetadata && user.appMetadata.roles) || [];
  const isAdmin = roles.includes("admin");
  const allowedBanks = isAdmin
    ? Array.from(VALID_BANK_NAMES)
    : roles.map((r) => ROLE_TO_BANK[r]).filter(Boolean);

  // 3. Cek bank yang diminta valid & termasuk yang diizinkan untuk role ini
  const requestedBank = new URL(req.url).searchParams.get("bank") || "";
  if (!VALID_BANK_NAMES.has(requestedBank)) {
    return new Response(
      JSON.stringify({ error: "Nama bank tidak dikenali." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!allowedBanks.includes(requestedBank)) {
    return new Response(
      JSON.stringify({ error: `Akun Anda tidak punya akses ke data "${requestedBank}".` }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Baru setelah lolos verifikasi, tarik data dari Google Sheets di sisi server
  const csvUrl =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
    `?tqx=out:csv&sheet=${encodeURIComponent(requestedBank)}`;

  let upstream: Response;
  try {
    upstream = await fetch(csvUrl);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Gagal menghubungi Google Sheets." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({ error: `Google Sheets merespons status ${upstream.status}. Pastikan sharing spreadsheet masih "Anyone with the link – Viewer".` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const csvText = await upstream.text();

  return new Response(csvText, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};

export const config = {
  path: "/.netlify/functions/get-bank-data",
};
