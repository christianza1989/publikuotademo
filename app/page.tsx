import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8">
      <h1 className="text-4xl md:text-6xl font-bold mb-4">
        Jūsų Inovatyvus Partneris Kuriant SEO Turinį
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl">
        Paverskite savo idėjas į aukštos kokybės, paieškos sistemoms optimizuotus straipsnius per kelias minutes. Mūsų išmanioji platforma padės jums atlikti tyrimą, parinkti raktinius žodžius ir sugeneruoti turinį, kuris pritraukia skaitytojus ir augina jūsų verslą. Prisijunkite ir pradėkite kurti efektyviau jau šiandien.
      </p>
      <Button asChild size="lg">
        <Link href="/write">Pradėti Kurti →</Link>
      </Button>
    </main>
  );
}
