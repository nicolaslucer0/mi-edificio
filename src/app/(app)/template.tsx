export default function AppTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-1 flex-col animate-in fade-in slide-in-from-bottom-1 duration-300">
      {children}
    </div>
  );
}
