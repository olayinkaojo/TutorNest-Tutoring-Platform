import { Resend } from "npm:resend@3.2.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "noreply@tutornest.org";

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
