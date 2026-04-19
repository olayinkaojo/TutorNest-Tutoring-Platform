import { Resend } from "npm:resend@3.2.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@resend.dev"; // Switch to noreply@tutornest.org once domain is verified in Resend

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("⚠️ Resend API key not configured - email not sent");
    return { success: false, error: "Email service not configured" };
  }

  try {
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
  // Booking confirmation email for parent
  bookingConfirmation: (parentName: string, tutorName: string, date: string, time: string, roomLink: string) => ({
    subject: "Session Confirmed with TutorNest",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your tutoring session is confirmed!</h2>
        <p>Hi ${parentName},</p>
        <p>Your booking with <strong>${tutorName}</strong> has been confirmed.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Session Details:</strong></p>
          <p>📅 Date: ${date}</p>
          <p>⏰ Time: ${time}</p>
          <p>👨‍🏫 Tutor: ${tutorName}</p>
        </div>
        
        <p><a href="${roomLink}" style="display: inline-block; background-color: #625d9c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Join Session</a></p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions, please contact our support team.
        </p>
      </div>
    `,
  }),

  // Tutor notification for new booking
  tutorBookingNotification: (tutorName: string, parentName: string, studentName: string, date: string, time: string, acceptLink: string) => ({
    subject: "New Booking Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You have a new booking request!</h2>
        <p>Hi ${tutorName},</p>
        <p><strong>${parentName}</strong> has requested a tutoring session with you.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Session Details:</strong></p>
          <p>📅 Date: ${date}</p>
          <p>⏰ Time: ${time}</p>
          <p>👨‍🎓 Student: ${studentName}</p>
          <p>👤 Parent: ${parentName}</p>
        </div>
        
        <p><a href="${acceptLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">View & Accept Booking</a></p>
        
        <p style="color: #666; font-size: 14px;">Please accept or decline this booking within 24 hours.</p>
      </div>
    `,
  }),

  // Session reminder email
  sessionReminder: (name: string, otherParty: string, date: string, time: string, roomLink: string) => ({
    subject: "Reminder: Your tutoring session is in 1 hour",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Session Reminder 🔔</h2>
        <p>Hi ${name},</p>
        <p>Your tutoring session with <strong>${otherParty}</strong> starts in 1 hour!</p>
        
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Session Details:</strong></p>
          <p>📅 Date: ${date}</p>
          <p>⏰ Time: ${time}</p>
        </div>
        
        <p><a href="${roomLink}" style="display: inline-block; background-color: #625d9c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Join Now</a></p>
      </div>
    `,
  }),

  // Payment confirmation email
  paymentConfirmation: (parentName: string, amount: string, currency: string, transactionId: string) => ({
    subject: "Payment Received - Tutoring Session Confirmed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Payment Confirmed ✅</h2>
        <p>Hi ${parentName},</p>
        <p>We've received your payment successfully!</p>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Payment Details:</strong></p>
          <p>💰 Amount: ${currency} ${amount}</p>
          <p>🔔 Transaction ID: ${transactionId}</p>
        </div>
        
        <p>Your tutoring session is now confirmed. You'll receive additional details before the session begins.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Thank you for using TutorNest!
        </p>
      </div>
    `,
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

  // Booking cancellation email
  bookingCancellation: (name: string, otherParty: string, date: string, time: string, reason: string) => ({
    subject: "Session Cancelled",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Session Cancelled</h2>
        <p>Hi ${name},</p>
        <p>Your tutoring session has been cancelled.</p>
        
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Cancelled Session:</strong></p>
          <p>👤 With: ${otherParty}</p>
          <p>📅 Date: ${date}</p>
          <p>⏰ Time: ${time}</p>
          ${reason ? `<p>📝 Reason: ${reason}</p>` : ""}
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you have any questions, please contact our support team.
        </p>
      </div>
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
};
