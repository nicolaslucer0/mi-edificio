import { ViewTransition } from "react";

export default function AppTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ViewTransition>
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}
