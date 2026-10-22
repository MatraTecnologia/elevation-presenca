"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="page-loader"><span className="brand-mark">E</span><h1>Não conseguimos abrir o painel.</h1><p>Confira a conexão com o banco e tente novamente.</p><button className="btn primary" onClick={reset}>Tentar novamente</button></main>; }
