import puppeteer from "puppeteer";

export const generatePDFBuffer = async (reportUrl) => {
  let browser;
  try {
    // 1. Launch Headless Browser
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // 2. Visit the Web Report Page
    // 'networkidle0' ensures the page is fully loaded before printing
    await page.goto(reportUrl, { waitUntil: "networkidle0" });

    // 3. Set standard A4 Print options
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true, // Crucial for Tailwind colors and Chart backgrounds
      margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px",
      },
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    if (browser) await browser.close();
    console.error("❌ Puppeteer Error:", error);
    throw error;
  }
};
