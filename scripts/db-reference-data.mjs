import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
const environment = process.env.DATABASE_ENVIRONMENT?.trim();
const confirmation = process.env.REFERENCE_DATA_CONFIRM?.trim();

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED belum diatur. Reference data hanya berjalan dari secret store.",
  );
}

if (!["preview", "production"].includes(environment)) {
  throw new Error(
    "DATABASE_ENVIRONMENT harus bernilai preview atau production.",
  );
}

if (
  (environment === "production" && confirmation !== "APPLY_REFERENCE_DATA") ||
  (environment === "preview" && confirmation !== "APPLY_PREVIEW_REFERENCE_DATA")
) {
  throw new Error(
    "REFERENCE_DATA_CONFIRM tidak cocok dengan lingkungan target.",
  );
}

const categories = [
  [
    "fasilitas-kampus",
    "Fasilitas kampus",
    "Akses dan kondisi fasilitas kampus.",
    "Fasilitas FTI",
    10,
  ],
  [
    "laboratorium-komputer",
    "Laboratorium komputer",
    "Perangkat, jaringan, dan kenyamanan laboratorium.",
    "Laboratorium FTI",
    20,
  ],
  [
    "ruang-kelas-pembelajaran",
    "Ruang kelas dan pembelajaran",
    "Kenyamanan ruang dan proses belajar.",
    "Akademik FTI",
    30,
  ],
  [
    "proses-akademik",
    "Proses akademik",
    "Administrasi dan proses akademik mahasiswa.",
    "Akademik FTI",
    40,
  ],
  [
    "perpustakaan-sumber-daya",
    "Perpustakaan dan sumber daya",
    "Akses referensi dan sumber daya belajar.",
    "Layanan kampus",
    50,
  ],
  [
    "kesejahteraan-mahasiswa",
    "Kesejahteraan mahasiswa",
    "Dukungan lingkungan belajar dan kesejahteraan.",
    "Kesejahteraan mahasiswa",
    60,
  ],
  [
    "saran-ide",
    "Saran dan ide",
    "Usulan pengembangan kampus atau FTI.",
    "BEM FTI",
    70,
  ],
];

const sql = neon(databaseUrl);

for (const [slug, name, description, routeLabel, sortOrder] of categories) {
  await sql`
    insert into categories (slug, name, description, default_route_label, sort_order)
    values (${slug}, ${name}, ${description}, ${routeLabel}, ${sortOrder})
    on conflict (slug) do update
      set name = excluded.name,
          description = excluded.description,
          default_route_label = excluded.default_route_label,
          sort_order = excluded.sort_order,
          updated_at = now()
  `;
}

console.log(
  `Reference data ${environment} berhasil diterapkan: ${categories.length} kategori aktif.`,
);
