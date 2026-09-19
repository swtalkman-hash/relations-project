import nodemailer from "nodemailer";

function getTransporter(): nodemailer.Transporter {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT ?? 465);

  if (!user || !pass) {
    throw new Error("EMAIL_USER and EMAIL_PASS environment variables are required");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM ?? process.env.EMAIL_USER ?? "noreply@goldinvestment.com";

  await transporter.sendMail({
    from: `"Gold Investment" <${from}>`,
    to,
    subject: `${code} — رمز التحقق من Gold Investment`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #06060e; color: #f0f0ff; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1a1500, #0e0c00); padding: 32px; text-align: center; border-bottom: 1px solid rgba(212,175,55,0.2);">
          <h1 style="margin: 0; color: #d4af37; font-size: 24px;">🏆 Gold Investment</h1>
          <p style="margin: 8px 0 0; color: rgba(240,215,122,0.7); font-size: 13px;">منصة الاستثمار الذهبي</p>
        </div>
        <div style="padding: 32px; text-align: center;">
          <p style="margin: 0 0 20px; color: #a0a0c0; font-size: 15px;">رمز التحقق من بريدك الإلكتروني</p>
          <div style="display: inline-block; background: linear-gradient(135deg, #1a1500, #120f00); border: 2px solid rgba(212,175,55,0.4); border-radius: 16px; padding: 20px 40px; margin: 0 auto;">
            <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #f0d77a; font-family: monospace;">${code}</span>
          </div>
          <p style="margin: 20px 0 0; color: #6060a0; font-size: 13px;">صالح لمدة <strong style="color: #d4af37;">10 دقائق</strong> فقط</p>
          <p style="margin: 8px 0 0; color: #6060a0; font-size: 12px;">إذا لم تطلب هذا الرمز، تجاهل هذا البريد</p>
        </div>
      </div>
    `,
  });
}
