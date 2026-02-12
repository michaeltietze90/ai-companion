/**
 * Extract company names from slide images using OCR
 * Run with: node extract_company_names.js
 */

import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const slidesDir = path.join(__dirname, 'public', 'slides');
const outputFile = path.join(__dirname, 'company_names.txt');

async function extractCompanyNames() {
  const results = [];
  
  // Get all slide files sorted numerically
  const files = fs.readdirSync(slidesDir)
    .filter(f => f.startsWith('page_') && f.endsWith('.jpg'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });
  
  console.log(`Found ${files.length} slide files`);
  console.log('Starting OCR extraction...\n');
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pageNum = file.match(/\d+/)[0];
    const filePath = path.join(slidesDir, file);
    
    try {
      console.log(`[${i + 1}/${files.length}] Processing Page ${pageNum}...`);
      
      // Perform OCR
      const { data: { text, words } } = await Tesseract.recognize(filePath, 'eng', {
        logger: m => {
          // Suppress verbose logging, only show progress
          if (m.status === 'recognizing text') {
            process.stdout.write(`\r[${i + 1}/${files.length}] Page ${pageNum}... ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      // Extract company name - typically the largest/most prominent text
      // Strategy: Look for text that appears to be a company name
      // Usually it's near the top, larger font, or standalone
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Common patterns for company names:
      // - Usually one of the first few lines
      // - Often contains letters/numbers (like "800Accountant")
      // - May be followed by descriptive text
      let companyName = null;
      
      // Try first few lines - company name is usually at the top
      for (const line of lines.slice(0, 5)) {
        // Skip common slide text patterns
        if (line.toLowerCase().includes('customer story') ||
            line.toLowerCase().includes('case study') ||
            line.toLowerCase().includes('success story') ||
            line.toLowerCase().includes('transformation') ||
            line.toLowerCase().includes('results') ||
            line.match(/^\d+%/) || // Percentage
            line.length < 3) {
          continue;
        }
        
        // Company names are usually:
        // - 2-50 characters
        // - Mix of letters and possibly numbers
        // - Not all caps (unless it's an acronym)
        if (line.length >= 2 && line.length <= 50) {
          companyName = line;
          break;
        }
      }
      
      // Fallback: if no good match, use first substantial line
      if (!companyName && lines.length > 0) {
        companyName = lines[0];
      }
      
      // Clean up the company name
      if (companyName) {
        // Remove common prefixes/suffixes
        companyName = companyName
          .replace(/^[•\-\*]\s*/, '') // Remove bullet points
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }
      
      const result = `Page ${pageNum} - ${companyName || '[Not found]'}`;
      results.push(result);
      console.log(`\r[${i + 1}/${files.length}] ✓ Page ${pageNum} - ${companyName || '[Not found]'}`);
      
    } catch (error) {
      console.error(`\nError processing ${file}:`, error.message);
      results.push(`Page ${pageNum} - [Error: ${error.message}]`);
    }
  }
  
  // Write results
  fs.writeFileSync(outputFile, results.join('\n'));
  console.log(`\n\n✓ Extraction complete!`);
  console.log(`Results written to: ${outputFile}`);
  console.log(`\nFirst 10 results:`);
  results.slice(0, 10).forEach(r => console.log(`  ${r}`));
}

extractCompanyNames().catch(console.error);
