export const metadata = {
  title: "Trip-Expense",
  description:
    "Trip-Expense é um aplicativo para controle de despesas de viagem.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
