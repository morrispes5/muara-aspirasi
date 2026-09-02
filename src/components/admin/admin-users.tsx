"use client";

import { FormEvent, useState } from "react";

import { type BemRole, roleLabels } from "@/server/auth/roles";

type ManagedUser = {
  createdAt: string;
  email: string;
  id: string;
  lastLoginAt: string | null;
  name: string;
  role: BemRole;
  status: "ACTIVE" | "SUSPENDED";
  twoFactorEnabled: boolean;
};

type AdminUsersProps = {
  initialUsers: ManagedUser[];
};

const fieldClassName =
  "rounded-control border-line bg-surface text-ink focus:border-brand w-full border px-3 py-3 text-sm outline-none";

function formatDate(value: string | null) {
  if (!value) return "Belum pernah masuk";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

async function readResponse(response: Response) {
  return (await response.json()) as {
    error?: { message?: string };
    user?: ManagedUser;
  };
}

export function AdminUsers({ initialUsers }: AdminUsersProps) {
  const [users, setUsers] = useState(initialUsers);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<BemRole>("EDITOR");
  const [isCreating, setIsCreating] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setErrorMessage(null);
    setIsCreating(true);

    try {
      const response = await fetch("/api/admin/users", {
        body: JSON.stringify({ email, name, password, role }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = await readResponse(response);
      const createdUser = body.user;
      if (!response.ok || !createdUser) {
        throw new Error(body.error?.message ?? "Akun belum dapat dibuat.");
      }

      setName("");
      setEmail("");
      setPassword("");
      setRole("EDITOR");
      setUsers((current) => [
        {
          ...createdUser,
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          twoFactorEnabled: false,
        },
        ...current,
      ]);
      setFeedback(
        "Akun dibuat. Minta pemilik akun mengaktifkan MFA sebelum mengelola ruang BEM.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Akun belum dapat dibuat.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function updateUser(
    user: ManagedUser,
    changes: Partial<Pick<ManagedUser, "role" | "status">>,
  ) {
    if (
      changes.status === "SUSPENDED" &&
      !window.confirm(`Suspend ${user.email}?`)
    ) {
      return;
    }

    setFeedback(null);
    setErrorMessage(null);
    setBusyUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        body: JSON.stringify(changes),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const body = await readResponse(response);
      if (!response.ok || !body.user) {
        throw new Error(
          body.error?.message ?? "Perubahan akses belum tersimpan.",
        );
      }

      setUsers((current) =>
        current.map((candidate) =>
          candidate.id === user.id ? { ...candidate, ...body.user } : candidate,
        ),
      );
      setFeedback("Perubahan akses tersimpan. Sesi target telah dicabut.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Perubahan akses belum tersimpan.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-brand text-xs font-bold tracking-[0.16em] uppercase">
          Akses BEM
        </p>
        <h1 className="font-display text-ink mt-3 text-4xl leading-tight tracking-[-0.04em]">
          Kelola akun tanpa pendaftaran publik.
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
          Hanya ADMIN aktif yang dapat membuat akun, menurunkan role, atau
          men-suspend akses. Password tidak pernah ditampilkan kembali.
        </p>
      </div>

      <section className="border-line rounded-card border bg-white p-5 sm:p-6">
        <h2 className="text-ink text-xl font-bold">Buat akun BEM</h2>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={createUser}>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Nama lengkap
            <input
              className={fieldClassName}
              maxLength={160}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Email BEM
            <input
              className={fieldClassName}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Role
            <select
              className={fieldClassName}
              onChange={(event) => setRole(event.target.value as BemRole)}
              value={role}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-ink grid gap-2 text-sm font-bold">
            Password sementara
            <input
              className={fieldClassName}
              minLength={12}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <span className="text-muted text-xs font-normal">
              Minimal 12 karakter. Minta user menggantinya sesuai SOP internal.
            </span>
          </label>
          <button
            className="bg-brand hover:bg-brand-dark min-h-11 rounded-full px-5 py-3 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "Membuat akun…" : "Buat akun"}
          </button>
        </form>
      </section>

      {feedback ? (
        <p
          className="border-success/25 bg-success-soft text-success rounded-control border p-3 text-sm"
          role="status"
        >
          {feedback}
        </p>
      ) : null}
      {errorMessage ? (
        <p
          className="border-danger bg-danger-soft text-danger rounded-control border p-3 text-sm"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-ink text-xl font-bold">Akun terdaftar</h2>
        {users.map((user) => (
          <article
            className="border-line rounded-card grid gap-4 border bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center"
            key={user.id}
          >
            <div>
              <p className="text-ink font-bold">{user.name}</p>
              <p className="text-muted mt-1 text-sm break-all">{user.email}</p>
              <p className="text-muted mt-2 text-xs">
                Login terakhir: {formatDate(user.lastLoginAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="bg-brand-soft text-brand rounded-full px-3 py-1">
                  {roleLabels[user.role]}
                </span>
                <span
                  className={`${user.status === "ACTIVE" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"} rounded-full px-3 py-1`}
                >
                  {user.status === "ACTIVE" ? "Aktif" : "Suspended"}
                </span>
                <span className="border-line text-muted rounded-full border px-3 py-1">
                  MFA {user.twoFactorEnabled ? "aktif" : "belum aktif"}
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:min-w-48">
              <label className="text-muted grid gap-1 text-xs font-bold">
                Role
                <select
                  className={fieldClassName}
                  disabled={busyUserId === user.id}
                  onChange={(event) =>
                    updateUser(user, { role: event.target.value as BemRole })
                  }
                  value={user.role}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="border-line text-ink hover:border-brand min-h-10 rounded-full border px-4 py-2 text-xs font-bold disabled:opacity-60"
                disabled={busyUserId === user.id}
                onClick={() =>
                  updateUser(user, {
                    status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                  })
                }
                type="button"
              >
                {user.status === "ACTIVE" ? "Suspend akun" : "Aktifkan akun"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
