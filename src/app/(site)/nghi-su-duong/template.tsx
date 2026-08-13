export default function ForumTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="motion-page-entry">{children}</div>;
}
