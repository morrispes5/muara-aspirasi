import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/layout/container";
import { HeroBackdrop } from "@/components/public/hero-backdrop";
import Image from "next/image";
import { Reveal } from "@/components/public/reveal";

const steps = [
  [
    "01",
    "Ceritakan konteksnya",
    "Sampaikan apa yang terjadi, apa yang perlu diperhatikan, atau perubahan apa yang kamu harapkan.",
  ],
  [
    "02",
    "Simpan jejak aman",
    "Saat layanan dibuka, pelapor akan menerima cara khusus untuk melihat perkembangan tanpa membuka identitasnya.",
  ],
  [
    "03",
    "Tinjau dan teruskan",
    "Aspirasi akan dibaca dengan konteks yang cukup, lalu diarahkan pada langkah yang proporsional.",
  ],
  [
    "04",
    "Baca pembaruannya",
    "Ringkasan proses dibuat jelas bagi kampus tanpa menjadikan pengalaman pelapor sebagai konsumsi publik.",
  ],
] as const;

const categories = [
  "Fasilitas kampus",
  "Laboratorium komputer",
  "Proses akademik",
  "Kenyamanan kelas",
  "Kesejahteraan mahasiswa",
  "Ide kegiatan",
] as const;

const sampleMetrics = [
  ["28", "aspirasi pada periode contoh"],
  ["06", "pembaruan proses contoh"],
  ["03", "arah perbaikan contoh"],
] as const;

export default function HomePage() {
  return (
    <main className="flex-1" id="konten-utama">
      <section className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden text-white">
        <HeroBackdrop />
        <div aria-hidden="true" className="hero-veil absolute inset-0" />
        <div aria-hidden="true" className="hero-grain absolute inset-0" />

        <Container className="relative z-10 grid w-full items-center gap-8 px-5 pt-28 pb-24 sm:pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:gap-2">
          <div className="max-w-3xl text-left">
            <p className="hero-enter hero-enter-1 text-[0.7rem] font-semibold tracking-[0.28em] text-[#f3efe6]/80 uppercase">
              Ruang aspirasi kampus
            </p>
            <h1 className="hero-enter hero-enter-2 font-display mt-6 text-[clamp(2.6rem,5.8vw,6.1rem)] leading-[0.93] tracking-[-0.052em] text-[#f7f1e6]">
              Suara kampus, <br />
              sampai ke tempat <br className="hidden sm:block" /> yang tepat.
            </h1>
            <p className="hero-enter hero-enter-3 mt-7 max-w-xl text-base leading-8 text-slate-100/90 sm:text-lg sm:leading-9">
              Muara Aspirasi menyiapkan ruang yang tenang untuk menyampaikan hal
              penting di kampus—dengan konteks yang dijaga dan tindak lanjut
              yang dapat dipahami.
            </p>
            <div className="hero-enter hero-enter-4 mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row">
              <ButtonLink
                className="rounded-full px-7 shadow-[0_12px_40px_rgba(7,21,41,0.28)]"
                href="/aspirasi/kirim"
                variant="light"
              >
                Kirim Aspirasi
              </ButtonLink>
              <ButtonLink
                className="rounded-full px-7"
                href="/aspirasi/lacak"
                variant="light-outline"
              >
                Lacak Aspirasi
              </ButtonLink>
            </div>
          </div>
          <div className="hero-enter hero-enter-5 student-scene relative mx-auto w-full max-w-xl self-end lg:translate-y-9">
            <Image
              alt="Tiga mahasiswa berdiskusi dan menyuarakan aspirasi dengan megafon"
              className="h-auto w-full drop-shadow-[0_28px_32px_rgba(0,0,0,0.3)]"
              height={936}
              priority
              sizes="(min-width: 1024px) 46vw, 88vw"
              src="/images/student-voices-editorial.png"
              width={1664}
            />
          </div>
        </Container>

        <div className="hero-enter hero-enter-5 scroll-cue absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-center text-[0.65rem] tracking-[0.22em] text-white/70 uppercase">
          Gulir
          <span className="mx-auto mt-2 block h-8 w-px bg-white/55" />
        </div>
      </section>

      <section className="bg-canvas py-24 sm:py-32">
        <Container className="max-w-4xl text-center">
          <Reveal>
            <p className="text-[0.7rem] font-semibold tracking-[0.22em] text-[#9c4c20] uppercase">
              Sebuah prinsip sederhana
            </p>
            <p className="font-display text-ink mt-6 text-[clamp(2rem,5vw,4.5rem)] leading-[0.96] tracking-[-0.04em]">
              Aspirasi bukan tontonan publik.
            </p>
            <p className="text-muted mx-auto mt-7 max-w-2xl text-lg leading-8">
              Layanan yang baik dimulai dari cara mendengar: seperlunya,
              bertanggung jawab, dan tanpa janji kosong.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="border-line bg-surface border-y py-20 sm:py-28">
        <Container className="grid items-center gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
          <Reveal className="mx-auto w-full max-w-[19rem] lg:mx-0">
            <figure className="relative border border-[#0b1930]/15 bg-[#e8edf4] p-3 shadow-[16px_18px_0_0_#173d7d]">
              <Image
                alt="Poster kampanye Muara Aspirasi dengan ilustrasi megafon"
                className="h-auto w-full"
                height={619}
                sizes="(min-width: 1024px) 19rem, 75vw"
                src="/images/muara-aspirasi-poster.jpg"
                width={495}
              />
              <figcaption className="mt-3 text-[0.62rem] font-semibold tracking-[0.16em] text-[#0b1930]/65 uppercase">
                Arsip kampanye Muara Aspirasi
              </figcaption>
            </figure>
          </Reveal>
          <Reveal delay={110}>
            <Badge>Untuk mahasiswa, bersama mahasiswa</Badge>
            <h2 className="font-display text-ink mt-5 max-w-2xl text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
              Aspirasi yang baik berangkat dari pengalaman yang benar-benar
              hidup di kampus.
            </h2>
            <p className="text-muted mt-6 max-w-2xl text-lg leading-8">
              Dari kelas, laboratorium, fasilitas, sampai kegiatan mahasiswa:
              Muara Aspirasi memberi tempat untuk menyusun pengalaman itu
              menjadi masukan yang bisa dipahami dan diperjuangkan.
            </p>
            <div className="border-ink/15 mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t pt-6">
              {categories.map((category) => (
                <span className="text-ink text-sm font-semibold" key={category}>
                  {category}
                </span>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-surface py-24 sm:py-32">
        <Container>
          <Reveal className="grid gap-12 lg:grid-cols-[0.62fr_1.38fr] lg:gap-20">
            <div className="space-y-4">
              <Badge>Ruang yang sudah aktif</Badge>
              <p className="font-display text-ink max-w-sm text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
                Bukan sekadar tempat mengisi keluhan.
              </p>
            </div>
            <div className="text-muted max-w-3xl space-y-8 text-lg leading-8 sm:text-xl sm:leading-9">
              <p>
                Muara Aspirasi membuat percakapan kampus terasa lebih terarah.
                Aspirasi dapat berangkat dari persoalan kecil, gagasan yang
                belum terdengar, atau pengalaman yang perlu dibaca dengan lebih
                saksama.
              </p>
              <p className="text-ink border-ink/15 border-t pt-6 text-sm font-semibold">
                Di sini, setiap suara diperlakukan sebagai konteks yang perlu
                didengar—bukan sekadar angka untuk ditampilkan.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="border-line bg-surface border-y py-12 sm:py-16">
        <Container>
          <Reveal className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[0.7rem] font-semibold tracking-[0.22em] text-[#9c4c20] uppercase">
                Ruang kolaborasi kampus
              </p>
              <p className="text-ink mt-3 max-w-xl text-lg leading-8">
                Muara Aspirasi hadir dalam ekosistem Universitas Budi Luhur,
                Fakultas Teknologi Informasi, dan BEM FTI.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md border border-[#0b1930]/10 bg-white px-3 py-2">
                <Image
                  alt="Universitas Budi Luhur dan Fakultas Teknologi Informasi"
                  height={42}
                  src="/images/ubl-fti-lockup.png"
                  width={115}
                />
              </span>
              <span className="rounded-md border border-[#0b1930]/10 bg-white p-2">
                <Image
                  alt="Logo Fakultas Teknologi Informasi"
                  height={42}
                  src="/images/fti-logo.jpg"
                  width={45}
                />
              </span>
              <span className="rounded-md border border-[#0b1930]/10 bg-white p-2">
                <Image
                  alt="Identitas BEM Fakultas Teknologi Informasi"
                  className="h-[42px] w-auto"
                  height={399}
                  src="/images/bem-fti-mark.png"
                  width={403}
                />
              </span>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="border-line bg-canvas border-y py-24 sm:py-32">
        <Container>
          <Reveal className="mb-14 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl space-y-4">
              <Badge>Alur yang jelas</Badge>
              <h2 className="font-display text-ink text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
                Setiap suara perlu jalur, bukan sekadar ruang kosong.
              </h2>
            </div>
            <p className="text-muted max-w-sm text-sm leading-6">
              Ini adalah alur layanan yang digunakan pada halaman publik. Form
              pengiriman sudah aktif dengan verifikasi anti-spam dan bukti
              penerimaan yang dapat disimpan pelapor.
            </p>
          </Reveal>
          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(([number, title, description], index) => (
              <Reveal delay={index * 80} key={number}>
                <li className="rounded-card bg-surface shadow-card h-full px-6 py-8">
                  <span className="editorial-index text-brand/70 text-4xl">
                    {number}
                  </span>
                  <h3 className="text-ink mt-8 text-lg font-bold tracking-tight">
                    {title}
                  </h3>
                  <p className="text-muted mt-3 text-sm leading-6">
                    {description}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <section className="bg-night py-24 text-white sm:py-32">
        <Container className="grid gap-14 lg:grid-cols-[0.86fr_1.14fr] lg:gap-24">
          <Reveal>
            <Badge className="border-mist/50 text-mist" tone="brand">
              Privasi sebagai tata cara
            </Badge>
            <h2 className="font-display mt-5 max-w-xl text-4xl leading-[0.98] tracking-[-0.04em] text-[#f7f1e6] sm:text-5xl">
              Aman bukan berarti sunyi. Aman berarti tahu batasnya.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="divide-y divide-white/15 border-t border-white/15">
              {[
                [
                  "Data seperlunya",
                  "Rancangan layanan akan meminta informasi seperlunya agar aspirasi dapat dipahami tanpa mengumpulkan identitas secara berlebihan.",
                ],
                [
                  "Akses yang proporsional",
                  "Informasi laporan tidak dibuka untuk semua orang; akses dan konteks akan mengikuti peran serta kebutuhan tindak lanjut.",
                ],
                [
                  "Pembaruan yang beretika",
                  "Perkembangan dapat dijelaskan kepada kampus tanpa memindahkan detail sensitif ke ruang publik.",
                ],
              ].map(([title, description], index) => (
                <article
                  className="grid gap-5 py-7 sm:grid-cols-[3rem_1fr] sm:gap-7"
                  key={title}
                >
                  <span className="editorial-index text-mist text-2xl">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
                      {description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-canvas py-24 sm:py-32">
        <Container className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <Reveal>
            <Badge tone="warning">Contoh tampilan</Badge>
            <h2 className="font-display text-ink mt-5 max-w-md text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
              Transparansi yang tidak mengorbankan cerita pribadi.
            </h2>
            <p className="text-muted mt-5 max-w-md text-sm leading-6">
              Format di samping menunjukkan bagaimana pembaruan bisa dibaca
              kelak. Seluruh angka adalah contoh tampilan, bukan data nyata.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="grid gap-4 sm:grid-cols-3">
              {sampleMetrics.map(([value, label]) => (
                <div
                  className="rounded-card bg-surface shadow-card px-6 py-8"
                  key={label}
                >
                  <p className="editorial-index text-ink text-6xl leading-none tracking-[-0.05em]">
                    {value}
                  </p>
                  <p className="text-muted mt-4 text-sm leading-6">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="bg-surface py-24 sm:py-32">
        <Container>
          <Reveal>
            <div className="bg-night rounded-[2rem] px-8 py-14 text-white sm:flex sm:items-end sm:justify-between sm:gap-10 sm:px-14 sm:py-16">
              <div className="max-w-3xl space-y-5">
                <p className="text-[0.7rem] font-semibold tracking-[0.22em] text-white/70 uppercase">
                  Langkah awal
                </p>
                <h2 className="font-display text-4xl leading-[0.98] tracking-[-0.04em] text-[#f7f1e6] sm:text-5xl">
                  Ruang yang baik dimulai dari niat untuk mendengar.
                </h2>
                <p className="max-w-2xl text-base leading-7 text-slate-300">
                  Pelajari prinsip, privasi, dan etika pelaporan, lalu kirim
                  aspirasi dengan aman melalui layanan yang sudah aktif.
                </p>
              </div>
              <ButtonLink
                className="mt-8 shrink-0 rounded-full sm:mt-0"
                href="/aspirasi/kirim"
                variant="light"
              >
                Kirim aspirasi
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
