// Load Resend only when sending email. A top-level `import "npm:resend"` + `new Resend()` can throw
// during module init and take down the whole Edge Function worker (HTTP 503 BOOT_ERROR).
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@resend.dev"; // Switch to noreply@tutornest.org once domain is verified in Resend

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
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TutorNest</h1>
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
                <p style="font-size:14px;color:#374151;">Best regards,<br><strong>The TutorNest Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.tutornest.org" style="color:#625d9c;text-decoration:none;">tutornest.org</a></p>
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
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TutorNest</h1>
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
                  Questions? Check your dashboard or contact support. Thank you for being an excellent tutor on TutorNest!
                </p>
                <p style="font-size:14px;color:#374151;">Best regards,<br><strong>The TutorNest Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.tutornest.org" style="color:#625d9c;text-decoration:none;">tutornest.org</a></p>
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
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TutorNest</h1>
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
                <p style="font-size:14px;color:#374151;">Best of luck,<br><strong>The TutorNest Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.tutornest.org" style="color:#625d9c;text-decoration:none;">tutornest.org</a></p>
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
            <p style="margin:22px 0 0;font-size:13px;color:#6b7280;">You will receive session details and reminders by email. Thank you for choosing TutorNest.</p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px;text-align:center;font-size:12px;color:#9ca3af;">© TutorNest ${new Date().getFullYear()}</td></tr>
        </table>
      </td></tr></table></body></html>`,
  }),

  // Session report notification
  sessionReportNotification: (parentName: string, tutorName: string, date: string, reportLink: string) => ({
    subject: "Session Report Available",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Session Report from ${tutorName}</h2>
        <p>Hi ${parentName},</p>
        <p>The session report for your session on ${date} is now available.</p>
        
        <p><a href="${reportLink}" style="display: inline-block; background-color: #625d9c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">View Report</a></p>
        
        <p style="color: #666; font-size: 14px;">
          Check the report to see what topics were covered and recommended focus areas.
        </p>
      </div>
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
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TutorNest</h1>
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
                      <a href="https://tutornest.org/dashboard" style="color:#1d4ed8;font-weight:600;">Visit Dashboard →</a>
                    </p>
                  </td></tr>
                </table>
                <p style="font-size:14px;color:#374151;">Warm regards,<br><strong>The TutorNest Team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.tutornest.org" style="color:#625d9c;text-decoration:none;">tutornest.org</a></p>
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
    subject: "Welcome to TutorNest!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to TutorNest! 🎓</h2>
        <p>Hi ${name},</p>
        <p>Your account has been created successfully as a <strong>${role}</strong>.</p>
        
        <div style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>What's next?</strong></p>
          <ul>
            <li>Complete your profile</li>
            <li>Set your preferences</li>
            <li>Start your learning journey!</li>
          </ul>
        </div>
        
        <p><a href="${dashboardLink}" style="display: inline-block; background-color: #625d9c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Go to Dashboard</a></p>
        
        <p style="color: #666; font-size: 14px;">
          If you need help, check out our FAQ or contact support.
        </p>
      </div>
    `,
  }),

  // Payout notification for tutors
  payoutNotification: (tutorName: string, amount: string, currency: string, date: string) => ({
    subject: "Payout Processed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payout Processed ✅</h2>
        <p>Hi ${tutorName},</p>
        <p>Your earnings have been processed and transferred to your account.</p>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Payout Details:</strong></p>
          <p>💰 Amount: ${currency} ${amount}</p>
          <p>📅 Date: ${date}</p>
        </div>
        
        <p>The amount will appear in your account within 1-2 business days depending on your bank.</p>
      </div>
    `,
  }),

  // Email verification/confirmation for signup
  emailVerification: (name: string, confirmationLink: string) => ({
    subject: "Confirm Your Email Address - TutorNest",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #625d9c; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1>Email Verification</h1>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
          <p>Hi ${name},</p>
          
          <p>Thank you for signing up for <strong>TutorNest</strong>! We're excited to have you join our tutoring community.</p>
          
          <p>To complete your signup and activate your account, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationLink}" style="display: inline-block; background-color: #625d9c; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Or copy and paste this link in your browser:<br>
            <span style="word-break: break-all; color: #0066cc;">${confirmationLink}</span>
          </p>
          
          <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #999;">
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't sign up for TutorNest, you can safely ignore this email.</p>
            <p>© TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
          </div>
        </div>
      </div>
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
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TutorNest</h1>
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
                <p style="font-size:14px;color:#374151;">Warm regards,<br><strong>The TutorNest Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">Transaction Ref: ${transactionRef}</p>
                <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.tutornest.org" style="color:#625d9c;text-decoration:none;">tutornest.org</a></p>
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
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TutorNest</h1>
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
                      These time slots have been automatically blocked in your TutorNest availability calendar.
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
                      <li>Contact TutorNest support if you need to reschedule a session.</li>
                      <li>Earnings will be credited to your TutorNest balance after each completed session.</li>
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
                <p style="font-size:14px;color:#374151;">Best regards,<br><strong>The TutorNest Team</strong></p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved. &middot; <a href="https://www.tutornest.org" style="color:#625d9c;text-decoration:none;">tutornest.org</a></p>
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
    subject: "Email Verified! Welcome to TutorNest",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1>✅ Email Verified!</h1>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px;">
          <p>Hi ${name},</p>
          
          <p>Excellent! Your email has been verified and your TutorNest account is now active.</p>
          
          <p>You can now:</p>
          <ul style="color: #333;">
            <li>Access your personal dashboard</li>
            <li>Browse tutors and book sessions</li>
            <li>Participate in learning activities</li>
            <li>Track your progress</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" style="display: inline-block; background-color: #625d9c; color: white; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If you need any help getting started, check out our FAQ or contact our support team.
          </p>
          
          <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #999;">
            <p>Welcome to the TutorNest community!</p>
            <p>© TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  }),

  // Tutor verification approval
  tutorVerificationApproved: (tutorName: string, dashboardLink: string) => ({
    subject: "🎉 Congratulations! Your TutorNest Verification is Approved",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #625d9c 0%, #5d9827 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Welcome to TutorNest!</h1>
          <p style="margin: 10px 0 0 0; font-size: 18px;">Your Verification is Approved</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi ${tutorName},</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Excellent news! Your application to become a tutor on TutorNest has been <strong>approved</strong> after careful review of your qualifications and credentials.
          </p>
          
          <div style="background-color: #e8f5e9; border-left: 4px solid #5d9827; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0 0 15px 0; font-weight: bold; color: #2e7d32; font-size: 16px;">✅ You are now verified and can start tutoring!</p>
            <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.5;">
              Your profile is now visible to students and parents who are looking for a tutor with your expertise. You can start accepting bookings immediately.
            </p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin-top: 25px; margin-bottom: 15px;"><strong>What's Next:</strong></p>
          <ul style="color: #555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 25px;">
            <li>Complete your tutor profile with your bio, rates, and availability</li>
            <li>Set up your payment methods in the dashboard</li>
            <li>Start accepting bookings from students</li>
            <li>Provide excellent sessions and build your rating</li>
            <li>Earn competitive payments weekly</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #625d9c 0%, #5d9827 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Go to Your Dashboard
            </a>
          </div>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px; font-weight: bold;">💡 Pro Tip:</p>
            <p style="margin: 5px 0 0 0; color: #856404; font-size: 13px;">
              Complete your profile thoroughly and add a professional photo to attract more students!
            </p>
          </div>
          
          <p style="color: #666; font-size: 13px; margin-top: 25px; line-height: 1.6;">
            If you have any questions or need assistance, feel free to reach out to our support team at support@tutornest.org or visit our Help Center.
          </p>
          
          <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <p style="margin: 0 0 5px 0;">We're excited to have you as part of the TutorNest community!</p>
            <p style="margin: 0;">© TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  }),

  // Tutor verification rejection
  tutorVerificationRejected: (tutorName: string, rejectionReason: string, dashboardLink: string) => ({
    subject: "Application Review: Next Steps for Your TutorNest Verification",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f44336; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⏸️ Verification Status</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">We Need More Information</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi ${tutorName},</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Thank you for applying to become a tutor on TutorNest. We've carefully reviewed your application and qualifications.
          </p>
          
          <div style="background-color: #ffebee; border-left: 4px solid #f44336; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #c62828; font-size: 15px;">⚠️ Your Application Status</p>
            <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.5;">
              We've decided not to approve your verification at this time. Below you'll find the specific reason(s).
            </p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 25px 0 10px 0; font-weight: bold;">Reason for Decision:</p>
          <div style="background-color: #fff9c4; border-left: 4px solid #fbc02d; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
            <p style="margin: 0; color: #333; font-size: 14px; line-height: 1.6;">
              ${rejectionReason}
            </p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 25px 0 15px 0; font-weight: bold;">What You Can Do:</p>
          <ul style="color: #555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 25px;">
            <li><strong>Address the issues:</strong> Review the reason(s) above and gather any additional documentation or qualifications needed</li>
            <li><strong>Resubmit your application:</strong> Once you've addressed the concerns, you can resubmit your verification</li>
            <li><strong>Contact support:</strong> If you'd like clarification or have questions, our team is here to help</li>
            <li><strong>Appeal:</strong> If you believe there's been a misunderstanding, you can submit an appeal</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" style="display: inline-block; background-color: #625d9c; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Update Your Application
            </a>
          </div>
          
          <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0d47a1; font-size: 14px; font-weight: bold;">ℹ️ We Want You to Succeed</p>
            <p style="margin: 5px 0 0 0; color: #0d47a1; font-size: 13px; line-height: 1.5;">
              Becoming a tutor on TutorNest requires high standards to ensure quality education for our students. We believe in your potential and would love to see your application resubmitted.
            </p>
          </div>
          
          <p style="color: #666; font-size: 13px; margin-top: 25px; line-height: 1.6;">
            Have questions? Contact our support team at support@tutornest.org and we'll be happy to guide you through the process.
          </p>
          
          <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <p style="margin: 0 0 5px 0;">We look forward to reviewing your updated application!</p>
            <p style="margin: 0;">© TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  }),

  // Tutor verification pending (for new tutor signups or role additions)
  tutorVerificationPending: (tutorName: string, dashboardLink: string) => ({
    subject: "Welcome to TutorNest! Your Verification is Under Review",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #625d9c 0%, #8b7cb8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 26px;">Welcome to TutorNest! 👋</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your Tutor Application is Under Review</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi ${tutorName},</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Excellent! We've received your tutor application and we're excited to have you join the TutorNest community. Our verification team is currently reviewing your qualifications and credentials.
          </p>
          
          <div style="background-color: #f0f4ff; border-left: 4px solid #625d9c; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #625d9c; font-size: 15px;">⏳ Verification Timeline</p>
            <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.5;">
              We typically complete verification within <strong>2-5 business days</strong>. You'll receive an email as soon as your verification is complete.
            </p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 25px 0 15px 0; font-weight: bold;">While You Wait:</p>
          <ul style="color: #555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 25px;">
            <li>Complete your tutor profile with bio, rates, and availability</li>
            <li>Upload professional profile photo and credentials</li>
            <li>Set up your payment methods</li>
            <li>Explore our tutor resources and guidelines</li>
            <li>Join the TutorNest tutor community</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #625d9c 0%, #8b7cb8 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Go to Your Dashboard
            </a>
          </div>
          
          <div style="background-color: #fef3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-size: 14px; font-weight: bold;">📋 Pro Tips:</p>
            <ul style="margin: 5px 0 0 0; color: #856404; font-size: 13px; padding-left: 20px;">
              <li>A complete profile increases verification speed</li>
              <li>Professional photo helps build student trust</li>
              <li>Clear teaching rates and availability are essential</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 13px; margin-top: 25px; line-height: 1.6;">
            Have questions about the verification process? Reply to this email or contact our support team at support@tutornest.org. We're here to help!
          </p>
          
          <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <p style="margin: 0 0 5px 0;">We're excited to get you started! 🚀</p>
            <p style="margin: 0;">© TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  }),

  // Role addition congratulations (when parent becomes tutor or tutor becomes parent)
  roleAdditionCongratulations: (userName: string, newRole: string, dashboardLink: string) => ({
    subject: `🎉 Welcome to Your New ${newRole === 'tutor' ? 'Tutor' : 'Parent'} Role!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #5d9827 0%, #4CAF50 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">You're now a ${newRole}</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #333;">Hi ${userName},</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Fantastic! You've successfully added the <strong>${newRole}</strong> role to your TutorNest account. You now have access to ${newRole === 'tutor' ? 'tutor dashboards, booking management, and earning opportunities' : 'parent dashboards, student management, and learning tools'}.
          </p>
          
          <div style="background-color: #e8f5e9; border-left: 4px solid #5d9827; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #2e7d32; font-size: 15px;">✅ What's New:</p>
            <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.5;">
              ${newRole === 'tutor' 
                ? 'You can now offer tutoring services, manage student bookings, and earn competitive payments. Your profile will be visible to students once verification is complete.' 
                : 'You can now find and book tutors for your children, manage student profiles, and track learning progress.'}
            </p>
          </div>
          
          <p style="font-size: 15px; color: #555; margin: 25px 0 15px 0; font-weight: bold;">Getting Started:</p>
          <ul style="color: #555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 25px;">
            ${newRole === 'tutor' ? `
              <li>Complete your tutor profile with qualifications and experience</li>
              <li>Set your teaching rates and availability</li>
              <li>Wait for verification (typically 2-5 business days)</li>
              <li>Start accepting bookings from students!</li>
            ` : `
              <li>Add your children to your parent account</li>
              <li>Browse qualified tutors in your area</li>
              <li>Book tutoring sessions that fit your schedule</li>
              <li>Monitor your children's learning progress</li>
            `}
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #5d9827 0%, #4CAF50 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Go to ${newRole === 'tutor' ? 'Tutor' : 'Parent'} Dashboard
            </a>
          </div>
          
          <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; color: #0d47a1; font-size: 14px; font-weight: bold;">ℹ️ Switch Between Roles</p>
            <p style="margin: 5px 0 0 0; color: #0d47a1; font-size: 13px; line-height: 1.5;">
              You can easily switch between your ${newRole === 'tutor' ? 'parent and tutor' : 'tutor and parent'} roles anytime from your dashboard. Simply use the role switcher in your account menu.
            </p>
          </div>
          
          <p style="color: #666; font-size: 13px; margin-top: 25px; line-height: 1.6;">
            Have questions or need assistance? Our support team is always available at support@tutornest.org.
          </p>
          
          <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #999; text-align: center;">
            <p style="margin: 0 0 5px 0;">Welcome to your new TutorNest experience! 🚀</p>
            <p style="margin: 0;">© TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
          </div>
        </div>
      </div>
    `,
  }),

  /** Branded signup confirmation — all roles (parent, tutor, student). */
  signupConfirmEmail: (name: string, role: string, confirmationLink: string) => {
    const r = (role || '').toLowerCase();
    let headline = 'Confirm your email';
    let sub = 'You are one step away from activating your TutorNest account.';
    let tip =
      'After confirming, sign in to complete your profile and explore the platform.';
    if (r === 'parent') {
      headline = 'Welcome, parent — confirm your email';
      sub = 'Thank you for joining TutorNest. Confirm your address so we can keep you updated on bookings, sessions, and payments.';
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
      subject: `Confirm your email — TutorNest`,
      html: `
      <!DOCTYPE html><html lang="en"><body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;"><tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr><td style="background:linear-gradient(135deg,#625d9c 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">TutorNest</h1>
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
            <p style="margin:0;font-size:12px;color:#9ca3af;">© TutorNest ${new Date().getFullYear()} · <a href="https://www.tutornest.org" style="color:#625d9c;text-decoration:none;">tutornest.org</a></p>
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
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px;text-align:center;font-size:12px;color:#9ca3af;">© TutorNest ${new Date().getFullYear()}</td></tr>
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
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px;text-align:center;font-size:12px;color:#9ca3af;">© TutorNest ${new Date().getFullYear()}</td></tr>
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
            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Keep this email for your records. For billing questions, reply to this thread or contact support@tutornest.org.</p>
          </td></tr>
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px;text-align:center;font-size:12px;color:#9ca3af;">© TutorNest ${new Date().getFullYear()}</td></tr>
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
            <p style="margin:0;color:#fff;font-size:16px;font-weight:600;">New payment on TutorNest</p>
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
          <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:14px;text-align:center;font-size:12px;color:#9ca3af;">© TutorNest ${new Date().getFullYear()}</td></tr>
        </table>
      </td></tr></table></body></html>`,
  }),
};
