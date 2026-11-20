import styles from "./RichText.module.css";

/**
 * Texto con formato mínimo y seguro (sin HTML): párrafos, listas con "- ",
 * **negritas** y [enlaces](https://…). Los enlaces llevan rel="nofollow ugc".
 */
function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<b key={`${key}-b${i++}`}>{m[1]}</b>);
    else
      out.push(
        <a key={`${key}-a${i++}`} href={m[3]} rel="nofollow ugc noopener" target="_blank">
          {m[2]}
        </a>,
      );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className={styles.texto}>
      {blocks.map((b, k) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^[-*] /.test(l)))
          return (
            <ul key={k}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.slice(2), `${k}-${j}`)}</li>
              ))}
            </ul>
          );
        if (/^#{1,3} /.test(b)) return <h3 key={k}>{b.replace(/^#{1,3} /, "")}</h3>;
        return (
          <p key={k}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(l, `${k}-${j}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
