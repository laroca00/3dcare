"use client";

import { useState, type FormEvent } from "react";
import type { Dictionary } from "@/i18n/config";

// Public Web3Forms access key. It only allows sending to the inbox it was
// created for, so it is safe to ship in the client bundle.
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? "";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm({ t }: { t: Dictionary["contact"] }) {
  const [status, setStatus] = useState<Status>("idle");

  if (!ACCESS_KEY) {
    return <p className="notice">{t.inactive}</p>;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("sending");
    try {
      const data = new FormData(form);
      data.append("access_key", ACCESS_KEY);
      data.append("subject", "3D Care website message");
      const res = await fetch("https://api.web3forms.com/submit", { method: "POST", body: data });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <label>
        {t.name}
        <input name="name" autoComplete="name" required />
      </label>
      <label>
        {t.email}
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        {t.organisation}
        <input name="organisation" autoComplete="organization" />
      </label>
      <label>
        {t.message}
        <textarea name="message" rows={6} required />
      </label>
      {/* Spam trap: real visitors never see or fill this field. */}
      <input type="checkbox" name="botcheck" className="visually-hidden" tabIndex={-1} aria-hidden="true" />
      <button type="submit" className="btn btn--primary" disabled={status === "sending"}>
        {status === "sending" ? t.sending : t.send}
      </button>
      <p role="status" className="form-status">
        {status === "sent" && t.sent}
        {status === "error" && t.error}
      </p>
    </form>
  );
}
