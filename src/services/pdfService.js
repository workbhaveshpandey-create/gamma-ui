import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - using standard Vite URL import
// Note: This relies on Vite handling the ?url import correctly for the worker file
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts text content from a PDF file.
 * @param {File} file - The PDF file object
 * @returns {Promise<string>} - The extracted text
 */
export const extractPdfText = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Join items with space, but respect basic layout flow by checking transform (simplified here)
            const pageText = textContent.items.map(item => item.str).join(' ');

            fullText += `--- Page ${i} ---\n${pageText}\n\n`;
        }

        return fullText.trim();
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        throw new Error('Failed to read PDF file. Please ensure it is a valid PDF.');
    }
};
