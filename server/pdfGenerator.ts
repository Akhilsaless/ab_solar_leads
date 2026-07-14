export function generateEstimateHTML(data: {
  agencyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  state: string;
  monthlyBill: number;
  systemSizeKw: number;
  panelCount: number;
  panelType: string;
  totalCost: number;
  subsidyAmount: number;
  netCost: number;
  monthlySavings: number;
  paybackYears: number;
  totalSavings25Years: number;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data.agencyName} - Solar Estimate</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0;
      padding: 40px;
      color: #333;
    }
    .header {
      border-bottom: 3px solid #F97316;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #F97316;
      margin: 0 0 5px 0;
      font-size: 28px;
    }
    .header p {
      color: #666;
      margin: 0;
      font-size: 14px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #333;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .label {
      font-weight: bold;
      color: #555;
    }
    .value {
      color: #333;
    }
    .highlight {
      background-color: #FFF3E0;
      padding: 15px;
      border-radius: 4px;
      margin: 10px 0;
    }
    .highlight .row {
      border-bottom: none;
    }
    .highlight .value {
      font-weight: bold;
    }
    .highlight .value.total {
      color: #F97316;
      font-size: 16px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.agencyName}</h1>
    <p>Solar Energy Estimate</p>
  </div>

  <div class="section">
    <div class="section-title">Customer Information</div>
    <div class="row">
      <span class="label">Name:</span>
      <span class="value">${data.customerName}</span>
    </div>
    <div class="row">
      <span class="label">Email:</span>
      <span class="value">${data.customerEmail}</span>
    </div>
    <div class="row">
      <span class="label">Phone:</span>
      <span class="value">${data.customerPhone}</span>
    </div>
    <div class="row">
      <span class="label">State:</span>
      <span class="value">${data.state}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">System Details</div>
    <div class="row">
      <span class="label">Current Monthly Bill:</span>
      <span class="value">Approx ₹${data.monthlyBill.toLocaleString('en-IN')}</span>
    </div>
    <div class="row">
      <span class="label">Recommended System Size:</span>
      <span class="value">Approx ${data.systemSizeKw} kW</span>
    </div>
    <div class="row">
      <span class="label">Number of Panels:</span>
      <span class="value">Approx ${data.panelCount} panels</span>
    </div>
    <div class="row">
      <span class="label">Panel Type:</span>
      <span class="value">${data.panelType === "monocrystalline" ? "Monocrystalline (Premium)" : "Polycrystalline (Budget)"}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Financial Summary</div>
    <div class="highlight">
      <div class="row">
        <span class="label">Total System Cost:</span>
        <span class="value">Approx ₹${data.totalCost.toLocaleString('en-IN')}</span>
      </div>
      <div class="row">
        <span class="label">Government Subsidy (40%):</span>
        <span class="value">Approx ₹${data.subsidyAmount.toLocaleString('en-IN')}</span>
      </div>
      <div class="row">
        <span class="label">Your Net Cost:</span>
        <span class="value total">Approx ₹${data.netCost.toLocaleString('en-IN')}</span>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Return on Investment & Savings</div>
    <div class="row">
      <span class="label">Monthly Electricity Savings:</span>
      <span class="value">Approx ₹${data.monthlySavings.toLocaleString('en-IN')}</span>
    </div>
    <div class="row">
      <span class="label">Payback Period:</span>
      <span class="value">Approx ${data.paybackYears} years</span>
    </div>
    <div class="row">
      <span class="label">25-Year Total Savings:</span>
      <span class="value total">Approx ₹${data.totalSavings25Years.toLocaleString('en-IN')}</span>
    </div>
  </div>

  <div class="footer">
    <p>This is an approximate estimate. Actual costs and savings may vary based on site conditions and local policies.</p>
    <p>Contact us for a detailed site survey and final quotation.</p>
  </div>
</body>
</html>
  `;
}
