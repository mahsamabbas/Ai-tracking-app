import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Techlio AI Activity",
  description: "AI agent activity monitoring dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0, padding: 24 }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0 }}>AI Agent Activity Dashboard</h1>
          <p style={{ color: "#555" }}>
            Operational visibility through connected AI coding agents — not
            timekeeping.
          </p>
        </header>
        {children}
      </body>
    </html>
  );
}
