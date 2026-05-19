import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, MessageCircle, Mail, Send, Facebook, Twitter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type ShareTarget = {
  title: string;
  url: string;
  text?: string;
};

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ShareTarget | null;
}

export function ShareDialog({ open, onOpenChange, target }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCopyTimer = () => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      clearCopyTimer();
      setCopied(false);
    }
  }, [open]);

  useEffect(() => () => clearCopyTimer(), []);

  if (!target) return null;

  const { title, url, text } = target;
  const shareText = text ?? `Check out ${title}`;
  const enc = (s: string) => encodeURIComponent(s);

  const networks: { key: string; label: string; href: string; icon: React.ReactNode; tone: string }[] = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${enc(`${shareText} — ${url}`)}`,
      icon: <MessageCircle className="w-4 h-4" />,
      tone: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    {
      key: "twitter",
      label: "X / Twitter",
      href: `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(url)}`,
      icon: <Twitter className="w-4 h-4" />,
      tone: "bg-zinc-800 hover:bg-zinc-700 text-white",
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      icon: <Facebook className="w-4 h-4" />,
      tone: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      key: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${enc(url)}&text=${enc(shareText)}`,
      icon: <Send className="w-4 h-4" />,
      tone: "bg-sky-600 hover:bg-sky-700 text-white",
    },
    {
      key: "email",
      label: "Email",
      href: `mailto:?subject=${enc(title)}&body=${enc(`${shareText}\n\n${url}`)}`,
      icon: <Mail className="w-4 h-4" />,
      tone: "bg-zinc-700 hover:bg-zinc-600 text-white",
    },
  ];

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied!", duration: 1500 });
      clearCopyTimer();
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1500);
    } catch {
      toast({ title: "Couldn't copy link", duration: 1500 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Share</DialogTitle>
          <DialogDescription className="text-zinc-400 truncate">{title}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-2 pt-1">
          {networks.map((n) => (
            <a
              key={n.key}
              href={n.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center gap-1.5 rounded-md py-3 text-[10px] uppercase tracking-wide transition-colors ${n.tone}`}
              data-testid={`share-${n.key}`}
            >
              {n.icon}
              <span>{n.label}</span>
            </a>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="flex-1 truncate text-xs text-zinc-300">{url}</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onCopy}
            className="h-8 gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700"
            data-testid="share-copy"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}
