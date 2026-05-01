import { Resend } from "npm:resend@3.2.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Use verified domain if available, otherwise fallback to onboarding domain
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@tutornest.org";
const FALLBACK_FROM_EMAIL = "onboarding@resend.dev"; // Resend's default verified domain for testing

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

console.log(`📧 Email Service Initialized: API Key: ${RESEND_API_KEY ? '✅ Configured' : '❌ NOT configured'}, From: ${FROM_EMAIL}`);

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.error("❌ Resend API key not configured - configure RESEND_API_KEY environment variable");
    return { success: false, error: "Email service not configured. Set RESEND_API_KEY environment variable." };
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
      console.warn(`⚠️ Email send failed with FROM_EMAIL "${FROM_EMAIL}": ${result.error.message}`);
      console.log(`Retrying with fallback email: ${FALLBACK_FROM_EMAIL}`);
      
      // Retry with fallback email
      try {
        const fallbackResult = await resend.emails.send({
          from: FALLBACK_FROM_EMAIL,
          to: data.to,
          subject: data.subject,
          html: data.html,
          reply_to: data.replyTo || FALLBACK_FROM_EMAIL,
        });
        
        if (fallbackResult.error) {
          console.error("❌ Email send failed (even with fallback):", fallbackResult.error.message);
          return { success: false, error: fallbackResult.error.message };
        }
        
        console.log("✅ Email sent successfully (via fallback) to:", data.to);
        return { success: true };
      } catch (fallbackErr) {
        console.error("❌ Fallback email send failed:", fallbackErr);
        return { success: false, error: (fallbackErr as Error).message };
      }
    }

    console.log("✅ Email sent successfully to:", data.to, "Subject:", data.subject);
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

  // ─────────────────────────────────────────────────────────────────────────
  // BOOKING MANAGEMENT EMAILS
  // ─────────────────────────────────────────────────────────────────────────

  // Booking cancellation - Parent notification
  bookingCancelledParent: (parentName: string, studentName: string, tutorName: string, refundAmount: string, date: string, time: string) => ({
    subject: `Booking Cancelled — ${studentName}'s session with ${tutorName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#ff9800;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Booking Cancelled</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Dear ${parentName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  We regret to inform you that the tutoring session between <strong>${studentName}</strong> and <strong>${tutorName}</strong> scheduled for <strong>${date} at ${time}</strong> has been cancelled.
                </p>
                
                <!-- Refund info -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#2e7d32;text-transform:uppercase;letter-spacing:0.8px;">Refund Status</p>
                    <p style="margin:0;font-size:14px;color:#2e7d32;font-weight:600;"><span style="font-size:20px;">↩️</span> Full refund of <strong>${refundAmount}</strong> has been processed</p>
                    <p style="margin:8px 0 0;font-size:12px;color:#1b5e20;">Your refund should appear in your account within 1-2 business days</p>
                  </td></tr>
                </table>

                <p style="font-size:15px;color:#555;margin-bottom:16px;"><strong>What happens next:</strong></p>
                <ul style="color:#555;font-size:14px;line-height:1.8;margin:0;padding-left:25px;">
                  <li>If this was due to a tutor cancellation, you can book another available tutor</li>
                  <li>Your refund will be credited to your TutorNest account</li>
                  <li>If you need to reschedule, please visit your dashboard</li>
                </ul>

                <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:24px;margin-bottom:8px;">
                  If you have questions about this cancellation, please contact our support team.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Booking cancellation - Tutor notification
  bookingCancelledTutor: (tutorName: string, studentName: string, parentName: string, date: string, time: string, reason: string) => ({
    subject: `Booking Cancelled — Session with ${studentName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#ff9800;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Booking Cancelled</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  The tutoring session with <strong>${studentName}</strong> (parent: ${parentName}) scheduled for <strong>${date} at ${time}</strong> has been cancelled.
                </p>
                
                <!-- Cancellation reason -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff3cd;border:1px solid #ffeaa7;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#856404;text-transform:uppercase;letter-spacing:0.8px;">Cancellation Reason</p>
                    <p style="margin:0;font-size:14px;color:#333;">${reason}</p>
                  </td></tr>
                </table>

                <p style="font-size:15px;color:#555;margin-bottom:16px;"><strong>Important:</strong></p>
                <ul style="color:#555;font-size:14px;line-height:1.8;margin:0;padding-left:25px;">
                  <li>This time slot is now available for other bookings</li>
                  <li>Your earnings for this session will NOT be credited</li>
                  <li>If cancelled by parent, a cancellation fee may apply per terms</li>
                  <li>Check your dashboard for any updated availability</li>
                </ul>

                <p style="font-size:14px;color:#374151;line-height:1.6;margin-top:24px;margin-bottom:8px;">
                  Thank you for understanding. If you have questions, please reach out to our support team.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Session completed - Tutor session report prompt
  sessionCompletionPrompt: (tutorName: string, studentName: string, date: string, sessionLink: string) => ({
    subject: `📝 File Your Session Report — ${studentName}'s Class`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#7c3aed;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">📝 Session Report</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Complete your session summary for the parent</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  Thank you for conducting today's session with <strong>${studentName}</strong>! We'd appreciate if you could file a brief session report to help the parent track progress.
                </p>

                <!-- Report info -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border:1px solid #ddd6fe;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Student</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${studentName}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#6b7280;">Session Date</td>
                        <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:600;">${date}</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>

                <div style="background:#e8f5e9;border-left:4px solid #4caf50;padding:16px;margin-bottom:24px;border-radius:4px;">
                  <p style="margin:0;color:#2e7d32;font-size:14px;font-weight:600;">✅ Your report helps with:</p>
                  <ul style="margin:8px 0 0;padding-left:20px;color:#2e7d32;font-size:13px;line-height:1.6;">
                    <li>Parent visibility into child's progress</li>
                    <li>Documenting what was covered</li>
                    <li>Identifying areas for improvement</li>
                    <li>Building parent confidence</li>
                  </ul>
                </div>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${sessionLink}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    File Session Report
                  </a>
                </div>

                <p style="font-size:14px;color:#374151;line-height:1.6;">
                  It typically takes just 2-3 minutes to complete. Your insights are valuable!
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // PAYMENT & EARNINGS EMAILS
  // ─────────────────────────────────────────────────────────────────────────

  // Weekly earnings summary for tutors
  weeklyEarningsSummary: (tutorName: string, totalEarnings: string, sessionsCompleted: number, averageRating: string, withdrawalLink: string) => ({
    subject: `💰 Your Weekly Earnings Summary — ${totalEarnings}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#16a34a 0%,#22c55e 100%);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">💰 Weekly Summary</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Great week of tutoring!</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${tutorName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  Here's your tutoring summary for this week. You're doing amazing!
                </p>

                <!-- Stats cards -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td width="48%" style="padding-right:12px;vertical-align:top;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                        <tr><td style="padding:20px;text-align:center;">
                          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;">Weekly Earnings</p>
                          <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">${totalEarnings}</p>
                        </td></tr>
                      </table>
                    </td>
                    <td width="48%" style="padding-left:12px;vertical-align:top;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;">
                        <tr><td style="padding:20px;text-align:center;">
                          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#1d4ed8;text-transform:uppercase;">Sessions</p>
                          <p style="margin:0;font-size:28px;font-weight:700;color:#3b82f6;">${sessionsCompleted}</p>
                        </td></tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Rating -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px;text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;">Your Rating</p>
                    <p style="margin:0;font-size:24px;font-weight:700;color:#d97706;">⭐ ${averageRating}/5.0</p>
                    <p style="margin:8px 0 0;font-size:13px;color:#92400e;">Keep up the excellent work!</p>
                  </td></tr>
                </table>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${withdrawalLink}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Withdraw Earnings
                  </a>
                </div>

                <p style="font-size:13px;color:#6b7280;line-height:1.6;">
                  Your earnings are available for withdrawal anytime. Withdrawals typically process within 1-2 business days.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Payment failure notification
  paymentFailedNotification: (parentName: string, amount: string, retryLink: string) => ({
    subject: "⚠️ Payment Failed — Action Required",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#ef4444;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">⚠️ Payment Failed</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Dear ${parentName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  We attempted to process a payment of <strong>${amount}</strong> for your TutorNest tutoring session, but it was declined. Please update your payment method.
                </p>

                <!-- Error details -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffebee;border:1px solid #ffcdd2;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#c62828;text-transform:uppercase;">What happened:</p>
                    <ul style="margin:0;padding-left:20px;color:#d32f2f;font-size:14px;line-height:1.8;">
                      <li>Payment declined by your card issuer</li>
                      <li>Your tutor's slot may become available for others</li>
                      <li>Please retry payment immediately</li>
                    </ul>
                  </td></tr>
                </table>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${retryLink}" style="display:inline-block;background:#ef4444;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Retry Payment
                  </a>
                </div>

                <p style="font-size:14px;color:#374151;line-height:1.6;">
                  If you continue to experience issues, please contact our support team. We're here to help!
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // ACCOUNT & SECURITY EMAILS
  // ─────────────────────────────────────────────────────────────────────────

  // Password reset
  passwordReset: (userName: string, resetLink: string) => ({
    subject: "🔐 Reset Your TutorNest Password",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#1f2937;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">🔐 Password Reset</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${userName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  We received a request to reset your TutorNest password. Click the button below to create a new password.
                </p>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${resetLink}" style="display:inline-block;background:#625d9c;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Reset Password
                  </a>
                </div>

                <p style="font-size:13px;color:#6b7280;margin-bottom:16px;">
                  This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;">
                  <tr><td style="padding:16px 24px;">
                    <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">🔒 Security Tip:</p>
                    <p style="margin:4px 0 0;color:#92400e;font-size:12px;line-height:1.6;">Never share your password with anyone. TutorNest staff will never ask for your password.</p>
                  </td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Email change confirmation
  emailChangeConfirmation: (userName: string, newEmail: string, confirmLink: string) => ({
    subject: "Confirm Your New Email Address",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#3b82f6;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">📧 Confirm Email Change</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${userName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  You requested to change your email address to <strong>${newEmail}</strong>. Please confirm this change by clicking the button below.
                </p>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${confirmLink}" style="display:inline-block;background:#3b82f6;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Confirm Email Change
                  </a>
                </div>

                <p style="font-size:13px;color:#6b7280;">
                  This link expires in 24 hours. If you didn't request this change, please contact support immediately.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Security alert - Login from new device
  securityAlertNewDevice: (userName: string, device: string, location: string, timestamp: string, securityLink: string) => ({
    subject: "🔐 Security Alert: New Login Detected",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#f59e0b;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">🔐 Security Alert</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">New login detected on your account</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${userName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  We detected a login to your TutorNest account from a new device. Here are the details:
                </p>

                <!-- Login details -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#92400e;">Device</td>
                        <td style="padding:6px 0;font-size:14px;font-weight:600;color:#333;">${device}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#92400e;">Location</td>
                        <td style="padding:6px 0;font-size:14px;font-weight:600;color:#333;">${location}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;font-size:14px;color:#92400e;">Time</td>
                        <td style="padding:6px 0;font-size:14px;font-weight:600;color:#333;">${timestamp}</td>
                      </tr>
                    </table>
                  </td></tr>
                </table>

                <p style="font-size:14px;color:#374151;margin-bottom:16px;">
                  <strong>Was this you?</strong> If so, you can safely ignore this message. If this wasn't you, please secure your account immediately.
                </p>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${securityLink}" style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Review Account Activity
                  </a>
                </div>

                <p style="font-size:13px;color:#6b7280;">
                  If you believe your account has been compromised, please reset your password immediately and contact our support team.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // GAMIFICATION & ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────────────────────

  // Badge/Achievement earned
  badgeEarned: (userName: string, badgeName: string, badgeDescription: string, badgeIcon: string, achievementsLink: string) => ({
    subject: `🏆 You've Earned a Badge: ${badgeName}!`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:700;">🏆 Achievement Unlocked!</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;text-align:center;">
                <p style="font-size:56px;margin:0 0 16px;">${badgeIcon}</p>
                
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${userName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  Congratulations! You've earned the <strong>${badgeName}</strong> badge!
                </p>

                <!-- Badge details -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:2px solid #fbbf24;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:24px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#92400e;text-transform:uppercase;">About This Badge</p>
                    <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${badgeDescription}</p>
                  </td></tr>
                </table>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${achievementsLink}" style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    View Your Badges
                  </a>
                </div>

                <p style="font-size:13px;color:#6b7280;">
                  Keep up the great work! Continue engaging with TutorNest to earn more badges and achievements.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // LEARNING & PROGRESS EMAILS
  // ─────────────────────────────────────────────────────────────────────────

  // Student performance summary for parent
  studentPerformanceSummary: (parentName: string, studentName: string, tutorName: string, hoursLearned: number, topicsLearned: string, progressScore: number, dashboardLink: string) => ({
    subject: `📊 ${studentName}'s Learning Progress Summary`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#8b5cf6 0%,#7c3aed 100%);padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">📊 Learning Progress</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">This week's summary for ${studentName}</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Dear ${parentName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  Here's a summary of ${studentName}'s learning progress with ${tutorName}. Great progress!
                </p>

                <!-- Progress cards -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                  <tr>
                    <td width="48%" style="padding-right:12px;vertical-align:top;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;border:1px solid #ddd6fe;border-radius:8px;">
                        <tr><td style="padding:20px;text-align:center;">
                          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;">Learning Hours</p>
                          <p style="margin:0;font-size:28px;font-weight:700;color:#7c3aed;">${hoursLearned}h</p>
                        </td></tr>
                      </table>
                    </td>
                    <td width="48%" style="padding-left:12px;vertical-align:top;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
                        <tr><td style="padding:20px;text-align:center;">
                          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#16a34a;text-transform:uppercase;">Progress Score</p>
                          <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a;">${progressScore}%</p>
                        </td></tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Topics -->
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;">Topics Covered</p>
                    <p style="margin:0;font-size:14px;color:#333;line-height:1.6;">${topicsLearned}</p>
                  </td></tr>
                </table>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${dashboardLink}" style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    View Detailed Report
                  </a>
                </div>

                <p style="font-size:14px;color:#374151;line-height:1.6;">
                  ${studentName} is making excellent progress! Continue supporting their learning journey.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Document sharing notification
  documentSharedNotification: (recipientName: string, senderName: string, documentName: string, documentLink: string) => ({
    subject: `📄 ${senderName} Shared "${documentName}" with You`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#06b6d4;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">📄 Document Shared</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${recipientName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  <strong>${senderName}</strong> has shared a document with you: <strong>"${documentName}"</strong>
                </p>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${documentLink}" style="display:inline-block;background:#06b6d4;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    View Document
                  </a>
                </div>

                <p style="font-size:13px;color:#6b7280;line-height:1.6;">
                  You can download this document and refer to it anytime from your TutorNest dashboard.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // FEEDBACK & REVIEWS
  // ─────────────────────────────────────────────────────────────────────────

  // Parent review request
  parentReviewRequest: (parentName: string, studentName: string, tutorName: string, reviewLink: string) => ({
    subject: `📝 Share Your Feedback About ${tutorName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#ec4899;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">⭐ Leave a Review</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Dear ${parentName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  How was your experience with <strong>${tutorName}</strong> for ${studentName}'s tutoring sessions? We'd love to hear your feedback!
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background:#fce7f3;border:1px solid #fbcfe8;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:16px 24px;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#be185d;text-transform:uppercase;">Why Your Review Matters:</p>
                    <ul style="margin:8px 0 0;padding-left:20px;color:#be185d;font-size:13px;line-height:1.6;">
                      <li>Help other parents find great tutors</li>
                      <li>Recognize excellent tutors</li>
                      <li>Improve the TutorNest platform</li>
                    </ul>
                  </td></tr>
                </table>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${reviewLink}" style="display:inline-block;background:#ec4899;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Write a Review
                  </a>
                </div>

                <p style="font-size:13px;color:#6b7280;">
                  It takes just 2 minutes. Your honest feedback helps us maintain the highest standards.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Tutor review request
  tutorReviewRequest: (studentName: string, tutorName: string, reviewLink: string) => ({
    subject: `⭐ Tell ${tutorName} About Your Learning Experience`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#f59e0b;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">⭐ Your Feedback Matters</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${studentName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  How did you enjoy learning with <strong>${tutorName}</strong>? Your feedback helps us maintain excellent tutoring quality and helps ${tutorName} improve!
                </p>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${reviewLink}" style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Rate Your Tutor
                  </a>
                </div>

                <p style="font-size:13px;color:#6b7280;">
                  Share your honest experience. It takes less than 2 minutes!
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // ADMINISTRATIVE EMAILS
  // ─────────────────────────────────────────────────────────────────────────

  // Account deletion confirmation
  accountDeletionConfirmed: (userName: string) => ({
    subject: "Your TutorNest Account Has Been Deleted",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#6b7280;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Account Deleted</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${userName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  Your TutorNest account has been successfully deleted. All your personal data has been removed from our systems.
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;">What Was Deleted:</p>
                    <ul style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:1.8;">
                      <li>✓ Your account and login credentials</li>
                      <li>✓ Personal profile information</li>
                      <li>✓ Payment and transaction history</li>
                      <li>✓ Messages and communications</li>
                    </ul>
                  </td></tr>
                </table>

                <p style="font-size:14px;color:#374151;line-height:1.6;">
                  We're sorry to see you go! If you ever want to join TutorNest again, you can create a new account anytime.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),

  // Inactive account reminder
  inactiveAccountReminder: (userName: string, lastActivityDays: number, reengageLink: string) => ({
    subject: `👋 We Miss You! Come Back to TutorNest`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:#8b5cf6;padding:36px 40px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">👋 We Miss You!</h1>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 8px;font-size:16px;color:#1e1b4b;">Hi ${userName},</p>
                <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                  It's been <strong>${lastActivityDays} days</strong> since you last visited TutorNest. We'd love to see you back!
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8ff;border:1px solid #e9d5ff;border-radius:8px;margin-bottom:24px;">
                  <tr><td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#6b21a8;text-transform:uppercase;">What's New:</p>
                    <ul style="margin:0;padding-left:20px;color:#6b21a8;font-size:13px;line-height:1.8;">
                      <li>✨ New tutors available in your area</li>
                      <li>📚 Enhanced learning resources</li>
                      <li>🎉 Special offers for returning users</li>
                      <li>🏆 New achievement badges</li>
                    </ul>
                  </td></tr>
                </table>

                <div style="text-align:center;margin-bottom:24px;">
                  <a href="${reengageLink}" style="display:inline-block;background:#8b5cf6;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Welcome Back to TutorNest
                  </a>
                </div>

                <p style="font-size:13px;color:#6b7280;">
                  Log in to your account and continue your learning journey with us!
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; TutorNest ${new Date().getFullYear()}. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>
    `,
  }),
};
