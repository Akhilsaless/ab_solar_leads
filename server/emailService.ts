import nodemailer from "nodemailer";

// Email configuration - using environment variables
const emailConfig = {
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

export interface EstimateEmailData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  state: string;
  systemSizeKw: number;
  panelType: "monocrystalline" | "polycrystalline";
  totalCost: number;
  subsidyAmount: number;
  netCost: number;
  monthlyBill: number;
  monthlyElectricitySavings: number;
  paybackYears: number;
  savings25Year: number;
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
  futureElectricityRate?: number;
  currentRate?: number;
  rateIncreasePercentage?: number;
}

/**
 * Send estimate email to customer
 */
export async function sendCustomerEstimateEmail(data: EstimateEmailData): Promise<boolean> {
  try {
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F97316, #FB923C); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .section h3 { color: #F97316; margin-top: 0; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
            .row:last-child { border-bottom: none; }
            .label { color: #666; }
            .value { font-weight: bold; color: #333; }
            .highlight { color: #F97316; font-size: 24px; font-weight: bold; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>☀️ Your Solar Estimate</h1>
              <p>Thank you for choosing ${data.agencyName}!</p>
            </div>

            <div class="section">
              <h3>Personalized Estimate for ${data.customerName}</h3>
              <div class="row">
                <span class="label">System Size:</span>
                <span class="value">${data.systemSizeKw} kW</span>
              </div>
              <div class="row">
                <span class="label">Panel Type:</span>
                <span class="value">${data.panelType === "monocrystalline" ? "Monocrystalline (Premium)" : "Polycrystalline (Budget)"}</span>
              </div>
              <div class="row">
                <span class="label">State:</span>
                <span class="value">${data.state}</span>
              </div>
              <div class="row">
                <span class="label">Your Monthly Bill:</span>
                <span class="value">₹${data.monthlyBill.toFixed(0)}</span>
              </div>
            </div>

            <div class="section">
              <h3>💰 Cost Breakdown</h3>
              <div class="row">
                <span class="label">Total System Cost:</span>
                <span class="value">₹${data.totalCost.toFixed(0)}</span>
              </div>
              <div class="row">
                <span class="label">Government Subsidy:</span>
                <span class="value" style="color: #10b981;">-₹${data.subsidyAmount.toFixed(0)}</span>
              </div>
              <div class="row" style="background: #fff3cd; padding: 10px; border-radius: 4px;">
                <span class="label">Your Net Cost:</span>
                <span class="highlight">₹${data.netCost.toFixed(0)}</span>
              </div>
            </div>

            <div class="section">
              <h3>📊 ROI & Savings</h3>
              <div class="row">
                <span class="label">Monthly Savings:</span>
                <span class="value" style="color: #10b981;">₹${data.monthlyElectricitySavings.toFixed(0)}</span>
              </div>
              <div class="row">
                <span class="label">Payback Period:</span>
                <span class="value">${data.paybackYears.toFixed(1)} years</span>
              </div>
              <div class="row">
                <span class="label">25-Year Total Savings:</span>
                <span class="value" style="color: #10b981; font-size: 18px;">₹${data.savings25Year.toFixed(0)}</span>
              </div>
            </div>

            ${data.currentRate && data.rateIncreasePercentage ? `
            <div class="section">
              <h3>⚡ Electricity Rate Prediction</h3>
              <p style="margin: 0; color: #666;">Based on historical trends, electricity rates in ${data.state} increase ~${data.rateIncreasePercentage.toFixed(1)}% yearly.</p>
              <div class="row" style="margin-top: 10px;">
                <span class="label">Current Rate:</span>
                <span class="value">₹${data.currentRate.toFixed(2)}/unit</span>
              </div>
              <div class="row">
                <span class="label">Predicted Rate (Year 10):</span>
                <span class="value">₹${(data.currentRate * Math.pow(1 + data.rateIncreasePercentage / 100, 10)).toFixed(2)}/unit</span>
              </div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 13px;">💡 Installing now protects you from future rate hikes and maximizes your savings!</p>
            </div>
            ` : ""}

            <div class="section" style="background: #dbeafe; border-left: 4px solid #F97316;">
              <h3 style="margin-top: 0;">Next Steps</h3>
              <p>1. Review this estimate and share with family</p>
              <p>2. ${data.agencyName} will contact you for a site visit</p>
              <p>3. Installation typically takes 2-3 days</p>
              <p>4. Start saving immediately!</p>
            </div>

            <div class="section" style="background: #f0fdf4;">
              <h3 style="margin-top: 0; color: #10b981;">Contact Information</h3>
              <p><strong>${data.agencyName}</strong></p>
              <p>📞 ${data.agencyPhone}</p>
              <p>📧 ${data.agencyEmail}</p>
            </div>

            <div class="footer">
              <p>This is an automated estimate from ${data.agencyName}. For more information, please contact us directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: data.customerEmail,
      subject: `Your ☀️ Solar Estimate - ${data.agencyName}`,
      html: htmlContent,
    });

    console.log(`✓ Customer email sent to ${data.customerEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending customer email:", error);
    return false;
  }
}

/**
 * Send lead details email to company
 */
export async function sendCompanyLeadEmail(data: EstimateEmailData): Promise<boolean> {
  try {
    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .section { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .section h3 { color: #F97316; margin-top: 0; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
            .row:last-child { border-bottom: none; }
            .label { color: #666; font-weight: bold; }
            .value { color: #333; }
            .priority { background: #fef3c7; padding: 10px; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔥 New Lead Alert!</h1>
              <p>Qualified solar lead ready for follow-up</p>
            </div>

            <div class="section">
              <h3>Customer Information</h3>
              <div class="row">
                <span class="label">Name:</span>
                <span class="value">${data.customerName}</span>
              </div>
              <div class="row">
                <span class="label">Phone:</span>
                <span class="value">${data.customerPhone}</span>
              </div>
              <div class="row">
                <span class="label">Email:</span>
                <span class="value">${data.customerEmail}</span>
              </div>
              <div class="row">
                <span class="label">State:</span>
                <span class="value">${data.state}</span>
              </div>
            </div>

            <div class="section">
              <h3>System Details</h3>
              <div class="row">
                <span class="label">System Size:</span>
                <span class="value">${data.systemSizeKw} kW</span>
              </div>
              <div class="row">
                <span class="label">Panel Type:</span>
                <span class="value">${data.panelType}</span>
              </div>
              <div class="row">
                <span class="label">Monthly Bill:</span>
                <span class="value">₹${data.monthlyBill.toFixed(0)}</span>
              </div>
              <div class="row">
                <span class="label">Monthly Savings:</span>
                <span class="value" style="color: #10b981; font-weight: bold;">₹${data.monthlyElectricitySavings.toFixed(0)}</span>
              </div>
            </div>

            <div class="section">
              <h3>Financial Summary</h3>
              <div class="row">
                <span class="label">Total Cost:</span>
                <span class="value">₹${data.totalCost.toFixed(0)}</span>
              </div>
              <div class="row">
                <span class="label">Subsidy:</span>
                <span class="value">₹${data.subsidyAmount.toFixed(0)}</span>
              </div>
              <div class="row">
                <span class="label">Net Cost:</span>
                <span class="value">₹${data.netCost.toFixed(0)}</span>
              </div>
              <div class="row">
                <span class="label">Payback Period:</span>
                <span class="value">${data.paybackYears.toFixed(1)} years</span>
              </div>
              <div class="row">
                <span class="label">25-Year Savings:</span>
                <span class="value" style="color: #10b981; font-weight: bold;">₹${data.savings25Year.toFixed(0)}</span>
              </div>
            </div>

            <div class="priority">
              <strong>⚠️ Action Required:</strong> Contact customer within 24 hours for site visit scheduling. Customer has been sent detailed estimate.
            </div>

            <div class="section" style="background: #f0fdf4;">
              <h3 style="margin-top: 0; color: #10b981;">Follow-up Checklist</h3>
              <p>☐ Call customer to confirm details</p>
              <p>☐ Schedule site visit</p>
              <p>☐ Provide financing options</p>
              <p>☐ Answer any questions</p>
              <p>☐ Close the deal!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: data.agencyEmail,
      subject: `🔥 New Lead: ${data.customerName} - ₹${data.netCost.toFixed(0)} Net Cost`,
      html: htmlContent,
    });

    console.log(`✓ Company email sent to ${data.agencyEmail}`);
    return true;
  } catch (error) {
    console.error("Error sending company email:", error);
    return false;
  }
}
