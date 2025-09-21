// PDF Layout utilities for Stillness theme

export const PAGE = { width: 432, height: 648 }; // 6x9 in points
export const MARGIN = { top: 72, bottom: 72, inner: 64, outer: 54 };
export const BODY = { fontSize: 11.5, leading: 16.5, paragraphSpacing: 10 };
export const HEADER = { fontSize: 9, y: PAGE.height - 48, color: 0.5 };  // gray
export const FOLIO = { fontSize: 9, y: 36, color: 0.5 };
export const ORNAMENT = { y: PAGE.height - MARGIN.top - 36 }; // between header and body

// Content frame (mirrors on left/right pages)
export function textFrame(isRight: boolean) {
  const left = isRight ? MARGIN.inner : MARGIN.outer;
  const right = isRight ? PAGE.width - MARGIN.outer : PAGE.width - MARGIN.inner;
  return { 
    x: left, 
    y: PAGE.height - MARGIN.top - 24, 
    width: right - left, 
    bottom: MARGIN.bottom + 36 
  };
}

export function sanitizeEntryText(raw: string): string {
  if (!raw) return '';
  
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/[ ]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  if (!text) return [''];
  
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    
    const words = paragraph.split(' ');
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      
      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, split it
          let remainingWord = word;
          while (remainingWord) {
            let splitWord = '';
            for (let i = 0; i < remainingWord.length; i++) {
              const testChar = splitWord + remainingWord[i];
              if (font.widthOfTextAtSize(testChar, fontSize) <= maxWidth) {
                splitWord = testChar;
              } else {
                break;
              }
            }
            if (!splitWord) splitWord = remainingWord[0];
            lines.push(splitWord);
            remainingWord = remainingWord.slice(splitWord.length);
          }
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  
  return lines;
}