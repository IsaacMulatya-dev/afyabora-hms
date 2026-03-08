import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
        <Construction size={28} className="text-primary" />
      </div>
      <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
