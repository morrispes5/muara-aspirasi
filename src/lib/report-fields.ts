export const nimPattern = /^[0-9]{7,20}$/;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const whatsappPattern = /^\+?[0-9 ()-]+$/;

export function isValidWhatsapp(value: string) {
  return (
    whatsappPattern.test(value) &&
    /^[0-9]{7,15}$/.test(value.replace(/\D/g, ""))
  );
}

export const reportFieldDefinitions = [
  {
    key: "name",
    label: "Nama lengkap",
    max: 160,
    placeholder: "Nama sesuai data mahasiswa",
  },
  {
    key: "nim",
    label: "NIM",
    max: 20,
    placeholder: "Contoh format: 2411500001 (7–20 angka)",
  },
  {
    key: "email",
    label: "Email",
    max: 320,
    placeholder: "nama@student.budiluhur.ac.id",
  },
  { key: "whatsapp", label: "WhatsApp", max: 32, placeholder: "08… atau +62…" },
  {
    key: "title",
    label: "Judul masalah atau ide",
    max: 200,
    placeholder: "Contoh: AC ruang kelas tidak berfungsi",
  },
  {
    key: "location",
    label: "Lokasi atau area",
    max: 200,
    placeholder: "Gedung, lantai, ruang; atau layanan terkait",
  },
  {
    key: "chronology",
    label: "Kronologi",
    max: 5000,
    placeholder: "Kapan terjadi? Apa yang terjadi? Seberapa sering?",
  },
  {
    key: "impact",
    label: "Dampak yang dirasakan",
    max: 3000,
    placeholder: "Apa dampaknya pada kegiatan kuliah?",
  },
  {
    key: "suggestedSolution",
    label: "Usulan solusi",
    max: 3000,
    placeholder:
      "Apa yang diharapkan? Jika belum tahu, tulis perlu bantuan BEM menentukan solusi.",
  },
] as const;

export type ReportFields = Record<
  (typeof reportFieldDefinitions)[number]["key"],
  string
>;

export function reportFieldError(key: keyof ReportFields, value: string) {
  if (!value.trim()) return "Kolom ini wajib diisi.";
  if (key === "nim" && !nimPattern.test(value.trim()))
    return "NIM harus 7–20 angka, tanpa spasi atau tanda baca.";
  if (key === "email" && !emailPattern.test(value.trim()))
    return "Masukkan email yang valid.";
  if (key === "whatsapp" && !isValidWhatsapp(value.trim()))
    return "WhatsApp harus memuat 7–15 angka.";
  return null;
}
