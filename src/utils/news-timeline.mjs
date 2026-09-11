export function timelineGroups(items,limit=12,mode='day') {
  const groups=new Map();
  for(const item of [...items].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.id.localeCompare(b.id)).slice(0,limit)) {
    const date=new Date(item.publishedAt);
    if(mode==='week') date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);
    const key=date.toISOString().slice(0,10);
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(item);
  }
  return [...groups];
}
