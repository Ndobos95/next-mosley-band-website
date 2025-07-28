import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface PaymentEmailData {
  parentEmail: string;
  parentName: string;
  studentName: string;
  categoryName: string;
  amount: number;
  paymentIntentId: string;
  paymentDate: Date;
}

export interface DirectorNotificationData {
  parentName: string;
  parentEmail: string;
  studentName: string;
  instrument: string;
  dashboardUrl: string;
}

export class EmailService {
  private static async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }) {
    console.log("🚀 EmailService.sendEmail called with:", {
      to: params.to,
      subject: params.subject,
      fromEmail: process.env.FROM_EMAIL,
      resendConfigured: !!resend,
      apiKey: process.env.RESEND_API_KEY
        ? `${process.env.RESEND_API_KEY.substring(0, 10)}...`
        : "NOT SET",
    });

    if (!resend) {
      console.warn("⚠️ Resend not configured, skipping email send");
      return { success: false, error: "Resend not configured" };
    }

    try {
      console.log("📤 Calling resend.emails.send...");
      const result = await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@localhost",
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      console.log("📧 Resend API response:", result);

      // Check for Resend API errors in response
      if (result.error) {
        console.error("❌ Resend API error:", result.error);
        return {
          success: false,
          error: `Resend API error: ${result.error.message || result.error}`,
        };
      }

      console.log(`✅ Email sent successfully to ${params.to}`);
      return { success: true, resendResult: result };
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        errorObject: error,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async emailNotifyBooostersOfPayment(data: PaymentEmailData) {
    const amountFormatted = `$${(data.amount / 100).toFixed(2)}`;
    const dateFormatted = data.paymentDate.toLocaleDateString();
    const html = `
      <h2>Payment Confirmation</h2>
      <p>Hi boosters,</p>
      
      <p>This is a courtesy email to notify you that a payment has been made.</p>
      
      <ul>
        <li><strong>Parent:</strong> ${data.parentEmail}</li>
        <li><strong>Student:</strong> ${data.studentName}</li>
        <li><strong>Category:</strong> ${data.categoryName}</li>
        <li><strong>Amount:</strong> ${amountFormatted}</li>
        <li><strong>Payment Date:</strong> ${dateFormatted}</li>
        <li><strong>Reference:</strong> ${data.paymentIntentId}</li>
      </ul>
      
      <p>If you have any questions, please contact the band program.</p>
    `;

    return this.sendEmail({
      to: process.env.BOOSTER_EMAIL || "booster@example.com",
      subject: `Payment Notification - ${data.studentName} - ${data.categoryName}`,
      html,
    });
  }

  static async sendPaymentNotificationEmails(data: PaymentEmailData) {
    console.log('📧 Sending payment notification emails for:', {
      parentEmail: data.parentEmail,
      studentName: data.studentName,
      categoryName: data.categoryName,
      amount: data.amount
    });

    // Send both emails in parallel
    const [confirmationResult, boosterResult] = await Promise.all([
      this.sendPaymentConfirmation(data),
      this.emailNotifyBooostersOfPayment(data)
    ]);

    console.log('📧 Email results:', {
      confirmation: confirmationResult.success,
      booster: boosterResult.success
    });

    return {
      confirmationResult,
      boosterResult,
      success: confirmationResult.success && boosterResult.success
    };
  }

  static async sendPaymentConfirmation(data: PaymentEmailData) {
    const amountFormatted = `$${(data.amount / 100).toFixed(2)}`;
    const dateFormatted = data.paymentDate.toLocaleDateString();

    const html = `
      <h2>Payment Confirmation</h2>
      <p>Hi ${data.parentName},</p>
      
      <p>Thank you for your payment! Here are the details:</p>
      
      <ul>
        <li><strong>Student:</strong> ${data.studentName}</li>
        <li><strong>Category:</strong> ${data.categoryName}</li>
        <li><strong>Amount:</strong> ${amountFormatted}</li>
        <li><strong>Payment Date:</strong> ${dateFormatted}</li>
        <li><strong>Reference:</strong> ${data.paymentIntentId}</li>
      </ul>
      
      <p>You can view your payment history and outstanding balances in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">parent dashboard</a>.</p>
      
      <p>If you have any questions, please contact the band program.</p>
      
      <p>Best regards,<br>Band Program</p>
    `;

    return this.sendEmail({
      to: data.parentEmail,
      subject: `Payment Confirmation - ${data.studentName} - ${data.categoryName}`,
      html,
    });
  }

  static async sendDirectorNotification(data: DirectorNotificationData) {
    const html = `
      <h2>New Student Registration Needs Review</h2>
      
      <p>A new parent registration could not be automatically matched to a student in the roster.</p>
      
      <p><strong>Registration Details:</strong></p>
      <ul>
        <li><strong>Parent:</strong> ${data.parentName} (${data.parentEmail})</li>
        <li><strong>Student:</strong> ${data.studentName}</li>
        <li><strong>Instrument:</strong> ${data.instrument}</li>
      </ul>
      
      <p>Please review this registration and manually link it to the correct student in your <a href="${data.dashboardUrl}">director dashboard</a>.</p>
      
      <p>This is an automated notification from the band program website.</p>
    `;

    return this.sendEmail({
      to: process.env.DIRECTOR_EMAIL || "director@example.com",
      subject: "Student Registration Needs Manual Review",
      html,
    });
  }
}
