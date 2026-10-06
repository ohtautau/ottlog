export default function PostDate({date}:{date:string}) {
  const match=/^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if(!match)return <time dateTime={date}>{date}</time>;
  const [,year,month,day]=match;
  return <time className="post-date" dateTime={date} aria-label={`${year}年${month}月${day}日`}>
    <span className="post-date-year" aria-hidden="true">{year}</span>
    <span className="post-date-day" aria-hidden="true">{month}<span className="post-date-separator">.</span>{day}</span>
  </time>;
}
