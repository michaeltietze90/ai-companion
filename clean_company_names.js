/**
 * Clean up OCR results to extract just company names
 */

import fs from 'fs';

const inputFile = 'company_names.txt';
const outputFile = 'company_names_cleaned.txt';

const raw = fs.readFileSync(inputFile, 'utf-8');
const lines = raw.split('\n').filter(l => l.trim());

// Manual mapping for pages with poor OCR or complex names
const manualFixes = {
  '1': '1-800Accountant',
  '2': 'A7',
  '3': 'Adobe',
  '4': 'Advanced Turf Solutions',
  '5': 'AgencyQ',
  '6': 'Air India',
  '7': 'Alpine',
  '8': 'America',
  '9': 'Andina ART',
  '10': 'Anthropic',
  '11': 'Asymbl',
  '12': 'Big Brothers',
  '13': '[Not found]',
  '14': '[Not found]',
  '15': '[Not found]',
  '16': '[Not found]',
  '17': 'College Possible',
  '18': 'Dakota',
  '19': 'David Yurman',
  '20': '[Not found]',
  '21': 'DeVry',
  '22': '[Not found]',
  '23': 'Elements.cloud',
  '24': 'Endress+Hauser',
  '25': '[Not found]',
  '26': 'Engine',
  '27': 'Equinox',
  '28': 'Equipter',
  '29': 'F1',
  '30': '[Not found]',
  '31': 'Finnair',
  '32': '[Not found]',
  '33': 'Fisher & Paykel',
  '34': 'Good360',
  '35': 'Goodyear',
  '36': 'Globoplay',
  '37': '[Not found]',
  '38': 'Salesforce',
  '39': 'Hero FinCorp',
  '40': 'HX',
  '41': 'Indeed',
  '42': 'Kaseya',
  '43': 'Kyle, TX',
  '44': 'Lennar',
  '45': 'McLaren F1 Team',
  '46': '[Not found]',
  '47': '[Not found]',
  '48': 'Montway',
  '49': 'Movistar Plus+',
  '50': 'National Ability Center',
  '51': 'Nexo',
  '52': 'Nexstar',
  '53': 'Northern Trains',
  '54': '[Not found]',
  '55': 'OpenTable',
  '56': 'ORRAA',
  '57': '[Not found]',
  '58': 'Pacific',
  '59': 'Panasonic',
  '60': 'Pandora',
  '61': 'Pearson',
  '62': 'PenFed',
  '63': '[Not found]',
  '64': '[Not found]',
  '65': '[Not found]',
  '66': 'The RealReal',
  '67': 'Reddit',
  '68': 'reMarkable',
  '69': '[Not found]',
  '70': 'Saastr',
  '71': 'Safari365',
  '72': 'Salesforce',
  '73': '[Not found]',
  '74': 'Salesforce',
  '75': 'Salesforce',
  '76': '[Not found]',
  '77': '[Not found]',
  '78': 'Simplyhealth',
  '79': 'TASC Outsourcing',
  '80': 'Telepass',
  '81': 'UChicago',
  '82': 'United Football League',
  '83': 'Urban Rest',
  '84': '[Not found]',
  '85': '[Not found]',
  '86': 'Young Drivers',
  '87': 'Volkswagen Group',
  '88': 'YMCA of San Diego County',
  '89': 'Zota Payment',
};

const cleaned = lines.map(line => {
  const match = line.match(/Page (\d+) - (.+)/);
  if (!match) return line;
  
  const pageNum = match[1];
  
  // Use manual fix if available
  if (manualFixes[pageNum]) {
    return `Page ${pageNum} - ${manualFixes[pageNum]}`;
  }
  
  // Otherwise try to extract from OCR text
  let companyText = match[2];
  
  // Extract company name - look for capitalized words at the start
  const words = companyText.split(/\s+/);
  let companyName = '';
  
  for (const word of words.slice(0, 5)) {
    // Stop at verbs or common action words
    if (/^(uses|will|helps?|enables?|powers?|delivers?|transforms?|automates?|increases?|boosts?|scales?|handles?|resolves?|empowers?|makes?|gives?|brings?|closes?|revamps?|issues?|supports?|serves?|replicates?|enhances?|drives?|tackles?|finds?|optimizes?|streamlines?|accelerates?|elevates?|leads?|tailors?|routes?|approves?|charts?|reinvents?|expects?|shifts?|upsells?|reduces?|with|through|at|in|and|to|the)$/i.test(word)) {
      break;
    }
    // Skip single character or symbols
    if (word.length <= 1 || /^[^\w]+$/.test(word)) continue;
    
    companyName += (companyName ? ' ' : '') + word;
    
    // Stop after reasonable company name length
    if (companyName.split(/\s+/).length >= 4) break;
  }
  
  // Clean up
  companyName = companyName
    .replace(/^[^\w]+/, '')
    .replace(/[^\w\s&+\-]+$/, '')
    .trim();
  
  return `Page ${pageNum} - ${companyName || '[Not found]'}`;
});

fs.writeFileSync(outputFile, cleaned.join('\n'));
console.log('Cleaned company names written to:', outputFile);
console.log('\nAll results:');
cleaned.forEach(l => console.log(' ', l));
