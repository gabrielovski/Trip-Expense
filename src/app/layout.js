import { GeistSans } from "geist/font/sans";
import "../style.css";

export const metadata = {
  title: "Trip-Expense",
  description:
    "Trip-Expense é um aplicativo para controle de despesas de viagem.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={GeistSans.className}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
