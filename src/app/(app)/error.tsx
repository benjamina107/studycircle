"use client";
export default function WorkspaceError({retry}: {retry:()=>void}) {
  return <main className="workspace-panel"><header className="page-heading"><h1>Unable to load this page</h1><p>Your class workspace couldn’t be loaded. Please try again.</p></header><button className="workspace-button" onClick={retry}>Try again</button></main>;
}
