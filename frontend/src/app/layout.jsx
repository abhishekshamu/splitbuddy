export const metadata = {
  title: "SplitBuddy",
  description: "Smart expense splitting for roommates",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
