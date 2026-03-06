import puppeteer from "puppeteer";
import { generateHTMLReport } from "./reportTemplate.js";

export const generatePDFBuffer = async (data) => {
  let browser;
  try {
    // 1. Launch Headless Browser
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Prevents memory issues on servers
      ],
    });

    const page = await browser.newPage();

    // 2. Generate HTML from data and set it directly (no network call)
    const htmlContent = generateHTMLReport(data);
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
    });

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
