import Link from "next/link";
export async function StudioNav(_props:{current?:string;area?:string}) { return <nav className="container py-4 flex gap-4"><Link href="/forum">论坛</Link><Link href="/studio/forum">管理</Link></nav>; }
