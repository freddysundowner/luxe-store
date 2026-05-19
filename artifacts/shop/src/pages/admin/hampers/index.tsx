import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  useListAdminHampers,
  getListAdminHampersQueryKey,
  useDeleteHamper,
  useGetSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Plus, Edit, Trash2, Gift, Sparkles } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminHampers() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hampers, isLoading } = useListAdminHampers({
    query: { queryKey: getListAdminHampersQueryKey() },
  });
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const currencySymbol = settings?.currencySymbol || "KSh";

  const deleteMutation = useDeleteHamper({
    mutation: {
      onSuccess: () => {
        toast({ title: "Hamper deleted" });
        queryClient.invalidateQueries({ queryKey: getListAdminHampersQueryKey() });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to delete hamper" });
      },
    },
  });

  return (
    <AdminLayout title="Gift Hampers">
      <div className="flex justify-end mb-6">
        <Link href="/admin/hampers/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Add Hamper
          </Button>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading hampers...</div>
        ) : !hampers || hampers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No hampers yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Bundle products into curated gift hampers. The AI gift concierge will recommend them to customers.
            </p>
            <Link href="/admin/hampers/new">
              <Button variant="outline">Create your first hamper</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hampers.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                        {h.imageUrl ? (
                          <img src={h.imageUrl} alt={h.name} className="w-full h-full object-cover" />
                        ) : (
                          <Gift className="w-5 h-5 text-muted-foreground m-2.5" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{h.items.reduce((s, i) => s + i.quantity, 0)} items</TableCell>
                    <TableCell>
                      {currencySymbol} {Number(h.price).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {h.isActive ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                        {h.isFeatured && (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
                            <Sparkles className="w-3 h-3" /> Featured
                          </Badge>
                        )}
                        {!h.inStock && <Badge variant="destructive">Out of Stock</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/hampers/${h.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteId(h.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete hamper?"
        description="This action cannot be undone. The hamper will be permanently removed."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => { if (deleteId !== null) deleteMutation.mutate({ id: deleteId }); }}
      />
    </AdminLayout>
  );
}
