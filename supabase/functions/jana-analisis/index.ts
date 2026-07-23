// Fungsi Edge 'jana-analisis' — proksi Gemini di SISI PELAYAN.
//
// Kunci GEMINI_API_KEY hanya wujud sebagai rahsia fungsi ini; ia tidak
// pernah dihantar ke pelayar. Prompt dibina di sini daripada angka/label
// yang dihantar klien — fungsi ini BUKAN proksi Gemini am, jadi JWT yang
// dicuri tidak boleh menggunakannya untuk penjanaan sewenang-wenangnya.
//
// Deploy:   supabase functions deploy jana-analisis   (Verify JWT: ON)
// Rahsia:   supabase secrets set GEMINI_API_KEY=...
//           supabase secrets set ALLOWED_ORIGIN=https://<url-app>  (pilihan)

import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_MODEL = 'gemini-3-flash-preview';

const MANAGEMENT_ROLES = [
  'unit_semakan',
  'unit_pembentangan',
  'unit_kertas_kerja',
  'unit_pelaporan',
  'admin',
  'ydp',
  'tnc_hepa',
];

// Nilai header mesti ByteString (ASCII boleh cetak) — aksara halimunan atau
// petikan condong daripada salin-tampal rahsia akan menyebabkan TypeError
// semasa membina permintaan/respons. Sanitasi di sini menjadikannya mesej
// ralat yang jelas, bukan kegagalan kabur.
function cleanAscii(v: string | undefined): string {
  return (v ?? '').trim();
}
function isPrintableAscii(v: string): boolean {
  return /^[\x21-\x7e]+$/.test(v);
}

const rawOrigin = cleanAscii(Deno.env.get('ALLOWED_ORIGIN'));
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': rawOrigin && isPrintableAscii(rawOrigin) ? rawOrigin : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// Penyucian input: nombor terhingga sahaja; rentetan dipotong (elak
// penyalahgunaan prompt melalui muatan besar / arahan tersembunyi).
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown, max = 200): string {
  return String(v ?? '')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, max);
}

function buildPrompt(jenis: string, data: Record<string, unknown>) {
  if (jenis === 'papan-pemuka') {
    return {
      systemInstruction: undefined as string | undefined,
      prompt: `
        Sebagai penganalisis data universiti, berikan satu perenggan ringkas (3-4 ayat) analisis eksekutif berdasarkan data berikut:
        - Peranan Pengguna: ${str(data.peranan, 30)}
        - Jumlah Permohonan: ${num(data.jumlahPermohonan)}
        - Permohonan Lulus: ${num(data.permohonanLulus)}
        - Jumlah Bajet Terlibat: RM${num(data.jumlahBajet).toLocaleString()}
        - Sesi: ${str(data.sesi, 20)}, Semester: ${str(data.semester, 10)}

        Berikan fokus kepada prestasi pengurusan aktiviti dan cadangan ringkas. Gunakan Bahasa Melayu yang profesional.
      `,
    };
  }
  if (jenis === 'analitik') {
    const taburan = Array.isArray(data.taburanKategori)
      ? data.taburanKategori
          .slice(0, 20)
          .map((d) => {
            const item = d as Record<string, unknown>;
            return `${str(item.name, 60)}: ${num(item.value)}`;
          })
          .join(', ')
      : '';
    return {
      systemInstruction:
        'Anda ialah penganalisis data universiti yang pakar dalam pembangunan pelajar. Berikan analisis yang profesional, padat dan berwawasan dalam Bahasa Melayu.',
      prompt: `
        Berdasarkan data aktiviti pelajar universiti berikut (Tahun: ${str(data.tahun, 20)}, Teras: ${str(data.teras, 60)}, Peringkat: ${str(data.peringkat, 40)}), berikan satu perenggan analisis eksekutif mengenai trend semasa dan cadangan penambahbaikan.

        Data Semasa (Ditapis):
        Jumlah Permohonan: ${num(data.jumlahPermohonan)}
        Permohonan Lulus Sepenuhnya: ${num(data.permohonanLulus)} (${num(data.kadarLulus)}%)
        Bajet Diluluskan: RM${num(data.bajetDiluluskan).toLocaleString()}
        Bajet Digunakan (disahkan): RM${num(data.bajetDigunakan).toLocaleString()}
        Jumlah Peserta Terlibat: ${num(data.peserta).toLocaleString()}
        Taburan Kategori Program: ${taburan}

        Sila berikan ulasan yang kritikal tetapi membina untuk membantu pihak pengurusan membuat keputusan yang lebih baik.
      `,
    };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'kaedah tidak dibenarkan' });
  }

  // Sahkan sesi + peranan pengurusan (JWT turut disahkan oleh gateway).
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json(401, { error: 'tidak dibenarkan' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json(401, { error: 'tidak dibenarkan' });

  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('uid', userData.user.id)
    .maybeSingle();
  if (!profile || !MANAGEMENT_ROLES.includes(String(profile.role))) {
    return json(403, { error: 'tidak dibenarkan' });
  }

  let body: { jenis?: string; data?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'badan permintaan tidak sah' });
  }

  const built = buildPrompt(String(body.jenis ?? ''), body.data ?? {});
  if (!built) return json(400, { error: 'jenis tidak sah' });

  const apiKey = cleanAscii(Deno.env.get('GEMINI_API_KEY'));
  if (!apiKey) return json(502, { error: 'GEMINI_API_KEY belum ditetapkan pada fungsi' });
  if (!isPrintableAscii(apiKey)) {
    console.error('GEMINI_API_KEY mengandungi aksara bukan-ASCII (salin-tampal rosak?)');
    return json(502, {
      error:
        'GEMINI_API_KEY mengandungi aksara tidak sah — tetapkan semula rahsia dengan nilai kunci yang bersih (tanpa petikan condong atau aksara halimunan).',
    });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: built.prompt }] }],
          ...(built.systemInstruction
            ? { systemInstruction: { parts: [{ text: built.systemInstruction }] } }
            : {}),
        }),
      },
    );
    if (!geminiRes.ok) {
      console.error('Gemini API:', geminiRes.status, await geminiRes.text());
      return json(502, { error: 'Gagal menjana analisis AI.' });
    }
    const result = await geminiRes.json();
    const text: string =
      result?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('') ?? '';
    if (!text) return json(502, { error: 'Tiada analisis dapat dijana.' });
    return json(200, { text });
  } catch (err) {
    console.error('jana-analisis:', err);
    return json(502, { error: 'Gagal menjana analisis AI.' });
  }
});
