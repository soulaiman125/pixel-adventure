export const inbetweens = (counts, loops) => Object.fromEntries(
  Object.entries(counts).map(([name,count])=>[name,count*2-Number(count===1||!loops.has(name))]));

export function sampleTrack(values, position, loop=false) {
  const left=Math.min(values.length-1,Math.floor(position));
  const right=loop ? (left+1)%values.length : Math.min(values.length-1,left+1);
  const from=values[left], to=values[right];
  const weight=position-left;
  if (!weight || left===right) return from;
  const blend=(a,b)=>a+(b-a)*weight;
  return Array.isArray(from) ? from.map((value,i)=>blend(value,to[i])) : blend(from,to);
}
