import Link from 'next/link';
import { Fragment } from 'react';
import report from '../../public/Jawa_POS_Deep_Research_and_Release_Review.md?raw';
// A small renderer for this authored report only; no HTML or user content is evaluated.
function inline(value: string) {
  return value.split(/(\[[^\]]+\]\(https:\/\/[^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} rel="noreferrer">{link[1]}</a>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}
function reportBlocks() {
  return report.split(/\n\n+/).map((block, index) => {
    if (block.startsWith('# ')) return <h1 key={index}>{block.slice(2)}</h1>;
    if (block.startsWith('## ')) return <h2 key={index}>{block.slice(3)}</h2>;
    if (block.startsWith('|')) {
      const rows = block.trim().split('\n').map(row => row.split('|').slice(1, -1).map(cell => cell.trim()));
      return <div className="pos-table-scroll" key={index}><table><thead><tr>{rows[0].map((cell, i) => <th key={i}>{inline(cell)}</th>)}</tr></thead><tbody>{rows.slice(2).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{inline(cell)}</td>)}</tr>)}</tbody></table></div>;
    }
    return <p key={index}>{inline(block)}</p>;
  });
}
export default function Research() {
  return <main className="pos-research"><nav><Link href="/">Choose app</Link><a href="/restaurant">Restaurant</a><a href="/retail">Retail</a></nav><p><a href="/Jawa_POS_Deep_Research_and_Release_Review.md" download>Download research report</a></p>{reportBlocks()}</main>;
}
