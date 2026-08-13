export default function PaymentTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="motion-page-entry">{children}</div>;
}
