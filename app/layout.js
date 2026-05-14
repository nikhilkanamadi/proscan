import './globals.css';

export const metadata = {
  title: 'ProSCAN — Prostate Single-Cell Analysis Navigator',
  description: 'Interactive scRNA-seq visualization platform for prostate cancer gene expression analysis with UMAP, violin, and ridge plots.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
