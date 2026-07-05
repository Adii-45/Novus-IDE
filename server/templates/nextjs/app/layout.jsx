export const metadata = {
  title: 'Next.js App',
  description: 'Created with NovusIDE',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0b1020', color: '#e6eaf4' }}>
        {children}
      </body>
    </html>
  );
}
