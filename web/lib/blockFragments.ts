// L'anteprima del builder marca ogni blocco con <div data-blk="id"> … </div><!--/blk-->: da qui si ricava il pezzo di ciascuno.
export function parseFragments(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of html.matchAll(/<div data-blk="([^"]+)" style="display:contents">([\s\S]*?)<\/div><!--\/blk-->/g)) out[m[1]] = m[2];
  return out;
}
