import nodemailer from "nodemailer";

type MailInput = { to: string; subject: string; html: string; text?: string };

let transporter: any = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true";
  if (!host || !port || !user || !pass) {
    console.warn("[mailer] SMTP no configurado; los correos no se enviarán.");
    return null;
  }
  transporter = (nodemailer as any).createTransport({ host, port, secure, auth: { user, pass } });
  return transporter;
}

export async function sendMail({ to, subject, html, text }: MailInput) {
  const t = getTransporter();
  if (!t) return;
  const from = process.env.MAIL_FROM || `Bilbohammer <no-reply@bilbohammer.local>`;
  await t.sendMail({ from, to, subject, html, text });
}
