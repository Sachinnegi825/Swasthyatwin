import puppeteer from "puppeteer";
import { generateHTMLReport } from "./reportTemplate.js";

export const generatePDFBuffer = async (data) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security", // Added to help load external fonts/scripts without CORS issues
      ],
    });

    const page = await browser.newPage();
    const htmlContent = generateHTMLReport(data);

    // THE FIX IS HERE:
    await page.setContent(htmlContent, {
      waitUntil: "networkidle2", // Allows up to 2 background connections (like fonts)
      timeout: 60000, // Bump timeout to 60 seconds so Tailwind has time to compile
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
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
