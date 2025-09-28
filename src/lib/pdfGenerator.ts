import jsPDF from 'jspdf'
import { JournalEntry } from '@/hooks/useJournalEntries'

// Helper to detect indented/preformatted lines
function isIndentedLine(line: string): boolean {
  return /^ {4,}|^C\s{2,}/.test(line);
}

function sanitizeEntryText(raw: string): string {
  if (!raw) return '';
  
  return raw
    .replace(/\r\n/g, '\n')      // normalize Windows line breaks
    .replace(/\r/g, '\n')        // normalize old Mac line breaks
    .replace(/\u00A0/g, ' ')     // non-breaking space to space
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // strip control chars
  // ⚠️ Do NOT collapse spaces or tabs — we want to preserve indentation
}

export interface PDFGenerationOptions {
  entries: JournalEntry[]
  dedication?: string
  userTitle?: string
  includeDedication?: boolean
}

export const generateBasicPDF = async ({ entries, dedication, userTitle, includeDedication = false }: PDFGenerationOptions) => {
  const doc = new jsPDF()
  
  // Title page
  doc.setFontSize(24)
  doc.text(userTitle || "My Legacy Journal", 20, 30)
  
  doc.setFontSize(12)
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 50)
  
  // Dedication page
  if (dedication && dedication.trim()) {
    doc.addPage()
    doc.setFontSize(18)
    doc.text('Dedication', 20, 30)
    doc.setFontSize(12)
    
    // Split dedication text to fit on page
    const splitDedication = doc.splitTextToSize(dedication, 170)
    doc.text(splitDedication, 20, 50)
  }
  
  // Journal entries
  entries.forEach((entry, index) => {
    doc.addPage()
    
    // Entry date header
    doc.setFontSize(14)
    const entryDate = new Date(entry.received_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    doc.text(entryDate, 20, 30)
    
    // Entry content with indentation support
    doc.setFontSize(12)
    const sanitizedContent = sanitizeEntryText(entry.content)
    const lines = sanitizedContent.split('\n')
    let y = 50
    
    lines.forEach(line => {
      const isIndented = isIndentedLine(line)
      if (isIndented) {
        doc.setFont('courier', 'normal')
        doc.setFontSize(11)
        doc.text(line, 25, y, { baseline: 'top' }) // slight left margin
      } else {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(12)
        const splitText = doc.splitTextToSize(line, 170)
        doc.text(splitText, 20, y, { baseline: 'top' })
        y += (splitText.length - 1) * 6 // adjust for multi-line
      }
      y += 8
    })
    
    // Add category if available
    if (entry.category) {
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Category: ${entry.category}`, 20, doc.internal.pageSize.height - 20)
      doc.setTextColor(0, 0, 0) // Reset to black
    }
  })
  
  return doc.output('blob')
}

export const downloadPDF = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}