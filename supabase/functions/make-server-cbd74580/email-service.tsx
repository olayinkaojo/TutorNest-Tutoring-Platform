// Load Resend only when sending email. A top-level `import "npm:resend"` + `new Resend()` can throw
// during module init and take down the whole Edge Function worker (HTTP 503 BOOT_ERROR).
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@resend.dev"; // Switch to noreply@knowledgefonsacademy.com once domain is verified in Resend

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.warn("⚠️ Resend API key not configured - email not sent");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { Resend } = await import("npm:resend@3.2.0");
    const resend = new Resend(RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: data.subject,
      html: data.html,
      reply_to: data.replyTo || FROM_EMAIL,
    });

    if (result.error) {
      console.error("❌ Email send failed:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("✅ Email sent successfully:", data.to, data.subject);
    return { success: true };
  } catch (error) {
    console.error("❌ Email service error:", error);
    return { success: false, error: (error as Error).message };
  }
}

export const emailTemplates = {
  // Booking confirmation email for parent - WORLD CLASS
  bookingConfirmation: (parentName: string, studentName: string, tutorName: string, date: string, time: string, subject: string, roomLink: string) => ({
    subject: `Booking Confirmed — ${studentName} with ${tutorName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
              </td>
            </tr>
            <!-- Success banner -->
            <tr>
              <td style="background:#22c55e;padding:14px 40px;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">✓ &nbsp;Session Confirmed &amp; Payment Received</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Dear ${parentName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  Excellent news! Your tutoring session for <strong>${studentName}</strong> has been confirmed. 
                  ${tutorName} is ready to help your child succeed. Here are all the details.
                </p>

                <!-- Session details card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:24px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">Session Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;width:120px;">📚 Subject</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${subject}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">👨‍🏫 Tutor</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${tutorName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">👨‍🎓 Student</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${studentName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">📅 Date</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${date}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">⏰ Time</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${time} WAT</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>

                <!-- Video link card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.8px;">🎥 Virtual Classroom Link</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
                      Use this link to join the session. Send it to ${studentName} beforehand so they can bookmark it.
                    </p>
                    <a href="${roomLink}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;">
                      Join Classroom
                    </a>
                    <p style="margin:12px 0 0;font-size:11px;color:#6b7280;word-break:break-all;">${roomLink}</p>
                  </td></tr>
                </table>

                <!-- Tips -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:0.8px;">💡 Preparation Tips</p>
                    <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8;">
                      <li>Ensure stable internet connection and a quiet, distraction-free space</li>
                      <li>Have relevant textbooks or materials ready before the session</li>
                      <li>Log in 5 minutes early to test audio/video</li>
                      <li>You'll receive a reminder email 1 hour before the session</li>
                    </ul>
                  </td></tr>
                </table>

                <p style="font-size:14px;color:#374151;line-height:1.6;">
                  If you have any questions, reply to this email or visit your dashboard. We're committed to making learning exceptional.
                </p>
                <p style="font-size:14px;color:#374151;">Best regards,<br><strong>The Knowledge Fons Academy Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Tutor notification for new booking - WORLD CLASS
  tutorBookingNotification: (tutorName: string, parentName: string, studentName: string, date: string, time: string, subject: string, acceptLink: string) => ({
    subject: `New Booking — ${studentName} in ${subject}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#5d9827 0%,#7ab84e 100%);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
              </td>
            </tr>
            <!-- Alert banner -->
            <tr>
              <td style="background:#f59e0b;padding:14px 40px;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">🎓 &nbsp;New Booking Request Received</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  Great news! <strong>${parentName}</strong> has booked a session with you for their child <strong>${studentName}</strong>. 
                  Please review the details and confirm you're available.
                </p>

                <!-- Session details card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:24px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.8px;">Session Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;width:120px;">📚 Subject</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${subject}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">👨‍🎓 Student</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${studentName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">👤 Parent</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${parentName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">📅 Date</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${date}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;font-size:14px;color:#6b7280;">⏰ Time</td>
                        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${time} WAT</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>

                <!-- Action required -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.8px;">⚡ Action Required</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
                      Please confirm this booking within 24 hours. The parent is waiting for confirmation.
                    </p>
                    <a href="${acceptLink}" style="display:inline-block;background:#5d9827;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;">
                      ✓ View & Confirm Booking
                    </a>
                  </td></tr>
                </table>

                <!-- Earnings info -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:16px 24px;">
                    <p style="margin:0;font-size:14px;color:#1e40af;">
                      💰 <strong>Earnings:</strong> Your session rate applies. Payment will be processed after the session is completed.
                    </p>
                  </td></tr>
                </table>

                <p style="font-size:14px;color:#374151;line-height:1.6;">
                  Questions? Check your dashboard or contact support. Thank you for being an excellent tutor on Knowledge Fons Academy!
                </p>
                <p style="font-size:14px;color:#374151;">Best regards,<br><strong>The Knowledge Fons Academy Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Session reminder email — world-class
  sessionReminder: (name: string, otherParty: string, date: string, time: string, roomLink: string) => ({
    subject: `Reminder: Your session with ${otherParty} starts in 1 hour`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
              </td>
            </tr>
            <tr>
              <td style="background:#f59e0b;padding:14px 40px;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">&#128276; &nbsp;Session Reminder — Starting in 1 Hour</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${name},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  Your tutoring session with <strong>${otherParty}</strong> is starting in <strong>1 hour</strong>. Get ready!
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:24px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:0.8px;">Session Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:7px 0;font-size:14px;color:#6b7280;width:130px;">👤 With</td>
                        <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${otherParty}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:14px;color:#6b7280;">📅 Date</td>
                        <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${date}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:14px;color:#6b7280;">⏰ Time</td>
                        <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${time} WAT</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;text-align:center;">
                    <p style="margin:0 0 16px;font-size:14px;color:#374151;">Click below to join your virtual classroom</p>
                    <a href="${roomLink}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                      &#127909; &nbsp;Join Session Now
                    </a>
                  </td></tr>
                </table>
                <p style="font-size:14px;color:#374151;">Best of luck,<br><strong>The Knowledge Fons Academy Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Payment confirmation email (legacy signature — same as receipt style)
  paymentConfirmation: (parentName: string, amount: string, currency: string, transactionId: string) => ({
    subject: `Payment received — ${currency} ${amount}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:#22c55e;padding:18px 36px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">Payment successful</p>
          </td></tr>
          <tr><td style="padding:32px 36px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${parentName},</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">We have received your payment. Your booking will show as confirmed in your dashboard.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
              <tr><td style="padding:18px;">
                <p style="margin:0 0 6px;font-size:15px;color:#166534;font-weight:700;">${currency} ${amount}</p>
                <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">Transaction: ${transactionId}</p>
              </td></tr>
            </table>
            <p style="margin:22px 0 0;font-size:13px;color:#6b7280;">You will receive session details and reminders by email. Thank you for choosing Knowledge Fons Academy.</p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px;text-align:center;font-size:12px;color:#9ca3af;">© Knowledge Fons Academy ${new Date().getFullYear()}</td></tr>
        </table>
      </td></tr></table></body></html>`,
  }),

  // Session report notification — world-class
  sessionReportNotification: (parentName: string, tutorName: string, studentName: string, subject: string, date: string, progressStatus: string, reportLink: string) => ({
    subject: `Session report ready — ${studentName} with ${tutorName}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#0ea5e9;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">📋 &nbsp;Session Report Available</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Dear ${parentName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              ${tutorName} has submitted a session report for ${studentName}'s tutoring session. You can review it below.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:24px;">
                <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.8px;">Session Summary</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:7px 0;font-size:14px;color:#6b7280;width:130px;">👨‍🎓 Student</td>
                    <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${studentName}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;font-size:14px;color:#6b7280;">👨‍🏫 Tutor</td>
                    <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${tutorName}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;font-size:14px;color:#6b7280;">📚 Subject</td>
                    <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${subject}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;font-size:14px;color:#6b7280;">📅 Date</td>
                    <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${date}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;font-size:14px;color:#6b7280;">📈 Progress</td>
                    <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${progressStatus.charAt(0).toUpperCase() + progressStatus.slice(1)}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${reportLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">View Full Report</a>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px 24px;">
                <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
                  💡 Reports help you track your child's progress over time. Review strengths, areas for improvement, and homework set by the tutor.
                </p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#374151;">Warm regards,<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // Booking cancellation email — world-class
  bookingCancellation: (name: string, otherParty: string, date: string, time: string, reason: string) => ({
    subject: `Session Cancelled — ${date}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
              </td>
            </tr>
            <tr>
              <td style="background:#ef4444;padding:14px 40px;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">&#10005; &nbsp;Session Cancelled</p>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${name},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  We wanted to let you know that a tutoring session has been cancelled. Please review the details below.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:24px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.8px;">Cancelled Session</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:7px 0;font-size:14px;color:#6b7280;width:130px;">👤 With</td>
                        <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${otherParty}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:14px;color:#6b7280;">📅 Date</td>
                        <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${date}</td>
                      </tr>
                      <tr>
                        <td style="padding:7px 0;font-size:14px;color:#6b7280;">⏰ Time</td>
                        <td style="padding:7px 0;font-size:14px;color:#111827;font-weight:600;">${time}</td>
                      </tr>
                      ${reason ? `<tr><td style="padding:7px 0;font-size:14px;color:#6b7280;vertical-align:top;">📝 Note</td><td style="padding:7px 0;font-size:14px;color:#111827;">${reason}</td></tr>` : ''}
                    </table>
                  </td></tr>
                </table>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:16px 24px;">
                    <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
                      💡 <strong>What's next?</strong> You can book another session anytime from your dashboard.
                      <a href="https://app.knowledgefonsacademy.com/dashboard" style="color:#1d4ed8;font-weight:600;">Visit Dashboard →</a>
                    </p>
                  </td></tr>
                </table>
                <p style="font-size:14px;color:#374151;">Warm regards,<br><strong>The Knowledge Fons Academy Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Welcome email for new users
  welcomeEmail: (name: string, role: string, dashboardLink: string) => ({
    subject: `Welcome to Knowledge Fons Academy — your account is ready`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#22c55e;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">✓ &nbsp;Account Created Successfully</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Welcome to Knowledge Fons Academy! Your account has been created as a <strong>${role}</strong>. You're all set to get started.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">What's next?</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;Complete your profile with a photo and bio</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;Set your preferences and availability</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;Explore the platform and start your journey</td></tr>
                </table>
              </td></tr>
            </table>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Go to Dashboard</a>
            </div>
            <p style="font-size:14px;color:#374151;">If you need help, reply to this email or visit our Help Centre.<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // Payout notification for tutors — world-class
  payoutNotification: (tutorName: string, amount: string, currency: string, date: string, bookingsCount?: number) => ({
    subject: `Payout processed — ${currency} ${amount}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#22c55e;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">✓ &nbsp;Payout Approved &amp; Processed</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Great news! Your payout request has been approved and is being processed. The funds will arrive in your bank account within 1–3 business days.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:24px;">
                <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.8px;">Payout Details</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;width:130px;">💰 Amount</td>
                    <td style="padding:8px 0;font-size:15px;color:#166534;font-weight:700;">${currency} ${amount}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;">📅 Date</td>
                    <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${date}</td>
                  </tr>
                  ${bookingsCount ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">📚 Sessions</td><td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${bookingsCount} completed session${bookingsCount !== 1 ? 's' : ''}</td></tr>` : ''}
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px 24px;">
                <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
                  💡 <strong>Tip:</strong> Track all your earnings, session history, and upcoming payouts from your tutor dashboard.
                  <a href="https://app.knowledgefonsacademy.com/dashboard" style="color:#1d4ed8;font-weight:600;"> Visit Dashboard →</a>
                </p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#374151;">Thank you for being part of Knowledge Fons Academy.<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // Payout rejected notification for tutors — world-class
  payoutRejected: (tutorName: string, amount: string, currency: string, reason: string, dashboardLink: string) => ({
    subject: `Payout request update — ${currency} ${amount}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#f59e0b;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">⚠ &nbsp;Payout Request Requires Attention</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              We were unable to process your payout request at this time. Please review the details below.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:24px;">
                <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.8px;">Request Details</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;width:130px;">💰 Amount</td>
                    <td style="padding:8px 0;font-size:15px;color:#111827;font-weight:700;">${currency} ${amount}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;vertical-align:top;">📝 Reason</td>
                    <td style="padding:8px 0;font-size:14px;color:#374151;">${reason}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px 24px;">
                <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
                  💡 <strong>What to do next:</strong> Your earnings remain safely in your balance. You can submit a new payout request from your dashboard once any issues are resolved. If you believe this is an error, please contact support.
                  <a href="${dashboardLink}" style="color:#1d4ed8;font-weight:600;"> Visit Dashboard →</a>
                </p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#374151;">If you have any questions, please reply to this email or contact support@knowledgefonsacademy.com.<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // Refund request confirmation — world-class
  refundRequested: (userName: string, amountDisplay: string, refundPercentage: number, reference: string, sessionDate: string, dashboardLink: string) => ({
    subject: `Refund request received — ${amountDisplay}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#0ea5e9;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">↩ &nbsp;Refund Request Received</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${userName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              We have received your refund request and it is now under review. Our team will process it within 3–5 business days.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:24px;">
                <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.8px;">Refund Details</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;width:130px;">💰 Refund Amount</td>
                    <td style="padding:8px 0;font-size:15px;color:#0369a1;font-weight:700;">${amountDisplay}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;">📊 Refund %</td>
                    <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${refundPercentage}% of original payment</td>
                  </tr>
                  ${sessionDate ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">📅 Session Date</td><td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${sessionDate}</td></tr>` : ''}
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;">🔖 Reference</td>
                    <td style="padding:8px 0;font-size:12px;color:#6b7280;word-break:break-all;">${reference}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px 24px;">
                <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
                  💡 Once approved, the refund will be returned to your original payment method. You can track the status from your dashboard.
                  <a href="${dashboardLink}" style="color:#1d4ed8;font-weight:600;"> View Dashboard →</a>
                </p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#374151;">For questions, reply to this email or contact support@knowledgefonsacademy.com.<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // Email verification/confirmation for signup
  emailVerification: (name: string, confirmationLink: string) => ({
    subject: `Confirm your email — Knowledge Fons Academy`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#625d9c;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">&#10003; &nbsp;Please confirm your email address</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Thank you for joining Knowledge Fons Academy! To activate your account and access all features, please confirm your email address.
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${confirmationLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Confirm Email Address</a>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:20px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">
                  Or paste this link in your browser:<br/>
                  <span style="color:#4338ca;">${confirmationLink}</span>
                </p>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#9ca3af;">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // ── Plan booking: parent confirmation (professional, multi-session) ──────────
  planBookingConfirmationParent: (
    parentName: string,
    studentName: string,
    tutorName: string,
    planName: string,
    sessions: number,
    subject: string,
    startDate: string,
    sessionTime: string,
    meetLink: string,
    dashboardLink: string,
    transactionRef: string,
    amount: string,
  ) => ({
    subject: `Booking Confirmed — ${planName} with ${tutorName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
              </td>
            </tr>
            <!-- Green success banner -->
            <tr>
              <td style="background:#22c55e;padding:14px 40px;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">&#10003; &nbsp;Booking Confirmed &amp; Payment Received</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Dear ${parentName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  Great news! Your tutoring plan for <strong>${studentName}</strong> has been confirmed.
                  Here is everything you need to know ahead of the first session.
                </p>

                <!-- Plan summary card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">Plan Summary</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;width:140px;">Plan</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Subject</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${subject}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Tutor</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${tutorName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Student</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${studentName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Sessions</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${sessions} session${sessions > 1 ? 's' : ''} &times; 1 hour</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Starts</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${startDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Session Time</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${sessionTime} (Nigeria Time)</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Amount Paid</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${amount}</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>

                <!-- Video link card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.8px;">Virtual Classroom Link</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
                      All sessions will take place online. Use the same link for every session — share it with ${studentName} before the first class.
                    </p>
                    <a href="${meetLink}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;">
                      &#127909; &nbsp;Join Virtual Classroom
                    </a>
                    <p style="margin:12px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">${meetLink}</p>
                  </td></tr>
                </table>

                <!-- Tips -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#a16207;text-transform:uppercase;letter-spacing:0.8px;">Tips for a Great Session</p>
                    <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8;">
                      <li>Ensure ${studentName} has a stable internet connection and a quiet space.</li>
                      <li>Have relevant textbooks or worksheets ready before each session.</li>
                      <li>Sessions should begin promptly at the scheduled time.</li>
                      <li>Session reminders will be sent 1 hour before each class.</li>
                    </ul>
                  </td></tr>
                </table>

                <!-- CTA -->
                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    View My Dashboard
                  </a>
                </div>

                <p style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:8px;">
                  If you have any questions, simply reply to this email or visit your dashboard. We're here to make learning excellent.
                </p>
                <p style="font-size:14px;color:#374151;">Warm regards,<br><strong>The Knowledge Fons Academy Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">Transaction Ref: ${transactionRef}</p>
                <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // ── Plan booking: tutor notification ────────────────────────────────────────
  planBookingNotificationTutor: (
    tutorName: string,
    parentName: string,
    studentName: string,
    planName: string,
    sessions: number,
    subject: string,
    startDate: string,
    sessionTime: string,
    meetLink: string,
    dashboardLink: string,
    tutorEarnings: string,
  ) => ({
    subject: `New Booking — ${planName} for ${studentName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
              </td>
            </tr>
            <!-- Banner -->
            <tr>
              <td style="background:#7c3aed;padding:14px 40px;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">&#127881; &nbsp;You have a new confirmed booking!</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  A parent has booked a tutoring plan with you and payment has been received. Please review the details
                  below and ensure you are prepared for the first session.
                </p>

                <!-- Booking details card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">Booking Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;width:140px;">Plan</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Subject</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${subject}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Student</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${studentName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Parent</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${parentName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Sessions</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${sessions} session${sessions > 1 ? 's' : ''} &times; 1 hour</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Starts</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${startDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Session Time</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${sessionTime} (Nigeria Time)</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Your Earnings</td>
                        <td style="padding:6px 0;font-size:14px;color:#16a34a;font-weight:700;">${tutorEarnings}</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>

                <!-- Calendar blocked notice -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:16px 24px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.8px;">&#128197; Calendar Notice</p>
                    <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                      These time slots have been automatically blocked in your Knowledge Fons Academy availability calendar.
                      Please do not accept conflicting bookings for the scheduled times.
                    </p>
                  </td></tr>
                </table>

                <!-- Video link card -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.8px;">Virtual Classroom Link</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.5;">
                      Use this link to host all sessions for this booking. Share it with the student if needed.
                    </p>
                    <a href="${meetLink}" style="display:inline-block;background:#1d4ed8;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none;">
                      &#127909; &nbsp;Open Virtual Classroom
                    </a>
                    <p style="margin:12px 0 0;font-size:12px;color:#6b7280;word-break:break-all;">${meetLink}</p>
                  </td></tr>
                </table>

                <!-- Expectations -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:0.8px;">Professional Expectations</p>
                    <ul style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.8;">
                      <li>Begin each session punctually at the scheduled time.</li>
                      <li>File a session report on your dashboard after each class.</li>
                      <li>Contact Knowledge Fons Academy support if you need to reschedule a session.</li>
                      <li>Earnings will be credited to your Knowledge Fons Academy balance after each completed session.</li>
                    </ul>
                  </td></tr>
                </table>

                <!-- CTA -->
                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    View My Dashboard
                  </a>
                </div>

                <p style="font-size:14px;color:#374151;line-height:1.6;margin-bottom:8px;">
                  Thank you for your dedication to quality education. If you have any questions, please reach out to us.
                </p>
                <p style="font-size:14px;color:#374151;">Best regards,<br><strong>The Knowledge Fons Academy Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Account verification successful
  emailVerificationSuccess: (name: string, dashboardLink: string) => ({
    subject: `Email verified — welcome to Knowledge Fons Academy!`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#22c55e;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">✓ &nbsp;Email Verified — Account Active</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${name},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Your email address has been confirmed and your Knowledge Fons Academy account is now fully active. You're all set!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.8px;">You can now</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🗂️ &nbsp;Access your personal dashboard</td></tr>
                  <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🔍 &nbsp;Browse verified tutors and book sessions</td></tr>
                  <tr><td style="padding:6px 0;font-size:14px;color:#374151;">💬 &nbsp;Message tutors and track progress</td></tr>
                  <tr><td style="padding:6px 0;font-size:14px;color:#374151;">🏆 &nbsp;Participate in learning activities and trivia</td></tr>
                </table>
              </td></tr>
            </table>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Go to My Dashboard</a>
            </div>
            <p style="font-size:14px;color:#374151;">Welcome to the Knowledge Fons Academy community — we're delighted to have you!<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // Tutor verification approval
  tutorVerificationApproved: (tutorName: string, dashboardLink: string) => ({
    subject: `Congratulations — your Knowledge Fons Academy tutor application is approved`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#5d9827 0%,#16a34a 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#22c55e;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">✓ &nbsp;Tutor Application Approved</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Congratulations! Your application to become a tutor on Knowledge Fons Academy has been approved. Your profile is now visible to students and parents — you can start accepting bookings immediately.
            </p>
            <!-- 2x2 Feature grid -->
            <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:24px;">
              <tr>
                <td width="50%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px 16px;vertical-align:top;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#166534;">📅 Connect Calendar</p>
                  <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">Sync your availability so parents can book the right slots.</p>
                </td>
                <td width="50%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px 16px;vertical-align:top;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#166534;">💳 Set Up Payouts</p>
                  <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">Add your bank account to receive earnings on schedule.</p>
                </td>
              </tr>
              <tr>
                <td width="50%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px 16px;vertical-align:top;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#166534;">🎓 Accept Students</p>
                  <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">Review incoming booking requests and confirm sessions.</p>
                </td>
                <td width="50%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px 16px;vertical-align:top;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#166534;">📈 Track Earnings</p>
                  <p style="margin:0;font-size:13px;color:#374151;line-height:1.5;">Monitor completed sessions, ratings, and payout history.</p>
                </td>
              </tr>
            </table>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${dashboardLink}" style="display:inline-block;background:#5d9827;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Go to My Dashboard</a>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;margin-bottom:20px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
                  💡 <strong>Earnings reminder:</strong> You keep <strong>80%</strong> of every session fee. Payouts are processed weekly directly to your bank account.
                </p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#374151;">We're excited to have you on Knowledge Fons Academy. Welcome to the team!<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // Tutor verification rejection
  tutorVerificationRejected: (tutorName: string, rejectionReason: string, dashboardLink: string) => ({
    subject: `Your Knowledge Fons Academy tutor application — decision update`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#ef4444;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">&#10005; &nbsp;Application Not Approved</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Thank you for applying to Knowledge Fons Academy. After carefully reviewing your application and credentials, we are unable to approve your tutor profile at this time.
            </p>
            <!-- Rejection reason card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;margin-bottom:24px;">
              <tr><td style="padding:20px 20px 20px 24px;">
                <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.8px;">Reason for Decision</p>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${rejectionReason}</p>
              </td></tr>
            </table>
            <!-- What you can do -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">What you can do</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">📋 &nbsp;<strong>Address the issues</strong> — review the reason above and gather any missing documents</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">🔄 &nbsp;<strong>Resubmit your application</strong> — once you've resolved the concerns, update and resubmit</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">💬 &nbsp;<strong>Contact support</strong> — email support@knowledgefonsacademy.com for clarification or guidance</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">⚖️ &nbsp;<strong>Appeal</strong> — if you believe this is in error, you can submit a formal appeal</td></tr>
                </table>
              </td></tr>
            </table>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Update Your Application</a>
            </div>
            <!-- Info card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:20px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1d4ed8;">We Want You to Succeed</p>
                <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
                  Knowledge Fons Academy maintains high standards to protect students and families. This decision reflects our commitment to quality, not a judgment on your abilities. We'd love to see your updated application.
                </p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#374151;">If you have questions, reply to this email or contact support@knowledgefonsacademy.com.<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // Tutor verification pending (for new tutor signups or role additions)
  tutorVerificationPending: (tutorName: string, dashboardLink: string) => ({
    subject: `Your Knowledge Fons Academy tutor application is under review`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#f59e0b;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">⏳ &nbsp;Verification Under Review</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Thank you for applying to become a tutor on Knowledge Fons Academy! We've received your application and our verification team is currently reviewing your qualifications and credentials.
            </p>
            <!-- Timeline card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf4ff;border-left:4px solid #625d9c;border-radius:0 8px 8px 0;margin-bottom:24px;">
              <tr><td style="padding:20px 20px 20px 24px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#625d9c;text-transform:uppercase;letter-spacing:0.8px;">Verification Timeline</p>
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                  We aim to complete verification within <strong>2–5 business days</strong>. You'll receive a separate email as soon as a decision is made.
                </p>
              </td></tr>
            </table>
            <!-- While you wait checklist -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">While you wait</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;Complete your profile — bio, subjects, and teaching experience</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;Upload a professional profile photo</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;Set your preferred hourly rates</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;Connect your calendar and mark your availability</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;Add your bank account for payouts</td></tr>
                </table>
              </td></tr>
            </table>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Go to My Dashboard</a>
            </div>
            <!-- Tips box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;margin-bottom:20px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">
                  💡 <strong>Tip:</strong> A fully completed profile leads to a faster review. Make sure all required documents and credentials are uploaded before your interview.
                </p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#374151;">Questions? Reply to this email or contact support@knowledgefonsacademy.com — we're happy to help.<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  // Role addition congratulations (when parent becomes tutor or tutor becomes parent)
  roleAdditionCongratulations: (userName: string, newRole: string, dashboardLink: string) => ({
    subject: `Your new ${newRole === 'tutor' ? 'tutor' : newRole === 'parent' ? 'parent' : 'student'} role is ready — Knowledge Fons Academy`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:${newRole === 'tutor' ? 'linear-gradient(135deg,#5d9827 0%,#16a34a 100%)' : 'linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%)'};padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#22c55e;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">✓ &nbsp;New Role Added — ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${userName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              You've successfully added the <strong>${newRole}</strong> role to your Knowledge Fons Academy account. You now have access to ${newRole === 'tutor' ? 'tutor dashboards, booking management, and earning opportunities' : newRole === 'parent' ? 'parent dashboards, student management, and learning tools' : 'your student dashboard, messages, and learning tools'}.
            </p>
            <!-- Role-specific next steps -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">Getting started</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${newRole === 'tutor' ? `
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">📋 &nbsp;Complete your tutor profile with qualifications and experience</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">💰 &nbsp;Set your teaching rates and add your bank account</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">⏳ &nbsp;Await verification — typically 2–5 business days</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">🎓 &nbsp;Start accepting bookings from students</td></tr>
                  ` : newRole === 'parent' ? `
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">👨‍👩‍👧 &nbsp;Add your children to your parent account</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">🔍 &nbsp;Browse verified tutors and filter by subject</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">📅 &nbsp;Book sessions that fit your family's schedule</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">📊 &nbsp;Monitor your children's learning progress</td></tr>
                  ` : `
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">🗂️ &nbsp;Access your personal student dashboard</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">📚 &nbsp;View your upcoming tutoring sessions</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">💬 &nbsp;Message your tutor directly</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">🏆 &nbsp;Participate in trivia and learning challenges</td></tr>
                  `}
                </table>
              </td></tr>
            </table>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Go to Dashboard</a>
            </div>
            <!-- Role switching note -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:20px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">
                  💡 <strong>Switching roles:</strong> You can switch between your roles anytime using the role switcher in your account menu at the top of your dashboard.
                </p>
              </td></tr>
            </table>
            <p style="font-size:14px;color:#374151;">Need help? Reply to this email or contact support@knowledgefonsacademy.com.<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  /** Branded signup confirmation — all roles (parent, tutor, student). */
  signupConfirmEmail: (name: string, role: string, confirmationLink: string) => {
    const r = (role || '').toLowerCase();
    let headline = 'Confirm your email';
    let sub = 'You are one step away from activating your Knowledge Fons Academy account.';
    let tip =
      'After confirming, sign in to complete your profile and explore the platform.';
    if (r === 'parent') {
      headline = 'Welcome, parent — confirm your email';
      sub = 'Thank you for joining Knowledge Fons Academy. Confirm your address so we can keep you updated on bookings, sessions, and payments.';
      tip = 'You will be able to add children, browse vetted tutors, and book sessions securely.';
    } else if (r === 'tutor') {
      headline = 'Tutor application — confirm your email';
      sub =
        'Confirm your address to activate your account. You will receive a separate note about verification once this step is complete.';
      tip = 'Complete your profile and credentials while our team reviews your application.';
    } else if (r === 'student') {
      headline = 'Student account — confirm your email';
      sub = 'Confirm your address to unlock your dashboard, messages, and learning tools.';
      tip = 'If you are under 13, a parent or guardian may manage bookings on your behalf.';
    }
    return {
      subject: `Confirm your email — Knowledge Fons Academy`,
      html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">${headline}</p>
          </td></tr>
          <tr><td style="padding:32px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${name},</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">${sub}</p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${confirmationLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Confirm email address</a>
            </div>
            <p style="margin:0 0 12px;font-size:13px;color:#6b7280;word-break:break-all;">Or paste this link:<br/><span style="color:#4338ca">${confirmationLink}</span></p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-top:20px;"><tr><td style="padding:16px 20px;">
              <p style="margin:0;font-size:14px;color:#4c1d95;line-height:1.5;"><strong>Tip:</strong> ${tip}</p>
            </td></tr></table>
            <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">This link expires in 24 hours. If you did not create an account, you can ignore this message.</p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© Knowledge Fons Academy ${new Date().getFullYear()} · <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>`,
    };
  },

  /** Session moved — send to parent, tutor, and optionally student. */
  sessionRescheduled: (
    recipientName: string,
    studentName: string,
    tutorName: string,
    oldWhen: string,
    newWhen: string,
    meetLink: string,
    dashboardLink: string,
    movedByLabel: string,
  ) => ({
    subject: `Session rescheduled — ${studentName} with ${tutorName}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);padding:28px 36px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">📅 Session rescheduled</p>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">${movedByLabel}</p>
          </td></tr>
          <tr><td style="padding:32px 36px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${recipientName},</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">Your tutoring session for <strong>${studentName}</strong> with <strong>${tutorName}</strong> has a new time.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;margin-bottom:16px;">
              <tr><td style="padding:14px 18px;background:#fef2f2;font-size:13px;font-weight:700;color:#991b1b;text-transform:uppercase;">Previous</td></tr>
              <tr><td style="padding:14px 18px;font-size:15px;color:#111827;">${oldWhen}</td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #bbf7d0;border-radius:8px;margin-bottom:22px;">
              <tr><td style="padding:14px 18px;background:#ecfdf5;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;">New schedule</td></tr>
              <tr><td style="padding:14px 18px;font-size:15px;color:#111827;font-weight:600;">${newWhen}</td></tr>
            </table>
            <a href="${meetLink}" style="display:inline-block;background:#1d4ed8;color:#fff;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;text-decoration:none;">Join link (same room where applicable)</a>
            <p style="margin:10px 0 0;font-size:11px;color:#6b7280;word-break:break-all;">${meetLink}</p>
            <div style="text-align:center;margin-top:24px;">
              <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Open dashboard</a>
            </div>
            <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">Please update your calendar. If this change was unexpected, contact support from your dashboard.</p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">© Knowledge Fons Academy ${new Date().getFullYear()}</td></tr>
        </table>
      </td></tr></table></body></html>`,
  }),

  /** Student / teen with own email — session booked or updated. */
  studentSessionUpdate: (
    studentName: string,
    tutorName: string,
    subject: string,
    whenLabel: string,
    meetLink: string,
    dashboardLink: string,
    isReschedule: boolean,
  ) => ({
    subject: isReschedule
      ? `Your session was rescheduled — ${subject}`
      : `Your tutoring session is booked — ${subject}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#5d9827 0%,#16a34a 100%);padding:28px 36px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:16px;font-weight:600;">${isReschedule ? 'Session rescheduled' : 'Session confirmed'}</p>
          </td></tr>
          <tr><td style="padding:32px 36px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${studentName},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
              ${isReschedule ? 'Your lesson time has been updated.' : 'A tutoring session has been scheduled for you.'}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:18px;">
              <tr><td style="padding:18px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#166534;">Details</p>
                <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Subject:</strong> ${subject}</p>
                <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>Tutor:</strong> ${tutorName}</p>
                <p style="margin:4px 0;font-size:14px;color:#374151;"><strong>When:</strong> ${whenLabel}</p>
              </td></tr>
            </table>
            <a href="${meetLink}" style="display:inline-block;background:#1d4ed8;color:#fff;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;text-decoration:none;">Join session</a>
            <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">A parent or guardian may manage bookings on your behalf. Questions? Use Messages in your dashboard.</p>
            <div style="text-align:center;margin-top:20px;"><a href="${dashboardLink}" style="color:#625d9c;font-weight:600;">Dashboard</a></div>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px;text-align:center;font-size:12px;color:#9ca3af;">© Knowledge Fons Academy ${new Date().getFullYear()}</td></tr>
        </table>
      </td></tr></table></body></html>`,
  }),

  /** Single-session or generic payment receipt (Flutterwave verify, etc.). */
  paymentSuccessReceipt: (
    payerName: string,
    amountDisplay: string,
    reference: string,
    contextLine: string,
    dashboardLink: string,
  ) => ({
    subject: `Payment received — ${amountDisplay}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:#22c55e;padding:18px 36px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:16px;font-weight:700;">Payment successful</p>
          </td></tr>
          <tr><td style="padding:32px 36px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${payerName},</p>
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">We have successfully received your payment. Thank you — your support helps us run a safe, quality learning platform.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:20px;">
              <tr><td style="padding:18px;">
                <p style="margin:0 0 8px;font-size:14px;color:#166534;"><strong>Amount</strong> · ${amountDisplay}</p>
                <p style="margin:0;font-size:13px;color:#374151;word-break:break-all;"><strong>Reference</strong><br/>${reference}</p>
              </td></tr>
            </table>
            <p style="margin:0 0 20px;font-size:14px;color:#374151;">${contextLine}</p>
            <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:14px;font-weight:600;padding:12px 26px;border-radius:8px;text-decoration:none;">View dashboard</a>
            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Keep this email for your records. For billing questions, reply to this thread or contact support@knowledgefonsacademy.com.</p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px;text-align:center;font-size:12px;color:#9ca3af;">© Knowledge Fons Academy ${new Date().getFullYear()}</td></tr>
        </table>
      </td></tr></table></body></html>`,
  }),

  /** Tutor: payment landed for a session (single-session flow). */
  tutorPaymentReceived: (
    tutorName: string,
    amountDisplay: string,
    reference: string,
    contextLine: string,
    dashboardLink: string,
  ) => ({
    subject: `Payment received for a session — ${amountDisplay}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#5d9827 0%,#4d7c0f 100%);padding:24px 36px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:16px;font-weight:600;">New payment on Knowledge Fons Academy</p>
          </td></tr>
          <tr><td style="padding:32px 36px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${tutorName},</p>
            <p style="margin:0 0 18px;font-size:15px;color:#374151;line-height:1.6;">A parent payment has cleared. Your share will follow your payout schedule.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:8px;">
              <tr><td style="padding:18px;">
                <p style="margin:0 0 6px;font-size:15px;color:#166534;font-weight:700;">${amountDisplay}</p>
                <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all;">Ref: ${reference}</p>
              </td></tr>
            </table>
            <p style="margin:18px 0 0;font-size:14px;color:#374151;">${contextLine}</p>
            <div style="text-align:center;margin-top:22px;"><a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Tutor dashboard</a></div>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px;text-align:center;font-size:12px;color:#9ca3af;">© Knowledge Fons Academy ${new Date().getFullYear()}</td></tr>
        </table>
      </td></tr></table></body></html>`,
  }),

  /** Parent link invitation — sent when a student lists a parent/guardian. */
  parentLinkInvitation: (studentFirstName: string, studentLastName: string, linkUrl: string) => ({
    subject: `${studentFirstName} ${studentLastName} wants to join Knowledge Fons Academy — approve their account`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#0ea5e9;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">👤 &nbsp;Student Account Approval Required</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              <strong>${studentFirstName} ${studentLastName}</strong> has created a Knowledge Fons Academy student account and listed you as their parent or guardian. Your approval is required to activate their account.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:0.8px;">What this means</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">📚 &nbsp;${studentFirstName} can access tutoring sessions and learning tools</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">👀 &nbsp;You'll be able to monitor their progress from your parent dashboard</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">📅 &nbsp;You can manage and approve their bookings</td></tr>
                </table>
              </td></tr>
            </table>
            <div style="text-align:center;margin:28px 0;">
              <a href="${linkUrl}" style="display:inline-block;background:#22c55e;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Approve &amp; Link Account</a>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">
                  Or paste this link in your browser:<br/>
                  <span style="color:#4338ca;">${linkUrl}</span>
                </p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;margin-bottom:20px;">
              <tr><td style="padding:16px 20px 16px 24px;">
                <p style="margin:0;font-size:14px;color:#dc2626;line-height:1.6;">
                  <strong>Don't recognise ${studentFirstName}?</strong> Do NOT click the link above — you can safely ignore this email. This link expires in 7 days.
                </p>
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  /** Sent to a tutor once they submit their full profile for review. */
  tutorProfileSubmitted: (tutorName: string, dashboardLink: string) => ({
    subject: `Profile received — we'll review it within 2–5 business days`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Professional Tutoring Platform</p>
          </td></tr>
          <tr><td style="background:#f59e0b;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">📋 &nbsp;Profile Under Review</p>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              We've received your full tutor profile and supporting documents. Our verification team will review everything and get back to you within <strong>2–5 business days</strong>.
            </p>
            <!-- What we're checking -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.8px;">What we're checking</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">🪪 &nbsp;Identity documents</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">🎓 &nbsp;Academic qualifications and certificates</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">🔒 &nbsp;DBS / background check documentation</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">📝 &nbsp;Teaching experience and references</td></tr>
                </table>
              </td></tr>
            </table>
            <!-- While you wait -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">While you wait</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">✅ &nbsp;Keep your dashboard accessible — you may be asked for more info</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">💰 &nbsp;Set your preferred hourly rate</td></tr>
                  <tr><td style="padding:7px 0;font-size:14px;color:#374151;">📅 &nbsp;Link your calendar and mark your availability</td></tr>
                </table>
              </td></tr>
            </table>
            <div style="text-align:center;margin-bottom:24px;">
              <a href="${dashboardLink}" style="display:inline-block;background:#625d9c;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">View Your Dashboard</a>
            </div>
            <p style="font-size:14px;color:#374151;">Questions? Reply to this email or contact <a href="mailto:support@knowledgefonsacademy.com" style="color:#625d9c;">support@knowledgefonsacademy.com</a>.<br><strong>The Knowledge Fons Academy Team</strong></p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),

  /** Internal alert sent to admin when a new tutor submits their application. */
  adminTutorApplicationAlert: (tutorName: string, tutorEmail: string, adminDashboardLink: string) => ({
    subject: `New tutor application — ${tutorName}`,
    html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Knowledge Fons Academy Admin</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Internal Notification</p>
          </td></tr>
          <tr><td style="background:#0ea5e9;padding:12px 40px;text-align:center;">
            <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">🔔 &nbsp;New Tutor Application</p>
          </td></tr>
          <tr><td style="padding:32px 40px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
              A new tutor has submitted their application and is awaiting review.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
              <tr><td style="padding:20px 24px;">
                <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;">Application Details</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;width:130px;">👤 Name</td>
                    <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${tutorName}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;">✉️ Email</td>
                    <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${tutorEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;">📅 Submitted</td>
                    <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:14px;color:#6b7280;">🔖 Status</td>
                    <td style="padding:8px 0;font-size:14px;color:#f59e0b;font-weight:700;">Pending Review</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <div style="text-align:center;margin-bottom:20px;">
              <a href="${adminDashboardLink}" style="display:inline-block;background:#22c55e;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">Review Application</a>
            </div>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; Knowledge Fons Academy ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.knowledgefonsacademy.com" style="color:#625d9c;text-decoration:none;">knowledgefonsacademy.com</a></p>
          </td></tr>
        </table>
      </td></tr></table></body></html>
    `,
  }),
};
