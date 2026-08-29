import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL_UNPOOLED;
const environment = process.env.DATABASE_ENVIRONMENT;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL_UNPOOLED belum diatur. Seed hanya berjalan dari .env.local atau secret store.",
  );
}

if (environment !== "development" && environment !== "preview") {
  throw new Error(
    "DATABASE_ENVIRONMENT harus bernilai development atau preview agar seed tidak pernah mengenai production.",
  );
}

const sql = neon(databaseUrl);

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

const insertedSeedUser = await sql`
  insert into bem_users (name, email, role, status)
  values ('Development Seed Admin', 'development-seed-admin@example.invalid', 'ADMIN', 'SUSPENDED')
  on conflict do nothing
  returning id
`;

const [seedUser] =
  insertedSeedUser.length > 0
    ? insertedSeedUser
    : await sql`
        select id
        from bem_users
        where email = 'development-seed-admin@example.invalid'
        limit 1
      `;

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

const [category] = await sql`
  select id from categories where slug = 'saran-ide' limit 1
`;

await sql`
  insert into advocacy_updates (
    slug, title, summary, body, category_id, progress_label, publication_status, author_user_id
  )
  values (
    'development-seed-update',
    'Contoh draf pengelolaan aspirasi',
    'Data seed aman untuk pengujian development dan preview.',
    'Draf ini tidak boleh dipublikasikan dan tidak memuat aspirasi atau identitas mahasiswa nyata.',
    ${category.id},
    'Draf internal',
    'DRAFT',
    ${seedUser.id}
  )
  on conflict (slug) do nothing
`;

await sql`
  insert into student_info_posts (
    slug, title, summary, body, category, publication_status, author_user_id
  )
  values (
    'development-seed-info',
    'Contoh draf informasi mahasiswa',
    'Data seed aman untuk pengujian development dan preview.',
    'Draf ini tidak memuat informasi kampus nyata dan tidak boleh dipublikasikan.',
    'ANNOUNCEMENT',
    'DRAFT',
    ${seedUser.id}
  )
  on conflict (slug) do nothing
`;

console.log(
  "Seed development/preview berhasil diterapkan tanpa data mahasiswa nyata.",
);
