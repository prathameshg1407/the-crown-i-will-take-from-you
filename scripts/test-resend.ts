import "dotenv/config";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

async function main() {
  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev", // allowed in test mode
    to: "prathameshgaikwad964006@gmail.com", // MUST be your email
    subject: "Resend test – sandbox mode",
    html: "<strong>Email sent successfully 🚀</strong>",
  });

  if (error) {
    console.error("❌ Email failed:", error);
    process.exit(1);
  }

  console.log("✅ Email sent:", data);
}

main();
