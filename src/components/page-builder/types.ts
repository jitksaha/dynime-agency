export type BlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "button"
  | "spacer"
  | "divider"
  | "video"
  | "columns"
  | "cta"
  | "list"
  | "quote"
  | "html"
  | "hero"
  | "features"
  | "testimonial";

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, any>;
}

export interface PageData {
  id?: string;
  title: string;
  slug: string;
  is_published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  content: Block[];
}

export const BLOCK_DEFINITIONS: {
  type: BlockType;
  label: string;
  icon: string;
  category: string;
  defaultProps: Record<string, any>;
}[] = [
  {
    type: "heading",
    label: "Heading",
    icon: "Type",
    category: "Text",
    defaultProps: { text: "Heading Text", level: "h2", align: "left", color: "" },
  },
  {
    type: "paragraph",
    label: "Text Block",
    icon: "AlignLeft",
    category: "Text",
    defaultProps: { text: "Enter your text here...", align: "left", color: "" },
  },
  {
    type: "image",
    label: "Image",
    icon: "ImageIcon",
    category: "Media",
    defaultProps: { src: "", alt: "", width: "100%", borderRadius: "0.5rem", objectFit: "cover" },
  },
  {
    type: "video",
    label: "Video Embed",
    icon: "Play",
    category: "Media",
    defaultProps: { url: "", aspectRatio: "16/9" },
  },
  {
    type: "button",
    label: "Button",
    icon: "MousePointerClick",
    category: "Interactive",
    defaultProps: { text: "Click Me", url: "#", variant: "primary", align: "left", size: "md" },
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: "MoveVertical",
    category: "Layout",
    defaultProps: { height: 40 },
  },
  {
    type: "divider",
    label: "Divider",
    icon: "Minus",
    category: "Layout",
    defaultProps: { color: "border", width: "100%", style: "solid" },
  },
  {
    type: "columns",
    label: "Columns",
    icon: "Columns3",
    category: "Layout",
    defaultProps: { columns: 2, gap: 24, content: [[], []] },
  },
  {
    type: "cta",
    label: "Call to Action",
    icon: "Megaphone",
    category: "Sections",
    defaultProps: {
      heading: "Ready to Get Started?",
      subtext: "Contact us today for a free consultation.",
      buttonText: "Get Started",
      buttonUrl: "/contact",
      bgColor: "primary",
      align: "center",
    },
  },
  {
    type: "hero",
    label: "Hero Section",
    icon: "LayoutTemplate",
    category: "Sections",
    defaultProps: {
      heading: "Welcome to Our Website",
      subtext: "We build amazing digital experiences.",
      buttonText: "Learn More",
      buttonUrl: "#",
      bgImage: "",
      overlay: true,
      align: "center",
    },
  },
  {
    type: "list",
    label: "List",
    icon: "List",
    category: "Text",
    defaultProps: { items: ["Item 1", "Item 2", "Item 3"], style: "bullet", color: "" },
  },
  {
    type: "quote",
    label: "Blockquote",
    icon: "Quote",
    category: "Text",
    defaultProps: { text: "A great quote goes here.", author: "", color: "" },
  },
  {
    type: "features",
    label: "Features Grid",
    icon: "Grid3X3",
    category: "Sections",
    defaultProps: {
      heading: "Our Features",
      columns: 3,
      items: [
        { title: "Feature 1", description: "Description here", icon: "Zap" },
        { title: "Feature 2", description: "Description here", icon: "Shield" },
        { title: "Feature 3", description: "Description here", icon: "Globe" },
      ],
    },
  },
  {
    type: "testimonial",
    label: "Testimonial",
    icon: "MessageSquareQuote",
    category: "Sections",
    defaultProps: { quote: "Amazing service!", author: "John Doe", role: "CEO", avatar: "" },
  },
  {
    type: "html",
    label: "Custom HTML",
    icon: "Code",
    category: "Advanced",
    defaultProps: { code: "<div>Custom HTML</div>" },
  },
];
