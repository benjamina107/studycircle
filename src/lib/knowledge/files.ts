import { fileTypeFromBuffer } from 'file-type';
import { PDFDocument } from 'pdf-lib';
import { MAX_FILE_BYTES } from './shared';
import sharp from 'sharp';
const types: Record<string,string[]> = {
 pdf:['application/pdf'],docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
 jpg:['image/jpeg'],jpeg:['image/jpeg'],png:['image/png'],webp:['image/webp'],
 mp3:['audio/mpeg'],m4a:['audio/mp4','audio/x-m4a','video/mp4'],wav:['audio/wav','audio/x-wav'],ogg:['audio/ogg','application/ogg'],flac:['audio/flac'],
};
export async function validateFile(name: string, bytes: Buffer) {
 if(!bytes.length || bytes.length>MAX_FILE_BYTES) throw new Error('Files must be between 1 byte and 25 MB.');
 const ext=name.split('.').pop()?.toLowerCase() || '';
 if(['txt','md'].includes(ext)) {
  if(bytes.length>500_000 || bytes.includes(0)) throw new Error('Text files must be UTF-8 and under 500 KB.');
  new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  return 'text/plain';
 }
 if(!types[ext]) throw new Error('Choose a PDF, DOCX, text, image, or audio file. Video is not supported.');
 const detected=await fileTypeFromBuffer(bytes);
 if(!detected || !types[ext].includes(detected.mime)) throw new Error('The file contents do not match its extension.');
 if(detected.mime.startsWith('image/')) {const meta=await sharp(bytes,{limitInputPixels:40_000_000}).metadata();if(!meta.width||!meta.height)throw new Error('This image could not be read.');}
 if(ext==='pdf') { const pdf=await PDFDocument.load(bytes); if(pdf.getPageCount()>60) throw new Error('Please split PDFs into files of 60 pages or fewer.'); }
 return ext==='m4a' ? 'audio/mp4' : detected.mime;
}
