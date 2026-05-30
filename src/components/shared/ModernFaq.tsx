import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export type ModernFaqItem = { q: string; a: React.ReactNode };

interface ModernFaqProps {
  items: ModernFaqItem[];
  className?: string;
  /** Index offset so multiple lists can share continuous numbering if needed */
  startIndex?: number;
}

/**
 * Modern FAQ accordion: numbered chip + animated +/× toggle + gradient-border item.
 * Styling tokens live in `index.css` (`.faq-item-modern`).
 */
const ModernFaq = ({ items, className, startIndex = 0 }: ModernFaqProps) => {
  return (
    <Accordion type="single" collapsible className={`space-y-3 ${className ?? ""}`}>
      {items.map((faq, i) => {
        const n = startIndex + i + 1;
        return (
          <AccordionItem key={i} value={`faq-${startIndex}-${i}`} className="faq-item-modern border-none">
            <AccordionTrigger className="group px-5 md:px-6 py-5 text-left hover:no-underline [&>svg]:hidden">
              <div className="flex items-center gap-4 w-full">
                <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 text-primary font-mono text-sm font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {String(n).padStart(2, "0")}
                </span>
                <span className="flex-1 font-heading font-semibold text-base md:text-lg text-foreground group-hover:text-primary transition-colors">
                  {faq.q}
                </span>
                <span className="flex-shrink-0 w-8 h-8 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground group-hover:border-primary group-hover:text-primary transition-all group-data-[state=open]:bg-primary group-data-[state=open]:text-primary-foreground group-data-[state=open]:border-primary group-data-[state=open]:rotate-45">
                  <span className="block w-3 h-[2px] bg-current relative before:content-[''] before:absolute before:left-1/2 before:top-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-[2px] before:h-3 before:bg-current" />
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 md:px-6 pb-6 text-muted-foreground leading-relaxed">
              <div className="border-l-2 border-primary/20 pl-5 ml-[3.25rem] text-[15px]">
                {faq.a}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

export default ModernFaq;
