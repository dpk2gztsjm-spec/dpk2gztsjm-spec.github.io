/** Minimal dependency-free A5 PDF writer. Embeds only re-encoded JPEG page images:
 * no names or hidden source metadata ever exist as PDF text / metadata.
 * Page media box is exact A5 at 72 PDF units/inch.
 */
export const A5_WIDTH_PT=148/25.4*72;
export const A5_HEIGHT_PT=210/25.4*72;
const enc=new TextEncoder();
export function buildA5Pdf(pages){
 if(!Array.isArray(pages)||!pages.length)throw Error('PDFに必要なページがありません。');
 const chunks=[],offsets=[0];let length=0;
 const write=(bytes)=>{if(typeof bytes==='string')bytes=enc.encode(bytes);chunks.push(bytes);length+=bytes.length;};
 const obj=(n,body)=>{offsets[n]=length;write(`${n} 0 obj\n`);write(body);write('\nendobj\n');};
 write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
 const pageRefs=pages.map((_,i)=>`${3+i*3} 0 R`).join(' ');
 obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
 obj(2,`<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);
 for(let i=0;i<pages.length;i++){
  const {jpeg,width,height}=pages[i];
  if(!(jpeg instanceof Uint8Array)||jpeg.length<10||jpeg[0]!==0xff||jpeg[1]!==0xd8||!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw Error('JPEGページのデータが不正です。');
  const n=3+i*3,im=n+1,stream=n+2;
  obj(n,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A5_WIDTH_PT.toFixed(6)} ${A5_HEIGHT_PT.toFixed(6)}] /Resources << /XObject << /Im${i} ${im} 0 R >> >> /Contents ${stream} 0 R >>`);
  offsets[im]=length;write(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);write(jpeg);write('\nendstream\nendobj\n');
  const ops=`q ${A5_WIDTH_PT.toFixed(6)} 0 0 ${A5_HEIGHT_PT.toFixed(6)} 0 0 cm /Im${i} Do Q\n`;
  offsets[stream]=length;write(`${stream} 0 obj\n<< /Length ${enc.encode(ops).length} >>\nstream\n${ops}endstream\nendobj\n`);
 }
 const xrefOffset=length,objects=2+pages.length*3;
 write(`xref\n0 ${objects+1}\n0000000000 65535 f \n`);
 for(let n=1;n<=objects;n++)write(`${String(offsets[n]).padStart(10,'0')} 00000 n \n`);
 write(`trailer\n<< /Size ${objects+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
 const output=new Uint8Array(length);let off=0;for(const piece of chunks){output.set(piece,off);off+=piece.length;}return output;
}
export async function blobBytes(blob){return new Uint8Array(await blob.arrayBuffer());}
