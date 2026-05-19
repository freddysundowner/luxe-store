import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAvailabilityTags, useCreateAvailabilityTag, useDeleteAvailabilityTag } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, Trash2, Plus, Info } from "lucide-react";

export default function AdminAvailabilityTags() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newLabel, setNewLabel] = useState("");

  const { data: tags, isLoading } = useListAvailabilityTags();

  const createMutation = useCreateAvailabilityTag({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/availability-tags"] });
        queryClient.invalidateQueries({ queryKey: ["/api/availability-tags"] });
        setNewLabel("");
        toast({ title: "Tag added" });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to add tag";
        toast({ variant: "destructive", title: msg });
      },
    },
  });

  const deleteMutation = useDeleteAvailabilityTag({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/availability-tags"] });
        queryClient.invalidateQueries({ queryKey: ["/api/availability-tags"] });
        toast({ title: "Tag removed" });
      },
      onError: () => toast({ variant: "destructive", title: "Failed to remove tag" }),
    },
  });

  const handleAdd = () => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    createMutation.mutate({ data: { label: trimmed } });
  };

  return (
    <AdminLayout title="Availability Tags">
      <div className="space-y-6">
        {/* Info */}
        <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <p>
            Availability tags appear as badges on product cards and power the <strong>Availability</strong> filter in the store.
            Set a tag on each product from the product's edit page.
          </p>
        </div>

        {/* Add new tag */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-foreground">Add new tag</h2>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Flash Sale, Staff Pick, Pre-order…"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={!newLabel.trim() || createMutation.isPending}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The slug (used internally) is auto-generated from the label — e.g. "Flash Sale" → <code>flash_sale</code>
          </p>
        </div>

        {/* Tag list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{tags?.length ?? 0} tag{tags?.length !== 1 ? "s" : ""}</span>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
          ) : !tags?.length ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No tags yet. Add one above.</div>
          ) : (
            <ul className="divide-y divide-border">
              {tags.map((tag) => (
                <li key={tag.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      {tag.label}
                    </span>
                    <code className="text-xs text-muted-foreground">{tag.value}</code>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate({ id: tag.id })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
